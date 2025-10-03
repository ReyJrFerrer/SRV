/**
 * SRV Payment Integration Cloud Functions
 *
 * This file exports all the cloud functions for the SRV payment system
 * including Xendit integration for digital payments and wallet top-ups.
 */

const { setGlobalOptions } = require("firebase-functions");

// Set global options for all functions
setGlobalOptions({ maxInstances: 10 });

// Import and export all payment-related functions
const { onboardProvider } = require("./onboardProvider");
const { createDirectPayment } = require("./createDirectPayment");
const { createTopupInvoice } = require("./createTopupInvoice");
const { xenditWebhook } = require("./xenditWebhook");
const { checkProviderOnboarding } = require("./checkProviderOnboarding");
const { getPaymentData } = require("./getPaymentData");
const { checkInvoiceStatus } = require("./checkInvoiceStatus");
const { releaseHeldPayment } = require("./releaseHeldPayment");

// Export all functions
exports.onboardProvider = onboardProvider;
exports.createDirectPayment = createDirectPayment;
exports.createTopupInvoice = createTopupInvoice;
exports.xenditWebhook = xenditWebhook;
exports.checkProviderOnboarding = checkProviderOnboarding;
exports.getPaymentData = getPaymentData;
exports.checkInvoiceStatus = checkInvoiceStatus;
exports.releaseHeldPayment = releaseHeldPayment;
