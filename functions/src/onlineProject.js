const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {admin, getFirestore} = require("../firebase-admin");
const {FieldValue} = require("firebase-admin/firestore");
const {
  NOTIFICATION_TYPES,
  USER_TYPES,
  NOTIFICATION_STATUS,
  generateNotificationHref,
  isSpamming,
  updateNotificationFrequency,
  sendOneSignalNotification,
  sendEmailForNotification,
  BOOKING_EMAIL_TYPES,
} = require("./notification");

const db = getFirestore();

const NOTIFICATION_EXPIRY_DAYS = 30;
const MAX_NEGOTIATION_ROUNDS = 10;
const MAX_BRIEF_LENGTH = 2000;
const MIN_BRIEF_LENGTH = 50;

const VALID_TRANSITIONS = {
  Pending: ["Active", "Negotiating", "Declined", "Cancelled"],
  Negotiating: ["Active", "Declined", "Cancelled"],
  Active: ["InReview", "Cancelled"],
  InReview: ["Completed", "RevisionsRequested", "Active", "Disputed"],
  RevisionsRequested: ["InReview", "Cancelled", "Disputed"],
  Completed: ["Disputed"],
  Disputed: ["ResolvedForClient", "ResolvedForProvider"],
  Declined: [],
  Cancelled: [],
  ResolvedForClient: [],
  ResolvedForProvider: [],
};

/**
 * Check if a status transition is valid
 * @param {string} from The current status
 * @param {string} to The target status
 * @return {boolean} Whether the transition is valid
 */
