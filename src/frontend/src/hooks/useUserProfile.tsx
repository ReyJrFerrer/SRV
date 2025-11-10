import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import authCanisterService, {
  FrontendProfile,
} from "../services/authCanisterService"; // Adjust path as needed
import { mediaService } from "../services/mediaService";
import { useProfileImage } from "./useMediaLoader";

/**
 * Custom hook to manage the client's profile data, including fetching and updating.
 */
export const useUserProfile = () => {
  const { isAuthenticated, identity } = useAuth();

  const [profile, setProfile] = useState<FrontendProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use the profile image hook for optimal loading
  const {
    profileImageUrl,
    isLoading: isImageLoading,
    isUsingDefaultAvatar,
    refetch: refetchImage,
  } = useProfileImage(profile?.profilePicture?.imageUrl);

  const fetchProfile = useCallback(async () => {
    if (isAuthenticated && identity) {
      setLoading(true);
      setError(null);
      try {
        const userProfile = await authCanisterService.getMyProfile();
        setProfile(userProfile);
      } catch (err) {
        setError("Could not load your profile.");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, identity]);

  const uploadImageToServer = async (
    imageFile: File,
  ): Promise<FrontendProfile | null> => {
    try {
      // Use the media service to upload the profile picture
      const updatedProfile =
        await mediaService.uploadProfilePictureWithDescaling(imageFile);
      return updatedProfile;
    } catch (error) {
      throw error;
    }
  };

  // This effect triggers the profile fetch when the component mounts
  // or when the user's authentication status changes.
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /**
   * Updates the user's profile with new information.
   * @param updatedData - An object containing the new name and phone number.
   * @returns A boolean indicating whether the update was successful.
   */
  const updateProfile = async (updatedData: {
    name: string; // Phone is no longer editable from the profile page
    imageFile?: File | null;
  }) => {
    if (!isAuthenticated) {
      setError("You must be logged in to update your profile.");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Handle image upload first if provided
      if (updatedData.imageFile) {
        try {
          const updatedProfileWithImage = await uploadImageToServer(
            updatedData.imageFile,
          );
          if (updatedProfileWithImage) {
            setProfile(updatedProfileWithImage);
          }
        } catch (imageError) {
          throw new Error(
            "Failed to upload image. It might be too large or in an unsupported format. Please try a different image.",
          );
        }
      }

      // Update name and phone in backend if they're different from current profile
      const needsUpdate = profile && updatedData.name !== profile.name;

      if (needsUpdate) {
        const result = await authCanisterService.updateProfile(
          updatedData.name,
        );

        if (result) {
          setProfile(result);
        } else {
          throw new Error("An unknown error occurred during the update.");
        }
      }

      // Always refetch to ensure consistency
      await fetchProfile();
      return true;
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Switches the user's role between Client and ServiceProvider while preserving all data.
   * @returns A boolean indicating whether the role switch was successful.
   */
  const switchRole = async () => {
    if (!isAuthenticated) {
      setError("You must be logged in to switch roles.");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await authCanisterService.switchUserRole();

      if (result) {
        setProfile(result); // Update profile with new role immediately
        await fetchProfile(); // Refetch to ensure consistency
        return true;
      } else {
        throw new Error("An unknown error occurred during role switch.");
      }
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Removes the user's profile picture.
   * @returns A boolean indicating whether the removal was successful.
   */
  const removeProfilePicture = async () => {
    if (!isAuthenticated) {
      setError("You must be logged in to remove your profile picture.");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await mediaService.removeProfilePicture();
      if (result) {
        setProfile(result);
        await fetchProfile(); // Refetch to ensure consistency
        return true;
      } else {
        throw new Error("Failed to remove profile picture.");
      }
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    removeProfilePicture,
    switchRole,
    refetchProfile: fetchProfile,
    // Image loading functionality
    profileImageUrl,
    isImageLoading,
    isUsingDefaultAvatar,
    refetchImage,
  };
};
