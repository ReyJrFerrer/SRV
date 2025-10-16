import React, { useEffect, useState } from "react";
import ServiceListItem from "./ServiceListItem"; // Your individual card component
import {
  EnrichedService,
  useAllServicesWithProviders,
} from "../../hooks/serviceInformation";
import { getCategoryImage } from "../../utils/serviceHelpers";
import { getFirebaseFirestore } from "../../services/firebaseApp";
import {
  collection,
  onSnapshot,
  query,
  DocumentData,
} from "firebase/firestore";

interface ServicesListProps {
  className?: string;
}

const ServicesList: React.FC<ServicesListProps> = ({ className = "" }) => {
  const { services, loading, error } = useAllServicesWithProviders();

  // Local state for realtime Firestore-backed services. If this is non-null
  // we prefer it over the canister-based `services` returned by the hook.
  const [realtimeServices, setRealtimeServices] = useState<
    EnrichedService[] | null
  >(null);

  // Subscribe to Firestore 'services' collection for realtime updates
  // from the emulator (localhost). We map service documents into the
  // EnrichedService shape used by the UI. Assumptions about Firestore schema
  // are noted below.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const firestore = getFirebaseFirestore();

        // Build a simple query without orderBy to avoid indexing issues
        const q = query(collection(firestore, "services"));

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const mapped: EnrichedService[] = snapshot.docs.map((doc) => {
              const data = doc.data() as DocumentData;

              // Map Firestore document fields to EnrichedService. These are
              // best-effort mappings — adjust to match your exact Firestore schema.
              const priceAmount =
                data.price?.amount ??
                (typeof data.price === "number" ? data.price : 0);
              const ratingAverage = data.rating?.average ?? data.rating ?? 0;

              const slug =
                data.slug ||
                (data.title &&
                  String(data.title)
                    .toLowerCase()
                    .replace(/[^^\w\s-]/g, "")
                    .replace(/\s+/g, "-")) ||
                doc.id;

              console.log("From Servie List Row", data);

              return {
                id: doc.id,
                slug,
                name: data.title || data.name || "",
                title: data.title || data.name || "",
                heroImage:
                  data.heroImage ||
                  data.category?.imageUrl ||
                  getCategoryImage(
                    data.category?.name || data.category?.slug || "others",
                  ),
                description: data.description || "",

                providerName:
                  data.providerName,
                providerAvatar: data.providerAvatar || data.provider?.avatar || "",
                providerId: data.providerId || data.provider?.id || "",

                rating: {
                  average: ratingAverage,
                  count: data.rating?.count ?? data.reviewCount ?? 0,
                },

                price: {
                  amount: priceAmount,
                  unit: data.price?.unit || "starting from",
                  display: `₱${priceAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`,
                },

                location: {
                  serviceDistance: data.location?.serviceDistance,
                  address: data.location?.address || "",
                  city: data.location?.city || "",
                  state: data.location?.state || "",
                  serviceDistanceUnit: data.location?.serviceDistanceUnit,
                },

                category: {
                  name: data.category?.name || data.category || "",
                  id: data.category?.id || "",
                  slug: data.category?.slug || "",
                },

                availability: {
                  isAvailable: Boolean(
                    data.availability?.isAvailable ?? data.status === "Available",
                  ),
                },
              } as EnrichedService;
            });

            // Sort by createdAt in memory if the field exists
            const sorted = mapped.sort((a, b) => {
              const aData = snapshot.docs.find(doc => doc.id === a.id)?.data();
              const bData = snapshot.docs.find(doc => doc.id === b.id)?.data();
              const aTime = aData?.createdAt?.toMillis?.() ?? 0;
              const bTime = bData?.createdAt?.toMillis?.() ?? 0;
              return bTime - aTime;
            });

            setRealtimeServices(sorted);
          },
          (err) => {
            // keep console error but don't break UI
            // eslint-disable-next-line no-console
            console.error("Realtime services listener error:", err);
            // Fallback to canister services on error
            setRealtimeServices(null);
          },
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to setup Firestore listener:", error);
        // Fallback to canister services
        setRealtimeServices(null);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const enhanceService = (service: EnrichedService): EnrichedService => ({
    ...service,
    heroImage: getCategoryImage(service.category.name),
    providerName: service.providerName,
    providerAvatar: service.providerAvatar,
    rating: {
      average: service.rating.average ?? 0,
      count: service.rating.count ?? 0,
    },
    price: {
      amount: service.price.amount,
      unit: service.price.unit,
      display: `₱${service.price.amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    },
    location: {
      serviceDistance: service.location?.serviceDistance,
      address: service.location?.address,
      city: service.location?.city,
      state: service.location?.state,
      serviceDistanceUnit: service.location?.serviceDistanceUnit,
    },
  });

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="mb-4 flex items-center justify-between">
          <div className="h-7 w-32 animate-pulse rounded-md bg-gray-200"></div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-lg bg-white shadow-sm"
            >
              {/* Image skeleton */}
              <div className="aspect-video w-full animate-pulse bg-gray-200"></div>
              {/* Content skeleton */}
              <div className="p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
                  <div className="h-3 w-16 animate-pulse rounded bg-gray-200"></div>
                </div>
                <div className="mb-2 h-4 w-full animate-pulse rounded bg-gray-200"></div>
                <div className="mb-2 h-3 w-24 animate-pulse rounded bg-gray-200"></div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                  <div className="h-5 w-16 animate-pulse rounded bg-gray-200"></div>
                  <div className="h-3 w-12 animate-pulse rounded bg-gray-200"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <h2 className="mb-4 text-lg font-bold sm:text-xl">Book Now!</h2>
        <p className="text-red-500">Error loading services: {error.message}</p>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-full ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold sm:text-xl">Book Now!</h2>
      </div>

      {(realtimeServices ?? services).length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">
            No top-rated services available at the moment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
          {(realtimeServices ?? services).map((service) => (
            <div key={service.id}>
              <ServiceListItem service={enhanceService(service)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ServicesList;
