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

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm ${className}`}
    >
      <button
        onClick={handleSwitch}
        disabled={switching}
        className="group flex w-full items-center justify-between p-4 text-left transition-all hover:bg-gray-50 disabled:opacity-70"
      >
        <div className="flex items-center">
          <div className="mr-4 rounded-lg border border-blue-200 bg-white p-2 text-blue-600">
            <ArrowPathRoundedSquareIcon
              className={`h-6 w-6 transition-transform duration-300 ${
                switching ? "animate-spin" : ""
              }`}
            />
          </div>
          <span
            className={`text-base font-bold text-blue-700 ${switching ? "opacity-70" : ""}`}
          >
            {switching ? "Switching..." : buttonText}
          </span>
        </div>
        <ChevronRightIcon
          className={`h-5 w-5 text-blue-400 ${switching ? "opacity-70" : ""}`}
        />
      </button>
    </div>
  );
};

export default RoleSwitchButton;
