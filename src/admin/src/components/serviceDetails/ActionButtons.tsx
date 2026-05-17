import React from "react";
import { TrashIcon } from "@heroicons/react/24/solid";

interface Props {
  isDeleting: boolean;
  onDeleteClick: () => void;
}

const ActionButtons: React.FC<Props> = ({
  isDeleting,
  onDeleteClick,
}) => {
  return (
    <div className="flex flex-col-reverse items-center justify-between gap-4 border-t border-gray-200 pt-6 sm:flex-row">
      <button
        onClick={onDeleteClick}
        disabled={isDeleting}
        className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-4 text-sm font-medium text-white shadow-sm transition-all sm:w-auto ${
          isDeleting
            ? "cursor-not-allowed opacity-70"
            : "hover:bg-red-700"
        }`}
      >
        <TrashIcon className="h-5 w-5" />
        {isDeleting ? "Deleting..." : "Delete Service"}
      </button>
    </div>
  );
};

export default ActionButtons;
