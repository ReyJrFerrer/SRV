const {onCall} = require("firebase-functions/v2/https");
const {Xendit} = require("xendit-node");
const admin = require("firebase-admin");
const {creditWalletInternal} = require("./src/wallet");

// Initialize Xendit client
let xendit;
try {
  const secretKey = process.env.XENDIT_SECRET_KEY;

  if (!secretKey) {
    console.warn("Xendit secret key not found in environment variables");
    xendit = null;
  } else {
    xendit = new Xendit({
      secretKey: secretKey,
    });
    console.log(
      "Xendit client initialized successfully for invoice status check",
    );
  }
} catch (error) {
  console.error("Failed to initialize Xendit client:", error);
  xendit = null;
}

// Ensure Firebase Admin is initialized
if (admin.apps.length === 0) {
  // Check if we're in the emulator environment
  if (process.env.FUNCTIONS_EMULATOR) {
    console.log("Running in emulator mode");
    admin.initializeApp({
      projectId: "srve-7133d",
    });

    // Set Firestore emulator settings
    const db = admin.firestore();
    db.settings({
      host: "127.0.0.1:8080",
      ssl: false,
    });
  } else {
    admin.initializeApp();
  }
}

/**
 * Check the status of a Xendit invoice
 * This function fetches the current status of an invoice from Xendit
 */
