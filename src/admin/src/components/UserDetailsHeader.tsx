import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ProfileImage } from "../../../frontend/src/components/common/ProfileImage";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckIcon,
  ClipboardDocumentListIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  LockClosedIcon,
  Squares2X2Icon,
  StarIcon,
} from "@heroicons/react/24/outline";

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

// SVG Icon Components have been replaced with @heroicons/react counterparts

const truncateName = (name: string) =>
  name.length > 10 ? `${name.slice(0, 10)}...` : name;

// BackLink Component
const BackLink: React.FC<{ fromTicket: boolean; ticketId: string | null }> = ({
  fromTicket,
  ticketId,
}) => {
  const to = fromTicket && ticketId ? `/ticket/${ticketId}` : "/users";
  const label = fromTicket && ticketId ? "Back to Ticket" : "Back to Users";

  return (
    <Link
      to={to}
      className="mr-4 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
    >
      <ArrowLeftIcon className="mr-1 h-4 w-4" />
      {label}
    </Link>
  );
};

// DateDisplay Component
const DateDisplay: React.FC<{
  label: string;
  date: Date;
  formatDate: (date: Date) => string;
  className?: string;
}> = ({ label, date, formatDate, className = "text-left" }) => (
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
  const sizeClasses =
    size === "sm" ? "px-2 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const iconSize = size === "sm" ? "mr-1.5 h-3.5 w-3.5" : "mr-2 h-4 w-4";

  const variantClasses = {
    default: "border-gray-300 bg-white hover:bg-gray-50 focus:ring-indigo-500",
    gray: "border-gray-300 bg-gray-50 hover:bg-gray-100 focus:ring-gray-500",
    yellow:
      "border-yellow-300 bg-yellow-50 hover:bg-yellow-100 focus:ring-yellow-500",
    green:
      "border-green-300 bg-green-50 hover:bg-green-100 focus:ring-green-500",
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
    return (
      <Link to={to} className={baseClasses}>
        {content}
      </Link>
    );
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
        icon={<LockClosedIcon className="h-full w-full" />}
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
          <ArrowPathIcon className="h-full w-full animate-spin" />
        ) : (
          <CheckIcon className="h-full w-full" />
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

  const iconClass = "h-full w-full";

  const actionButtons = [
    {
      to: `/user/${user.id}/services`,
      icon: <Squares2X2Icon className={iconClass} />,
      label: "View Services",
      variant: "default" as const,
    },
    {
      onClick: () => navigate(`/user/${user.id}/bookings`),
      icon: <ClipboardDocumentListIcon className={iconClass} />,
      label: "View Bookings",
      variant: "gray" as const,
    },
    {
      onClick: () => navigate(`/user/${user.id}/chat`),
      icon: <ChatBubbleOvalLeftEllipsisIcon className={iconClass} />,
      label: "View Chats",
      variant: "default" as const,
    },
    {
      onClick: () =>
        navigate(`/user/${user.id}/reviews`, {
          state: { from: "userDetails" },
        }),
      icon: <StarIcon className={iconClass} />,
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
          <div className="mt-4 flex flex-nowrap items-start gap-4 lg:gap-6">
            <div className="flex-shrink-0">
              <div className="flex items-center">
                <div className="h-16 w-16 flex-shrink-0">
                  <ProfileImage
                    profilePictureUrl={
                      user.profilePicture?.thumbnailUrl ||
                      user.profilePicture?.imageUrl
                    }
                    userName={user.name}
                    size="h-16 w-16"
                    className="shadow-lg ring-4 ring-white"
                  />
                </div>
                <div className="ml-6">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-baseline gap-3">
                      <h1 className="text-3xl font-bold leading-tight text-gray-900">
                        <span className="lg:hidden">
                          {truncateName(user.name)}
                        </span>
                        <span className="hidden lg:inline">{user.name}</span>
                      </h1>
                    </div>
                    {user.isLocked && (
                      <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-red-100 px-3 py-0.5 text-sm font-medium text-red-800">
                        <LockClosedIcon className="h-4 w-4 text-red-700" />
                        <span className="leading-none">Account Locked</span>
                      </span>
                    )}
                    {user.biography && (
                      <p className="max-w-2xl text-sm text-gray-500">
                        {user.biography}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-shrink-0 flex-col items-start lg:ml-auto lg:items-end lg:items-end">
              {/* Mobile date display */}
              <div className="ml-4 mt-4 flex items-center space-x-4 lg:hidden">
                <DateDisplay
                  label="Member since"
                  date={user.createdAt}
                  formatDate={formatDate}
                />
                <DateDisplay
                  label="Last activity"
                  date={user.lastActivity}
                  formatDate={formatDate}
                />
              </div>
              {/* Desktop buttons grid */}
              <div className="hidden w-full justify-end lg:flex">
                <div className="grid grid-flow-row auto-rows-max grid-cols-5 gap-2">
                  <div aria-hidden="true" />
                  <div aria-hidden="true" />
                  <div aria-hidden="true" />
                  <DateDisplay
                    label="Member since"
                    date={user.createdAt}
                    formatDate={formatDate}
                    className="text-right"
                  />
                  <DateDisplay
                    label="Last activity"
                    date={user.lastActivity}
                    formatDate={formatDate}
                    className="text-right"
                  />
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
          <div className="mt-4 flex w-full flex-wrap items-center gap-2 lg:hidden">
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
