/**
 * SRV Payment Integration Cloud Functions
 *
 * This file exports all the cloud functions for the SRV payment system
 * including Xendit integration for digital payments and wallet top-ups.
 */

const {setGlobalOptions} = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Set global options for all functions
setGlobalOptions({maxInstances: 10});

/**
 * Initialize categories on startup
 * This function runs automatically when Firebase Functions are deployed
 */
async function initializeOnStartup() {
  try {
    console.log("Initializing categories on startup...");
    const {initializeCategoriesDirectly} = require("./src/service");

    // Call the direct initialization function
    const result = await initializeCategoriesDirectly();
    console.log("Categories initialization result:", result);
  } catch (error) {
    console.error("Error initializing categories on startup:", error);
  }
}

// Run initialization
initializeOnStartup();

// Import and export all payment-related functions
const {onboardProvider} = require("./onboardProvider");
const {createDirectPayment} = require("./createDirectPayment");
const {createTopupInvoice} = require("./createTopupInvoice");
const {xenditWebhook} = require("./xenditWebhook");
const {checkProviderOnboarding} = require("./checkProviderOnboarding");
const {getPaymentData} = require("./getPaymentData");
const {checkInvoiceStatus} = require("./checkInvoiceStatus");
const {releaseHeldPayment} = require("./releaseHeldPayment");

// Import Identity Bridge function
const {signInWithInternetIdentity} = require("./src/auth");

// Import Reputation Bridge functions
const {
  initializeReputation,
  updateUserReputation: updateUserReputationBridge,
  updateProviderReputation,
  processReviewForReputation,
} = require("./src/reputation");

// Import Admin Management functions
const {
  getUserRole,
  listUserRoles,
  hasRole,
  setSettings,
  getSettings,
  getSystemStats,
  getUserServicesAndBookings,
  getUserServiceCount,
  getAllUserLockStatuses,
  lockUserAccount,
  updateUserReputation,
  getValidatedCertificates,
  getRejectedCertificates,
  getServicesWithCertificates,
  getPendingCertificateValidations,
  updateCertificateValidationStatus,
  autoReactivateSuspendedAccounts,
  getBookingsData,
  updateUserPhoneNumber,
} = require("./src/admin");

// Import Commission functions
const {
  calculateCommission,
  getCategoryTier,
  getCommissionBreakdown,
} = require("./src/commission");

// Import Account Management functions
const {
  createProfile,
  getProfile,
  updateProfile,
  switchUserRole,
  getAllServiceProviders,
  getAllUsers,
  uploadProfilePicture,
  removeProfilePicture,
  updateUserActiveStatus,
  validatePhoneNumber,
} = require("./src/account");

// Import Service Management functions
const {
  createService,
  getService,
  getServicesByProvider,
  getServicesByCategory,
  updateServiceStatus,
  searchServicesByLocation,
  updateService,
  deleteService,
  getAllServices,
  uploadServiceImages,
  removeServiceImage,
  reorderServiceImages,
  uploadServiceCertificates,
  removeServiceCertificate,
  verifyService,
  getAllCategories,
  initializeCategories,
  createServicePackage,
  getServicePackages,
  getPackage,
  updateServicePackage,
  deleteServicePackage,
  getCommissionQuote,
  updateServiceRating,
  setServiceAvailability,
  getServiceAvailability,
  getAvailableTimeSlots,
  restoreService,
  cleanupArchivedServices,
} = require("./src/service");

const {
  createBooking,
  acceptBooking,
  declineBooking,
  startBooking,
  startNavigation,
  completeBooking,
  cancelBooking,
  getBooking,
  getClientBookings,
  getProviderBookings,
  getBookingsByStatus,
  disputeBooking,
  getServiceAvailableSlots,
  checkServiceAvailability,
  getClientAnalytics,
  getProviderAnalytics,
  releasePayment,
  cancelMissedBookings,
  sendServiceReminders,
} = require("./src/booking");

// Import Wallet Management functions
const {
  getBalance,
  creditBalance,
  debitBalance,
  transferFunds,
  getTransactionHistory,
  getWalletDetails,
  getAllWallets,
} = require("./src/wallet");

// Import Review Management functions
const {
  submitReview,
  getReview,
  getBookingReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  restoreReview,
  bulkUpdateReviewStatus,
  calculateProviderRating,
  calculateServiceRating,
  calculateUserAverageRating,
  getAllReviews,
  getReviewStatistics,
  flagReview,
  getProviderReviews,
  getServiceReviews,
  submitProviderReview,
  getClientProviderReviews,
  getProviderReviewsByProvider,
} = require("./src/review");

// Import Feedback Management functions
const {
  submitFeedback,
  getAllFeedback,
  getMyFeedback,
  getFeedbackStats,
  getFeedbackById,
  getRecentFeedback,
  submitReport,
  getAllReports,
  getMyReports,
  updateReportStatus,
  getReportStats,
  getReportById,
  getRecentReports,
} = require("./src/feedback");

