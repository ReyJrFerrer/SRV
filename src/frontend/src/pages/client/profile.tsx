// SECTION: Imports — dependencies for this page
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../../components/ToastNotifications";
import {
  PencilIcon,
  CameraIcon,
  BriefcaseIcon,
  CheckBadgeIcon,
  CalendarIcon,
  InformationCircleIcon,
  StarIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/solid";
import {
  XMarkIcon,
  StarIcon as StarIconOutline,
} from "@heroicons/react/24/outline";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useLogout } from "../../hooks/logout";
import { useReputation } from "../../hooks/useReputation";
import { useClientAnalytics } from "../../hooks/useClientAnalytics";
import useClientRating, {
  type ClientReview,
} from "../../hooks/useClientRating";
import ClientRatingInfoModal from "../../components/common/ClientRatingInfoModal";
import SpotlightTour from "../../components/common/SpotlightTour";
import SmartHeader from "../../components/common/SmartHeader";
import RoleSwitchButton from "../../components/common/RoleSwitchButton";
import {
  ProfileSkeleton,
  ReputationScoreSkeleton,
} from "../../components/SkeletonLoader";
import authCanisterService from "../../services/authCanisterService";
import { useAuth } from "../../context/AuthContext";
interface AboutReputationScoreModalProps {
  show: boolean;
  onClose: () => void;
  reputationDisplay: any;
}

