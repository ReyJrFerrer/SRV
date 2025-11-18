import { callFirebaseFunction, requireAuth } from "./coreUtils";
import { AdminServiceError } from "./serviceTypes";

// Get services with certificates for validation
export const getServicesWithCertificates = async (): Promise<any[]> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction(
      "getServicesWithCertificates",
      {},
    );

    return result || [];
  } catch (error) {
    console.error("Error fetching services with certificates", error);
    throw new Error(`Failed to fetch services with certificates: ${error}`);
  }
};

// Certificate validation functions
export const getPendingCertificateValidations = async (): Promise<any[]> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction(
      "getPendingCertificateValidations",
      {},
    );

    return result || [];
  } catch (error) {
    console.error("Error fetching certificate validations", error);
    throw new Error(`Failed to fetch certificate validations: ${error}`);
  }
};

export const validateCertificate = async (
  validationId: string,
  approved: boolean,
  reason?: string,
): Promise<string> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction("validateCertificate", {
      certificateId: validationId,
      approved,
      reason: reason || null,
    });

    return result.message || "Certificate validation updated successfully";
  } catch (error) {
    console.error("Error validating certificate", error);
    throw new Error(`Failed to validate certificate: ${error}`);
  }
};

// Update certificate validation status
export const updateCertificateValidationStatus = async (
  certificateId: string,
  status: "Validated" | "Rejected" | "Pending",
  reason?: string,
): Promise<any> => {
  try {
    requireAuth();

    // Validate certificateId is provided
    if (!certificateId || certificateId.trim() === "") {
      throw new AdminServiceError({
        message: "Certificate ID (mediaId) is required",
        code: "INVALID_CERTIFICATE_ID",
      } as AdminServiceError);
    }

    const payload = {
      certificateId: certificateId.trim(),
      status,
      reason: reason || undefined,
    };

    const result = await callFirebaseFunction(
      "updateCertificateValidationStatus",
      payload,
    );
    return result || `Certificate ${status.toLowerCase()} successfully`;
  } catch (error) {
    console.error("Error updating certificate validation status", error);
    throw new AdminServiceError({
      message: `Failed to update certificate validation status: ${error}`,
      code: "CERTIFICATE_STATUS_UPDATE_ERROR",
    } as AdminServiceError);
  }
};

// Get validated certificates
export const getValidatedCertificates = async (): Promise<any[]> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction("getValidatedCertificates", {});
    return result || [];
  } catch (error) {
    console.error("Error fetching validated certificates", error);
    return [];
  }
};

// Get rejected certificates
export const getRejectedCertificates = async (): Promise<any[]> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction("getRejectedCertificates", {});
    return result || [];
  } catch (error) {
    console.error("Error fetching rejected certificates", error);
    return [];
  }
};
