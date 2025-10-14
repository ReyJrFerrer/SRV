import React, { useState, useEffect, useRef } from "react";
import Toast from "../../../components/ToastNotifications";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  PencilIcon,
  CameraIcon,
  ArrowPathRoundedSquareIcon,
  ChevronRightIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";
import BottomNavigation from "../../../components/provider/BottomNavigation"; // Changed to provider bottom nav
import { useUserProfile } from "../../../hooks/useUserProfile";
import { useLogout } from "../../../hooks/logout";
import { useReputation } from "../../../hooks/useReputation";

// AboutReputationScoreModal: Provider version
interface AboutReputationScoreModalProps {
  show: boolean;
  onClose: () => void;
  reputationDisplay: any;
}

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
            Your reputation score (0-100) reflects your reliability and activity
            as a provider. It increases when you complete bookings and get
            positive ratings, and decreases if you get flagged for suspicious
            activity or have low activity as a new provider.
          </p>
          <ul className="mt-3 list-disc pl-5 text-xs text-gray-600">
            <li>
              Completing bookings and getting good ratings increases your score.
            </li>
            <li>
              Flags for suspicious activity or low activity as a new provider
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// TrustLevelBadge: Provider version
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
          color: "bg-blue-50 text-blue-900 border-blue-200",
          icon: "🆕",
          description: (
            <>
              <span className="mb-1 flex items-center justify-center gap-2 text-lg font-bold text-blue-700">
                <span className="inline-block text-2xl">🎉</span> Welcome to
                SRV!
              </span>
              <span className="block text-gray-700">
                Complete your first booking to start building your reputation as
                a provider.
              </span>
            </>
          ),
        };
      case "Low":
        return {
          color: "bg-red-100 text-red-800 border-red-300",
          icon: "⚠️",
          description:
            "Building trust - Focus on completing bookings and maintaining good conduct to improve your provider rating.",
        };
      case "Medium":
        return {
          color: "bg-yellow-100 text-yellow-800 border-yellow-300",
          icon: "⭐",
          description:
            "Reliable provider - You're building a good reputation! Keep up the excellent conduct.",
        };
      case "High":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-300",
          icon: "🏆",
          description:
            "Trusted provider - Excellent reputation! Clients trust you as a reliable provider.",
        };
      case "VeryHigh":
        return {
          color: "bg-green-100 text-green-800 border-green-300",
          icon: "💎",
          description:
            "Elite provider - Outstanding reputation! You're among the top-rated providers on our platform.",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-300",
          icon: "❓",
          description: "Trust level not available.",
        };
    }
  };
  const config = getTrustLevelConfig(trustLevel);
  return (
    <div className="mt-4 flex flex-col items-center">
      <div
        className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold ${config.color}`}
      >
        <span className="mr-2">{config.icon}</span>
        {trustLevel} Provider
        <button
          type="button"
          aria-label="Show badge info"
          className="ml-2 rounded-full p-1 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
          onClick={onInfoClick}
        >
          <InformationCircleIcon
            className={`h-5 w-5 text-blue-500 transition-transform ${infoOpen ? "rotate-90" : ""}`}
          />
        </button>
      </div>
      <div className="mt-3 flex w-full max-w-md flex-col items-center">
        {trustLevel === "New" ? (
          <div className="w-full rounded-lg border border-blue-100 bg-blue-50 p-4 text-center shadow-sm">
            {config.description}
          </div>
        ) : (
          <p className="max-w-sm text-center text-xs leading-relaxed text-gray-600">
            {config.description}
          </p>
        )}
      </div>
    </div>
  );
};

// TrustLevelInfoModal: Provider version
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
          Provider Badge Levels
        </h2>
        <ul className="space-y-4">
          <li className="flex flex-col gap-1 rounded-lg border border-blue-100 bg-blue-50 p-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🆕</span>
              <span className="font-semibold text-blue-700">New Provider</span>
              <span className="text-xs text-gray-500">Score: 50</span>
            </div>
            <span className="text-xs text-gray-700">
              Signifies: You just joined SRV. Complete your first booking to
              start building your reputation and unlock higher trust levels.
            </span>
          </li>
          <li className="flex flex-col gap-1 rounded-lg border border-red-100 bg-red-50 p-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <span className="font-semibold text-red-700">Low Trust</span>
              <span className="text-xs text-gray-500">Score: 0.0 - 20.0</span>
            </div>
            <span className="text-xs text-gray-700">
              Signifies: Building trust. Focus on completing bookings and
              maintaining good conduct to improve your provider rating.
            </span>
          </li>
          <li className="flex flex-col gap-1 rounded-lg border border-yellow-100 bg-yellow-50 p-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⭐</span>
              <span className="font-semibold text-yellow-700">
                Medium Trust
              </span>
              <span className="text-xs text-gray-500">Score: 20.01 - 50.0</span>
            </div>
            <span className="text-xs text-gray-700">
              Signifies: Reliable provider. You're building a good reputation!
              Keep up the excellent conduct.
            </span>
          </li>
          <li className="flex flex-col gap-1 rounded-lg border border-blue-200 bg-blue-100 p-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <span className="font-semibold text-blue-700">High Trust</span>
              <span className="text-xs text-gray-500">Score: 50.01 - 80.0</span>
            </div>
            <span className="text-xs text-gray-700">
              Signifies: Trusted provider. Excellent reputation! Clients trust
              you as a reliable provider.
            </span>
          </li>
          <li className="flex flex-col gap-1 rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💎</span>
              <span className="font-semibold text-green-700">
                Very High Trust
              </span>
              <span className="text-xs text-gray-500">
                Score: 80.01 - 100.0
              </span>
            </div>
            <span className="text-xs text-gray-700">
              Signifies: Elite provider. Outstanding reputation! You're among
              the top-rated providers on our platform.
            </span>
          </li>
        </ul>
        <button
          className="absolute right-2 top-2 rounded-full bg-gray-200 p-2 text-gray-700 hover:bg-blue-100"
          onClick={onClose}
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// ProviderStats: Displays booking and activity summary stats for providers

// ProfilePictureModal: Provider version
interface ProfilePictureModalProps {
  src: string | null | undefined;
  isLoading: boolean;
}

const ProfilePictureModal: React.FC<ProfilePictureModalProps> = ({
  src,
  isLoading,
}) => {
  const [showModal, setShowModal] = React.useState(false);
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
        {isLoading ? (
          <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-gray-200 shadow-lg">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : (
          <img
            src={src || "/default-provider.svg"}
            alt="Profile Picture"
            className="h-32 w-32 rounded-full border-4 border-blue-200 object-cover shadow-lg transition-all duration-200 hover:border-yellow-400 focus:border-yellow-400"
            tabIndex={-1}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/default-provider.svg";
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
              src={src || "/default-provider.svg"}
              alt="Profile Picture Large"
              className="max-h-[80vh] max-w-[90vw] rounded-2xl border-4 border-white bg-white shadow-2xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/default-provider.svg";
              }}
            />
            <button
              className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
              onClick={() => setShowModal(false)}
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// ProviderProfilePage: Main profile view for providers
const ProviderProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    profile,
    loading,
    error,
    updateProfile,
    switchRole,
    profileImageUrl,
    isImageLoading,
    refetchImage,
  } = useUserProfile();
  const { logout } = useLogout();
  const {
    loading: reputationLoading,
    error: reputationError,
    getReputationDisplay,
    forceRefreshReputation,
  } = useReputation();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [editError, setEditError] = useState("");
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type?: "success" | "error";
  } | null>(null);

  const [showAboutInfo, setShowAboutInfo] = useState(false);
  const [showBadgeInfo, setShowBadgeInfo] = useState(false);
  const reputationDisplay = getReputationDisplay();
  const reputationScore = reputationDisplay?.score ?? 0;

  useEffect(() => {
    document.title = "My Provider Profile | SRV";
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
    } else if (nameWords.some((w) => w.length < 2)) {
      setNameError("Each part of your name must be at least 2 characters.");
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
    const success = await updateProfile({ name, phone, imageFile });
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

  const handleSwitchToClient = async () => {
    setIsSwitchingRole(true);
    try {
      await switchRole();
      navigate("/client/profile");
    } finally {
      setIsSwitchingRole(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 pb-24">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
          </button>
          <h1 className="ml-4 text-xl font-bold text-gray-900">
            My Provider Profile
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
          {/* --- Left Column: Profile Info, Edit, Switch, Logout --- */}
          <div className="flex flex-col space-y-4 lg:col-span-1">
            {/* Profile Info Card (top left) */}
            <div className="rounded-xl bg-white p-6 shadow-md">
              <div className="flex flex-col items-center text-center">
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
                        accept="image/*"
                      />
                      <button
                        onClick={handleImageUploadClick}
                        className="absolute bottom-1 right-1 rounded-full bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700"
                      >
                        <CameraIcon className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
                {!isEditing ? (
                  <>
                    <h2 className="text-2xl font-bold text-gray-800">
                      {profile?.name || "Provider Name"}
                    </h2>
                    <p className="text-md text-gray-500">
                      {profile?.phone || "No phone number"}
                    </p>
                  </>
                ) : (
                  <div className="mt-4 w-full max-w-sm space-y-4">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-left text-sm font-medium text-gray-700"
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
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                      {nameError && (
                        <p className="mt-1 text-sm text-red-500">{nameError}</p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-left text-sm font-medium text-gray-700"
                      >
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        value={phone}
                        onChange={(e) => {
                          // Remove spaces from phone number input
                          const phoneValue = e.target.value.replace(/\s/g, "");
                          setPhone(phoneValue);
                          if (phoneError) setPhoneError("");
                          if (editError) setEditError("");
                        }}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                      {phoneError && (
                        <p className="mt-1 text-sm text-red-500">
                          {phoneError}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <div className="mt-6">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center rounded-lg bg-blue-50 px-6 py-2 font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      <PencilIcon className="mr-2 h-4 w-4" />
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex space-x-3">
                      <button
                        onClick={handleCancelEdit}
                        className="rounded-lg bg-gray-200 px-6 py-2 font-semibold text-gray-800 transition-colors hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveChanges}
                        disabled={loading}
                        className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        {loading ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Switch to Client Button (below profile info) */}
            <div className="rounded-lg bg-blue-600 shadow-sm">
              <button
                onClick={handleSwitchToClient}
                disabled={isSwitchingRole}
                className={`group flex w-full items-center justify-between rounded-lg p-4 text-left transition-colors ${
                  isSwitchingRole
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-yellow-400"
                }`}
              >
                <div className="flex items-center">
                  <ArrowPathRoundedSquareIcon
                    className={`mr-4 h-6 w-6 ${
                      isSwitchingRole
                        ? "animate-spin text-yellow-400"
                        : "text-white group-hover:text-black"
                    }`}
                  />
                  <span className="text-md font-medium text-white group-hover:text-gray-800">
                    {isSwitchingRole
                      ? "Switching Role..."
                      : "Switch into Client"}
                  </span>
                </div>
                {!isSwitchingRole && (
                  <ChevronRightIcon className="h-5 w-5 text-white group-hover:text-black" />
                )}
              </button>
            </div>
            <div className="hidden lg:block">
              <button
                onClick={logout}
                className="mt-2 flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-3 text-lg font-semibold text-red-600 shadow transition-colors hover:bg-red-50"
              >
                Log Out
              </button>
            </div>
          </div>
          {/* --- Right Column: Reputation and Stats --- */}
          <div className="mt-8 lg:col-span-2 lg:mt-0">
            <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-blue-100 p-8 shadow-xl">
              <div className="mb-6 flex items-center justify-center gap-2">
                <h3 className="text-center text-2xl font-bold tracking-tight text-black drop-shadow-sm">
                  Your Reputation Score
                </h3>
                <button
                  type="button"
                  aria-label="What is reputation score?"
                  className="rounded-full p-1 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onClick={() => setShowAboutInfo(true)}
                >
                  <InformationCircleIcon className="h-6 w-6 text-blue-500" />
                </button>
                <AboutReputationScoreModal
                  show={showAboutInfo}
                  onClose={() => setShowAboutInfo(false)}
                  reputationDisplay={reputationDisplay}
                />
              </div>
              {reputationLoading ? (
                <div className="flex justify-center">
                  <div className="flex h-48 w-48 items-center justify-center">
                    <div className="text-center">
                      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                      <p className="text-sm text-gray-500">
                        Loading reputation score...
                      </p>
                    </div>
                  </div>
                </div>
              ) : reputationError ? (
                <div className="flex justify-center">
                  <div className="flex h-48 w-48 items-center justify-center">
                    <div className="text-center">
                      <div className="mb-4 text-red-500">
                        <svg
                          className="mx-auto h-16 w-16"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-red-600">
                        {reputationError}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        Please check your connection and try again
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  <div className="mb-2 flex items-center justify-center gap-2">
                    <ReputationScore score={reputationScore} />
                    <button
                      onClick={forceRefreshReputation}
                      className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      title="Refresh reputation score"
                    >
                      <ArrowPathRoundedSquareIcon className="h-4 w-4" />
                    </button>
                  </div>
                  {reputationDisplay && (
                    <>
                      <div className="flex w-full justify-center">
                        <TrustLevelBadge
                          trustLevel={reputationDisplay.level}
                          onInfoClick={() => setShowBadgeInfo(true)}
                          infoOpen={showBadgeInfo}
                        />
                      </div>
                      <TrustLevelInfoModal
                        show={showBadgeInfo}
                        onClose={() => setShowBadgeInfo(false)}
                      />
                      <AboutReputationScoreModal
                        show={showAboutInfo}
                        onClose={() => setShowAboutInfo(false)}
                        reputationDisplay={reputationDisplay}
                      />
                    </>
                  )}
                </div>
              )}
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
      </main>
      <div className="mt-8 block w-full px-4 lg:hidden">
        <button
          onClick={logout}
          className="flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-3 text-lg font-semibold text-red-600 shadow transition-colors hover:bg-red-50"
        >
          Log Out
        </button>
      </div>
      <BottomNavigation />
    </div>
  );
};

const ReputationScore: React.FC<{ score: number }> = ({ score }) => {
  const getScoreColor = (value: number) => {
    if (value >= 80) return "#2563eb";
    if (value >= 60) return "#60a5fa";
    if (value >= 40) return "#facc15";
    return "#fef08a";
  };

  const color = getScoreColor(score);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex h-48 w-48 items-center justify-center">
      <svg className="absolute h-full w-full" viewBox="0 0 100 100">
        <circle
          className="text-gray-200"
          strokeWidth="10"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
        />
        <circle
          stroke={color}
          strokeWidth="10"
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
            transition: "stroke-dashoffset 0.5s ease-in-out",
          }}
        />
      </svg>
      <div className="text-center">
        <span className="text-5xl font-bold text-gray-800">{score}</span>
      </div>
    </div>
  );
};

export default ProviderProfilePage;