// SECTION: AboutReputationScoreModal — modal explaining reputation score
const AboutReputationScoreModal: React.FC<AboutReputationScoreModalProps> = ({
  show,
  onClose,
  reputationDisplay,
}) => {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-center text-xl font-bold text-blue-700">
          What is Reputation Score?
        </h2>
        <div className="mb-4 text-sm text-gray-700">
          <p>
            Your reputation score (0-100) reflects your reliability and
            activity. It increases when you complete bookings and get positive
            ratings, and decreases if you get flagged for suspicious activity or
            have low activity as a new user.
          </p>
          <ul className="mt-3 list-disc pl-5 text-xs text-gray-600">
            <li>
              Completing bookings and getting good ratings increases your score.
            </li>
            <li>
              Flags for suspicious activity or low activity as a new user
              decrease your score.
            </li>
            <li>Your badge level is based on your score.</li>
          </ul>
          {reputationDisplay && reputationDisplay.bookings > 0 && (
            <div className="mt-3 text-xs text-gray-500">
              <strong>Current stats:</strong> {reputationDisplay.bookings}{" "}
              completed booking{reputationDisplay.bookings !== 1 ? "s" : ""}
              {reputationDisplay.rating &&
                `, ${reputationDisplay.rating.toFixed(1)}★ average rating`}
            </div>
          )}
        </div>
        <button
          className="absolute right-2 top-2 rounded-full bg-gray-200 p-2 text-gray-700 hover:bg-blue-100"
          onClick={onClose}
          aria-label="Close"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

// SECTION: TrustLevelBadge — trust level display with info button
interface TrustLevelBadgeProps {
  trustLevel: string;
  onInfoClick?: () => void;
  infoOpen?: boolean;
}
const TrustLevelBadge: React.FC<TrustLevelBadgeProps> = ({
  trustLevel,
  onInfoClick,
  infoOpen,
}) => {
  const getTrustLevelConfig = (level: string) => {
    switch (level) {
      case "New":
        return {
          color: "bg-white text-blue-700 shadow-sm border-blue-200",
          icon: SparklesIcon,
          description: (
            <>
              <span className="mb-2 flex items-center justify-center gap-2 text-lg font-black tracking-tight text-blue-600">
                <SparklesIcon className="h-5 w-5 text-blue-500" /> Welcome to
                SRV!
              </span>
              <span className="block text-sm font-medium text-blue-800/70">
                Complete your first booking to start building your reputation.
              </span>
            </>
          ),
        };
      case "Low":
        return {
          color: "bg-white text-red-700 shadow-sm border-red-200",
          icon: ExclamationTriangleIcon,
          description:
            "Building trust - Focus on completing bookings and maintaining good conduct to improve your client rating.",
        };
      case "Medium":
        return {
          color: "bg-white text-yellow-700 shadow-sm border-yellow-200",
          icon: StarIcon,
          description:
            "Reliable client - You're building a good reputation! Keep up the excellent conduct.",
        };
      case "High":
        return {
          color: "bg-white text-blue-700 shadow-sm border-blue-200",
          icon: TrophyIcon,
          description:
            "Trusted client - Excellent reputation! Service providers trust you as a reliable client.",
        };
      case "VeryHigh":
        return {
          color: "bg-white text-green-700 shadow-sm border-green-200",
          icon: ShieldCheckIcon,
          description:
            "Premium client - Outstanding reputation! You're among the top-rated clients on our platform.",
        };
      default:
        return {
          color: "bg-white text-gray-700 shadow-sm border-gray-200",
          icon: InformationCircleIcon,
          description: "Trust level not available.",
        };
    }
  };
  const config = getTrustLevelConfig(trustLevel);
  const IconComponent = config.icon;
  return (
    <div className="flex w-full flex-col items-center">
      <div
        className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-bold uppercase tracking-wide ${config.color}`}
      >
        <IconComponent className="mr-2 h-4 w-4" />
        {trustLevel === "VeryHigh"
          ? "Premium"
          : trustLevel === "High"
            ? "Trusted"
            : trustLevel === "Medium"
              ? "Reliable"
              : trustLevel === "Low"
                ? "Building Trust"
                : trustLevel}{" "}
        User
        {/* Info button for all badges */}
        <button
          type="button"
          aria-label="Show badge info"
          className="ml-2 rounded-full p-1 transition-colors hover:bg-black/5 focus:outline-none"
          onClick={onInfoClick}
        >
          <InformationCircleIcon
            className={`h-5 w-5 text-current opacity-60 transition-transform hover:opacity-100 ${infoOpen ? "rotate-90" : ""}`}
          />
        </button>
      </div>
      <div className="mt-4 flex w-full flex-col items-center">
        {trustLevel === "New" ? (
          <div className="w-full rounded-2xl border-none bg-gradient-to-br from-blue-50 to-indigo-50 p-5 text-center shadow-sm">
            {config.description}
          </div>
        ) : (
          <p className="max-w-sm text-center text-sm font-medium leading-relaxed text-gray-500">
            {config.description}
          </p>
        )}
      </div>
    </div>
  );
};

// SECTION: TrustLevelInfoModal — modal with badge levels information
const TrustLevelInfoModal: React.FC<{ show: boolean; onClose: () => void }> = ({
  show,
  onClose,
}) => {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-center text-xl font-bold text-blue-700">
          User Badge Levels
        </h2>
        <ul className="space-y-4">
          <li className="flex flex-col gap-1 rounded-lg border border-blue-200 bg-white p-3">
            <div className="flex items-center gap-3">
              <SparklesIcon className="h-6 w-6 text-blue-500" />
              <span className="font-semibold text-blue-700">New User</span>
              <span className="text-xs text-gray-500">Score: 50</span>
            </div>
            <span className="text-xs text-gray-700">
              Signifies: You just joined SRV. Complete your first booking to
              start building your reputation and unlock higher trust levels.
            </span>
          </li>
          <li className="flex flex-col gap-1 rounded-lg border border-red-200 bg-white p-3">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
              <span className="font-semibold text-red-700">Building Trust</span>
              <span className="text-xs text-gray-500">Score: 0.0 - 20.0</span>
            </div>
            <span className="text-xs text-gray-700">
              Signifies: Building trust. Focus on completing bookings and
              maintaining good conduct to improve your client rating.
            </span>
          </li>
          <li className="flex flex-col gap-1 rounded-lg border border-yellow-200 bg-white p-3">
            <div className="flex items-center gap-3">
              <StarIcon className="h-6 w-6 text-yellow-500" />
              <span className="font-semibold text-yellow-700">Reliable</span>
              <span className="text-xs text-gray-500">Score: 20.01 - 50.0</span>
            </div>
            <span className="text-xs text-gray-700">
              Signifies: Reliable client. You're building a good reputation!
              Keep up the excellent conduct.
            </span>
          </li>
          <li className="flex flex-col gap-1 rounded-lg border border-blue-200 bg-blue-100 p-3">
            <div className="flex items-center gap-3">
              <TrophyIcon className="h-6 w-6 text-blue-600" />
              <span className="font-semibold text-blue-700">Trusted</span>
              <span className="text-xs text-gray-500">Score: 50.01 - 80.0</span>
            </div>
            <span className="text-xs text-gray-700">
              Signifies: Trusted client. Excellent reputation! Service providers
              trust you as a reliable client.
            </span>
          </li>
          <li className="flex flex-col gap-1 rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="h-6 w-6 text-green-600" />
              <span className="font-semibold text-green-700">Premium</span>
              <span className="text-xs text-gray-500">
                Score: 80.01 - 100.0
              </span>
            </div>
            <span className="text-xs text-gray-700">
              Signifies: Premium client. Outstanding reputation! You're among
              the top-rated clients on our platform.
            </span>
          </li>
        </ul>
        <button
          className="absolute right-2 top-2 rounded-full bg-gray-200 p-2 text-gray-700 hover:bg-blue-100"
          onClick={onClose}
          aria-label="Close"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

// SECTION: ClientStats — booking and activity summary
const ClientStats: React.FC = () => {
  const {
    loading: analyticsLoading,
    error: analyticsError,
    getFormattedStats,
  } = useClientAnalytics();

  const formattedStats = getFormattedStats();

  const stats = [
    {
      name: "Total Bookings",
      value: formattedStats.totalBookings,
      icon: BriefcaseIcon,
      bg: "text-blue-700",
    },
    {
      name: "Services Completed",
      value: formattedStats.servicesCompleted,
      icon: CheckBadgeIcon,
      bg: "text-blue-700",
    },
    {
      name: "Total Spent",
      value: formattedStats.totalSpent,
      icon: "₱",
      bg: "text-blue-700",
    },
    {
      name: "Member Since",
      value: formattedStats.memberSince,
      icon: CalendarIcon,
      bg: "text-blue-700",
    },
  ];

  if (analyticsLoading) {
    return (
      <div className="mt-8">
        <h3 className="mb-4 text-center text-lg font-semibold text-gray-800">
          Your Statistics
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="flex animate-pulse flex-col items-center justify-center rounded-2xl bg-white p-6 shadow"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200" />
              <div className="mb-2 h-6 w-16 rounded bg-gray-200" />
              <div className="h-3 w-20 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (analyticsError) {
    return (
      <div className="mt-8">
        <h3 className="mb-4 text-center text-lg font-semibold text-gray-800">
          Your Statistics
        </h3>
        <div className="flex justify-center">
          <p className="text-sm text-red-500">
            Failed to load statistics: {analyticsError}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="mb-4 text-left text-sm font-bold uppercase tracking-wider text-gray-500">
        Your Booking & Activity Summary
      </h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => {
          return (
            <div
              key={stat.name}
              className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg} shadow-sm`}
              >
                {typeof stat.icon === "string" ? (
                  <span className="text-lg font-bold">{stat.icon}</span>
                ) : (
                  <stat.icon className="h-5 w-5" />
                )}
              </div>
              <p className="mb-1 w-full text-center text-xl font-black text-gray-900">
                {stat.value}
              </p>
              <p className="w-full text-center text-[10px] font-bold uppercase tracking-wide text-gray-500">
                {stat.name}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StarBar: React.FC<{ label: string; value: number; total: number }> = ({
  label,
  value,
  total,
}) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex w-8 items-center justify-end gap-1">
        <span className="text-sm font-black text-gray-700">{label}</span>
        <StarIcon className="h-3 w-3 text-yellow-400" />
      </div>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-yellow-400 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-8 text-right text-sm font-bold text-gray-500">
        {value}
      </span>
    </div>
  );
};