function isValidTransition(from, to) {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Extract auth info from context and data
 * @param {Object} context The request context
 * @param {Object} data The request data
 * @return {Object} Auth info with uid, isAdmin, hasAuth
 */
function getAuthInfo(context, data) {
  const auth = context.auth || data.auth;
  return {
    uid: auth?.uid || null,
    isAdmin: auth?.token?.isAdmin || false,
    hasAuth: !!auth,
  };
}

/**
 * Generate a unique project ID
 * @return {string} A unique project ID
 */
function generateProjectId() {
  const now = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `op_${now}_${random}`;
}

/**
 * Create a notification for a user
 * @param {string} targetUserId The target user ID
 * @param {string} userType The user type (client/provider)
 * @param {string} notificationType The notification type
 * @param {string} title The notification title
 * @param {string} message The notification message
 * @param {string} onlineProjectId The related project ID
 * @param {Object|null} metadata Additional metadata
 * @return {Promise<void>}
 */
async function createNotification(
  targetUserId,
  userType,
  notificationType,
  title,
  message,
  onlineProjectId,
  metadata = null,
) {
  try {
    if (!targetUserId || !userType || !notificationType || !title || !message) {
      console.error("Error creating notification: Required parameters missing");
      return;
    }

    if (!Object.values(USER_TYPES).includes(userType)) {
      console.error(`Error creating notification: Invalid userType: ${userType}`);
      return;
    }

    if (!Object.values(NOTIFICATION_TYPES).includes(notificationType)) {
      console.error(`Error creating notification: Invalid notificationType: ${notificationType}`);
      return;
    }

    const spamming = await isSpamming(targetUserId, notificationType);
    if (spamming) {
      console.log("Notification spam prevention failed");
      return;
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + NOTIFICATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    const href = generateNotificationHref(
      notificationType,
      userType,
      onlineProjectId,
    );

    const notificationRef = db.collection("notifications").doc();
    const notification = {
      id: notificationRef.id,
      userId: targetUserId,
      userType,
      notificationType,
      title,
      message,
      relatedEntityId: onlineProjectId || null,
      metadata: metadata,
      href,
      status: NOTIFICATION_STATUS.UNREAD,
      createdAt: FieldValue.serverTimestamp(),
      readAt: null,
      pushSentAt: null,
      expiresAt,
    };

    await notificationRef.set(notification);
    await updateNotificationFrequency(targetUserId, notificationType);

    sendOneSignalNotification(targetUserId, {
      ...notification,
      createdAt: now,
    }).catch((error) => {
      console.error("Failed to send OneSignal notification:", error);
    });

    if (BOOKING_EMAIL_TYPES.has(notificationType)) {
      sendEmailForNotification(targetUserId, notification).catch((error) => {
        console.error("Failed to send notification email:", error);
      });
    }
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

/**
 * Get a project and validate the caller has access
 * @param {string} projectId The project ID
 * @param {Object} authInfo The auth info
 * @return {Promise<Object>} The project ref and data
 */
async function getProjectAndValidateAccess(projectId, authInfo) {
  const projectRef = db.collection("online_projects").doc(projectId);
  const projectSnap = await projectRef.get();

  if (!projectSnap.exists) {
    throw new HttpsError("not-found", "Online project not found");
  }

  const project = projectSnap.data();
  const isParticipant =
    project.clientId === authInfo.uid || project.providerId === authInfo.uid;

  if (!isParticipant && !authInfo.isAdmin) {
    throw new HttpsError("permission-denied", "Not authorized to access this project");
  }

  return {projectRef, project};
}

/**
 * Get the display name for a user
 * @param {string} userId The user ID
 * @return {Promise<string>} The display name
 */
async function getUserDisplayName(userId) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (userDoc.exists) {
      return userDoc.data().name || "Unknown";
    }
  } catch (e) {
    console.error("Failed to get user display name:", e);
  }
  return "Unknown";
}

/**
 * Get service and package names for display
 * @param {string} serviceId The service ID
 * @param {string|null} packageId The package ID
 * @return {Promise<Object>} Object with serviceName and packageName
 */
async function getServiceAndPackageName(serviceId, packageId) {
  let serviceName = "Unknown Service";
  let packageName = "Unknown Package";
  try {
    const serviceDoc = await db.collection("services").doc(serviceId).get();
    if (serviceDoc.exists) {
      serviceName = serviceDoc.data().title || serviceName;
    }
    if (packageId) {
      const packageDoc = await db.collection("service_packages").doc(packageId).get();
      if (packageDoc.exists) {
        packageName = packageDoc.data().title || packageName;
      }
    }
  } catch (e) {
    console.error("Failed to get service/package name:", e);
  }
  return {serviceName, packageName};
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================

/**
 * Create a new online project
 * @param {Object} request The callable request
 * @param {Object} data The request data
 * @return {Promise<Object>} Result with project ID
 */
async function createOnlineProject_handler(request, data) {
  const payload = data.data || data;
  const authInfo = getAuthInfo({auth: request.auth}, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {
    serviceId,
    servicePackageId,
    brief,
    desiredDeadline,
    referenceAttachments = [],
    idempotencyKey,
  } = payload;

  if (!idempotencyKey || typeof idempotencyKey !== "string") {
    throw new HttpsError("invalid-argument", "idempotencyKey is required");
  }

  if (!serviceId) {
    throw new HttpsError("invalid-argument", "serviceId is required");
  }

  if (!servicePackageId) {
    throw new HttpsError("invalid-argument", "servicePackageId is required");
  }

  if (!brief || brief.length < MIN_BRIEF_LENGTH || brief.length > MAX_BRIEF_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      `Project brief must be between ${MIN_BRIEF_LENGTH} and ${MAX_BRIEF_LENGTH} characters`,
    );
  }

  if (!desiredDeadline) {
    throw new HttpsError("invalid-argument", "desiredDeadline is required");
  }

  const existingKey = await db.collection("online_project_idempotency")
    .doc(idempotencyKey)
    .get();

  if (existingKey.exists) {
    if (existingKey.data().clientId !== authInfo.uid) {
      throw new HttpsError("permission-denied",
        "Idempotency key belongs to a different user");
    }
    return {success: true, data: {projectId: existingKey.data().projectId}};
  }

  const serviceDoc = await db.collection("services").doc(serviceId).get();
  if (!serviceDoc.exists) {
    throw new HttpsError("not-found", "Service not found");
  }

  const service = serviceDoc.data();

  if (service.serviceMode !== "OnlineService") {
    throw new HttpsError("invalid-argument", "Service is not an online service");
  }

  if (service.status !== "Available") {
    throw new HttpsError("failed-precondition", "Service is not currently available");
  }

  if (service.providerId === authInfo.uid) {
    throw new HttpsError("permission-denied", "Cannot create a project for your own service");
  }

  const packageDoc = await db.collection("service_packages").doc(servicePackageId).get();
  if (!packageDoc.exists) {
    throw new HttpsError("not-found", "Service package not found");
  }

  const packageData = packageDoc.data();
  if (packageData.serviceId !== serviceId) {
    throw new HttpsError("invalid-argument", "Package does not belong to this service");
  }

  const onlineConfig = service.onlineConfig || {};
  const packageSettings = onlineConfig.packageSettings?.[servicePackageId] || {};

  const minDeliveryDays =
    packageSettings.deliveryMinDays ?? onlineConfig.defaultDeliveryMinDays ?? 3;
  const maxDeliveryDays =
    packageSettings.deliveryMaxDays ?? onlineConfig.defaultDeliveryMaxDays ?? 14;
  const revisionRounds = packageSettings.revisionRounds ?? onlineConfig.defaultRevisionRounds ?? 3;
  const milestones = packageSettings.milestones || null;

  const deliverableMode = milestones && milestones.length > 0 ? "Milestone" : "Simple";

  const now = new Date().toISOString();
  const projectId = generateProjectId();

  const newProject = {
    id: projectId,
    clientId: authInfo.uid,
    providerId: service.providerId,
    serviceId,
    servicePackageId,
    status: "Pending",
    desiredDeadline,
    agreedDeadline: null,
    originalPrice: packageData.price || 0,
    agreedPrice: null,
    amountPaid: 0,
    paymentStatus: "Pending",
    paymentNotes: null,
    brief,
    referenceAttachments: Array.isArray(referenceAttachments) ? referenceAttachments : [],
    deliverableConfig: {
      mode: deliverableMode,
      minDeliveryDays,
      maxDeliveryDays,
      revisionRounds,
      milestones: milestones || undefined,
    },
    currentMilestoneIndex: 0,
    deliverableCount: 0,
    meetingUrl: null,
    disputeReason: null,
    disputeInitiatedBy: null,
    disputeInitiatedAt: null,
    disputePreStatus: null,
    resolutionNote: null,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
    acceptedAt: null,
    completedAt: null,
    lastNegotiationAt: now,
    autoCancelled: null,
  };

  await db.collection("online_projects").doc(projectId).set(newProject);

  await db.collection("online_project_idempotency").doc(idempotencyKey).set({
    projectId,
    clientId: authInfo.uid,
    createdAt: now,
  });

  const clientName = await getUserDisplayName(authInfo.uid);
  const {serviceName, packageName} = await getServiceAndPackageName(serviceId, servicePackageId);

  createNotification(
    service.providerId,
    USER_TYPES.PROVIDER,
    NOTIFICATION_TYPES.NEW_ONLINE_PROJECT_REQUEST,
    "New Online Project Request",
    `${clientName} requested ${serviceName} — ${packageName}`,
    projectId,
    {
      clientId: authInfo.uid,
      clientName,
      serviceId,
      serviceName,
      packageId: servicePackageId,
      packageName,
      projectId,
    },
  ).catch((e) => console.error("Notification dispatch error:", e));

  return {success: true, data: {projectId}};
}

/**
 * Accept an online project
 * @param {Object} request The callable request
 * @param {Object} data The request data
 * @return {Promise<Object>} Result with project ID and status
 */
async function acceptProject_handler(request, data) {
  const payload = data.data || data;
  const authInfo = getAuthInfo({auth: request.auth}, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {projectId} = payload;
  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId is required");
  }

  const {projectRef, project} = await getProjectAndValidateAccess(projectId, authInfo);

  if (project.providerId !== authInfo.uid && !authInfo.isAdmin) {
    throw new HttpsError("permission-denied", "Only the provider can accept a project");
  }

  const currentStatus = project.status;
  if (!isValidTransition(currentStatus, "Active")) {
    throw new HttpsError(
      "failed-precondition",
      `Cannot transition from ${currentStatus} to Active`,
    );
  }

  if (currentStatus !== "Pending" && currentStatus !== "Negotiating") {
    throw new HttpsError("failed-precondition", `Cannot accept project in ${currentStatus} status`);
  }

  const now = new Date().toISOString();
  const isFromNegotiation = currentStatus === "Negotiating";

  let agreedPrice = project.originalPrice;
  let agreedDeadline = project.desiredDeadline;

  if (isFromNegotiation) {
    const offersSnap = await db.collection("online_projects")
      .doc(projectId)
      .collection("negotiations")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (!offersSnap.empty) {
      const lastOffer = offersSnap.docs[0].data();
      if (lastOffer.proposedPrice !== undefined) agreedPrice = lastOffer.proposedPrice;
      if (lastOffer.proposedDeadline) agreedDeadline = lastOffer.proposedDeadline;
    }
  }

  await projectRef.update({
    status: "Active",
    agreedPrice,
    agreedDeadline,
    acceptedAt: now,
    updatedAt: now,
  });

  const providerName = await getUserDisplayName(authInfo.uid);
  const {serviceName} = await getServiceAndPackageName(project.serviceId, null);

  createNotification(
    project.clientId,
    USER_TYPES.CLIENT,
    NOTIFICATION_TYPES.ONLINE_PROJECT_ACCEPTED,
    "Project Accepted",
    `${providerName} accepted your project request for ${serviceName}`,
    projectId,
    {
      providerId: authInfo.uid,
      providerName,
      serviceId: project.serviceId,
      serviceName,
      projectId,
    },
  ).catch((e) => console.error("Notification dispatch error:", e));

  return {success: true, data: {projectId, status: "Active"}};
}

/**
 * Decline an online project
 * @param {Object} request The callable request
 * @param {Object} data The request data
 * @return {Promise<Object>} Result with project ID and status
 */
async function declineProject_handler(request, data) {
  const payload = data.data || data;
  const authInfo = getAuthInfo({auth: request.auth}, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {projectId} = payload;
  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId is required");
  }

  const {projectRef, project} = await getProjectAndValidateAccess(projectId, authInfo);

  if (project.providerId !== authInfo.uid && !authInfo.isAdmin) {
    throw new HttpsError("permission-denied", "Only the provider can decline a project");
  }

  const currentStatus = project.status;
  if (currentStatus !== "Pending" && currentStatus !== "Negotiating") {
    throw new HttpsError(
      "failed-precondition",
      `Cannot decline project in ${currentStatus} status`,
    );
  }

  const now = new Date().toISOString();
  await projectRef.update({
    status: "Declined",
    updatedAt: now,
  });

  const providerName = await getUserDisplayName(authInfo.uid);
  const {serviceName} = await getServiceAndPackageName(project.serviceId, null);

  createNotification(
    project.clientId,
    USER_TYPES.CLIENT,
    NOTIFICATION_TYPES.ONLINE_PROJECT_DECLINED,
    "Project Declined",
    `${providerName} declined your project request for ${serviceName}`,
    projectId,
    {
      providerId: authInfo.uid,
      providerName,
      serviceId: project.serviceId,
      serviceName,
      projectId,
    },
  ).catch((e) => console.error("Notification dispatch error:", e));

  return {success: true, data: {projectId, status: "Declined"}};
}

/**
 * Negotiate project terms (counter offer)
 * @param {Object} request The callable request
 * @param {Object} data The request data
 * @return {Promise<Object>} Result with project ID, status, and offer ID
 */
async function negotiateProject_handler(request, data) {
  const payload = data.data || data;
  const authInfo = getAuthInfo({auth: request.auth}, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {
    projectId,
    proposedPrice,
    proposedDeadline,
    proposedRevisionRounds,
    proposedScope,
    message,
  } = payload;

  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId is required");
  }

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    throw new HttpsError("invalid-argument", "A message is required for negotiation");
  }

  const projectRef = db.collection("online_projects").doc(projectId);

  const result = await db.runTransaction(async (transaction) => {
    const projectSnap = await transaction.get(projectRef);

    if (!projectSnap.exists) {
      throw new HttpsError("not-found", "Online project not found");
    }

    const project = projectSnap.data();

    if (project.providerId !== authInfo.uid && !authInfo.isAdmin) {
      throw new HttpsError("permission-denied", "Only the provider can negotiate");
    }

    const currentStatus = project.status;
    if (currentStatus !== "Pending" && currentStatus !== "Negotiating") {
      throw new HttpsError(
        "failed-precondition",
        `Cannot negotiate project in ${currentStatus} status`,
      );
    }

    const negotiationsRef = db.collection("online_projects")
      .doc(projectId)
      .collection("negotiations");

    const offersSnap = await transaction.get(negotiationsRef);
    if (offersSnap.size >= MAX_NEGOTIATION_ROUNDS) {
      throw new HttpsError(
        "failed-precondition",
        `Maximum negotiation rounds (${MAX_NEGOTIATION_ROUNDS}) reached. ` +
        "Accept, decline, or cancel the project.",
      );
    }

    const now = new Date().toISOString();
    const offerRef = negotiationsRef.doc();

    const offerData = {
      id: offerRef.id,
      offeredBy: "provider",
      proposedPrice: proposedPrice !== undefined ? proposedPrice : null,
      proposedDeadline: proposedDeadline || null,
      proposedRevisionRounds: proposedRevisionRounds !== undefined ? proposedRevisionRounds : null,
      proposedScope: proposedScope || null,
      message,
      createdAt: now,
      status: "Pending",
      clientId: project.clientId,
      providerId: project.providerId,
    };

    transaction.set(offerRef, offerData);
    transaction.update(projectRef, {
      status: "Negotiating",
      lastNegotiationAt: now,
      updatedAt: now,
    });

    return {project, offerId: offerRef.id};
  });

  const providerName = await getUserDisplayName(authInfo.uid);
  const {serviceName} = await getServiceAndPackageName(result.project.serviceId, null);

  createNotification(
    result.project.clientId,
    USER_TYPES.CLIENT,
    NOTIFICATION_TYPES.ONLINE_PROJECT_COUNTER_OFFER,
    "Counter Offer Received",
    `${providerName} sent a counter offer for ${serviceName}`,
    projectId,
    {
      providerId: authInfo.uid,
      providerName,
      serviceId: result.project.serviceId,
      serviceName,
      projectId,
      offerId: result.offerId,
    },
  ).catch((e) => console.error("Notification dispatch error:", e));

  return {success: true, data: {projectId, status: "Negotiating", offerId: result.offerId}};
}

/**
 * Accept a counter offer from the provider
 * @param {Object} request The callable request
 * @param {Object} data The request data
 * @return {Promise<Object>} Result with project ID and status
 */
async function acceptCounterOffer_handler(request, data) {
  const payload = data.data || data;
  const authInfo = getAuthInfo({auth: request.auth}, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {projectId} = payload;
  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId is required");
  }

  const projectRef = db.collection("online_projects").doc(projectId);

  const result = await db.runTransaction(async (transaction) => {
    const projectSnap = await transaction.get(projectRef);

    if (!projectSnap.exists) {
      throw new HttpsError("not-found", "Online project not found");
    }

    const project = projectSnap.data();

    if (project.clientId !== authInfo.uid && !authInfo.isAdmin) {
      throw new HttpsError("permission-denied", "Only the client can accept a counter offer");
    }

    if (project.status !== "Negotiating") {
      throw new HttpsError(
        "failed-precondition",
        `Cannot accept counter offer in ${project.status} status`,
      );
    }

    const negotiationsRef = db.collection("online_projects")
      .doc(projectId)
      .collection("negotiations");

    const offersSnap = await transaction.get(negotiationsRef);
    if (offersSnap.size >= MAX_NEGOTIATION_ROUNDS) {
      throw new HttpsError(
        "failed-precondition",
        `Maximum negotiation rounds (${MAX_NEGOTIATION_ROUNDS}) reached.`,
      );
    }

    const offers = offersSnap.docs.map((d) => ({id: d.id, ...d.data()}));
    offers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const latestOffer = offers[0];
    if (!latestOffer) {
      throw new HttpsError("failed-precondition", "No negotiation offers found");
    }

    let agreedPrice = project.originalPrice;
    let agreedDeadline = project.desiredDeadline;

    if (latestOffer.proposedPrice !== undefined && latestOffer.proposedPrice !== null) {
      agreedPrice = latestOffer.proposedPrice;
    }
    if (latestOffer.proposedDeadline) {
      agreedDeadline = latestOffer.proposedDeadline;
    }

    const now = new Date().toISOString();

    const latestOfferRef = negotiationsRef.doc(latestOffer.id);
    transaction.update(latestOfferRef, {status: "Accepted"});

    for (const offer of offers) {
      if (offer.id !== latestOffer.id && offer.status === "Pending") {
        transaction.update(negotiationsRef.doc(offer.id), {status: "Rejected"});
      }
    }

    transaction.update(projectRef, {
      status: "Active",
      agreedPrice,
      agreedDeadline,
      acceptedAt: now,
      lastNegotiationAt: now,
      updatedAt: now,
    });

    return {project, agreedPrice, agreedDeadline};
  });

  const clientName = await getUserDisplayName(authInfo.uid);
  const {serviceName} = await getServiceAndPackageName(result.project.serviceId, null);

  createNotification(
    result.project.providerId,
    USER_TYPES.PROVIDER,
    NOTIFICATION_TYPES.ONLINE_PROJECT_ACCEPTED,
    "Counter Offer Accepted",
    `${clientName} accepted your counter offer for ${serviceName}`,
    projectId,
    {
      clientId: authInfo.uid,
      clientName,
      serviceId: result.project.serviceId,
      serviceName,
      projectId,
    },
  ).catch((e) => console.error("Notification dispatch error:", e));

  return {success: true, data: {projectId, status: "Active"}};
}

/**
 * Submit a deliverable for review
 * @param {Object} request The callable request
 * @param {Object} data The request data
 * @return {Promise<Object>} Result with project ID and deliverable ID
 */
async function submitDeliverable_handler(request, data) {
  const payload = data.data || data;
  const authInfo = getAuthInfo({auth: request.auth}, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {projectId, files, notes, milestoneIndex} = payload;
  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId is required");
  }

  if (!files || !Array.isArray(files) || files.length === 0) {
    throw new HttpsError("invalid-argument", "At least one file is required");
  }

  const projectRef = db.collection("online_projects").doc(projectId);

  const result = await db.runTransaction(async (transaction) => {
    const projectSnap = await transaction.get(projectRef);

    if (!projectSnap.exists) {
      throw new HttpsError("not-found", "Online project not found");
    }

    const project = projectSnap.data();

    if (project.providerId !== authInfo.uid && !authInfo.isAdmin) {
      throw new HttpsError("permission-denied", "Only the provider can submit deliverables");
    }

    const currentStatus = project.status;
    if (currentStatus !== "Active" && currentStatus !== "RevisionsRequested") {
      throw new HttpsError(
        "failed-precondition",
        `Cannot submit deliverable in ${currentStatus} status`,
      );
    }

    const deliverableConfig = project.deliverableConfig;
    const isMilestoneMode = deliverableConfig?.mode === "Milestone" &&
      deliverableConfig.milestones && deliverableConfig.milestones.length > 0;

    if (isMilestoneMode) {
      const expectedIndex = project.currentMilestoneIndex;
      if (milestoneIndex === undefined || milestoneIndex === null) {
        throw new HttpsError("invalid-argument", "milestoneIndex is required in milestone mode");
      }
      if (milestoneIndex !== expectedIndex) {
        throw new HttpsError("invalid-argument",
          `milestone-index-mismatch: expected ${expectedIndex}, got ${milestoneIndex}`);
      }
    }

    const deliverablesRef = db.collection("online_projects")
      .doc(projectId)
      .collection("deliverables");

    const existingDeliverablesSnap = await transaction.get(deliverablesRef);
    const existingDeliverables = existingDeliverablesSnap.docs.map((d) => d.data());

    let previousRevisionCount = 0;
    if (currentStatus === "RevisionsRequested") {
      const relevantSubmissions = existingDeliverables.filter((d) => {
        if (isMilestoneMode) {
          return d.milestoneIndex === milestoneIndex;
        }
        return true;
      });
      if (relevantSubmissions.length > 0) {
        relevantSubmissions.sort((a, b) =>
          new Date(b.submittedAt) - new Date(a.submittedAt));
        previousRevisionCount = relevantSubmissions[0].revisionCount || 0;
      }
    }

    const newRevisionCount = currentStatus === "RevisionsRequested" ?
      previousRevisionCount + 1 :
      0;

    if (newRevisionCount > 0 && newRevisionCount > deliverableConfig.revisionRounds) {
      throw new HttpsError(
        "failed-precondition",
        `Maximum revision rounds (${deliverableConfig.revisionRounds}) exceeded`,
      );
    }

    const now = new Date().toISOString();
    const deliverableRef = deliverablesRef.doc();

    const deliverableData = {
      id: deliverableRef.id,
      milestoneIndex: isMilestoneMode ? milestoneIndex : null,
      files: files.map((f) => ({
        fileName: f.fileName,
        fileUrl: f.fileUrl,
        fileSize: f.fileSize,
        fileType: f.fileType,
      })),
      notes: notes || null,
      submittedAt: now,
      status: "Submitted",
      clientFeedback: null,
      revisionCount: newRevisionCount,
      clientId: project.clientId,
      providerId: project.providerId,
    };

    transaction.set(deliverableRef, deliverableData);
    transaction.update(projectRef, {
      status: "InReview",
      deliverableCount: (project.deliverableCount || 0) + 1,
      updatedAt: now,
    });

    return {project, deliverableId: deliverableRef.id};
  });

  const providerName = await getUserDisplayName(authInfo.uid);
  const {serviceName} = await getServiceAndPackageName(result.project.serviceId, null);

  createNotification(
    result.project.clientId,
    USER_TYPES.CLIENT,
    NOTIFICATION_TYPES.DELIVERABLE_SUBMITTED,
    "Deliverable Ready for Review",
    `${providerName} submitted a deliverable for ${serviceName}`,
    projectId,
    {
      providerId: authInfo.uid,
      providerName,
      deliverableId: result.deliverableId,
      milestoneIndex: milestoneIndex !== undefined ? milestoneIndex : null,
      projectId,
    },
  ).catch((e) => console.error("Notification dispatch error:", e));

  return {
    success: true,
    data: {projectId, deliverableId: result.deliverableId, status: "InReview"},
  };
}

/**
 * Approve a submitted deliverable
 * @param {Object} request The callable request
 * @param {Object} data The request data
 * @return {Promise<Object>} Result with project ID and new status
 */
async function approveDeliverable_handler(request, data) {
  const payload = data.data || data;
  const authInfo = getAuthInfo({auth: request.auth}, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {projectId, deliverableId} = payload;
  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId is required");
  }
  if (!deliverableId) {
    throw new HttpsError("invalid-argument", "deliverableId is required");
  }

  const projectRef = db.collection("online_projects").doc(projectId);

  const result = await db.runTransaction(async (transaction) => {
    const projectSnap = await transaction.get(projectRef);

    if (!projectSnap.exists) {
      throw new HttpsError("not-found", "Online project not found");
    }

    const project = projectSnap.data();

    if (project.clientId !== authInfo.uid && !authInfo.isAdmin) {
      throw new HttpsError("permission-denied", "Only the client can approve deliverables");
    }

    if (project.status !== "InReview") {
      throw new HttpsError(
        "failed-precondition",
        `Cannot approve deliverable in ${project.status} status`,
      );
    }

    const deliverableRef = db.collection("online_projects")
      .doc(projectId)
      .collection("deliverables")
      .doc(deliverableId);

    const deliverableSnap = await transaction.get(deliverableRef);
    if (!deliverableSnap.exists) {
      throw new HttpsError("not-found", "Deliverable not found");
    }

    const deliverable = deliverableSnap.data();
    const deliverableConfig = project.deliverableConfig;
    const isMilestoneMode = deliverableConfig?.mode === "Milestone" &&
      deliverableConfig.milestones && deliverableConfig.milestones.length > 0;

    if (isMilestoneMode) {
      if (deliverable.milestoneIndex !== project.currentMilestoneIndex) {
        throw new HttpsError("invalid-argument",
          `Deliverable milestone index mismatch: expected ${project.currentMilestoneIndex}`);
      }
    }

    const now = new Date().toISOString();
    transaction.update(deliverableRef, {status: "Approved"});

    let newStatus;
    let newMilestoneIndex = project.currentMilestoneIndex;
    let completedAt = null;

    if (isMilestoneMode) {
      const nextIndex = project.currentMilestoneIndex + 1;
      if (nextIndex >= deliverableConfig.milestones.length) {
        newStatus = "Completed";
        completedAt = now;
        newMilestoneIndex = nextIndex;
      } else {
        newStatus = "Active";
        newMilestoneIndex = nextIndex;
      }
    } else {
      newStatus = "Completed";
      completedAt = now;
    }

    const updates = {
      status: newStatus,
      currentMilestoneIndex: newMilestoneIndex,
      updatedAt: now,
    };

    if (completedAt) {
      updates.completedAt = completedAt;
    }

    transaction.update(projectRef, updates);

    return {
      project,
      newStatus,
      deliverable,
      isMilestoneMode,
      milestoneTitle: isMilestoneMode ?
        deliverableConfig.milestones[project.currentMilestoneIndex]?.title :
        null,
      milestoneIndex: project.currentMilestoneIndex,
    };
  });

  const clientName = await getUserDisplayName(authInfo.uid);
  const {serviceName} = await getServiceAndPackageName(result.project.serviceId, null);

  if (result.newStatus === "Completed") {
    createNotification(
      result.project.providerId,
      USER_TYPES.PROVIDER,
      NOTIFICATION_TYPES.ONLINE_PROJECT_COMPLETED,
      "Project Completed",
      `${clientName} approved your deliverable — ${serviceName} is complete`,
      projectId,
      {clientId: authInfo.uid, clientName, projectId},
    ).catch((e) => console.error("Notification dispatch error:", e));

    createNotification(
      authInfo.uid,
      USER_TYPES.CLIENT,
      NOTIFICATION_TYPES.REVIEW_REMINDER,
      "Share Your Experience",
      `Please review your "${serviceName}" project with ` +
      `${await getUserDisplayName(result.project.providerId)}`,
      projectId,
      {
        providerId: result.project.providerId,
        providerName: await getUserDisplayName(result.project.providerId),
        projectId,
      },
    ).catch((e) => console.error("Notification dispatch error:", e));

    createNotification(
      result.project.providerId,
      USER_TYPES.PROVIDER,
      NOTIFICATION_TYPES.REVIEW_REQUEST,
      "Rate Your Client",
      `Rate your experience with ${clientName} for "${serviceName}"`,
      projectId,
      {clientId: authInfo.uid, clientName, projectId},
    ).catch((e) => console.error("Notification dispatch error:", e));
  } else if (result.isMilestoneMode) {
    createNotification(
      result.project.providerId,
      USER_TYPES.PROVIDER,
      NOTIFICATION_TYPES.MILESTONE_APPROVED,
      "Milestone Approved",
      `${clientName} approved milestone "${result.milestoneTitle}" for ${serviceName}`,
      projectId,
      {
        clientId: authInfo.uid,
        clientName,
        milestoneTitle: result.milestoneTitle,
        milestoneIndex: result.milestoneIndex,
        projectId,
      },
    ).catch((e) => console.error("Notification dispatch error:", e));
  }

  return {success: true, data: {projectId, status: result.newStatus}};
}

/**
 * Request revisions for a deliverable
 * @param {Object} request The callable request
 * @param {Object} data The request data
 * @return {Promise<Object>} Result with project ID and status
 */
async function requestRevisions_handler(request, data) {
  const payload = data.data || data;
  const authInfo = getAuthInfo({auth: request.auth}, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {projectId, deliverableId, feedback} = payload;
  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId is required");
  }
  if (!deliverableId) {
    throw new HttpsError("invalid-argument", "deliverableId is required");
  }

  const projectRef = db.collection("online_projects").doc(projectId);

  const result = await db.runTransaction(async (transaction) => {
    const projectSnap = await transaction.get(projectRef);

    if (!projectSnap.exists) {
      throw new HttpsError("not-found", "Online project not found");
    }

    const project = projectSnap.data();

    if (project.clientId !== authInfo.uid && !authInfo.isAdmin) {
      throw new HttpsError("permission-denied", "Only the client can request revisions");
    }

    if (project.status !== "InReview") {
      throw new HttpsError(
        "failed-precondition",
        `Cannot request revisions in ${project.status} status`,
      );
    }

    const deliverableRef = db.collection("online_projects")
      .doc(projectId)
      .collection("deliverables")
      .doc(deliverableId);

    const deliverableSnap = await transaction.get(deliverableRef);
    if (!deliverableSnap.exists) {
      throw new HttpsError("not-found", "Deliverable not found");
    }

    const deliverableData = deliverableSnap.data();
    const deliverableConfig = project.deliverableConfig;
    const existingDeliverablesRef = db.collection("online_projects")
      .doc(projectId)
      .collection("deliverables");
    const existingSnap = await transaction.get(existingDeliverablesRef);
    const existingDeliverables = existingSnap.docs.map((d) => d.data());

    const isMilestoneMode = deliverableConfig?.mode === "Milestone" &&
      deliverableConfig.milestones && deliverableConfig.milestones.length > 0;
    const currentMilestone = deliverableData.milestoneIndex;

    const relevantSubmissions = existingDeliverables.filter((d) => {
      if (isMilestoneMode) return d.milestoneIndex === currentMilestone;
      return true;
    });

    const maxRevisions = deliverableConfig.revisionRounds || 0;
    const latestSubmission = relevantSubmissions
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];
    const currentRevisionCount = latestSubmission?.revisionCount || 0;

    if (currentRevisionCount >= maxRevisions) {
      throw new HttpsError(
        "failed-precondition",
        `Maximum revision rounds (${maxRevisions}) reached`,
      );
    }

    const now = new Date().toISOString();
    transaction.update(deliverableRef, {
      status: "RevisionsRequested",
      clientFeedback: feedback || null,
    });

    transaction.update(projectRef, {
      status: "RevisionsRequested",
      updatedAt: now,
    });

    return {project};
  });

  const clientName = await getUserDisplayName(authInfo.uid);
  const {serviceName} = await getServiceAndPackageName(result.project.serviceId, null);

  createNotification(
    result.project.providerId,
    USER_TYPES.PROVIDER,
    NOTIFICATION_TYPES.REVISIONS_REQUESTED,
    "Revisions Requested",
    `${clientName} requested revisions for ${serviceName} — ${feedback || "No notes provided"}`,
    projectId,
    {clientId: authInfo.uid, clientName, deliverableId, projectId},
  ).catch((e) => console.error("Notification dispatch error:", e));

  return {success: true, data: {projectId, status: "RevisionsRequested"}};
}

/**
 * Cancel an online project
 * @param {Object} request The callable request
 * @param {Object} data The request data
 * @return {Promise<Object>} Result with project ID and status
 */
async function cancelProject_handler(request, data) {
  const payload = data.data || data;
  const authInfo = getAuthInfo({auth: request.auth}, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {projectId} = payload;
  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId is required");
  }

  const {projectRef, project} = await getProjectAndValidateAccess(projectId, authInfo);

  const currentStatus = project.status;
  const allowedStatuses = ["Active", "InReview", "RevisionsRequested", "Negotiating", "Pending"];
  if (!allowedStatuses.includes(currentStatus)) {
    throw new HttpsError("failed-precondition", `Cannot cancel project in ${currentStatus} status`);
  }

  if (currentStatus === "Pending" && project.providerId === authInfo.uid && !authInfo.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Provider cannot cancel a Pending project. Use declineProject instead.",
    );
  }

  const isClient = project.clientId === authInfo.uid;
  const isProvider = project.providerId === authInfo.uid;
  if (!isClient && !isProvider && !authInfo.isAdmin) {
    throw new HttpsError("permission-denied", "Only participants can cancel a project");
  }

  const now = new Date().toISOString();
  await projectRef.update({
    status: "Cancelled",
    updatedAt: now,
  });

  const cancellerName = await getUserDisplayName(authInfo.uid);
  const {serviceName} = await getServiceAndPackageName(project.serviceId, null);

  if (isClient) {
    createNotification(
      project.providerId,
      USER_TYPES.PROVIDER,
      NOTIFICATION_TYPES.ONLINE_PROJECT_CANCELLED,
      "Project Cancelled",
      `${cancellerName} cancelled the project ${serviceName}`,
      projectId,
      {clientId: authInfo.uid, clientName: cancellerName, projectId},
    ).catch((e) => console.error("Notification dispatch error:", e));
  } else {
    createNotification(
      project.clientId,
      USER_TYPES.CLIENT,
      NOTIFICATION_TYPES.ONLINE_PROJECT_CANCELLED,
      "Project Cancelled",
      `${cancellerName} cancelled the project ${serviceName}`,
      projectId,
      {providerId: authInfo.uid, providerName: cancellerName, projectId},
    ).catch((e) => console.error("Notification dispatch error:", e));
  }

  return {success: true, data: {projectId, status: "Cancelled"}};
}

