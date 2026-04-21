import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowPathRoundedSquareIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useUserProfile } from "../../hooks/useUserProfile";

type RoleSwitchButtonProps = {
  currentRole: "client" | "provider";
  className?: string;
  onSwitchSuccess?: () => void;
};

const RoleSwitchButton: React.FC<RoleSwitchButtonProps> = ({
  currentRole,
  className = "",
  onSwitchSuccess,
}) => {
  const navigate = useNavigate();
  const { switchRole } = useUserProfile();
  const [switching, setSwitching] = useState(false);

  const isClient = currentRole === "client";
  const isProvider = currentRole === "provider";

  const newRole = isClient ? "provider" : "client";
  const buttonText = isClient
    ? "Switch to SRVice Provider"
    : "Switch to Client";
  const navPath = `/${newRole}/home`;

  const handleSwitch = async () => {
    setSwitching(true);
    try {
      const success = await switchRole();
      if (success) {
        navigate(navPath);
        if (onSwitchSuccess) {
          onSwitchSuccess();
        }
      }
    } finally {
      setSwitching(false);
    }
  };

  // Client = blue solid, Provider = yellow solid
  const solidBg = isProvider ? "bg-yellow-500" : "bg-blue-600";
  const solidHover = isProvider ? "hover:bg-yellow-600" : "hover:bg-blue-700";
  const iconColor = isProvider ? "text-yellow-900" : "text-white";

  return (
    <button
      onClick={handleSwitch}
      disabled={switching}
      className={`flex w-full items-center justify-between rounded-2xl ${solidBg} ${solidHover} px-5 py-3.5 font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 ${className}`}
    >
      <div className="flex items-center">
        <ArrowPathRoundedSquareIcon
          className={`mr-3 h-6 w-6 ${iconColor} ${switching ? "animate-spin" : ""}`}
        />
        <span className={switching ? "opacity-70" : ""}>
          {switching ? "Switching..." : buttonText}
        </span>
      </div>
      <ChevronRightIcon
        className={`h-5 w-5 ${iconColor} ${switching ? "opacity-70" : ""}`}
      />
    </button>
  );
};

export default RoleSwitchButton;
