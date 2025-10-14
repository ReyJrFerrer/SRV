import React from "react";
import {
  ChevronLeftIcon,
  CheckCircleIcon,
  StarIcon,
} from "@heroicons/react/24/solid";

// --- Data Types ---
interface ProviderProfile {
  name: string;
  bio: string;
  profilePicUrl: string;
  ratings: number;
  reviews: number;
  location: string;
  availability: string;
  isVerified: boolean;
  serviceRequirements: string[];
  servicePhotos: string[];
  certifications: string[];
  stats: {
    projects: number;
    reviews: number;
    years: number;
  };
}

interface Service {
  title: string;
  price: string;
  details: string[];
}

interface PublicProfileViewProps {
  providerData: ProviderProfile & { services: Service[] };
}

const renderStars = (rating: number) => {
  const stars = [];
  for (let i = 0; i < 5; i++) {
    stars.push(
      <StarIcon
        key={i}
        className={`h-5 w-5 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
        aria-hidden="true"
      />,
    );
  }
  return stars;
};

const ServiceCard: React.FC<{ service: Service }> = ({ service }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
    <h3 className="mb-1 text-lg font-bold">{service.title}</h3>
    <span className="text-lg font-semibold text-blue-500">{service.price}</span>
    <p className="mt-2 text-sm text-gray-600">{service.details[0]}</p>
    <h4 className="mt-3 mb-1 text-sm font-semibold">Includes:</h4>
    <ul className="space-y-1 text-sm">
      {service.details.map((detail, index) => (
        <li key={index} className="flex items-start">
          <CheckCircleIcon className="mt-0.5 mr-2 h-4 w-4 flex-shrink-0 text-blue-500" />
          <span>{detail}</span>
        </li>
      ))}
    </ul>
  </div>
);

const PublicProfileView: React.FC<PublicProfileViewProps> = ({
  providerData,
}) => {
  const data = providerData;

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="flex items-center justify-between border-b bg-white px-4 py-3 shadow-sm">
        <button aria-label="Go back">
          <ChevronLeftIcon className="h-6 w-6 text-gray-600" />
        </button>
        <span className="text-lg font-bold text-blue-600">SRV</span>
        <div></div>
      </header>
      <main className="container mx-auto max-w-xl px-4 py-6">
        {/* Profile Card Section */}
        <section className="rounded-lg bg-white shadow-lg">
          <div className="relative">
            <img
              src={data.profilePicUrl}
              alt={data.name}
              width={500}
              height={300}
              className="h-auto w-full rounded-t-lg object-cover"
            />
            <div className="absolute top-4 right-4 left-4 flex items-center justify-between">
              <div className="flex items-center space-x-2 rounded-full bg-white/70 px-3 py-1 backdrop-blur-sm">
                <h1 className="text-xl font-bold">{data.name}</h1>
                {data.isVerified && (
                  <CheckCircleIcon className="h-5 w-5 fill-blue-500 text-blue-500" />
                )}
              </div>
            </div>
            <div className="absolute right-4 bottom-4 flex space-x-2">
              <button className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-md">
                Message
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="mb-2 flex items-center">
              {renderStars(data.ratings)}
              <span className="ml-2 text-sm text-gray-600">
                {data.ratings} ({data.reviews} reviews)
              </span>
            </div>
            <p className="mb-4 text-sm text-gray-700">{data.bio}</p>
            <div className="mb-2 flex flex-wrap gap-4 text-sm text-gray-500">
              <span>
                <strong>Location:</strong> {data.location}
              </span>
              <span>
                <strong>Availability:</strong> {data.availability}
              </span>
            </div>
            <div className="mb-2 flex gap-4 text-sm">
              <span className="rounded bg-blue-50 px-2 py-1 text-blue-700">
                {data.stats.projects} Projects
              </span>
              <span className="rounded bg-yellow-50 px-2 py-1 text-yellow-700">
                {data.stats.reviews} Reviews
              </span>
              <span className="rounded bg-green-50 px-2 py-1 text-green-700">
                {data.stats.years} Years Experience
              </span>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="mt-6">
          <h2 className="mb-4 text-xl font-bold text-gray-800">Services</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {data.services.map((service, index) => (
              <ServiceCard key={index} service={service} />
            ))}
          </div>
        </section>

        {/* Credentials, Requirements, Photos, Certifications */}
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-bold text-gray-800">
            Credentials & Requirements
          </h2>
          <div className="mb-2">
            <span className="font-semibold text-gray-700">
              Service Requirements:
            </span>
            <ul className="ml-2 list-inside list-disc text-sm text-gray-600">
              {data.serviceRequirements.map((req, idx) => (
                <li key={idx}>{req}</li>
              ))}
            </ul>
          </div>
          {data.certifications.length > 0 && (
            <div className="mb-2">
              <span className="font-semibold text-gray-700">
                Certifications:
              </span>
              <div className="mt-1 flex gap-2">
                {data.certifications.map((cert, idx) => (
                  <img
                    key={idx}
                    src={cert}
                    alt="Certification"
                    className="h-12 w-12 rounded border"
                  />
                ))}
              </div>
            </div>
          )}
          {data.servicePhotos.length > 0 && (
            <div className="mb-2">
              <span className="font-semibold text-gray-700">
                Service Photos:
              </span>
              <div className="mt-1 flex gap-2">
                {data.servicePhotos.map((photo, idx) => (
                  <img
                    key={idx}
                    src={photo}
                    alt="Service"
                    className="h-16 w-16 rounded border object-cover"
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
export default PublicProfileView;