/**
 * Initiate a dispute on a project
 * @param {Object} request The callable request
 * @param {Object} data The request data
 * @return {Promise<Object>} Result with project ID and status
 */
async function disputeProject_handler(request, data) {
  const payload = data.data || data;
  const authInfo = getAuthInfo({auth: request.auth}, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {projectId, disputeReason} = payload;
  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId is required");
  }
  if (!disputeReason || typeof disputeReason !== "string" || disputeReason.trim().length === 0) {
    throw new HttpsError("invalid-argument", "disputeReason is required");
  }

  const {projectRef, project} = await getProjectAndValidateAccess(projectId, authInfo);

  const currentStatus = project.status;
  const allowedStatuses = ["InReview", "Completed", "RevisionsRequested"];
  if (!allowedStatuses.includes(currentStatus)) {
    throw new HttpsError(
      "failed-precondition",
      `Cannot dispute project in ${currentStatus} status`,
    );
  }

  const initiatedBy = project.clientId === authInfo.uid ? "client" : "provider";
  const now = new Date().toISOString();

  await projectRef.update({
    status: "Disputed",
    disputePreStatus: currentStatus,
    disputeReason,
    disputeInitiatedBy: initiatedBy,
    disputeInitiatedAt: now,
    updatedAt: now,
  });

  const {serviceName} = await getServiceAndPackageName(project.serviceId, null);

  createNotification(
    project.clientId,
    USER_TYPES.CLIENT,
    NOTIFICATION_TYPES.ONLINE_PROJECT_DISPUTED,
    "Project Disputed",
    `${serviceName} has been marked as disputed. An admin will review the case.`,
    projectId,
    {projectId, initiatedBy},
  ).catch((e) => console.error("Notification dispatch error:", e));

  createNotification(
    project.providerId,
    USER_TYPES.PROVIDER,
    NOTIFICATION_TYPES.ONLINE_PROJECT_DISPUTED,
    "Project Disputed",
    `${serviceName} has been marked as disputed. An admin will review the case.`,
    projectId,
    {projectId, initiatedBy},
  ).catch((e) => console.error("Notification dispatch error:", e));

  return {success: true, data: {projectId, status: "Disputed"}};
}

