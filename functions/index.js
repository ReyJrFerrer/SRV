/**
 * SRV Payment Integration Cloud Functions
 *
 * This file exports all the cloud functions for the SRV payment system
 * including Xendit integration for digital payments and wallet top-ups.
 */

const {setGlobalOptions} = require("firebase-functions");

// Set global options for all functions
setGlobalOptions({maxInstances: 10});

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

// Import Account Management functions
const {
  createProfile,
  getProfile,
  updateProfile,
  switchUserRole,
  getAllServiceProviders,
  getAllUsers,
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
  createServicePackage,
  getServicePackages,
  getPackage,
  updateServicePackage,
  deleteServicePackage,
  getCommissionQuote,
  updateServiceRating,
} = require("./src/service");

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

// Export Account Management functions
exports.createProfile = createProfile;
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.switchUserRole = switchUserRole;
exports.getAllServiceProviders = getAllServiceProviders;
exports.getAllUsers = getAllUsers;

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
exports.createServicePackage = createServicePackage;
exports.getServicePackages = getServicePackages;
exports.getPackage = getPackage;
exports.updateServicePackage = updateServicePackage;
exports.deleteServicePackage = deleteServicePackage;
exports.getCommissionQuote = getCommissionQuote;
exports.updateServiceRating = updateServiceRating;
