import React from "react";

/**
 * Reusable skeleton loader components for consistent loading states
 */

export const CircleSkeleton: React.FC<{
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}> = ({ size = "md", className = "" }) => {
  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
    xl: "h-48 w-48",
  };

  return (
    <div
      className={`animate-pulse rounded-full bg-gray-200 ${sizeClasses[size]} ${className}`}
    />
  );
};

export const TextSkeleton: React.FC<{
  width?: string;
  height?: string;
  className?: string;
}> = ({ width = "w-32", height = "h-4", className = "" }) => {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${width} ${height} ${className}`}
    />
  );
};

export const RectangleSkeleton: React.FC<{
  width?: string;
  height?: string;
  className?: string;
}> = ({ width = "w-full", height = "h-24", className = "" }) => {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200 ${width} ${height} ${className}`}
    />
  );
};

export const CardSkeleton: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  return (
    <div className={`rounded-xl bg-white p-6 shadow-md ${className}`}>
      <div className="flex flex-col items-center space-y-4">
        <CircleSkeleton size="lg" />
        <TextSkeleton width="w-40" height="h-6" />
        <TextSkeleton width="w-32" height="h-4" />
      </div>
    </div>
  );
};

/**
 * Profile Picture Skeleton with border styling
 */
export const ProfilePictureSkeleton: React.FC<{
  borderColor?: string;
  size?: "sm" | "md" | "lg" | "xl";
}> = ({ borderColor = "border-gray-200", size = "lg" }) => {
  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
    xl: "h-48 w-48",
  };

  return (
    <div
      className={`animate-pulse rounded-full border-4 bg-gray-200 shadow-lg ${borderColor} ${sizeClasses[size]}`}
    >
      <div className="flex h-full w-full items-center justify-center">
        {/* Use Heroicons UserIcon for skeleton placeholder */}
        <svg
          className="h-1/2 w-1/2 text-gray-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6 20c0-2.21 3.58-4 6-4s6 1.79 6 4"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};

/**
 * Reputation Score Skeleton
 */
export const ReputationScoreSkeleton: React.FC = () => {
  return (
    <div className="relative flex h-48 w-48 items-center justify-center">
      <svg
        className="absolute h-full w-full animate-pulse"
        viewBox="0 0 100 100"
      >
        <circle
          className="text-gray-200"
          strokeWidth="10"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
        />
      </svg>
      <div className="flex flex-col items-center">
        <TextSkeleton width="w-16" height="h-12" className="mb-2" />
      </div>
    </div>
  );
};

/**
 * Stats Card Skeleton
 */
export const StatsCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
      <div className="mb-3 flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-gray-200" />
      <TextSkeleton width="w-16" height="h-8" className="mb-1" />
      <TextSkeleton width="w-24" height="h-3" />
    </div>
  );
};

/**
 * Badge Skeleton
 */
export const BadgeSkeleton: React.FC = () => {
  return (
    <div className="mt-4 flex flex-col items-center space-y-3">
      <div className="inline-flex animate-pulse items-center rounded-full border border-gray-200 bg-gray-100 px-6 py-3">
        <TextSkeleton width="w-24" height="h-5" />
      </div>
      <TextSkeleton width="w-48" height="h-3" />
      <TextSkeleton width="w-40" height="h-3" />
    </div>
  );
};

/**
 * Full Profile Skeleton Layout
 */
export const ProfileSkeleton: React.FC<{ role?: "client" | "provider" }> = ({
  role = "client",
}) => {
  const borderColor =
    role === "client" ? "border-yellow-200" : "border-blue-200";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
      {/* Left Column */}
      <div className="flex flex-col space-y-4 lg:col-span-1">
        <div className="rounded-xl bg-white p-6 shadow-md">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4 flex items-center justify-center">
              <ProfilePictureSkeleton borderColor={borderColor} size="lg" />
            </div>
            <TextSkeleton width="w-40" height="h-8" className="mb-2" />
            <TextSkeleton width="w-32" height="h-5" />
            <div className="mt-6">
              <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200" />
            </div>
          </div>
        </div>
        <div className="h-14 animate-pulse rounded-lg bg-gray-200" />
      </div>

      {/* Right Column */}
      <div className="mt-4 lg:col-span-2 lg:mt-0">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-blue-100 p-8 shadow-xl">
          <div className="mb-6">
            <TextSkeleton width="w-64" height="h-8" className="mx-auto" />
          </div>
          <div className="flex flex-col items-center gap-6">
            <ReputationScoreSkeleton />
            <BadgeSkeleton />
          </div>

          {/* Stats Section */}
          {role === "client" && (
            <div className="mt-8 space-y-6 border-t border-gray-200 pt-8">
              <div className="rounded-xl border border-yellow-200 bg-white p-5 shadow">
                <TextSkeleton width="w-48" height="h-6" className="mb-4" />
                <div className="space-y-2">
                  <TextSkeleton width="w-full" height="h-4" />
                  <TextSkeleton width="w-3/4" height="h-4" />
                </div>
              </div>
              <div>
                <TextSkeleton
                  width="w-64"
                  height="h-6"
                  className="mx-auto mb-4"
                />
                <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <StatsCardSkeleton key={i} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