/**
 * Resolve a dispute in favor of the client
 * @param {Object} request The callable request
 * @param {Object} data The request data
 * @return {Promise<Object>} Result with project ID and status
 */
async function resolveDisputeForClient_handler(request, data) {
  const payload = data.data || data;
  const authInfo = getAuthInfo({auth: request.auth}, data);

  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  const {projectId, resolutionNote} = payload;
  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId is required");
  }

  const {projectRef, project} = await getProjectAndValidateAccess(projectId, authInfo);

  if (project.status !== "Disputed") {
    throw new HttpsError(
      "failed-precondition",
      `Cannot resolve project in ${project.status} status`,
    );
  }

  const now = new Date().toISOString();
  await projectRef.update({
    status: "ResolvedForClient",
    resolutionNote: resolutionNote || null,
    resolvedBy: authInfo.uid,
    resolvedAt: now,
    updatedAt: now,
  });

  const {serviceName} = await getServiceAndPackageName(project.serviceId, null);

  createNotification(
    project.clientId,
    USER_TYPES.CLIENT,
    NOTIFICATION_TYPES.DISPUTE_RESOLVED_FOR_CLIENT,
    "Dispute Resolved — Client",
    `The dispute for ${serviceName} has been resolved in the client's favor. ` +
    `Resolution: ${resolutionNote || "N/A"}`,
    projectId,
    {projectId, resolvedBy: authInfo.uid, resolutionNote},
  ).catch((e) => console.error("Notification dispatch error:", e));

  createNotification(
    project.providerId,
    USER_TYPES.PROVIDER,
    NOTIFICATION_TYPES.DISPUTE_RESOLVED_FOR_CLIENT,
    "Dispute Resolved — Client",
    `The dispute for ${serviceName} has been resolved in the client's favor. ` +
    `Resolution: ${resolutionNote || "N/A"}`,
    projectId,
    {projectId, resolvedBy: authInfo.uid, resolutionNote},
  ).catch((e) => console.error("Notification dispatch error:", e));

  return {success: true, data: {projectId, status: "ResolvedForClient"}};
}

