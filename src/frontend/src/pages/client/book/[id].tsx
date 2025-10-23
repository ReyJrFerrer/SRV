import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ClientBookingPageComponent from "../../../components/client/ClientBookingPageComponent";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

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
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex max-w-4xl items-center px-4 py-3 sm:px-6">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 flex-shrink-0 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
          </button>
          <div className="flex-grow lg:hidden"></div>
          <h1 className="flex-grow text-2xl font-extrabold tracking-tight text-black sm:text-left">
            Book Service
          </h1>
          <div className="flex-grow lg:hidden"></div>
          <div className="hidden lg:flex-grow"></div>
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
