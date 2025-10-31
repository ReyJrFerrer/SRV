const functions = require("firebase-functions");
const admin = require("firebase-admin");

const db = admin.firestore();

/**
 * Helper function to safely get user authentication info
 * @param {object} context - Firebase Functions context
 * @param {object} data - Request data
 * @return {object} User authentication info
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
 * Helper function to generate transaction ID
 * @return {string} Unique transaction ID
 */
function generateTransactionId() {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper function for safe subtraction
 * @param {number} a - Minuend
 * @param {number} b - Subtrahend
 * @return {number|null} Result or null if would be negative
 */
function safeSub(a, b) {
  if (a >= b) {
    return a - b;
  } else {
    return null;
  }
}

/**
 * Get balance for specific user
 * Cloud Function: getBalance
 */
exports.getBalance = functions.https.onCall(async (data, context) => {
  console.log("🚀 [getBalance] called");
  const safeDataForLog = {
    userId: data.data?.userId,
    auth: data.auth ? "Present" : "Missing",
  };
  console.log(
    "📦 [getBalance] Received payload:",
    JSON.stringify(safeDataForLog, null, 2),
  );
  // Extract payload from data.data first
  const payload = data.data.data || data;
  const {userId} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [getBalance] Auth info:", authInfo);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }


  // Validation
  if (!userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "userId is required",
    );
  }

  try {
    const walletDoc = await db.collection("wallets").doc(userId).get();

    if (!walletDoc.exists) {
      return {success: true, balance: 0, heldBalance: 0, availableBalance: 0};
    }

    const walletData = walletDoc.data();
    const balance = walletData.balance || 0;
    const heldBalance = walletData.heldBalance || 0;
    const availableBalance = balance - heldBalance;

    return {
      success: true,
      balance: balance,
      heldBalance: heldBalance,
      availableBalance: availableBalance,
    };
  } catch (error) {
    console.error("Error in getBalance:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Credit a user's balance
 * Cloud Function: creditBalance
 */
exports.creditBalance = functions.https.onCall(async (data, context) => {
  console.log("🚀 [creditBalance] called");
  const safeDataForLog = {
    userId: data.data?.userId,
    amount: data.data?.amount,
    paymentChannel: data.data?.paymentChannel,
    description: data.data?.description,
    auth: data.auth ? "Present" : "Missing",
  };
  console.log(
    "📦 [creditBalance] Received payload:",
    JSON.stringify(safeDataForLog, null, 2),
  );
  // Extract payload from data.data first
  const payload = data.data.data || data;
  console.log("Payload", payload);
  const {userId, amount, paymentChannel, description} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [creditBalance] Auth info:", authInfo);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }


  // Validation - mirror Motoko validation logic
  if (!userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "userId is required",
    );
  }

  if (!amount || amount <= 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid amount: Must be greater than 0",
    );
  }

  try {
    // Use Firestore transaction for atomic updates
    return await db.runTransaction(async (transaction) => {
      const walletRef = db.collection("wallets").doc(userId);
      const walletDoc = await transaction.get(walletRef);

      let currentBalance = 0;
      if (walletDoc.exists) {
        currentBalance = walletDoc.data().balance || 0;
      }

      const newBalance = currentBalance + amount;

      // Update wallet balance
      transaction.set(walletRef, {
        balance: newBalance,
        updatedAt: new Date().toISOString(),
      }, {merge: true});

      // Record transaction - mirror Motoko transaction recording logic
      const txId = generateTransactionId();
      const transactionData = {
        id: txId,
        from: null,
        to: userId,
        amount: amount,
        transaction_type: "Credit",
        timestamp: new Date().toISOString(),
        description: description || "Wallet Topup",
        payment_channel: paymentChannel || null,
        running_balance: newBalance,
      };

      const txRef = db.collection("transactions").doc(txId);
      transaction.set(txRef, transactionData);

      return {success: true, newBalance: newBalance, transactionId: txId};
    });
  } catch (error) {
    console.error("Error in creditBalance:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Internal function to hold a user's balance
 * Holds funds without creating a transaction (used for commission reservation)
 * @param {string} userId - User ID
 * @param {number} amount - Amount to hold
 * @param {string} holdReference - Reference for the hold (e.g., bookingId)
 * @param {string} reason - Reason for the hold
 * @return {Promise<Object>} Result object
 */
async function holdBalanceInternal(userId, amount, holdReference, reason) {
  console.log("🔒 Hold Balance Internal:", {userId, amount, holdReference, reason});

  // Validation
  if (!userId) {
    throw new Error("User ID is required");
  }

  if (!amount || amount <= 0) {
    throw new Error("Invalid amount: Must be greater than 0");
  }

  if (!holdReference) {
    throw new Error("Hold reference is required");
  }

  try {
    // Use Firestore transaction for atomic updates
    return await db.runTransaction(async (transaction) => {
      const walletRef = db.collection("wallets").doc(userId);
      const walletDoc = await transaction.get(walletRef);

      let currentBalance = 0;
      let currentHeldBalance = 0;
      let holds = [];

      if (walletDoc.exists) {
        const walletData = walletDoc.data();
        currentBalance = walletData.balance || 0;
        currentHeldBalance = walletData.heldBalance || 0;
        holds = walletData.holds || [];
      }

      // Calculate available balance (balance - already held amounts)
      const availableBalance = safeSub(currentBalance, currentHeldBalance);
      if (availableBalance === null || availableBalance < amount) {
        throw new Error(
          "Insufficient available balance: Cannot hold more than available balance",
        );
      }

      // Add new hold
      const newHold = {
        holdReference,
        amount,
        reason,
        createdAt: new Date().toISOString(),
      };

      holds.push(newHold);
      const newHeldBalance = currentHeldBalance + amount;

      // Update wallet with held balance
      transaction.set(walletRef, {
        balance: currentBalance, // Balance stays the same
        heldBalance: newHeldBalance,
        holds: holds,
        updatedAt: new Date().toISOString(),
      }, {merge: true});

      console.log(
        `✅ Hold successful for user ${userId}. ` +
        `Held: ${amount}, Total held: ${newHeldBalance}`,
      );
      return {
        success: true,
        heldAmount: amount,
        totalHeldBalance: newHeldBalance,
        availableBalance: currentBalance - newHeldBalance,
      };
    });
  } catch (error) {
    console.error("Error in holdBalanceInternal:", error);
    throw error;
  }
}

/**
 * Internal function to release a held balance
 * Releases held funds back to available balance without creating a transaction
 * @param {string} userId - User ID
 * @param {string} holdReference - Reference for the hold to release (e.g., bookingId)
 * @return {Promise<Object>} Result object
 */
async function releaseHoldInternal(userId, holdReference) {
  console.log("🔓 Release Hold Internal:", {userId, holdReference});

  // Validation
  if (!userId) {
    throw new Error("User ID is required");
  }

  if (!holdReference) {
    throw new Error("Hold reference is required");
  }

  try {
    // Use Firestore transaction for atomic updates
    return await db.runTransaction(async (transaction) => {
      const walletRef = db.collection("wallets").doc(userId);
      const walletDoc = await transaction.get(walletRef);

      if (!walletDoc.exists) {
        throw new Error("Wallet not found");
      }

      const walletData = walletDoc.data();
      const currentBalance = walletData.balance || 0;
      const currentHeldBalance = walletData.heldBalance || 0;
      const holds = walletData.holds || [];

      // Find and remove the hold
      const holdIndex = holds.findIndex((h) => h.holdReference === holdReference);
      if (holdIndex === -1) {
        throw new Error(`Hold not found for reference: ${holdReference}`);
      }

      const releasedHold = holds[holdIndex];
      holds.splice(holdIndex, 1);

      const newHeldBalance = Math.max(0, currentHeldBalance - releasedHold.amount);

      // Update wallet
      transaction.set(walletRef, {
        balance: currentBalance, // Balance stays the same
        heldBalance: newHeldBalance,
        holds: holds,
        updatedAt: new Date().toISOString(),
      }, {merge: true});

      console.log(
        `✅ Hold released for user ${userId}. ` +
        `Released: ${releasedHold.amount}, Total held: ${newHeldBalance}`,
      );
      return {
        success: true,
        releasedAmount: releasedHold.amount,
        totalHeldBalance: newHeldBalance,
        availableBalance: currentBalance - newHeldBalance,
      };
    });
  } catch (error) {
    console.error("Error in releaseHoldInternal:", error);
    throw error;
  }
}

/**
 * Internal function to convert a held balance to a debit
 * Converts held amount to actual debit with transaction record
 * @param {string} userId - User ID
 * @param {string} holdReference - Reference for the hold to convert (e.g., bookingId)
 * @param {string} description - Transaction description
 * @param {string} paymentChannel - Payment channel
 * @return {Promise<Object>} Result object
 */
async function convertHoldToDebitInternal(userId, holdReference, description, paymentChannel) {
  console.log(
    "💳 Convert Hold to Debit Internal:",
    {userId, holdReference, description, paymentChannel},
  );

  // Validation
  if (!userId) {
    throw new Error("User ID is required");
  }

  if (!holdReference) {
    throw new Error("Hold reference is required");
  }

  try {
    // Use Firestore transaction for atomic updates
    return await db.runTransaction(async (transaction) => {
      const walletRef = db.collection("wallets").doc(userId);
      const walletDoc = await transaction.get(walletRef);

      if (!walletDoc.exists) {
        throw new Error("Wallet not found");
      }

      const walletData = walletDoc.data();
      const currentBalance = walletData.balance || 0;
      const currentHeldBalance = walletData.heldBalance || 0;
      const holds = walletData.holds || [];

      // Find and remove the hold
      const holdIndex = holds.findIndex((h) => h.holdReference === holdReference);
      if (holdIndex === -1) {
        throw new Error(`Hold not found for reference: ${holdReference}`);
      }

      const holdToConvert = holds[holdIndex];
      const amount = holdToConvert.amount;
      holds.splice(holdIndex, 1);

      // Debit the balance
      const newBalance = safeSub(currentBalance, amount);
      if (newBalance === null) {
        throw new Error(
          "Insufficient balance: Cannot debit held amount",
        );
      }

      const newHeldBalance = Math.max(0, currentHeldBalance - amount);

      // Update wallet
      transaction.set(walletRef, {
        balance: newBalance,
        heldBalance: newHeldBalance,
        holds: holds,
        updatedAt: new Date().toISOString(),
      }, {merge: true});

      // Record transaction - now we create the transaction log
      const txId = generateTransactionId();
      const transactionData = {
        id: txId,
        from: userId,
        to: null,
        amount: amount,
        transaction_type: "Debit",
        timestamp: new Date().toISOString(),
        description: description || "Balance debited from held amount",
        payment_channel: paymentChannel || null,
        running_balance: newBalance,
        holdReference: holdReference,
      };

      const txRef = db.collection("transactions").doc(txId);
      transaction.set(txRef, transactionData);

      console.log(
        `✅ Hold converted to debit for user ${userId}. ` +
        `Amount: ${amount}, New balance: ${newBalance}`,
      );
      return {
        success: true,
        newBalance: newBalance,
        transactionId: txId,
        debitedAmount: amount,
      };
    });
  } catch (error) {
    console.error("Error in convertHoldToDebitInternal:", error);
    throw error;
  }
}

/**
 * Internal function to debit a user's balance
 * Can be called directly from other cloud functions
 * @param {string} userId - User ID
 * @param {number} amount - Amount to debit
 * @param {string} description - Transaction description
 * @param {string} paymentChannel - Payment channel
 * @return {Promise<Object>} Result object
 */
async function debitBalanceInternal(userId, amount, description, paymentChannel) {
  console.log("💸 Debit Balance Internal:", {userId, amount, description, paymentChannel});

  // Validation - mirror Motoko validation logic
  if (!userId) {
    throw new Error("User ID is required");
  }

  if (!amount || amount <= 0) {
    throw new Error("Invalid amount: Must be greater than 0");
  }

  try {
    // Use Firestore transaction for atomic updates
    return await db.runTransaction(async (transaction) => {
      const walletRef = db.collection("wallets").doc(userId);
      const walletDoc = await transaction.get(walletRef);

      let currentBalance = 0;
      if (walletDoc.exists) {
        currentBalance = walletDoc.data().balance || 0;
      }

      // Mirror Motoko safeSub logic
      const newBalance = safeSub(currentBalance, amount);
      if (newBalance === null) {
        throw new Error(
          "Insufficient balance: Cannot debit more than available balance",
        );
      }

      // Update wallet balance
      transaction.set(walletRef, {
        balance: newBalance,
        updatedAt: new Date().toISOString(),
      }, {merge: true});

      // Record transaction - mirror Motoko transaction recording logic
      const txId = generateTransactionId();
      const transactionData = {
        id: txId,
        from: userId,
        to: null,
        amount: amount,
        transaction_type: "Debit",
        timestamp: new Date().toISOString(),
        description: description || "Balance debited by system",
        payment_channel: paymentChannel || null,
        running_balance: newBalance,
      };

      const txRef = db.collection("transactions").doc(txId);
      transaction.set(txRef, transactionData);

      console.log(`✅ Debit successful for user ${userId}. New balance: ${newBalance}`);
      return {success: true, newBalance: newBalance, transactionId: txId};
    });
  } catch (error) {
    console.error("Error in debitBalanceInternal:", error);
    throw error;
  }
}

/**
 * Debit a user's balance
 * HTTP Cloud Function - can be called from client or other services via HTTP
 */
exports.debitBalance = functions.https.onCall(async (data, context) => {
  console.log("🚀 [debitBalance] called");
  const safeDataForLog = {
    userId: data.data?.userId,
    amount: data.data?.amount,
    description: data.data?.description,
    paymentChannel: data.data?.paymentChannel,
    auth: data.auth ? "Present" : "Missing",
  };
  console.log(
    "📦 [debitBalance] Received payload:",
    JSON.stringify(safeDataForLog, null, 2),
  );
  // Extract payload from data.data first
  const payload = data.data.data || data;
  const {userId, amount, description, paymentChannel} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [debitBalance] Auth info:", authInfo);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  try {
    const result = await debitBalanceInternal(userId, amount, description, paymentChannel);
    return result;
  } catch (error) {
    console.error("Error in debitBalance:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Internal function to credit a user's balance
 * Can be called directly from other cloud functions
 * @param {string} userId - User ID
 * @param {number} amount - Amount to credit (must be positive)
 * @param {string} paymentChannel - Payment channel (e.g., 'GCash', 'PayMaya')
 * @param {string} [description] - Transaction description
 * @return {Promise<Object>} Result object with success status and new balance
 */
async function creditWalletInternal(userId, amount, paymentChannel, description = "") {
  const logMessage = `💰 [creditWalletInternal] Crediting ${amount} to user ${userId}`;
  console.log(logMessage);

  // Input validation
  if (!userId) {
    throw new Error("User ID is required");
  }
  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }
  if (!paymentChannel) {
    throw new Error("Payment channel is required");
  }

  const db = admin.firestore();
  const walletRef = db.collection("wallets").doc(userId);

  try {
    return await db.runTransaction(async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      let currentBalance = 0;

      if (walletDoc.exists) {
        currentBalance = walletDoc.data().balance || 0;
      }

      const newBalance = currentBalance + amount;

      // Update wallet balance
      transaction.set(
        walletRef,
        {
          balance: newBalance,
          updatedAt: new Date().toISOString(),
        },
        {merge: true},
      );

      // Record transaction
      const txId = generateTransactionId();
      const transactionData = {
        id: txId,
        from: null, // System or payment provider
        to: userId,
        amount: amount,
        transaction_type: "Credit",
        timestamp: new Date().toISOString(),
        description: description || `Wallet top-up via ${paymentChannel}`,
        payment_channel: paymentChannel,
        running_balance: newBalance,
      };

      const txRef = db.collection("transactions").doc(txId);
      transaction.set(txRef, transactionData);

      console.log(`✅ Credit successful for user ${userId}. New balance: ${newBalance}`);
      return {success: true, newBalance, transactionId: txId};
    });
  } catch (error) {
    console.error("Error in creditWalletInternal:", error);
    throw error;
  }
}

// Export the internal function for use by other cloud functions
exports.debitBalanceInternal = debitBalanceInternal;
exports.holdBalanceInternal = holdBalanceInternal;
exports.releaseHoldInternal = releaseHoldInternal;
exports.convertHoldToDebitInternal = convertHoldToDebitInternal;
exports.creditWalletInternal = creditWalletInternal;

/**
 * Transfer funds between users
 * Cloud Function: transferFunds
 */
exports.transferFunds = functions.https.onCall(async (data, context) => {
  console.log("🚀 [transferFunds] called");
  const safeDataForLog = {
    fromUserId: data.data?.fromUserId,
    toUserId: data.data?.toUserId,
    amount: data.data?.amount,
    auth: data.auth ? "Present" : "Missing",
  };
  console.log(
    "📦 [transferFunds] Received payload:",
    JSON.stringify(safeDataForLog, null, 2),
  );
  // Extract payload from data.data first
  const payload = data.data.data || data;
  const {fromUserId, toUserId, amount} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [transferFunds] Auth info:", authInfo);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Validation - mirror Motoko validation logic
  if (!fromUserId || !toUserId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "fromUserId and toUserId are required",
    );
  }

  if (!amount || amount <= 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid amount: Must be greater than 0",
    );
  }

  if (fromUserId === toUserId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid transfer: Cannot transfer to the same account",
    );
  }

  try {
    // Use Firestore transaction for atomic updates
    return await db.runTransaction(async (transaction) => {
      const fromWalletRef = db.collection("wallets").doc(fromUserId);
      const toWalletRef = db.collection("wallets").doc(toUserId);

      const fromWalletDoc = await transaction.get(fromWalletRef);
      const toWalletDoc = await transaction.get(toWalletRef);

      // Get sender's balance
      let fromBalance = 0;
      if (fromWalletDoc.exists) {
        fromBalance = fromWalletDoc.data().balance || 0;
      }

      // Mirror Motoko safeSub logic
      const newFromBalance = safeSub(fromBalance, amount);
      if (newFromBalance === null) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Insufficient balance: Cannot transfer more than available balance",
        );
      }

      // Get receiver's balance
      let toBalance = 0;
      if (toWalletDoc.exists) {
        toBalance = toWalletDoc.data().balance || 0;
      }

      const newToBalance = toBalance + amount;

      // Update both wallet balances
      transaction.set(fromWalletRef, {
        balance: newFromBalance,
        updatedAt: new Date().toISOString(),
      }, {merge: true});

      transaction.set(toWalletRef, {
        balance: newToBalance,
        updatedAt: new Date().toISOString(),
      }, {merge: true});

      // Record transaction - mirror Motoko transaction recording logic
      const txId = generateTransactionId();
      const transactionData = {
        id: txId,
        from: fromUserId,
        to: toUserId,
        amount: amount,
        transaction_type: "Transfer",
        timestamp: new Date().toISOString(),
        description: "Transfer between users",
        payment_channel: null,
        running_balance: newFromBalance, // Use sender's new balance as reference
      };

      const txRef = db.collection("transactions").doc(txId);
      transaction.set(txRef, transactionData);

      return {success: true, transactionId: txId,
        newFromBalance: newFromBalance, newToBalance: newToBalance};
    });
  } catch (error) {
    console.error("Error in transferFunds:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get transaction history for a user
 * Cloud Function: getTransactionHistory
 */
exports.getTransactionHistory = functions.https.onCall(async (data, context) => {
  console.log("🚀 [getTransactionHistory] called");
  const safeDataForLog = {
    userId: data.data?.userId,
    auth: data.auth ? "Present" : "Missing",
  };
  console.log(
    "📦 [getTransactionHistory] Received payload:",
    JSON.stringify(safeDataForLog, null, 2),
  );
  // Extract payload from data.data first
  const payload = data.data.data || data;
  const {userId} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [getTransactionHistory] Auth info:", authInfo);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Validation
  if (!userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "userId is required",
    );
  }

  try {
    // Mirror Motoko logic: get all transactions where user is either sender or receiver
    const transactionsQuery1 = db.collection("transactions").where("from", "==", userId);
    const transactionsQuery2 = db.collection("transactions").where("to", "==", userId);

    const [fromSnapshot, toSnapshot] = await Promise.all([
      transactionsQuery1.get(),
      transactionsQuery2.get(),
    ]);

    const transactions = [];

    // Collect transactions where user is sender
    fromSnapshot.forEach((doc) => {
      transactions.push(doc.data());
    });

    // Collect transactions where user is receiver
    toSnapshot.forEach((doc) => {
      const txData = doc.data();
      // Avoid duplicates (though shouldn't happen with this logic)
      if (!transactions.some((tx) => tx.id === txData.id)) {
        transactions.push(txData);
      }
    });

    // Sort by timestamp (newest first)
    transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {success: true, transactions: transactions};
  } catch (error) {
    console.error("Error in getTransactionHistory:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Add authorized controller (Admin function)
 * Cloud Function: addAuthorizedController
 */
exports.addAuthorizedController = functions.https.onCall(async (data, context) => {
  console.log("🚀 [addAuthorizedController] called");
  const safeDataForLog = {
    userId: data.data?.userId,
    auth: data.auth ? "Present" : "Missing",
  };
  console.log(
    "📦 [addAuthorizedController] Received payload:",
    JSON.stringify(safeDataForLog, null, 2),
  );
  // Extract payload from data.data first
  const payload = data.data.data || data;
  const {userId} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [addAuthorizedController] Auth info:", authInfo);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only existing controllers can add new controllers",
    );
  }

  // Validation
  if (!userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "userId is required",
    );
  }

  try {
    // Check if user is already authorized
    const controllerDoc = await db.collection("authorized_controllers").doc(userId).get();

    if (controllerDoc.exists) {
      throw new functions.https.HttpsError(
        "already-exists",
        "Principal is already authorized",
      );
    }

    // Add to authorized controllers
    await db.collection("authorized_controllers").doc(userId).set({
      userId: userId,
      addedAt: new Date().toISOString(),
      addedBy: authInfo.uid,
    });

    return {success: true, message: "Controller added successfully"};
  } catch (error) {
    console.error("Error in addAuthorizedController:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Remove authorized controller (Admin function)
 * Cloud Function: removeAuthorizedController
 */
exports.removeAuthorizedController = functions.https.onCall(async (data, context) => {
  console.log("🚀 [removeAuthorizedController] called");
  const safeDataForLog = {
    userId: data.data?.userId,
    auth: data.auth ? "Present" : "Missing",
  };
  console.log(
    "📦 [removeAuthorizedController] Received payload:",
    JSON.stringify(safeDataForLog, null, 2),
  );
  // Extract payload from data.data first
  const payload = data.data.data || data;
  const {userId} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [removeAuthorizedController] Auth info:", authInfo);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only existing controllers can remove controllers",
    );
  }

  // Validation
  if (!userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "userId is required",
    );
  }

  try {
    // Check if user is in the authorized list
    const controllerDoc = await db.collection("authorized_controllers").doc(userId).get();

    if (!controllerDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Principal was not in the authorized list",
      );
    }

    // Remove from authorized controllers
    await db.collection("authorized_controllers").doc(userId).delete();

    return {success: true, message: "Controller removed successfully"};
  } catch (error) {
    console.error("Error in removeAuthorizedController:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get all authorized controllers (Admin function)
 * Cloud Function: getAuthorizedControllers
 */
exports.getAuthorizedControllers = functions.https.onCall(async (data, context) => {
  console.log("🚀 [getAuthorizedControllers] called");
  const safeDataForLog = {
    auth: data.auth ? "Present" : "Missing",
  };
  console.log(
    "📦 [getAuthorizedControllers] Received payload:",
    JSON.stringify(safeDataForLog, null, 2),
  );
  // Authentication
  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [getAuthorizedControllers] Auth info:", authInfo);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only authorized controllers can view controller list",
    );
  }

  try {
    const controllersSnapshot = await db.collection("authorized_controllers").get();

    const controllers = [];
    controllersSnapshot.forEach((doc) => {
      controllers.push(doc.data());
    });

    return {success: true, controllers: controllers};
  } catch (error) {
    console.error("Error in getAuthorizedControllers:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Release a held balance manually (Admin function)
 * Cloud Function: releaseHold
 * Used for dispute resolution or manual intervention
 */
exports.releaseHold = functions.https.onCall(async (data, context) => {
  console.log("🚀 [releaseHold] called");
  const safeDataForLog = {
    userId: data.data?.userId,
    holdReference: data.data?.holdReference,
    auth: data.auth ? "Present" : "Missing",
  };
  console.log(
    "📦 [releaseHold] Received payload:",
    JSON.stringify(safeDataForLog, null, 2),
  );
  // Extract payload from data.data first
  const payload = data.data.data || data;
  const {userId, holdReference} = payload;

  // Authentication - Admin only
  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [releaseHold] Auth info:", authInfo);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can manually release holds",
    );
  }

  // Validation
  if (!userId || !holdReference) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "userId and holdReference are required",
    );
  }

  try {
    const result = await releaseHoldInternal(userId, holdReference);
    return result;
  } catch (error) {
    console.error("Error in releaseHold:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get wallet details including holds (Admin function)
 * Cloud Function: getWalletDetails
 */
exports.getWalletDetails = functions.https.onCall(async (data, context) => {
  console.log("🚀 [getWalletDetails] called");
  const safeDataForLog = {
    userId: data.data?.userId,
    auth: data.auth ? "Present" : "Missing",
  };
  console.log(
    "📦 [getWalletDetails] Received payload:",
    JSON.stringify(safeDataForLog, null, 2),
  );
  // Extract payload from data.data first
  const payload = data.data.data || data;
  const {userId} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [getWalletDetails] Auth info:", authInfo);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Authorization - only the user or admin can view wallet details
  if (userId !== authInfo.uid && !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Not authorized to view this wallet",
    );
  }

  // Validation
  if (!userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "userId is required",
    );
  }

  try {
    const walletDoc = await db.collection("wallets").doc(userId).get();

    if (!walletDoc.exists) {
      return {
        success: true,
        balance: 0,
        heldBalance: 0,
        availableBalance: 0,
        holds: [],
      };
    }

    const walletData = walletDoc.data();
    const balance = walletData.balance || 0;
    const heldBalance = walletData.heldBalance || 0;
    const holds = walletData.holds || [];

    return {
      success: true,
      balance: balance,
      heldBalance: heldBalance,
      availableBalance: balance - heldBalance,
      holds: holds,
    };
  } catch (error) {
    console.error("Error in getWalletDetails:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
