const functions = require("firebase-functions");
const {Xendit} = require("xendit-node");
const {admin} = require("./firebase-admin");
const {detectEnvironment} = require("./utils/canisterConfig");

// Initialize Xendit client with proper error handling
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
    console.log("Xendit client initialized successfully");
  }
} catch (error) {
  console.error("Failed to initialize Xendit client:", error);
  xendit = null;
}

/**
 * Cloud Function to create direct payment for booking
 * Generates a Xendit Invoice to collect payment from client
 * When paid, will trigger payout to provider's GCash
 */
exports.createDirectPayment = functions.https.onRequest(async (req, res) => {
  console.log("=== createDirectPayment function started ===");
  console.log("Request method:", req.method);
  console.log("Request body:", JSON.stringify(req.body, null, 2));

  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      console.log("Invalid method, returning 405");
      return res.status(405).json({error: "Method not allowed"});
    }

    // Enable CORS for local development
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      console.log("OPTIONS request, returning 200");
      return res.status(200).end();
    }

    console.log("Processing POST request...");
    const data = req.body.data || req.body;
    console.log("Extracted data:", JSON.stringify(data, null, 2));

    const {
      bookingId,
      clientId,
      providerId,
      packages, // Changed from amount to packages array
      serviceTitle,
      category,
      bookingData, // New: receive full booking data
    } = req.body.data;

    console.log("Extracted fields:", {
      bookingId,
      providerId,
      clientId,
      packages: packages ? packages.length : 0,
      serviceTitle,
      category,
    });

    // Validate required fields
    if (!bookingId || !providerId || !clientId) {
      console.log("Missing required fields");
      return res.status(400).json({
        error: "Missing required fields: bookingId, providerId, clientId",
      });
    }

    // Calculate totals from selected packages
    if (!packages || !Array.isArray(packages) || packages.length === 0) {
      console.log("No packages provided");
      return res.status(400).json({
        error: "At least one package must be selected",
      });
    }

    // Calculate amounts from packages
    const selectedPackages = packages.filter((pkg) => pkg.checked);
    if (selectedPackages.length === 0) {
      console.log("No packages selected");
      return res.status(400).json({
        error: "At least one package must be selected",
      });
    }

    const totalAmount = selectedPackages.reduce(
      (sum, pkg) => sum + (pkg.price || 0),
      0,
    );
    const totalCommission = selectedPackages.reduce(
      (sum, pkg) => sum + (pkg.commissionFee || 0),
      0,
    );
    const providerAmount = totalAmount; // Provider gets the base package price
    // Client pays base price + commission
    const clientPaymentAmount = totalAmount + totalCommission;

    console.log("Package calculation:", {
      selectedPackages: selectedPackages.length,
      totalAmount,
      totalCommission,
      providerAmount,
      clientPaymentAmount,
    });

    // Check if Xendit client is initialized
    if (!xendit) {
      console.log("Xendit client not initialized");
      return res.status(500).json({
        error: "Xendit client not initialized",
      });
    }

    console.log("Xendit client is ready, proceeding with provider lookup...");

    // Get provider's onboarding info from Firestore
    let providerData;
    try {
      console.log("Attempting to connect to Firestore...");
      console.log("Admin apps:", admin.apps.length);
      console.log("Functions emulator env:", process.env.FUNCTIONS_EMULATOR);
      console.log(
        "Firestore host:",
        admin.firestore()._settings?.host || "default",
      );

      const providerDoc = await admin
        .firestore()
        .collection("providers")
        .doc(providerId)
        .get();

      console.log("Firestore query completed, checking if provider exists...");
      if (!providerDoc.exists) {
        console.log(
          "Provider document not found in Firestore, checking Xendit directly...",
        );

        // Fallback: Check if provider exists in Xendit Customer API
        try {
          const {Customer} = xendit;
          const customerResponse = await Customer.getCustomerByReferenceID({
            referenceId: providerId,
          });

          let xenditCustomer = null;
          if (
            customerResponse &&
            customerResponse.data &&
            customerResponse.data.length > 0
          ) {
            xenditCustomer = customerResponse.data[0];
          } else if (customerResponse && customerResponse.id) {
            xenditCustomer = customerResponse;
          }

          if (!xenditCustomer) {
            console.log("Provider not found in Xendit either");
            return res.status(404).json({
              error: "Provider not found or not onboarded for payments",
            });
          }

          console.log("Provider found in Xendit:", xenditCustomer.id);

          // Create a temporary provider data structure from Xendit data
          providerData = {
            xenditCustomerId: xenditCustomer.id,
            xenditReferenceId: xenditCustomer.referenceId,
            payoutInfo: {
              gcashNumber: xenditCustomer.metadata?.gcash_number || "Unknown",
              accountHolderName:
                xenditCustomer.metadata?.gcash_name ||
                `${xenditCustomer.individualDetail?.givenNames || "Provider"} ${
                  xenditCustomer.individualDetail?.surname || ""
                }`.trim(),
              channelCode: "PH_GCASH",
            },
            // Set defaults for missing data
            businessName:
              xenditCustomer.metadata?.business_name || "Provider Business",
            email: xenditCustomer.email || "provider@srv.com",
            mobileNumber: xenditCustomer.mobileNumber || "09000000000",
          };

          console.log(
            "Created temporary provider data from Xendit:",
            JSON.stringify(providerData, null, 2),
          );
        } catch (xenditError) {
          console.error("Error checking Xendit for provider:", xenditError);
          return res.status(404).json({
            error: "Provider not found or not onboarded for payments",
          });
        }
      } else {
        providerData = providerDoc.data();
        console.log(
          "Provider data retrieved from Firestore:",
          JSON.stringify(providerData, null, 2),
        );
      }

      if (!providerData.xenditCustomerId || !providerData.payoutInfo) {
        console.log("Provider not properly onboarded");
        return res.status(400).json({
          error: "Provider not properly onboarded for direct payments",
        });
      }
    } catch (firestoreError) {
      console.error("=== Firestore Error ===");
      console.error("Error fetching provider data:", firestoreError);
      console.error("Error code:", firestoreError.code);
      console.error("Error message:", firestoreError.message);
      return res.status(500).json({
        result: {
          success: false,
          error: "Failed to fetch provider data from Firestore",
          details: firestoreError.message,
        },
      });
    }

    // Get client info if available
    let clientData;
    try {
      const clientDoc = await admin
        .firestore()
        .collection("users")
        .doc(clientId)
        .get();

      clientData = clientDoc.exists ? clientDoc.data() : {};
    } catch (error) {
      console.warn("Could not fetch client data:", error);
      clientData = {};
    }

    // Use package-based commission calculation (packages contain pre-calculated commission fees)
    console.log("Using package-based commission calculation...");

    const commissionAmount = Number(totalCommission);
    const categoryStr =
      packages.length > 0 && packages[0].category ?
        typeof packages[0].category === "object" ?
          JSON.stringify(packages[0].category) :
          String(packages[0].category) :
        "General";

    // Create commission breakdown from packages for metadata
    const commissionBreakdown = {
      packages: selectedPackages.map((pkg) => ({
        title: pkg.title, // Changed from name to title
        price: pkg.price,
        commissionFee: pkg.commissionFee,
        commissionRate: pkg.commissionFee ?
          (pkg.commissionFee / pkg.price) * 100 :
          0,
      })),
      totalPackagePrice: totalAmount,
      totalCommissionFee: totalCommission,
      totalClientPayment: clientPaymentAmount,
    };

    // Define payment methods for the invoice
    const paymentMethods = ["GCASH", "PAYMAYA", "GRABPAY"];

    // Create invoice to collect payment from client with payment holding logic
    const {Invoice} = xendit;
    const currentEnvironment = detectEnvironment();

    const invoiceData = {
      externalId: `booking-${bookingId}-${Date.now()}`,
      amount: Number(clientPaymentAmount), // Convert to regular number for Xendit
      description: serviceTitle || `Payment for booking ${bookingId}`,
      invoiceDuration: 86400, // 24 hours expiry for booking payments
      currency: "PHP",
      reminderTime: 1,
      customer: {
        givenNames: (clientData.name || "Client").split(" ")[0] || "Client",
        surname:
          (clientData.name || "Client").split(" ").slice(1).join(" ") || "User",
        email: clientData.email || "client@srv.com",
        mobileNumber: clientData.phoneNumber || "09000000000",
      },
      customerNotificationPreference: {
        invoiceCreated: ["whatsapp", "sms"],
        invoiceReminder: ["whatsapp", "sms"],
        invoicePaid: ["whatsapp", "sms"],
        invoiceExpired: ["whatsapp", "sms"],
      },
      paymentMethods: paymentMethods,
      fees: [
        {
          type: "SRV_COMMISSION",
          value: Number(commissionAmount), // Convert to regular number for Xendit
        },
      ],
      metadata: {
        bookingId: bookingId,
        providerId: providerId,
        clientId: clientId,
        providerAmount: Number(providerAmount), // Convert to regular number
        commissionAmount: Number(commissionAmount), // Convert to regular number
        serviceTitle: serviceTitle,
        category: categoryStr,
        environment: currentEnvironment,
        paymentHoldEnabled: true, // Enable payment holding until booking completion
        autoPayoutEnabled: false, // Disable auto payout, use holding mechanism
        commissionCalculation: {
          method: "package-based",
          breakdown: commissionBreakdown,
          calculated_at: new Date().toISOString(),
        },
        payoutInfo: {
          xenditCustomerId: providerData.xenditCustomerId,
          gcashNumber: providerData.payoutInfo.gcashNumber,
          accountHolderName: providerData.payoutInfo.accountHolderName,
        },
        paymentStatus: "pending", // Track payment status progression
        timestamps: {
          created: new Date().toISOString(),
        },
        selectedPackages: selectedPackages, // Store package details
      },
    };

    console.log("Creating Xendit invoice with data:", invoiceData);
    let invoice;
    try {
      invoice = await Invoice.createInvoice({
        data: invoiceData,
      });
      console.log("Xendit invoice created:", invoice.id);
    } catch (xenditError) {
      console.error("Xendit invoice creation error:", xenditError);
      console.error(
        "Error response:",
        xenditError.response && xenditError.response.data,
      );

      // Check if it's a permission error and we're in development
      if (xenditError.status === 403 && process.env.FUNCTIONS_EMULATOR) {
        console.log(
          "Permission error in development mode, creating mock invoice...",
        );

        // Create a mock invoice for development
        invoice = {
          id: `invoice_mock_${Date.now()}`,
          externalId: invoiceData.externalId,
          amount: invoiceData.amount,
          invoiceUrl: `https://checkout.xendit.co/web/mock-${Date.now()}`,
          expiryDate: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
          status: "PENDING",
          currency: "PHP",
          description: invoiceData.description,
          created: new Date().toISOString(),
        };

        console.log("Mock invoice created for development:", invoice.id);
      } else {
        return res.status(500).json({
          error: "Failed to create payment invoice",
          details: xenditError.message,
          validation_errors:
            (xenditError.response &&
              xenditError.response.data &&
              xenditError.response.data.errors) ||
            [],
        });
      }
    }

    // Store payment data in Firestore for tracking with payment holding logic
    const paymentData = {
      bookingId,
      providerId,
      clientId,
      invoiceId: invoice.id,
      externalId: invoiceData.externalId,
      amount: Number(clientPaymentAmount), // Total amount client pays
      providerAmount: Number(providerAmount), // Amount provider receives
      commissionAmount: Number(commissionAmount), // Commission SRV takes
      status: "PENDING", // Payment status: PENDING → PAID → HELD → RELEASED → COMPLETED
      paymentStatus: "pending", // Detailed payment tracking
      paymentHoldEnabled: true,
      environment: currentEnvironment,
      createdAt: new Date().toISOString(),
      xenditData: {
        invoiceUrl: invoice.invoiceUrl,
        expiryDate: invoice.expiryDate,
      },
      commission: {
        calculation_method: "package-based",
        breakdown: commissionBreakdown,
        tier: commissionBreakdown?.tier || "unknown",
        base_fee: commissionBreakdown?.base_fee || 0,
      },
      statusHistory: [
        {
          status: "pending",
          timestamp: new Date().toISOString(),
          description: "Payment invoice created and waiting for client payment",
        },
      ],
      // Add booking data if provided
      ...(bookingData && {
        serviceId: bookingData.serviceId,
        serviceTitle: bookingData.serviceName || serviceTitle,
        packages: bookingData.packages,
        bookingType: bookingData.bookingType,
        scheduledDate: bookingData.scheduledDate ?
          typeof bookingData.scheduledDate === "string" ?
            bookingData.scheduledDate :
            new Date(bookingData.scheduledDate).toISOString() :
          null,
        scheduledTime: bookingData.scheduledTime,
        location: bookingData.location,
        notes: bookingData.notes,
        amountToPay: bookingData.amountToPay,
        paymentMethod: bookingData.paymentMethod,
      }),
    };

    try {
      await admin
        .firestore()
        .collection("payments")
        .doc(invoice.id)
        .set(paymentData);
      console.log("Payment data saved to Firestore successfully");
    } catch (firestoreError) {
      console.error("Error saving payment to Firestore:", firestoreError);
      // Continue with success response even if Firestore fails
      // since the invoice was created successfully
    }

    // Log successful invoice creation with commission details
    console.log(
      `Enhanced invoice ${invoice.id} created for booking ${bookingId}`,
      {
        amount: `₱${clientPaymentAmount}`,
        commission: `₱${commissionAmount}`,
        providerAmount: `₱${providerAmount}`,
        method: "package-based",
        environment: currentEnvironment,
        paymentHolding: true,
      },
    );

    return res.status(200).json({
      result: {
        success: true,
        invoiceId: invoice.id,
        invoiceUrl: invoice.invoiceUrl,
        externalId: invoiceData.externalId,
        amount: clientPaymentAmount,
        providerAmount: providerAmount,
        commissionAmount: commissionAmount,
        expiryDate: invoice.expiryDate,
        paymentMethods: paymentMethods,
        paymentHolding: {
          enabled: true,
          description: "Payment will be held until booking completion",
          statusFlow: "pending → paid → held → released → completed",
        },
        commission: {
          calculation_method: "package-based",
          breakdown_available: !!commissionBreakdown,
          tier: commissionBreakdown?.tier || "calculated",
        },
        environment: currentEnvironment,
      },
    });
  } catch (error) {
    console.error("=== Error in createDirectPayment ===");
    console.error("Error details:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    // Handle Xendit API errors
    if (
      error.response &&
      error.response.data &&
      error.response.data.error_code
    ) {
      console.error("Xendit API error:", error.response.data);
      return res.status(400).json({
        result: {
          success: false,
          error: `Xendit error: ${error.response.data.message}`,
          error_type: "xendit_api_error",
        },
      });
    }

    // Handle commission calculation errors
    if (error.message && error.message.includes("commission")) {
      console.error("Commission calculation error:", error);
      return res.status(500).json({
        result: {
          success: false,
          error: "Commission calculation failed",
          error_type: "commission_error",
          details: error.message,
        },
      });
    }

    // Handle canister connection errors
    if (
      error.message &&
      (error.message.includes("canister") || error.message.includes("agent"))
    ) {
      console.error("Canister connection error:", error);
      return res.status(503).json({
        result: {
          success: false,
          error: "Canister service temporarily unavailable",
          error_type: "canister_connection_error",
          details: error.message,
        },
      });
    }

    // Handle other errors
    console.error("Returning 500 error for unknown error type");
    return res.status(500).json({
      result: {
        success: false,
        error: `Failed to create direct payment: ${error.message}`,
        error_type: "unknown_error",
      },
    });
  }
});
