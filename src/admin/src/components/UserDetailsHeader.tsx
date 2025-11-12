import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ProfileImage } from "../../../frontend/src/components/common/ProfileImage";

interface UserDetailsHeaderProps {
  user: {
    id: string;
    name: string;
    biography?: string;
    profilePicture?: {
      imageUrl: string;
      thumbnailUrl: string;
    };
    isLocked: boolean;
    createdAt: Date;
    lastActivity: Date;
  };
  fromTicket: boolean;
  ticketId: string | null;
  formatDate: (date: Date) => string;
  onLockClick: () => void;
  onActivateClick: () => void;
  lockingAccount?: boolean;
}

// SVG Icon Components
const BackArrowIcon: React.FC<{ className?: string }> = ({ className = "mr-1 h-4 w-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const LockIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ServicesIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const BookingsIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const ChatIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const ReviewsIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const SpinnerIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// BackLink Component
const BackLink: React.FC<{ fromTicket: boolean; ticketId: string | null }> = ({ fromTicket, ticketId }) => {
  const to = fromTicket && ticketId ? `/ticket/${ticketId}` : "/users";
  const label = fromTicket && ticketId ? "Back to Ticket" : "Back to Users";
  
  return (
    <Link to={to} className="mr-4 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700">
      <BackArrowIcon />
      {label}
    </Link>
  );
};

// DateDisplay Component
const DateDisplay: React.FC<{ label: string; date: Date; formatDate: (date: Date) => string; className?: string }> = ({
  label,
  date,
  formatDate,
  className = "text-left",
}) => (
  <div className={className}>
    <p className="text-sm text-gray-500">{label}</p>
    <p className="text-sm font-medium text-gray-900">{formatDate(date)}</p>
  </div>
);

// ActionButton Component
interface ActionButtonProps {
  to?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: "default" | "gray" | "yellow" | "green";
  size?: "sm" | "md";
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  to,
  onClick,
  icon,
  label,
  variant = "default",
  size = "md",
  disabled = false,
}) => {
  const sizeClasses = size === "sm" ? "px-2 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const iconSize = size === "sm" ? "mr-1.5 h-3.5 w-3.5" : "mr-2 h-4 w-4";
  
  const variantClasses = {
    default: "border-gray-300 bg-white hover:bg-gray-50 focus:ring-indigo-500",
    gray: "border-gray-300 bg-gray-50 hover:bg-gray-100 focus:ring-gray-500",
    yellow: "border-yellow-300 bg-yellow-50 hover:bg-yellow-100 focus:ring-yellow-500",
    green: "border-green-300 bg-green-50 hover:bg-green-100 focus:ring-green-500",
  };
  
  const textColorClasses = {
    default: "text-gray-700",
    gray: "text-gray-700",
    yellow: "text-yellow-700",
    green: "text-green-700",
  };
  
  const baseClasses = `inline-flex items-center justify-center rounded-md border shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${sizeClasses} ${variantClasses[variant]} ${textColorClasses[variant]} ${disabled ? "disabled:cursor-not-allowed disabled:opacity-50" : ""}`;
  
  const content = (
    <>
      <span className={iconSize}>{icon}</span>
      {label}
    </>
  );
  
  if (to) {
    return <Link to={to} className={baseClasses}>{content}</Link>;
  }
  
  return (
    <button onClick={onClick} disabled={disabled} className={baseClasses}>
      {content}
    </button>
  );
};

// LockButton Component
interface LockButtonProps {
  isLocked: boolean;
  onLockClick: () => void;
  onActivateClick: () => void;
  lockingAccount: boolean;
  size?: "sm" | "md";
}

const LockButton: React.FC<LockButtonProps> = ({
  isLocked,
  onLockClick,
  onActivateClick,
  lockingAccount,
  size = "md",
}) => {
  if (!isLocked) {
    return (
      <ActionButton
        onClick={onLockClick}
        icon={<LockIcon />}
        label="Lock Account"
        variant="yellow"
        size={size}
      />
    );
  }
  
  return (
    <ActionButton
      onClick={onActivateClick}
      icon={
        lockingAccount ? (
          <SpinnerIcon className={size === "sm" ? "mr-1.5 h-3.5 w-3.5 animate-spin" : "mr-2 h-4 w-4 animate-spin"} />
        ) : (
          <CheckIcon />
        )
      }
      label={lockingAccount ? "Activating..." : "Activate Account"}
      variant="green"
      size={size}
      disabled={lockingAccount}
    />
  );
};

export const UserDetailsHeader: React.FC<UserDetailsHeaderProps> = ({
  user,
  fromTicket,
  ticketId,
  formatDate,
  onLockClick,
  onActivateClick,
  lockingAccount = false,
}) => {
  const navigate = useNavigate();
  
  const actionButtons = [
    {
      to: `/user/${user.id}/services`,
      icon: <ServicesIcon />,
      label: "View Services",
      variant: "default" as const,
    },
    {
      onClick: () => navigate(`/user/${user.id}/bookings`),
      icon: <BookingsIcon />,
      label: "View Bookings",
      variant: "gray" as const,
    },
    {
      onClick: () => navigate(`/user/${user.id}/chat`),
      icon: <ChatIcon />,
      label: "View Chats",
      variant: "default" as const,
    },
    {
      onClick: () => navigate(`/user/${user.id}/reviews`, { state: { from: "userDetails" } }),
      icon: <ReviewsIcon />,
      label: "View Reviews",
      variant: "default" as const,
    },
  ];

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <div className="flex items-center">
            <BackLink fromTicket={fromTicket} ticketId={ticketId} />
          </div>
          <div className="flex flex-nowrap items-start gap-4 lg:gap-6 mt-4">
            <div className="flex-shrink-0">
              <div className="flex items-center">
                <div className="h-16 w-16 flex-shrink-0">
                  <ProfileImage
                    profilePictureUrl={user.profilePicture?.thumbnailUrl || user.profilePicture?.imageUrl}
                    userName={user.name}
                    size="h-16 w-16"
                    className="shadow-lg ring-4 ring-white"
                  />
                </div>
                <div className="ml-6">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-baseline gap-3">
                      <h1 className="text-3xl font-bold leading-tight text-gray-900">{user.name}</h1>
                    </div>
                    {user.isLocked && (
                      <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-red-100 px-3 py-0.5 text-sm font-medium text-red-800">
                        <LockIcon className="h-4 w-4 text-red-700" />
                        <span className="leading-none">Account Locked</span>
                      </span>
                    )}
                    {user.biography && (
                      <p className="max-w-2xl text-sm text-gray-500">{user.biography}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 lg:ml-auto flex flex-col lg:items-end items-start lg:items-end">
              {/* Mobile date display */}
              <div className="flex items-center space-x-4 mt-4 ml-4 lg:hidden">
                <DateDisplay label="Member since" date={user.createdAt} formatDate={formatDate} />
                <DateDisplay label="Last activity" date={user.lastActivity} formatDate={formatDate} />
              </div>
              {/* Desktop buttons grid */}
              <div className="hidden lg:flex w-full justify-end">
                <div className="grid grid-flow-row auto-rows-max grid-cols-5 gap-2">
                  <div aria-hidden="true" />
                  <div aria-hidden="true" />
                  <div aria-hidden="true" />
                  <DateDisplay label="Member since" date={user.createdAt} formatDate={formatDate} className="text-right" />
                  <DateDisplay label="Last activity" date={user.lastActivity} formatDate={formatDate} className="text-right" />
                  {actionButtons.map((button, index) => (
                    <ActionButton key={index} size="md" {...button} />
                  ))}
                  <LockButton
                    isLocked={user.isLocked}
                    onLockClick={onLockClick}
                    onActivateClick={onActivateClick}
                    lockingAccount={lockingAccount}
                    size="md"
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Mobile buttons section */}
          <div className="w-full lg:hidden flex flex-wrap items-center gap-2 mt-4">
            {actionButtons.map((button, index) => (
              <ActionButton key={index} size="sm" {...button} />
            ))}
            <LockButton
              isLocked={user.isLocked}
              onLockClick={onLockClick}
              onActivateClick={onActivateClick}
              lockingAccount={lockingAccount}
              size="sm"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