// Import Chat Management functions
const {
  onMessageCreated,
} = require("./src/chat");

// Import Notification Management functions
const {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markNotificationAsPushSent,
  getNotificationsForPush,
  storeFCMToken,
  removeFCMToken,
  getNotificationStats,
  markAllNotificationsAsRead,
  canReceiveNotification,
  deleteNotification,
  cleanupNotificationFrequency,
  storeOneSignalPlayerId,
  removeOneSignalPlayerId,
} = require("./src/notification");

// Import Media Management functions
const {
  uploadMedia,
  getMediaItem,
  getFileData,
  getMediaByOwner,
  getMediaByTypeAndOwner,
  deleteMedia,
  updateMediaMetadata,
  getStorageStats,
  validateMediaItems,
  getCertificatesByValidationStatus,
} = require("./src/media");


// Export all functions
exports.onboardProvider = onboardProvider;
exports.createDirectPayment = createDirectPayment;
exports.createTopupInvoice = createTopupInvoice;
exports.xenditWebhook = xenditWebhook;
exports.checkProviderOnboarding = checkProviderOnboarding;
exports.getPaymentData = getPaymentData;
exports.checkInvoiceStatus = checkInvoiceStatus;
exports.releaseHeldPayment = releaseHeldPayment;

// Export Identity Bridge function
exports.signInWithInternetIdentity = signInWithInternetIdentity;

// Export Reputation Bridge functions
exports.initializeReputation = initializeReputation;
exports.updateUserReputationBridge = updateUserReputationBridge;
exports.updateProviderReputation = updateProviderReputation;
exports.processReviewForReputation = processReviewForReputation;

// Export Commission functions
exports.calculateCommission = calculateCommission;
exports.getCategoryTier = getCategoryTier;
exports.getCommissionBreakdown = getCommissionBreakdown;

// Export Account Management functions
exports.createProfile = createProfile;
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.switchUserRole = switchUserRole;
exports.getAllServiceProviders = getAllServiceProviders;
exports.getAllUsers = getAllUsers;
exports.uploadProfilePicture = uploadProfilePicture;
exports.removeProfilePicture = removeProfilePicture;
exports.updateUserActiveStatus = updateUserActiveStatus;
exports.validatePhoneNumber = validatePhoneNumber;


// Export Service Management functions
exports.createService = createService;
exports.getService = getService;
exports.getServicesByProvider = getServicesByProvider;
exports.getServicesByCategory = getServicesByCategory;
exports.updateServiceStatus = updateServiceStatus;
exports.searchServicesByLocation = searchServicesByLocation;
exports.updateService = updateService;
exports.deleteService = deleteService;
exports.getAllServices = getAllServices;
exports.uploadServiceImages = uploadServiceImages;
exports.removeServiceImage = removeServiceImage;
exports.reorderServiceImages = reorderServiceImages;
exports.uploadServiceCertificates = uploadServiceCertificates;
exports.removeServiceCertificate = removeServiceCertificate;
exports.verifyService = verifyService;
exports.getAllCategories = getAllCategories;
exports.initializeCategories = initializeCategories;
exports.createServicePackage = createServicePackage;
exports.getServicePackages = getServicePackages;
exports.getPackage = getPackage;
exports.updateServicePackage = updateServicePackage;
exports.deleteServicePackage = deleteServicePackage;
exports.getCommissionQuote = getCommissionQuote;
exports.updateServiceRating = updateServiceRating;
exports.setServiceAvailability = setServiceAvailability;
exports.getServiceAvailability = getServiceAvailability;
exports.getAvailableTimeSlots = getAvailableTimeSlots;
exports.restoreService = restoreService;
exports.cleanupArchivedServices = cleanupArchivedServices;

// Export Booking Management Functions
exports.createBooking = createBooking;
exports.acceptBooking = acceptBooking;
exports.declineBooking = declineBooking;
exports.startBooking = startBooking;
exports.startNavigation = startNavigation;
exports.completeBooking = completeBooking;
exports.cancelBooking = cancelBooking;
exports.getBooking = getBooking;
exports.getClientBookings = getClientBookings;
exports.getProviderBookings = getProviderBookings;
exports.getBookingsByStatus = getBookingsByStatus;
exports.disputeBooking = disputeBooking;
exports.getServiceAvailableSlots = getServiceAvailableSlots;
exports.checkServiceAvailability = checkServiceAvailability;
exports.getClientAnalytics = getClientAnalytics;
exports.getProviderAnalytics = getProviderAnalytics;
exports.releasePayment = releasePayment;

// Export Scheduled Booking Functions (cron jobs)
exports.cancelMissedBookings = cancelMissedBookings;
exports.sendServiceReminders = sendServiceReminders;

// Export Wallet Management Functions
exports.getBalance = getBalance;
exports.creditBalance = creditBalance;
exports.debitBalance = debitBalance;
exports.transferFunds = transferFunds;
exports.getTransactionHistory = getTransactionHistory;
exports.getWalletDetails = getWalletDetails;
exports.getAllWallets = getAllWallets;