/**
 * Resolve a dispute in favor of the provider
 * @param {Object} request The callable request
 * @param {Object} data The request data
 * @return {Promise<Object>} Result with project ID and status
 */
async function resolveDisputeForProvider_handler(request, data) {
  const payload = data.data || data;
  const authInfo = getAuthInfo({auth: request.auth}, data);

  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  const {projectId, resolutionNote} = payload;
  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId is required");
  }

  const {projectRef, project} = await getProjectAndValidateAccess(projectId, authInfo);

  if (project.status !== "Disputed") {
    throw new HttpsError(
      "failed-precondition",
      `Cannot resolve project in ${project.status} status`,
    );
  }

  const now = new Date().toISOString();
  await projectRef.update({
    status: "ResolvedForProvider",
    resolutionNote: resolutionNote || null,
    resolvedBy: authInfo.uid,
    resolvedAt: now,
    updatedAt: now,
  });

  const {serviceName} = await getServiceAndPackageName(project.serviceId, null);

  createNotification(
    project.clientId,
    USER_TYPES.CLIENT,
    NOTIFICATION_TYPES.DISPUTE_RESOLVED_FOR_PROVIDER,
    "Dispute Resolved — Provider",
    `The dispute for ${serviceName} has been resolved in the provider's favor. ` +
    `Resolution: ${resolutionNote || "N/A"}`,
    projectId,
    {projectId, resolvedBy: authInfo.uid, resolutionNote},
  ).catch((e) => console.error("Notification dispatch error:", e));

  createNotification(
    project.providerId,
    USER_TYPES.PROVIDER,
    NOTIFICATION_TYPES.DISPUTE_RESOLVED_FOR_PROVIDER,
    "Dispute Resolved — Provider",
    `The dispute for ${serviceName} has been resolved in the provider's favor. ` +
    `Resolution: ${resolutionNote || "N/A"}`,
    projectId,
    {projectId, resolvedBy: authInfo.uid, resolutionNote},
  ).catch((e) => console.error("Notification dispatch error:", e));

  return {success: true, data: {projectId, status: "ResolvedForProvider"}};
}

