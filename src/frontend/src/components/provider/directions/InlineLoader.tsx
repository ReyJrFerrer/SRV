import React from "react";

const InlineLoader: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      <p className="text-sm text-gray-600">{message || "Loading map..."}</p>
    </div>
  </div>
);

export default InlineLoader;
