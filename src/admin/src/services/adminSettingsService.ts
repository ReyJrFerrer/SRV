import { callFirebaseFunction, requireAuth } from "./coreUtils";
import { AdminServiceError } from "./serviceTypes";

export interface FrontendSystemSettings {
  restrictNewAdminLogins: boolean;
  updatedAt: Date;
  updatedBy: string;
}

export const getSettings = async (): Promise<FrontendSystemSettings> => {
  try {
    requireAuth();

    const settingsData = await callFirebaseFunction("adminUserAction", {
      action: "getSettings",
      payload: {},
    }) as FrontendSystemSettings;

    if (settingsData && settingsData.updatedAt) {
      settingsData.updatedAt = new Date(settingsData.updatedAt as any);
    }

    return settingsData;
  } catch (error) {
    if (error instanceof AdminServiceError) throw error;
    throw new AdminServiceError({
      message: `Failed to get settings: ${error}`,
      code: "GET_SETTINGS_ERROR",
      details: error,
    } as AdminServiceError);
  }
};

export const setSettings = async (
  settings: FrontendSystemSettings,
): Promise<void> => {
  try {
    requireAuth();

    await callFirebaseFunction("adminUserAction", {
      action: "setSettings",
      payload: {
        ...settings,
      },
    });
  } catch (error) {
    if (error instanceof AdminServiceError) throw error;
    throw new AdminServiceError({
      message: `Failed to set settings: ${error}`,
      code: "SET_SETTINGS_ERROR",
      details: error,
    } as AdminServiceError);
  }
};

export const isAdminPasswordSet = async (): Promise<boolean> => {
  try {
    requireAuth();

    const passwordData = await callFirebaseFunction("adminUserAction", {
      action: "isAdminPasswordSet",
      payload: {},
    }) as any;

    if (passwordData && typeof passwordData.isSet === "boolean") {
      return passwordData.isSet;
    } else if (passwordData === true || passwordData === false) {
      return passwordData;
    }

    return false;
  } catch (error) {
    if (error instanceof AdminServiceError) throw error;
    throw new AdminServiceError({
      message: `Failed to check if admin password is set: ${error}`,
      code: "IS_PASSWORD_SET_ERROR",
      details: error,
    } as AdminServiceError);
  }
};

export const verifyAdminPassword = async (
  password: string,
): Promise<boolean> => {
  try {
    requireAuth();

    const verifyResult = await callFirebaseFunction("adminUserAction", {
      action: "verifyAdminPassword",
      payload: { password },
    }) as {
      success: boolean;
      verified: boolean;
      message: string;
    };

    return verifyResult.verified === true;
  } catch (error) {
    if (error instanceof AdminServiceError) throw error;
    throw new AdminServiceError({
      message: `Failed to verify admin password: ${error}`,
      code: "VERIFY_PASSWORD_ERROR",
      details: error,
    } as AdminServiceError);
  }
};

export const changeAdminPassword = async (
  oldPassword: string | undefined,
  newPassword: string,
  confirmPassword: string,
): Promise<void> => {
  try {
    requireAuth();

    await callFirebaseFunction("adminUserAction", {
      action: "changeAdminPassword",
      payload: {
        oldPassword,
        newPassword,
        confirmPassword,
      },
    });
  } catch (error) {
    if (error instanceof AdminServiceError) throw error;
    throw new AdminServiceError({
      message: `Failed to change admin password: ${error}`,
      code: "CHANGE_PASSWORD_ERROR",
      details: error,
    } as AdminServiceError);
  }
};