/**
 * Dismiss a dispute and restore previous status
 * @param {Object} request The callable request
 * @param {Object} data The request data
 * @return {Promise<Object>} Result with project ID and status
 */
async function dismissDispute_handler(request, data) {
  const payload = data.data || data;
  const authInfo = getAuthInfo({auth: request.auth}, data);

  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  const {projectId, resolutionNote} = payload;
  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId is required");
  }

  const {projectRef, project} = await getProjectAndValidateAccess(projectId, authInfo);

  if (project.status !== "Disputed") {
    throw new HttpsError(
      "failed-precondition",
      `Cannot dismiss dispute in ${project.status} status`,
    );
  }

  const preStatus = project.disputePreStatus;
  if (!preStatus) {
    throw new HttpsError("internal", "disputePreStatus is missing from project document");
  }

  const now = new Date().toISOString();
  await projectRef.update({
    status: preStatus,
    resolutionNote: resolutionNote || null,
    resolvedBy: authInfo.uid,
    resolvedAt: now,
    updatedAt: now,
  });

  const {serviceName} = await getServiceAndPackageName(project.serviceId, null);

  createNotification(
    project.clientId,
    USER_TYPES.CLIENT,
    NOTIFICATION_TYPES.DISPUTE_DISMISSED,
    "Dispute Dismissed",
    `The dispute for ${serviceName} has been dismissed. Note: ${resolutionNote || "N/A"}`,
    projectId,
    {projectId, resolvedBy: authInfo.uid, resolutionNote},
  ).catch((e) => console.error("Notification dispatch error:", e));

  createNotification(
    project.providerId,
    USER_TYPES.PROVIDER,
    NOTIFICATION_TYPES.DISPUTE_DISMISSED,
    "Dispute Dismissed",
    `The dispute for ${serviceName} has been dismissed. Note: ${resolutionNote || "N/A"}`,
    projectId,
    {projectId, resolvedBy: authInfo.uid, resolutionNote},
  ).catch((e) => console.error("Notification dispatch error:", e));

  return {success: true, data: {projectId, status: preStatus}};
}

/**
 * Record a payment for a project
 * @param {Object} request The callable request
 * @param {Object} data The request data
 * @return {Promise<Object>} Result with payment record
 */