exports.checkInvoiceStatus = onCall(async (request) => {
  console.log("=== checkInvoiceStatus function started ===");
  console.log("Request data:", request.data);

  try {
    const {invoiceId} = request.data;

    if (!invoiceId) {
      throw new Error("Invoice ID is required");
    }

    console.log(`Checking status for invoice: ${invoiceId}`);

    // Check if Xendit client is initialized
    if (!xendit) {
      console.log(
        "Xendit client not initialized, checking Firestore for cached status",
      );

      // Fallback: Check Firestore for payment status
      const db = admin.firestore();
      const paymentDoc = await db.collection("payments").doc(invoiceId).get();

      if (!paymentDoc.exists) {
        throw new Error("Invoice not found");
      }

      const paymentData = paymentDoc.data();

      // Check if payment is completed and needs crediting
      if (
        (paymentData.status === "PAID" || paymentData.status === "SETTLED") &&
        !paymentData.credited
      ) {
        try {
          const providerId = paymentData.providerId;
          const amount = paymentData.amount;
          const paymentChannel = paymentData.paymentChannel || "GCash";
          const description = `Wallet Topup. Transfer from ${paymentChannel}`;

          console.log(
            `Auto-crediting wallet (Firestore) for provider ${providerId}: ₱${amount}`,
          );

          await creditWalletInternal(
            providerId,
            amount,
            paymentChannel,
            description,
          );

          await db.collection("payments").doc(invoiceId).update({
            credited: true,
            creditedAt: new Date().toISOString(),
          });

          console.log(`Wallet credited successfully for invoice ${invoiceId}`);

          return {
            success: true,
            status: paymentData.status || "PENDING",
            invoiceId: invoiceId,
            amount: paymentData.amount,
            paymentChannel: paymentChannel,
            credited: true,
            source: "firestore_cache",
          };
        } catch (creditError) {
          console.error(`Failed to credit wallet:`, creditError);
          return {
            success: true,
            status: paymentData.status || "PENDING",
            invoiceId: invoiceId,
            amount: paymentData.amount,
            paymentChannel: paymentData.paymentChannel || "GCash",
            credited: false,
            creditError: creditError.message,
            source: "firestore_cache",
          };
        }
      }

      return {
        success: true,
        status: paymentData.status || "PENDING",
        invoiceId: invoiceId,
        amount: paymentData.amount,
        paymentChannel: paymentData.paymentChannel || "GCash",
        credited: paymentData.credited || false,
        source: "firestore_cache",
      };
    }

    // Check if this is a mock invoice (development mode)
    if (invoiceId.startsWith("invoice_mock_")) {
      console.log("Mock invoice detected, simulating status check");

      // For development, we can simulate different statuses
      // In a real scenario, this would be "PAID" after webhook processing
      const db = admin.firestore();
      const paymentDoc = await db.collection("payments").doc(invoiceId).get();

      if (paymentDoc.exists) {
        const paymentData = paymentDoc.data();

        // Check if payment is completed and needs crediting
        if (
          (paymentData.status === "PAID" || paymentData.status === "SETTLED") &&
          !paymentData.credited
        ) {
          try {
            const providerId = paymentData.providerId;
            const amount = paymentData.amount;
            const paymentChannel = paymentData.paymentChannel || "GCash";
            const description = `Wallet Topup. Transfer from ${paymentChannel}`;

            console.log(
              `Auto-crediting wallet (Mock) for provider ${providerId}: ₱${amount}`,
            );

            await creditWalletInternal(
              providerId,
              amount,
              paymentChannel,
              description,
            );

            await db.collection("payments").doc(invoiceId).update({
              credited: true,
              creditedAt: new Date().toISOString(),
            });

            console.log(`Wallet credited successfully for mock invoice ${invoiceId}`);

            return {
              success: true,
              status: paymentData.status || "PENDING",
              invoiceId: invoiceId,
              amount: paymentData.amount,
              paymentChannel: paymentChannel,
              credited: true,
              source: "mock_development",
            };
          } catch (creditError) {
            console.error(`Failed to credit wallet:`, creditError);
            return {
              success: true,
              status: paymentData.status || "PENDING",
              invoiceId: invoiceId,
              amount: paymentData.amount,
              paymentChannel: paymentData.paymentChannel || "GCash",
              credited: false,
              creditError: creditError.message,
              source: "mock_development",
            };
          }
        }

        return {
          success: true,
          status: paymentData.status || "PENDING",
          invoiceId: invoiceId,
          amount: paymentData.amount,
          paymentChannel: paymentData.paymentChannel || "GCash",
          credited: paymentData.credited || false,
          source: "mock_development",
        };
      }
    }

    // Fetch invoice status from Xendit
    const {Invoice} = xendit;
    let invoice;

    try {
      invoice = await Invoice.getInvoiceById({
        invoiceId: invoiceId,
      });

      console.log(`Invoice status fetched: ${invoice.status}`);
    } catch (xenditError) {
      console.error("Error fetching invoice from Xendit:", xenditError);

      // Fallback to Firestore if Xendit fails
      const db = admin.firestore();
      const paymentDoc = await db.collection("payments").doc(invoiceId).get();

      if (!paymentDoc.exists) {
        throw new Error("Invoice not found in Xendit or Firestore");
      }

      const paymentData = paymentDoc.data();
      return {
        success: true,
        status: paymentData.status || "PENDING",
        invoiceId: invoiceId,
        amount: paymentData.amount,
        paymentChannel: paymentData.paymentChannel || "GCash",
        credited: paymentData.credited || false,
        source: "firestore_fallback",
      };
    }

    // Get the payment document from Firestore
    const db = admin.firestore();
    const paymentDoc = await db.collection("payments").doc(invoiceId).get();

    console.log(`Payment document exists: ${paymentDoc.exists}`);

    // Check if payment is completed and needs crediting
    if (invoice.status === "PAID" || invoice.status === "SETTLED") {
      console.log(`Invoice is ${invoice.status}, checking credit status...`);

      const paymentData = paymentDoc.exists ? paymentDoc.data() : null;
      const alreadyCredited = paymentData?.credited || false;

      console.log(`Already credited: ${alreadyCredited}`);

      // Only credit if not already credited
      if (!alreadyCredited) {
        try {
          // Extract provider ID from invoice external_id or payment document
          let providerId;

          if (paymentData?.providerId) {
            providerId = paymentData.providerId;
          } else if (invoice.externalId) {
            // External ID format: "topup-{providerId}-{timestamp}"
            // Provider ID format: "xqlpe-iic6h-...principal...-eae"
            // Example: "topup-xqlpe-iic6h-...-fqtip-eae-1761984255991"

            // Remove "topup-" prefix
            const withoutPrefix = invoice.externalId.replace(/^topup-/, "");

            // Split by hyphen and remove the last part (timestamp)
            const parts = withoutPrefix.split("-");

            // The timestamp is the last part (numeric), everything else is the provider ID
            if (parts.length > 1) {
              // Remove the last part (timestamp) and rejoin with hyphens
              const lastPart = parts[parts.length - 1];

              // Check if the last part is a timestamp (all digits)
              if (/^\d+$/.test(lastPart)) {
                providerId = parts.slice(0, -1).join("-");
              } else {
                // If no timestamp found, use the whole string
                providerId = withoutPrefix;
              }
            }
          }

          if (!providerId) {
            const errorMsg =
              `Cannot determine provider ID for invoice ${invoiceId}. ` +
              `Payment doc: ${paymentDoc.exists}, ` +
              `External ID: ${invoice.externalId}`;
            throw new Error(errorMsg);
          }

          console.log(`🔑 Extracted provider ID: ${providerId}`);

          const amount = invoice.paidAmount || invoice.amount;
          const paymentChannel = invoice.paymentChannel || "GCash";
          const description = `Wallet Topup. Transfer from ${paymentChannel}`;

          console.log(
            `Auto-crediting wallet for provider ${providerId}: ₱${amount}`,
          );

          // Credit the wallet using the internal function
          await creditWalletInternal(
            providerId,
            amount,
            paymentChannel,
            description,
          );

          // Update or create the payment document with credited status
          const paymentUpdateData = {
            credited: true,
            creditedAt: new Date().toISOString(),
            status: invoice.status,
            amount: amount,
            paymentChannel: paymentChannel,
            providerId: providerId,
          };

          if (paymentDoc.exists) {
            await db.collection("payments").doc(invoiceId).update(paymentUpdateData);
          } else {
            await db.collection("payments").doc(invoiceId).set({
              ...paymentUpdateData,
              createdAt: new Date().toISOString(),
              invoiceId: invoiceId,
            });
          }

          console.log(`Wallet credited successfully for invoice ${invoiceId}`);

          return {
            success: true,
            status: invoice.status,
            invoiceId: invoiceId,
            amount: invoice.amount,
            paidAmount: amount,
            expiryDate: invoice.expiryDate,
            paidAt: invoice.paidAt,
            paymentChannel: paymentChannel,
            paymentMethod: invoice.paymentMethod,
            credited: true,
            source: "xendit_api",
          };
        } catch (creditError) {
          console.error(
            `Failed to credit wallet for invoice ${invoiceId}:`,
            creditError,
          );
          // Return status but indicate credit failed
          return {
            success: true,
            status: invoice.status,
            invoiceId: invoiceId,
            amount: invoice.amount,
            paidAmount: invoice.paidAmount || invoice.amount,
            expiryDate: invoice.expiryDate,
            paidAt: invoice.paidAt,
            paymentChannel: invoice.paymentChannel || "GCash",
            paymentMethod: invoice.paymentMethod,
            credited: false,
            creditError: creditError.message,
            source: "xendit_api",
          };
        }
      } else {
        console.log(`Invoice ${invoiceId} already credited, skipping`);
        return {
          success: true,
          status: invoice.status,
          invoiceId: invoiceId,
          amount: invoice.amount,
          paidAmount: invoice.paidAmount || invoice.amount,
          expiryDate: invoice.expiryDate,
          paidAt: invoice.paidAt,
          paymentChannel: invoice.paymentChannel || "GCash",
          paymentMethod: invoice.paymentMethod,
          credited: true,
          alreadyCredited: true,
          source: "xendit_api",
        };
      }
    }

    return {
      success: true,
      status: invoice.status,
      invoiceId: invoiceId,
      amount: invoice.amount,
      paidAmount: invoice.paidAmount || invoice.amount,
      expiryDate: invoice.expiryDate,
      paidAt: invoice.paidAt,
      paymentChannel: invoice.paymentChannel || "GCash", // Default to GCash for Xendit payments
      paymentMethod: invoice.paymentMethod,
      credited: false,
      source: "xendit_api",
    };
  } catch (error) {
    console.error("Error checking invoice status:", error);
    throw new Error(error.message || "Internal server error");
  }
});

