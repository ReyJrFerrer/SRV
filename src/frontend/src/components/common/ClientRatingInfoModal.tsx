import React from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  role: "provider" | "client";
}

const ClientRatingInfoModal: React.FC<Props> = ({ isOpen, onClose, role }) => {
  if (!isOpen) return null;

  const providerText = (
    <>
      As a service provider, you can rate clients after completing a
      booking. Ratings help other providers and SRV maintain quality and
      trust across the platform. Be honest and fair — ratings should reflect
      the client's punctuality, communication, and overall conduct.
    </>
  );

  const clientText = (
    <>
      Providers can leave ratings and reviews about clients after a booking
      completes. These ratings contribute to your reputation score and help
      providers decide whether to accept future bookings. Keep good
      communication and timely payments to maintain a positive reputation.
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-2 text-lg font-bold">About Client Ratings</h2>
        <div className="mb-4 text-sm text-gray-700">
          {role === "provider" ? providerText : clientText}
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientRatingInfoModal;