const getReviewerName = (rev: ClientReview) =>
  (rev as any).reviewerName ||
  (rev as any).authorName ||
  (rev as any).providerName ||
  (rev as any).userName ||
  "Anonymous";

// SECTION: ProfilePictureModal — profile image with preview modal
interface ProfilePictureModalProps {
  src: string | null | undefined;
  isLoading: boolean;
}

const ProfilePictureModal: React.FC<ProfilePictureModalProps> = ({
  src,
  isLoading,
}) => {
  const [showModal, setShowModal] = React.useState(false);
  const [displaySrc, setDisplaySrc] = React.useState(
    src || "/default-client.svg",
  );

  // Update display src only when src is actually loaded (not during loading)
  React.useEffect(() => {
    if (src && !isLoading) {
      setDisplaySrc(src);
    }
  }, [src, isLoading]);

  // Check if we have a valid cached/loaded image (data URL or blob URL)
  const hasValidImage =
    displaySrc.startsWith("data:") || displaySrc.startsWith("blob:");

  return (
    <>
      <div
        className="relative mb-4 flex cursor-pointer items-center justify-center"
        onClick={() => setShowModal(true)}
        tabIndex={0}
        aria-label="View profile picture"
        role="button"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setShowModal(true);
        }}
      >
        {isLoading && !hasValidImage ? (
          <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-gray-200 shadow-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : (
          <img
            src={displaySrc}
            alt="Profile Picture"
            className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-sm transition-all duration-200"
            tabIndex={-1}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/default-client.svg";
            }}
          />
        )}
      </div>
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setShowModal(false)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={displaySrc}
              alt="Profile Picture Large"
              className="max-h-[80vh] max-w-[90vw] rounded-2xl border-4 border-white bg-white shadow-2xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/default-client.svg";
              }}
            />
            <button
              className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
              onClick={() => setShowModal(false)}
              aria-label="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// SECTION: ClientProfilePage — main profile view and interactions
const ClientProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();
  const {
    profile,
    loading,
    error,
    updateProfile,
    profileImageUrl,
    isImageLoading,
    refetchImage,
  } = useUserProfile();
  const { logout } = useLogout();
  const {
    loading: reputationLoading,
    error: reputationError,
    getReputationDisplay,
  } = useReputation();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  // Error states for validation
  const [nameError, setNameError] = useState("");
  const [, setPhoneError] = useState("");
  const [editError, setEditError] = useState("");

  // Toast notification state
  const [toast, setToast] = useState<{
    message: string;
    type?: "success" | "error";
  } | null>(null);

  // State: Editing profile, switching role, modal visibility, and reputation display
  const [showAboutInfo, setShowAboutInfo] = useState(false);
  const [showBadgeInfo, setShowBadgeInfo] = useState(false);
  const [showRatingInfo, setShowRatingInfo] = useState(false);
  const reputationDisplay = getReputationDisplay();
  const reputationScore = reputationDisplay?.score ?? 0;

  // Reviews state
  const { getClientReviewsByUser } = useClientRating();
  const [reviews, setReviews] = useState<ClientReview[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [ratingsError, setRatingsError] = useState<string | null>(null);
  const reviewerNameCache = useRef<Map<string, string>>(new Map());

  // Fetch reviews
  useEffect(() => {
    const loadReviews = async () => {
      try {
        setRatingsError(null);
        setRatingsLoading(true);

        if (!firebaseUser?.uid) {
          setRatingsError("Please sign in to view your reviews.");
          setRatingsLoading(false);
          return;
        }

        const data = await getClientReviewsByUser(firebaseUser.uid);

        const providerIds = Array.from(
          new Set(data.map((r: any) => r.providerId).filter(Boolean)),
        );

        const idsToFetch = providerIds.filter(
          (id) => !reviewerNameCache.current.has(id),
        );

        if (idsToFetch.length > 0) {
          const profileResults = await Promise.all(
            idsToFetch.map(async (id) => {
              try {
                return await authCanisterService.getProfile(id);
              } catch (e) {
                return null;
              }
            }),
          );

          profileResults.forEach((p, idx) => {
            const id = idsToFetch[idx];
            if (p && p.name) {
              reviewerNameCache.current.set(id, p.name);
            } else {
              reviewerNameCache.current.set(id, "Anonymous");
            }
          });
        }

        const mapped = data.map((r: any) => ({
          ...r,
          reviewerName:
            reviewerNameCache.current.get(r.providerId) ||
            (r as any).reviewerName,
        }));

        setReviews(mapped as ClientReview[]);
      } catch (e) {
        setRatingsError("Failed to load reviews.");
      } finally {
        setRatingsLoading(false);
      }
    };

    if (firebaseUser) {
      loadReviews();
    }
  }, [getClientReviewsByUser, firebaseUser]);

  const reviewsStats = useMemo(() => {
    const total = reviews.length;
    const counts = [1, 2, 3, 4, 5].reduce<Record<number, number>>(
      (acc, r) => ({ ...acc, [r]: 0 }),
      {},
    );
    let sum = 0;
    reviews.forEach((r) => {
      counts[r.rating] = (counts[r.rating] || 0) + 1;
      sum += r.rating;
    });
    const avg = total ? sum / total : 0;
    return { total, counts, avg };
  }, [reviews]);

  useEffect(() => {
    document.title = "My Profile | SRV";
  }, []);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setPhone(profile.phone || "");
    }
  }, [profile]);

  const handleImageUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSaveChanges = async () => {
    setNameError("");
    setPhoneError("");
    setEditError("");
    let valid = true;
    const nameTrimmed = name.trim();
    const nameWords = nameTrimmed.split(/\s+/);
    if (!nameTrimmed) {
      setNameError("Full name is required.");
      valid = false;
    } else if (nameWords.length < 2) {
      setNameError("Please enter your full name (first and last).");
      valid = false;
    }
    const phoneTrimmed = phone.trim();
    const phoneDigits = phoneTrimmed.replace(/[^\d]/g, "");
    if (!phoneTrimmed) {
      setPhoneError("Phone number is required.");
      valid = false;
    } else if (phoneDigits.length !== 11) {
      setPhoneError("Phone number must be exactly 11 digits.");
      valid = false;
    } else if (!phoneDigits.startsWith("09")) {
      setPhoneError("Phone number must start with '09'.");
      valid = false;
    }
    if (!valid) {
      setEditError("Please fix the errors above before saving.");
      return;
    }
    const success = await updateProfile({ name, imageFile });
    if (success) {
      setIsEditing(false);
      setImageFile(null);
      setPreviewImage(null);
      refetchImage();
      setToast({ message: "Profile updated successfully!", type: "success" });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setName(profile?.name || "");
    setPhone(profile?.phone || "");
    setImageFile(null);
    setPreviewImage(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <SpotlightTour flowType="client-profile" />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <SmartHeader title="Profile" showBackButton={false} userRole="client" />

      <main className="mx-auto w-full max-w-6xl flex-1 p-4">
        {loading || !profile ? (
          <ProfileSkeleton role="client" />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-8">
            <div className="flex flex-col space-y-4 lg:col-span-1">
              <div className="flex flex-col items-center rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="relative mb-4">
                  <ProfilePictureModal
                    src={previewImage || profileImageUrl}
                    isLoading={isImageLoading}
                  />
                  {isEditing && (
                    <>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/png, image/jpeg"
                      />
                      <button
                        onClick={handleImageUploadClick}
                        className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-blue-600 p-2.5 text-white shadow-sm transition-colors hover:bg-blue-700"
                      >
                        <CameraIcon className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>

                {!isEditing ? (
                  <div className="w-full text-center">
                    <h2 className="text-2xl font-black tracking-tight text-gray-900">
                      {profile?.name || "Client Name"}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-gray-500">
                      {profile?.phone || "No phone number"}
                    </p>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="mt-6 flex w-full items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-bold text-gray-800 transition transition-all duration-300 hover:border-gray-300 active:scale-95"
                    >
                      <PencilIcon className="mr-2 h-4 w-4 text-gray-500" />
                      Edit Profile
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 w-full space-y-4">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-left text-xs font-bold uppercase tracking-wider text-gray-500"
                      >
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (nameError) setNameError("");
                          if (editError) setEditError("");
                        }}
                        className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      {nameError && (
                        <p className="mt-1 text-xs font-medium text-red-500">
                          {nameError}
                        </p>
                      )}
                    </div>
                    <div className="text-left">
                      <label
                        htmlFor="phone"
                        className="block text-xs font-bold uppercase tracking-wider text-gray-500"
                      >
                        Phone Number
                      </label>
                      <p className="mt-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-900">
                        {profile?.phone || "No phone number"}
                      </p>
                      <p className="mt-2 flex items-start gap-1.5 px-1 text-xs text-gray-500">
                        <InformationCircleIcon className="h-4 w-4 shrink-0 text-blue-500" />
                        Phone number is linked for security. Contact support to
                        update.
                      </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 rounded-2xl bg-gray-100 px-5 py-3.5 text-sm font-bold text-gray-700 transition transition-all duration-300 hover:bg-gray-200 active:scale-95"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveChanges}
                        disabled={loading}
                        className="flex-1 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition transition-all duration-300 hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                      >
                        {loading ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <RoleSwitchButton currentRole="client" />
              <div >
                <button
                  onClick={logout}
                  className="flex w-full items-center justify-center rounded-2xl border border-red-200 bg-white px-6 py-3 text-sm font-bold text-red-600 shadow-sm transition-colors hover:bg-red-50"
                >
                  Log Out
                </button>
              </div>
            </div>
            <div className="mt-2 lg:col-span-2 lg:mt-0">
              <div className="tour-client-reputation-score tour-client-profile-reputation rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
                <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
                  <h3 className="text-xl font-bold tracking-tight text-gray-900">
                    Your Reputation
                  </h3>
                  <button
                    type="button"
                    aria-label="What is reputation score?"
                    className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    onClick={() => setShowAboutInfo(true)}
                  >
                    <InformationCircleIcon className="h-5 w-5" />
                  </button>
                  <AboutReputationScoreModal
                    show={showAboutInfo}
                    onClose={() => setShowAboutInfo(false)}
                    reputationDisplay={reputationDisplay}
                  />
                </div>
                {reputationLoading ? (
                  <div className="flex justify-center">
                    <ReputationScoreSkeleton />
                  </div>
                ) : reputationError ? (
                  <div className="flex justify-center">
                    <div className="flex h-48 w-48 items-center justify-center">
                      <div className="text-center">
                        <div className="mb-4 text-red-500">
                          <ExclamationTriangleIcon className="mx-auto h-16 w-16" />
                        </div>
                        <p className="text-sm font-medium text-red-600">
                          {reputationError}
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          If issues persist, please contact support.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative mb-2 flex items-center justify-center">
                      <ReputationScore score={reputationScore} />
                    </div>
                    {reputationDisplay && (
                      <div className="flex w-full flex-col items-center gap-4">
                        <TrustLevelBadge
                          trustLevel={reputationDisplay.level}
                          onInfoClick={() => setShowBadgeInfo(true)}
                          infoOpen={showBadgeInfo}
                        />
                        <TrustLevelInfoModal
                          show={showBadgeInfo}
                          onClose={() => setShowBadgeInfo(false)}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-8 space-y-6">
                  <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                    {/* Decorative background element */}
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-yellow-100 opacity-50 blur-2xl"></div>

                    <div className="relative z-10 mb-6 flex items-center justify-between">
                      <h4 className="text-sm font-black uppercase tracking-wider text-gray-900">
                        Your Ratings
                      </h4>
                      <button
                        type="button"
                        aria-label="About ratings"
                        className="rounded-full border border-gray-200 bg-white p-2 text-gray-400 transition-colors hover:bg-yellow-50 hover:text-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        onClick={() => setShowRatingInfo(true)}
                      >
                        <InformationCircleIcon className="h-5 w-5" />
                      </button>
                    </div>

                    {ratingsLoading ? (
                      <div className="flex animate-pulse items-center justify-center py-8">
                        <div className="h-16 w-16 rounded-2xl bg-gray-100"></div>
                      </div>
                    ) : ratingsError ? (
                      <div className="py-6 text-center text-sm font-medium text-red-500">
                        {ratingsError}
                      </div>
                    ) : (
                      <div className="relative z-10 flex flex-col gap-6">
                        {/* Summary section */}
                        <div className="flex flex-col items-center sm:flex-row sm:items-stretch sm:gap-8">
                          <div className="mb-6 flex flex-col items-center justify-center sm:mb-0 sm:min-w-[140px] sm:border-r sm:border-gray-100 sm:pr-8">
                            <span className="text-6xl font-black tracking-tighter text-blue-950">
                              {reviewsStats.avg.toFixed(1)}
                            </span>
                            <div className="mt-2 flex gap-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <React.Fragment key={s}>
                                  {s <= Math.round(reviewsStats.avg) ? (
                                    <StarIcon className="h-5 w-5 text-yellow-400 drop-shadow-sm" />
                                  ) : (
                                    <StarIconOutline className="h-5 w-5 text-gray-300" />
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                            <span className="mt-2 text-sm font-bold text-gray-500">
                              {reviewsStats.total} Review
                              {reviewsStats.total === 1 ? "" : "s"}
                            </span>
                          </div>

                          {/* Progress bars */}
                          <div className="w-full flex-1 space-y-3">
                            {[5, 4, 3, 2, 1].map((r) => (
                              <StarBar
                                key={r}
                                label={`${r}`}
                                value={reviewsStats.counts[r] || 0}
                                total={reviewsStats.total}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Detailed Reviews List */}
                        <div className="mt-6 border-t border-gray-100 pt-6">
                          <div className="mb-4 flex items-center justify-between">
                            <h5 className="text-sm font-black uppercase tracking-wider text-gray-900">
                              Recent Feedback
                            </h5>
                            <button
                              onClick={() => navigate("/client/ratings")}
                              className="text-sm font-medium text-blue-600 hover:underline"
                            >
                              {reviews.length > 0
                                ? `View All (${reviews.length})`
                                : "View All"}
                            </button>
                          </div>
                          {reviews.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl bg-gray-50 py-8 text-center">
                              <StarIconOutline className="mb-2 h-8 w-8 text-gray-400" />
                              <p className="text-sm font-medium text-gray-500">
                                No reviews yet
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {reviews.slice(0, 3).map((rev) => (
                                <div
                                  key={rev.id}
                                  className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                                >
                                  <div className="mb-2 flex items-start justify-between">
                                    <div>
                                      <h6 className="font-bold text-gray-900">
                                        {getReviewerName(rev)}
                                      </h6>
                                      <div className="mt-0.5 flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                          <React.Fragment key={s}>
                                            {s <= rev.rating ? (
                                              <StarIcon className="h-3 w-3 text-yellow-400" />
                                            ) : (
                                              <StarIconOutline className="h-3 w-3 text-gray-300" />
                                            )}
                                          </React.Fragment>
                                        ))}
                                      </div>
                                    </div>
                                    <span className="text-xs font-bold text-gray-400">
                                      {new Date(
                                        rev.createdAt,
                                      ).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                    </span>
                                  </div>
                                  {rev.comment && (
                                    <p className="mt-2 text-sm leading-relaxed text-gray-700">
                                      "{rev.comment}"
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <ClientStats />
                  </div>
                </div>
              </div>
            </div>
            {editError && (
              <p className="mt-4 text-center text-red-500">{editError}</p>
            )}
            {error && <p className="mt-4 text-center text-red-500">{error}</p>}
            {reputationError && !error && (
              <p className="mt-4 text-center text-red-500">
                Reputation: {reputationError}
              </p>
            )}
          </div>
        )}
      </main>
      <ClientRatingInfoModal
        isOpen={showRatingInfo}
        onClose={() => setShowRatingInfo(false)}
        role="client"
      />
    </div>
  );
};

// SECTION: ReputationScore — radial score visualization
const ReputationScore: React.FC<{ score: number }> = ({ score }) => {
  const getScoreColor = (value: number) => {
    if (value >= 80) return "#2563eb"; // blue-600
    if (value >= 60) return "#60a5fa"; // blue-300
    if (value >= 40) return "#facc15"; // yellow-400
    return "#fef08a"; // yellow-200
  };

  const color = getScoreColor(score);
  const circumference = 2 * Math.PI * 45; // 45 is the radius
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex h-56 w-56 items-center justify-center">
      {/* Outer subtle glow */}
      <div className="absolute inset-0 rounded-full bg-gray-100 opacity-70 blur-xl"></div>

      <svg
        className="absolute h-full w-full drop-shadow-sm"
        viewBox="0 0 100 100"
      >
        <circle
          className="text-gray-100"
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
        />
        <circle
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
            transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </svg>
      <div className="z-10 flex h-36 w-36 flex-col items-center justify-center rounded-full bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
        <span className="text-5xl font-black tracking-tighter text-gray-900">
          {score}
        </span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Trust Score
        </span>
      </div>
    </div>
  );
};

export default ClientProfilePage;