async function recordPayment_handler(request, data) {
  const payload = data.data || data;
  const authInfo = getAuthInfo({auth: request.auth}, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {projectId, amountDelta, notes} = payload;
  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId is required");
  }

  if (amountDelta === undefined || amountDelta === null || typeof amountDelta !== "number") {
    throw new HttpsError("invalid-argument", "amountDelta is required and must be a number");
  }

  const projectRef = db.collection("online_projects").doc(projectId);

  const result = await db.runTransaction(async (transaction) => {
    const projectSnap = await transaction.get(projectRef);

    if (!projectSnap.exists) {
      throw new HttpsError("not-found", "Online project not found");
    }

    const project = projectSnap.data();

    if (project.clientId !== authInfo.uid && !authInfo.isAdmin) {
      throw new HttpsError("permission-denied", "Only the project client can record payments");
    }

    const amountBefore = project.amountPaid || 0;
    const amountAfter = amountBefore + amountDelta;

    if (amountAfter < 0) {
      throw new HttpsError("invalid-argument", "Payment amount cannot result in negative total");
    }

    const price = project.agreedPrice || project.originalPrice || 0;
    let paymentStatusAfter;
    if (amountAfter >= price && price > 0) {
      paymentStatusAfter = "Full";
    } else if (amountAfter > 0) {
      paymentStatusAfter = "Partial";
    } else {
      paymentStatusAfter = "Pending";
    }

    const now = new Date().toISOString();
    const paymentHistoryRef = db.collection("online_projects")
      .doc(projectId)
      .collection("payment_history")
      .doc();

    const paymentRecord = {
      id: paymentHistoryRef.id,
      projectId,
      recordedBy: authInfo.uid,
      recordedByRole: authInfo.isAdmin ? "admin" : "provider",
      amountDelta,
      amountBefore,
      amountAfter,
      paymentStatusBefore: project.paymentStatus || "Pending",
      paymentStatusAfter,
      notes: notes || null,
      createdAt: now,
      clientId: project.clientId,
      providerId: project.providerId,
    };

    transaction.set(paymentHistoryRef, paymentRecord);
    transaction.update(projectRef, {
      amountPaid: amountAfter,
      paymentStatus: paymentStatusAfter,
      paymentNotes: notes || null,
      updatedAt: now,
    });

    return {paymentRecord};
  });

  return {success: true, data: result.paymentRecord};
}

/**
 * Get a single project by ID
 * @param {Object} request The callable request
 * @param {Object} data The request data
 * @return {Promise<Object>} Result with project data
 */
async function getProject_handler(request, data) {
  const payload = data.data || data;
  const authInfo = getAuthInfo({auth: request.auth}, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {projectId} = payload;
  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId is required");
  }

  const {project} = await getProjectAndValidateAccess(projectId, authInfo);

  return {success: true, data: project};
}

/**
 * Get all projects for a client
 * @param {Object} request The callable request
 * @param {Object} data The request data
 * @return {Promise<Object>} Result with list of projects
 */