// Export Review Management Functions
exports.submitReview = submitReview;
exports.getReview = getReview;
exports.getBookingReviews = getBookingReviews;
exports.getUserReviews = getUserReviews;
exports.updateReview = updateReview;
exports.deleteReview = deleteReview;
exports.restoreReview = restoreReview;
exports.bulkUpdateReviewStatus = bulkUpdateReviewStatus;
exports.calculateProviderRating = calculateProviderRating;
exports.calculateServiceRating = calculateServiceRating;
exports.calculateUserAverageRating = calculateUserAverageRating;
exports.getAllReviews = getAllReviews;
exports.getReviewStatistics = getReviewStatistics;
exports.flagReview = flagReview;
exports.getProviderReviews = getProviderReviews;
exports.getServiceReviews = getServiceReviews;
exports.submitProviderReview = submitProviderReview;
exports.getClientProviderReviews = getClientProviderReviews;
exports.getProviderReviewsByProvider = getProviderReviewsByProvider;


// Export Feedback Management Functions
exports.submitFeedback = submitFeedback;
exports.getAllFeedback = getAllFeedback;
exports.getMyFeedback = getMyFeedback;
exports.getFeedbackStats = getFeedbackStats;
exports.getFeedbackById = getFeedbackById;
exports.getRecentFeedback = getRecentFeedback;
exports.submitReport = submitReport;
exports.getAllReports = getAllReports;
exports.getMyReports = getMyReports;
exports.updateReportStatus = updateReportStatus;
exports.getReportStats = getReportStats;
exports.getReportById = getReportById;
exports.getRecentReports = getRecentReports;

// Export Chat Management Functions
exports.onMessageCreated = onMessageCreated;

// Export Notification Management Functions
exports.createNotification = createNotification;
exports.getUserNotifications = getUserNotifications;
exports.markNotificationAsRead = markNotificationAsRead;
exports.markNotificationAsPushSent = markNotificationAsPushSent;
exports.getNotificationsForPush = getNotificationsForPush;
exports.storeFCMToken = storeFCMToken;
exports.removeFCMToken = removeFCMToken;
exports.getNotificationStats = getNotificationStats;
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
exports.canReceiveNotification = canReceiveNotification;
exports.deleteNotification = deleteNotification;
exports.cleanupNotificationFrequency = cleanupNotificationFrequency;
exports.storeOneSignalPlayerId = storeOneSignalPlayerId;
exports.removeOneSignalPlayerId = removeOneSignalPlayerId;

// Export Media Management Functions
exports.uploadMedia = uploadMedia;
exports.getMediaItem = getMediaItem;
exports.getFileData = getFileData;
exports.getMediaByOwner = getMediaByOwner;
exports.getMediaByTypeAndOwner = getMediaByTypeAndOwner;
exports.deleteMedia = deleteMedia;
exports.updateMediaMetadata = updateMediaMetadata;
exports.getStorageStats = getStorageStats;
exports.validateMediaItems = validateMediaItems;
exports.getCertificatesByValidationStatus = getCertificatesByValidationStatus;

// Export Admin Management Functions
exports.getUserRole = getUserRole;
exports.listUserRoles = listUserRoles;
exports.hasRole = hasRole;
exports.setSettings = setSettings;
exports.getSettings = getSettings;
exports.getSystemStats = getSystemStats;
exports.getUserServicesAndBookings = getUserServicesAndBookings;
exports.getUserServiceCount = getUserServiceCount;
exports.getAllUserLockStatuses = getAllUserLockStatuses;
exports.lockUserAccount = lockUserAccount;
exports.updateUserReputation = updateUserReputation;
exports.updateUserPhoneNumber = updateUserPhoneNumber;
exports.getValidatedCertificates = getValidatedCertificates;
exports.getRejectedCertificates = getRejectedCertificates;
exports.getServicesWithCertificates = getServicesWithCertificates;
exports.getPendingCertificateValidations = getPendingCertificateValidations;
exports.updateCertificateValidationStatus = updateCertificateValidationStatus;
exports.getBookingsData = getBookingsData;

// Export Scheduled Admin Functions
exports.autoReactivateSuspendedAccounts = autoReactivateSuspendedAccounts;

// Export Admin Authentication Helper
const {createAdminProfile} = require("./src/adminAuth");
exports.createAdminProfile = createAdminProfile;

// Export Admin Password Functions
const {
  changeAdminPassword,
  verifyAdminPassword,
  isAdminPasswordSet,
} = require("./src/admin");
exports.changeAdminPassword = changeAdminPassword;
exports.verifyAdminPassword = verifyAdminPassword;
exports.isAdminPasswordSet = isAdminPasswordSet;

// Export Contact Form Handler
const {sendContactEmail} = require("./sendContactEmail");
exports.sendContactEmail = sendContactEmail;
