import { useProfileImage } from "../../hooks/useMediaLoader";
export const ProfileImage: React.FC<{
  profilePictureUrl?: string;
  userName: string;
  size?: string;
  className?: string;
}> = ({ profilePictureUrl, userName, size = "h-10 w-10", className = "" }) => {
  const { profileImageUrl, isLoading, isUsingDefaultAvatar } =
    useProfileImage(profilePictureUrl);

  if (isLoading) {
    return (
      <div className={`${size} ${className}`}>
        <div className={`${size} animate-pulse rounded-full bg-gray-300`}></div>
      </div>
    );
  }

  if (isUsingDefaultAvatar || !profileImageUrl) {
    return (
      <img
        src={"/default-provider.svg"}
        alt={userName}
        className={`${size} rounded-full border-2 border-blue-100 object-cover shadow ${className}`}
        onError={(e) => {
          // Prevent infinite loop - if default also fails, show nothing rather than error
          if ((e.target as HTMLImageElement).src !== "/default-provider.svg") {
            (e.target as HTMLImageElement).src = "/default-provider.svg";
          }
        }}
      />
    );
  }

  return (
    <img
      src={profileImageUrl}
      alt={userName}
      className={`${size} rounded-full border-2 border-blue-100 object-cover shadow ${className}`}
    />
  );
};