async function getClientProjects_handler(request, data) {
  const payload = data.data || data;
  const authInfo = getAuthInfo({auth: request.auth}, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {clientId, limit = 50} = payload;

  const targetClientId = clientId || authInfo.uid;
  if (targetClientId !== authInfo.uid && !authInfo.isAdmin) {
    throw new HttpsError("permission-denied", "Not authorized to view these projects");
  }

  try {
    const projectsQuery = await db.collection("online_projects")
      .where("clientId", "==", targetClientId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const projects = projectsQuery.docs.map((doc) => ({id: doc.id, ...doc.data()}));
    return {success: true, data: projects};
  } catch (error) {
    console.error("Error in getClientProjects:", error);
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get all projects for a provider
 * @param {Object} request The callable request
 * @param {Object} data The request data
 * @return {Promise<Object>} Result with list of projects
 */
async function getProviderProjects_handler(request, data) {
  const payload = data.data || data;
  const authInfo = getAuthInfo({auth: request.auth}, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {providerId, limit = 50} = payload;

  const targetProviderId = providerId || authInfo.uid;
  if (targetProviderId !== authInfo.uid && !authInfo.isAdmin) {
    throw new HttpsError("permission-denied", "Not authorized to view these projects");
  }

  try {
    const projectsQuery = await db.collection("online_projects")
      .where("providerId", "==", targetProviderId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const projects = projectsQuery.docs.map((doc) => ({id: doc.id, ...doc.data()}));
    return {success: true, data: projects};
  } catch (error) {
    console.error("Error in getProviderProjects:", error);
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get project analytics for a client
 * @param {Object} request The callable request
 * @param {Object} data The request data
 * @return {Promise<Object>} Result with analytics data
 */
async function getClientProjectAnalytics_handler(request, data) {
  const payload = data.data || data;
  const authInfo = getAuthInfo({auth: request.auth}, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {clientId, startDate, endDate} = payload;

  const targetClientId = clientId || authInfo.uid;
  if (targetClientId !== authInfo.uid && !authInfo.isAdmin) {
    throw new HttpsError("permission-denied", "Not authorized to view these analytics");
  }

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const actualStartDate = startDate ? new Date(startDate) : thirtyDaysAgo;
    const actualEndDate = endDate ? new Date(endDate) : now;

    let memberSinceDate = now;
    try {
      const userDoc = await db.collection("users").doc(targetClientId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        memberSinceDate = userData.createdAt ? new Date(userData.createdAt) : now;
      }
    } catch (error) {
      console.log("Could not get user profile, using default member date");
    }

    const projectsQuery = await db.collection("online_projects")
      .where("clientId", "==", targetClientId)
      .where("createdAt", ">=", actualStartDate.toISOString())
      .where("createdAt", "<=", actualEndDate.toISOString())
      .get();

    const projects = projectsQuery.docs.map((doc) => doc.data());

    const totalProjects = projects.length;
    const completedProjects = projects.filter((p) => p.status === "Completed").length;
    const activeProjects = projects.filter((p) =>
      ["Active", "InReview", "RevisionsRequested"].includes(p.status),
    ).length;
    const pendingProjects = projects.filter((p) =>
      ["Pending", "Negotiating"].includes(p.status),
    ).length;
    const cancelledProjects = projects.filter((p) => p.status === "Cancelled").length;
    const disputedProjects = projects.filter((p) =>
      ["Disputed", "ResolvedForClient", "ResolvedForProvider"].includes(p.status),
    ).length;
    const totalSpent = projects
      .filter((p) => p.status === "Completed")
      .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

    return {
      success: true,
      data: {
        clientId: targetClientId,
        totalProjects,
        completedProjects,
        activeProjects,
        pendingProjects,
        totalSpent,
        cancelledProjects,
        disputedProjects,
        memberSince: memberSinceDate.toISOString(),
        startDate: actualStartDate.toISOString(),
        endDate: actualEndDate.toISOString(),
      },
    };
  } catch (error) {
    console.error("Error in getClientProjectAnalytics:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get project analytics for a provider (admin only)
 * @param {Object} request The callable request
 * @param {Object} data The request data
 * @return {Promise<Object>} Result with analytics data
 */
async function getProviderProjectAnalytics_handler(request, data) {
  const payload = data.data || data;
  const authInfo = getAuthInfo({auth: request.auth}, data);

  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Only ADMIN users can get provider project analytics",
    );
  }

  const {providerId, startDate, endDate} = payload;
  if (!providerId) {
    throw new HttpsError("invalid-argument", "Provider ID is required");
  }

  try {
    const now = new Date();
    const actualStartDate = startDate ? new Date(startDate) : new Date(0);
    const actualEndDate = endDate ? new Date(endDate) : now;

    let query = db.collection("online_projects").where("providerId", "==", providerId);

    if (startDate) {
      query = query.where("createdAt", ">=", actualStartDate.toISOString());
    }
    if (endDate) {
      query = query.where("createdAt", "<=", actualEndDate.toISOString());
    }

    const projectsSnapshot = await query.get();
    const projects = projectsSnapshot.docs.map((doc) => doc.data());

    const totalProjects = projects.length;

    if (totalProjects === 0) {
      return {
        success: true,
        data: {
          providerId,
          totalProjects: 0,
          completedJobs: 0,
          cancelledJobs: 0,
          activeJobs: 0,
          disputedProjects: 0,
          completionRate: 0,
          totalEarnings: 0,
          packageBreakdown: [],
          startDate: startDate || null,
          endDate: endDate || null,
        },
      };
    }

    const completedJobs = projects.filter((p) => p.status === "Completed").length;
    const cancelledJobs = projects.filter((p) =>
      p.status === "Cancelled" || p.status === "Declined",
    ).length;
    const activeJobs = projects.filter((p) =>
      ["Active", "InReview", "RevisionsRequested"].includes(p.status),
    ).length;
    const disputedProjects = projects.filter((p) =>
      ["Disputed", "ResolvedForClient", "ResolvedForProvider"].includes(p.status),
    ).length;

    const acceptedJobs = projects.filter((p) =>
      ["Completed", "Active", "InReview", "RevisionsRequested"].includes(p.status),
    ).length;

    const completionRate = acceptedJobs === 0 ?
      0 :
      (completedJobs * 100) / acceptedJobs;

    const totalEarnings = projects
      .filter((p) => p.status === "Completed")
      .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

    const packageCounts = {};
    for (const project of projects.filter((p) => p.status === "Completed")) {
      if (project.servicePackageId) {
        packageCounts[project.servicePackageId] =
          (packageCounts[project.servicePackageId] || 0) + 1;
      }
    }

    const packageBreakdown = Object.entries(packageCounts);

    return {
      success: true,
      data: {
        providerId,
        totalProjects,
        completedJobs,
        cancelledJobs,
        activeJobs,
        disputedProjects,
        completionRate: Number(completionRate.toFixed(2)),
        totalEarnings,
        packageBreakdown,
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };
  } catch (error) {
    console.error("Error in getProviderProjectAnalytics:", error);
    throw new HttpsError("internal", error.message);
  }
}

// ============================================================================
// TRANSPORT LAYER: SINGLE CONSOLIDATED ENTRYPOINT
// ============================================================================

exports.onlineProjectAction = onCall(
  {
    memory: "256MiB",
  },
  async (request) => {
    const {action} = request.data || {};

    if (!action) {
      throw new HttpsError("invalid-argument", "An action must be specified.");
    }

    const data = request.data;

    try {
      switch (action) {
      case "createOnlineProject":
        return await createOnlineProject_handler(request, data);
      case "acceptProject":
        return await acceptProject_handler(request, data);
      case "declineProject":
        return await declineProject_handler(request, data);
      case "negotiateProject":
        return await negotiateProject_handler(request, data);
      case "acceptCounterOffer":
        return await acceptCounterOffer_handler(request, data);
      case "submitDeliverable":
        return await submitDeliverable_handler(request, data);
      case "approveDeliverable":
        return await approveDeliverable_handler(request, data);
      case "requestRevisions":
        return await requestRevisions_handler(request, data);
      case "cancelProject":
        return await cancelProject_handler(request, data);
      case "disputeProject":
        return await disputeProject_handler(request, data);
      case "resolveDisputeForClient":
        return await resolveDisputeForClient_handler(request, data);
      case "resolveDisputeForProvider":
        return await resolveDisputeForProvider_handler(request, data);
      case "dismissDispute":
        return await dismissDispute_handler(request, data);
      case "recordPayment":
        return await recordPayment_handler(request, data);
      case "getProject":
        return await getProject_handler(request, data);
      case "getClientProjects":
        return await getClientProjects_handler(request, data);
      case "getProviderProjects":
        return await getProviderProjects_handler(request, data);
      case "getClientProjectAnalytics":
        return await getClientProjectAnalytics_handler(request, data);
      case "getProviderProjectAnalytics":
        return await getProviderProjectAnalytics_handler(request, data);
      default:
        throw new HttpsError("invalid-argument", `Unknown action: ${action}`);
      }
    } catch (error) {
      console.error(`Error executing action [${action}]:`, error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "Internal Server Error");
    }
  },
);

// ============================================================================
// SCHEDULED FUNCTIONS
// ============================================================================

exports.autoCancelExpiredProjects = onSchedule("every day 00:00", async () => {
  const now = admin.firestore.Timestamp.now();
  const sevenDaysAgo = new Date(now.toMillis() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.toMillis() - 14 * 24 * 60 * 60 * 1000);

  try {
    const pendingExpired = await db.collection("online_projects")
      .where("status", "==", "Pending")
      .where("createdAt", "<", sevenDaysAgo.toISOString())
      .get();

    const pendingBatch = db.batch();
    const pendingProjects = [];

    pendingExpired.forEach((doc) => {
      pendingBatch.update(doc.ref, {
        status: "Cancelled",
        autoCancelled: true,
        updatedAt: new Date().toISOString(),
      });
      pendingProjects.push({id: doc.id, ...doc.data()});
    });

    if (pendingProjects.length > 0) {
      await pendingBatch.commit();

      for (const project of pendingProjects) {
        const {serviceName} = await getServiceAndPackageName(project.serviceId, null);

        createNotification(
          project.clientId,
          USER_TYPES.CLIENT,
          NOTIFICATION_TYPES.ONLINE_PROJECT_CANCELLED,
          "Project Auto-Cancelled",
          `${serviceName} was automatically cancelled due to inactivity.`,
          project.id,
          {projectId: project.id, autoCancelled: true, reason: "pending_expired"},
        ).catch((e) => console.error("Auto-cancel notification error:", e));

        createNotification(
          project.providerId,
          USER_TYPES.PROVIDER,
          NOTIFICATION_TYPES.ONLINE_PROJECT_CANCELLED,
          "Project Auto-Cancelled",
          `${serviceName} was automatically cancelled due to inactivity.`,
          project.id,
          {projectId: project.id, autoCancelled: true, reason: "pending_expired"},
        ).catch((e) => console.error("Auto-cancel notification error:", e));
      }
    }

    const negotiatingExpired = await db.collection("online_projects")
      .where("status", "==", "Negotiating")
      .where("lastNegotiationAt", "<", fourteenDaysAgo.toISOString())
      .get();

    const negotiatingBatch = db.batch();
    const negotiatingProjects = [];

    negotiatingExpired.forEach((doc) => {
      negotiatingBatch.update(doc.ref, {
        status: "Cancelled",
        autoCancelled: true,
        updatedAt: new Date().toISOString(),
      });
      negotiatingProjects.push({id: doc.id, ...doc.data()});
    });

    if (negotiatingProjects.length > 0) {
      await negotiatingBatch.commit();

      for (const project of negotiatingProjects) {
        const {serviceName} = await getServiceAndPackageName(project.serviceId, null);

        createNotification(
          project.clientId,
          USER_TYPES.CLIENT,
          NOTIFICATION_TYPES.ONLINE_PROJECT_CANCELLED,
          "Project Auto-Cancelled",
          `${serviceName} was automatically cancelled due to inactivity.`,
          project.id,
          {projectId: project.id, autoCancelled: true, reason: "negotiating_expired"},
        ).catch((e) => console.error("Auto-cancel notification error:", e));

        createNotification(
          project.providerId,
          USER_TYPES.PROVIDER,
          NOTIFICATION_TYPES.ONLINE_PROJECT_CANCELLED,
          "Project Auto-Cancelled",
          `${serviceName} was automatically cancelled due to inactivity.`,
          project.id,
          {projectId: project.id, autoCancelled: true, reason: "negotiating_expired"},
        ).catch((e) => console.error("Auto-cancel notification error:", e));
      }
    }

    console.log(
      `Auto-cancel complete: ${pendingProjects.length} pending, ` +
      `${negotiatingProjects.length} negotiating expired`,
    );
  } catch (error) {
    console.error("Error in autoCancelExpiredProjects:", error);
  }
});
