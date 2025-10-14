import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ClientBookingPageComponent from "../../../components/client/ClientBookingPageComponent";

const BookingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const serviceSlug = id;

  // Set document title
  useEffect(() => {
    document.title = "Book Service | SRV";
  }, []);

  // Show loading state while there's no serviceSlug
  if (!serviceSlug) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="text-2xl text-gray-600 hover:text-gray-800"
          >
            ←
          </button>
          <h1 className="text-lg font-medium text-gray-900">Book Service</h1>
          <div className="w-8"></div> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <ClientBookingPageComponent />
      </main>
    </div>
  );
};

export default BookingPage;
