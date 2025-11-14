export const DEFAULT_USER_IMAGE = "/default-provider.svg";

export const convertToDate = (timestamp: bigint | number | undefined): Date => {
  if (!timestamp) return new Date();
  const num = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  return new Date(num / 1000000);
};

export const validateDate = (date: Date): Date => {
  return isNaN(date.getTime()) ? new Date() : date;
};

export const extractProfilePicture = (
  profilePicture: any,
): { imageUrl: string; thumbnailUrl: string } | undefined => {
  if (profilePicture && profilePicture.imageUrl) {
    return {
      imageUrl: profilePicture.imageUrl,
      thumbnailUrl: profilePicture.thumbnailUrl || profilePicture.imageUrl,
    };
  }
  return undefined;
};

export const extractBiography = (biography: string | undefined): string | undefined => {
  return biography && biography.trim() ? biography.trim() : undefined;
};

export const getProfileImage = (
  profilePicture: any,
  defaultImage: string = DEFAULT_USER_IMAGE,
): string => {
  if (
    profilePicture &&
    profilePicture.imageUrl &&
    profilePicture.imageUrl !== defaultImage
  ) {
    return profilePicture.imageUrl;
  }
  return defaultImage;
};

export const shouldUseDefaultImage = (
  imageUrl: string | undefined,
  defaultImage: string = DEFAULT_USER_IMAGE,
): boolean => {
  return !imageUrl || imageUrl === defaultImage;
};
