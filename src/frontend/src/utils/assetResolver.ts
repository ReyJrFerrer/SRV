// Asset resolver utility for handling backend image references
// This bridges the gap between backend image paths and frontend asset URLs

/**
 * Resolves backend image paths to frontend asset URLs
 * @param imagePath - Path from backend (e.g., "/images/Maid1.jpg" or "https://media.srv.com/...")
 * @returns Resolved asset URL for frontend use
 */
export function resolveAssetPath(imagePath: string): string | null {
  if (!imagePath) return null;

  // If it's already a full URL (http/https), return as-is
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // Remove leading slash if present
  const cleanPath = imagePath.startsWith("/")
    ? imagePath.substring(1)
    : imagePath;

  // For Vite, we can directly use public assets via their path
  // Check if the path corresponds to a public asset
  if (cleanPath.startsWith("images/")) {
    return `/${cleanPath}`;
  }

  // If no mapping found, return the original path (might be from public directory)
  return `/${cleanPath}`;
}

/**
 * Converts backend profile data to frontend-compatible format
 * @param backendProfile - Profile data from ICP backend
 * @returns Frontend-compatible profile with resolved asset paths
 */
export function adaptBackendProfile(backendProfile: any): any {
  if (!backendProfile) return null;

  // Convert timestamps from nanoseconds to milliseconds
  const convertTime = (nanoseconds: bigint | number): Date => {
    const milliseconds =
      typeof nanoseconds === "bigint"
        ? Number(nanoseconds / BigInt(1_000_000))
        : Number(nanoseconds) / 1_000_000;
    return new Date(milliseconds);
  };

  // Extract role type from backend variant
  const extractRole = (roleVariant: any): "Client" | "ServiceProvider" => {
    if (roleVariant && typeof roleVariant === "object") {
      if ("Client" in roleVariant) return "Client";
      if ("ServiceProvider" in roleVariant) return "ServiceProvider";
    }
    return "Client"; // default fallback
  };

  const adapted: any = {
    id: backendProfile.id.toString(),
    name: backendProfile.name,
    phone: backendProfile.phone,
    role: extractRole(backendProfile.role),
    activeRole: extractRole(backendProfile.activeRole),
    isVerified: backendProfile.isVerified,
    biography: backendProfile.biography?.[0] || undefined, // Optional fields come as arrays
    createdAt: convertTime(backendProfile.createdAt),
    updatedAt: convertTime(backendProfile.updatedAt),
    isLocked: backendProfile.isLocked?.[0] || false, // Optional isLocked field
  };

  // Resolve profile picture paths
  if (backendProfile.profilePicture && backendProfile.profilePicture[0]) {
    const profilePic = backendProfile.profilePicture[0];
    adapted.profilePicture = {
      imageUrl: resolveAssetPath(profilePic.imageUrl),
      thumbnailUrl: resolveAssetPath(profilePic.thumbnailUrl),
    };
  }

  return adapted;
}

/**
 * Helper function to get asset path for a specific image name
 * Useful for dynamic asset loading
 */
export function getAssetByName(imageName: string): string | null {
  return resolveAssetPath(`images/${imageName}`);
}
