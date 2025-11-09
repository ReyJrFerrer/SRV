import { adminServiceCanister } from "../services/adminServiceCanister";

// User data interface
export interface UserData {
  id: string;
  name: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
  profilePicture?: {
    imageUrl: string;
    thumbnailUrl: string;
  };
  biography?: string;
  isLocked?: boolean;
  servicesCount?: number;
  // Online/offline status
  isActive?: boolean;
  lastActivity?: string | Date;
}

// Convert Profile to UserData format
export const convertProfileToUserData = async (
  profile: any,
  getUserLockStatus: (userId: string) => boolean | undefined,
): Promise<UserData> => {
  // Get user identifier
  const userId = profile.id
    ? profile.id
    : (profile as any).principal
      ? (profile as any).principal
      : (profile as any).uid;

  if (!userId) {
    console.warn("Profile missing id/principal/uid, skipping:", profile);
    throw new Error("Profile missing required id, principal, or uid field");
  }

  // Get lock status from local store
  const lockStatus = getUserLockStatus(userId.toString());

  // Fetch service count from backend
  let servicesCount = 0;
  try {
    servicesCount = await adminServiceCanister.getUserServiceCount(
      userId.toString(),
    );
  } catch (error) {
    console.error(
      `Failed to get service count for user ${userId.toString()}:`,
      error,
    );
    console.log("Fallback 0 applied");
    servicesCount = 0;
  }

  // Convert dates from Firebase to Date objects
  const createdAtValue = profile.createdAt
    ? profile.createdAt instanceof Date
      ? profile.createdAt
      : typeof profile.createdAt === "string"
        ? new Date(profile.createdAt)
        : new Date()
    : new Date();

  const updatedAtValue = profile.updatedAt
    ? profile.updatedAt instanceof Date
      ? profile.updatedAt
      : typeof profile.updatedAt === "string"
        ? new Date(profile.updatedAt)
        : new Date()
    : new Date();

  // Validate dates, use current date as fallback
  const createdAt = isNaN(createdAtValue.getTime())
    ? new Date()
    : createdAtValue;
  const updatedAt = isNaN(updatedAtValue.getTime())
    ? new Date()
    : updatedAtValue;

  // Get Firebase online status fields
  const isActive =
    profile.isActive !== undefined ? profile.isActive : undefined;
  const lastActivity = profile.lastActivity
    ? typeof profile.lastActivity === "string"
      ? new Date(profile.lastActivity)
      : profile.lastActivity instanceof Date
        ? profile.lastActivity
        : new Date(profile.lastActivity)
    : undefined;

  return {
    id: typeof userId === "string" ? userId : userId.toString(),
    name: profile.name || "Unknown",
    phone: profile.phone || "",
    createdAt: createdAt,
    updatedAt: updatedAt,
    profilePicture:
      profile.profilePicture &&
      typeof profile.profilePicture === "object" &&
      !Array.isArray(profile.profilePicture) &&
      profile.profilePicture.imageUrl
        ? {
            imageUrl: profile.profilePicture.imageUrl,
            thumbnailUrl:
              profile.profilePicture.thumbnailUrl ||
              profile.profilePicture.imageUrl,
          }
        : undefined,
    biography:
      profile.biography && typeof profile.biography === "string"
        ? profile.biography
        : undefined,
    isLocked: lockStatus,
    servicesCount: servicesCount,
    isActive: isActive,
    lastActivity: lastActivity,
  };
};

// Format date for display
export const formatDate = (date: Date) => {
  if (!date || isNaN(date.getTime())) {
    return "N/A";
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

// Helper function to check if user is online
export const isUserOnline = (user: UserData): boolean => {
  if (user.isActive !== undefined) {
    return user.isActive;
  }

  return false;
};

// Extract userId from profile
export const extractUserId = (profile: any): string | null => {
  if (profile.id) {
    return typeof profile.id === "string"
      ? profile.id
      : profile.id.toString();
  }
  if (profile.principal) {
    return typeof profile.principal === "string"
      ? profile.principal
      : profile.principal.toString();
  }
  if (profile.uid) {
    return typeof profile.uid === "string"
      ? profile.uid
      : profile.uid.toString();
  }
  return null;
};

// Check if a userId is an admin
export const isAdminUser = (
  userId: string,
  adminUserIds: Set<string>,
): boolean => {
  if (adminUserIds.has(userId)) {
    return true;
  }
  if (adminUserIds.size > 0) {
    for (const adminId of adminUserIds) {
      if (adminId === userId || adminId.toString() === userId.toString()) {
        return true;
      }
    }
  }
  return false;
};

// Filter profiles based on admin toggle
export const filterProfilesByAdminStatus = (
  profiles: any[],
  adminUserIds: Set<string>,
  showOnlyAdmins: boolean,
): any[] => {
  return profiles.filter((profile) => {
    const userId = extractUserId(profile);
    if (!userId) {
      return false;
    }

    const isAdmin = isAdminUser(userId, adminUserIds);
    return showOnlyAdmins ? isAdmin : !isAdmin;
  });
};

