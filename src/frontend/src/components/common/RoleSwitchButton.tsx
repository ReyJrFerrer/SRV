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

  const borderColor = isProvider ? "border-yellow-200" : "border-blue-200";
  const bgColor = isProvider ? "bg-white" : "bg-white";
  const iconBg = isProvider
    ? "border-yellow-200 bg-white"
    : "border-blue-200 bg-white";
  const textColor = isProvider ? "text-yellow-700" : "text-blue-700";
  const iconColor = isProvider ? "text-yellow-600" : "text-blue-600";
  const arrowColor = isProvider ? "text-yellow-400" : "text-blue-400";

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${borderColor} ${bgColor} shadow-sm ${className}`}
    >
      <button
        onClick={handleSwitch}
        disabled={switching}
        className="group flex w-full items-center justify-between p-4 text-left transition-all hover:bg-gray-50 disabled:opacity-70"
      >
        <div className="flex items-center">
          <div className={`mr-4 rounded-lg border ${iconBg} p-2 ${iconColor}`}>
            <ArrowPathRoundedSquareIcon
              className={`h-6 w-6 transition-transform duration-300 ${
                switching ? "animate-spin" : ""
              }`}
            />
          </div>
          <span
            className={`text-base font-bold ${textColor} ${switching ? "opacity-70" : ""}`}
          >
            {switching ? "Switching..." : buttonText}
          </span>
        </div>
        <ChevronRightIcon
          className={`h-5 w-5 ${arrowColor} ${switching ? "opacity-70" : ""}`}
        />
      </button>
    </div>
  );
};

export default RoleSwitchButton;
