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
  addCategory,
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
} = require("./src/service");

const {
  createBooking,
  acceptBooking,
  declineBooking,
  startBooking,
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
  releasePayment,
} = require("./src/booking");

// Import Wallet Management functions
const {
  getBalance,
  creditBalance,
  debitBalance,
  transferFunds,
  getTransactionHistory,
  addAuthorizedController,
  removeAuthorizedController,
  getAuthorizedControllers,
} = require("./src/wallet");

// Import Review Management functions
const {
  submitReview,
  getReview,
  getBookingReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  calculateProviderRating,
  calculateServiceRating,
  calculateUserAverageRating,
  getAllReviews,
  getReviewStatistics,
  flagReview,
  getProviderReviews,
  getServiceReviews,
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
  createConversation,
  sendMessage,
  getMyConversations,
  getConversationMessages,
  markMessagesAsRead,
  getConversation,
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
  cleanupNotificationFrequency,
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
  getRemittanceMediaItems,
  updateCertificateValidationStatus,
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
exports.addCategory = addCategory;
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

// Export Booking Management Functions
exports.createBooking = createBooking;
exports.acceptBooking = acceptBooking;
exports.declineBooking = declineBooking;
exports.startBooking = startBooking;
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
exports.releasePayment = releasePayment;

// Export Wallet Management Functions
exports.getBalance = getBalance;
exports.creditBalance = creditBalance;
exports.debitBalance = debitBalance;
exports.transferFunds = transferFunds;
exports.getTransactionHistory = getTransactionHistory;
exports.addAuthorizedController = addAuthorizedController;
exports.removeAuthorizedController = removeAuthorizedController;
exports.getAuthorizedControllers = getAuthorizedControllers;

// Export Review Management Functions
exports.submitReview = submitReview;
exports.getReview = getReview;
exports.getBookingReviews = getBookingReviews;
exports.getUserReviews = getUserReviews;
exports.updateReview = updateReview;
exports.deleteReview = deleteReview;
exports.calculateProviderRating = calculateProviderRating;
exports.calculateServiceRating = calculateServiceRating;
exports.calculateUserAverageRating = calculateUserAverageRating;
exports.getAllReviews = getAllReviews;
exports.getReviewStatistics = getReviewStatistics;
exports.flagReview = flagReview;
exports.getProviderReviews = getProviderReviews;
exports.getServiceReviews = getServiceReviews;

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
exports.createConversation = createConversation;
exports.sendMessage = sendMessage;
exports.getMyConversations = getMyConversations;
exports.getConversationMessages = getConversationMessages;
exports.markMessagesAsRead = markMessagesAsRead;
exports.getConversation = getConversation;

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
exports.cleanupNotificationFrequency = cleanupNotificationFrequency;

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
exports.getRemittanceMediaItems = getRemittanceMediaItems;
exports.updateCertificateValidationStatus = updateCertificateValidationStatus;
exports.getCertificatesByValidationStatus = getCertificatesByValidationStatus;

