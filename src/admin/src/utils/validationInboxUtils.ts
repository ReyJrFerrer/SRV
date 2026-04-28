export const calculateStats = (
  servicesWithCertificates: any[],
  approvedCertificates: any[],
  rejectedCertificates: any[],
) => {
  const certificatesPending = servicesWithCertificates.reduce(
    (total, service) => total + service.certificateUrls.length,
    0,
  );
  const completedTotal = approvedCertificates.length;
  const rejectedTotal = rejectedCertificates.length;
  const totalCertificates =
    certificatesPending + completedTotal + rejectedTotal;
  const today = new Date().toDateString();
  const completedToday = approvedCertificates.filter(
    (cert) => new Date(cert.approvedAt).toDateString() === today,
  ).length;

  return {
    totalCertificates,
    certificatesPending,
    completedToday,
    completedTotal,
    rejectedTotal,
  };
};

// Extract media ID from certificate URL (handles Firebase Storage emulator, production, and legacy formats)
export const extractMediaIdFromUrl = async (
  certificateUrl: string,
): Promise<string> => {
  let mediaId: string | null = null;

  try {
    // Firebase Storage Emulator (localhost/127.0.0.1:9199)
    if (
      certificateUrl.includes("127.0.0.1:9199") ||
      certificateUrl.includes("localhost:9199")
    ) {
      const urlMatch = certificateUrl.match(/\/o\/([^?]+)/);
      if (urlMatch) {
        const decodedPath = decodeURIComponent(urlMatch[1]);
        const pathParts = decodedPath.split("/");
        const filename = pathParts[pathParts.length - 1];
        mediaId = filename?.split("_")[0] || null;
      }
    }
    // Firebase Storage Production (storage.googleapis.com)
    else if (certificateUrl.includes("storage.googleapis.com")) {
      const parts = certificateUrl.split("/");
      const filename = parts[parts.length - 1]?.split("?")[0];
      mediaId = filename?.split("_")[0] || null;
    } else if (certificateUrl.includes("/media/")) {
      mediaId =
        certificateUrl.split("/media/")[1]?.split("?")[0]?.split("/")[0] ||
        null;
    } else if (certificateUrl.startsWith("media://")) {
      mediaId = certificateUrl.replace("media://", "").split("/").pop() || null;
    }

    // Fallback: query Firestore by URL if extraction failed
    if (!mediaId) {
      console.warn(
        "Could not extract mediaId from URL, querying Firestore by URL:",
        certificateUrl,
      );
      try {
        const { collection, query, where, getDocs } = await import(
          "firebase/firestore"
        );
        const { getFirebaseFirestore } = await import(
          "../services/firebaseApp"
        );
        const firestore = getFirebaseFirestore();
        const mediaCollection = collection(firestore, "media");
        const q = query(mediaCollection, where("url", "==", certificateUrl));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          mediaId = querySnapshot.docs[0].id;
        } else {
          console.error("No media document found with URL:", certificateUrl);
          throw new Error("Could not find media document for certificate URL");
        }
      } catch (queryError) {
        console.error("Error querying Firestore for media by URL:", queryError);
        throw new Error(
          `Could not extract or find media ID from certificate URL: ${queryError instanceof Error ? queryError.message : String(queryError)}`,
        );
      }
    }
  } catch (extractError) {
    console.error(
      "Error extracting media ID from certificate URL:",
      certificateUrl,
      extractError,
    );
    throw new Error(
      `Could not extract media ID from certificate URL: ${extractError instanceof Error ? extractError.message : String(extractError)}`,
    );
  }

  if (!mediaId || mediaId.trim() === "") {
    console.error("Media ID is empty or invalid:", mediaId);
    throw new Error("Media ID is required but was empty or invalid");
  }

  return mediaId;
};

export const removeCertificateFromServices = (
  services: any[],
  serviceId: string,
  certificateIndex: number,
): any[] => {
  return services
    .map((s) => {
      if (s.serviceId === serviceId) {
        return {
          ...s,
          certificateUrls: s.certificateUrls.filter(
            (_url: string, index: number) => index !== certificateIndex,
          ),
        };
      }
      return s;
    })
    .filter((s) => s.certificateUrls.length > 0);
};

export const createCertificateData = (
  service: any,
  certificateIndex: number,
  certificateUrl: string,
  status: "approved" | "rejected",
) => {
  const uniqueId = `${service.serviceId}-${certificateUrl}-${Date.now()}`;
  return {
    service,
    certificateIndex,
    certificateUrl,
    ...(status === "approved"
      ? { approvedAt: new Date().toISOString() }
      : { rejectedAt: new Date().toISOString() }),
    id: uniqueId,
  };
};

export const addCertificateToServices = (
  services: any[],
  certificate: any,
): any[] => {
  const existingServiceIndex = services.findIndex(
    (s) => s.serviceId === certificate.service.serviceId,
  );

  if (existingServiceIndex !== -1) {
    const service = services[existingServiceIndex];
    if (!service.certificateUrls.includes(certificate.certificateUrl)) {
      return services.map((s, idx) =>
        idx === existingServiceIndex
          ? {
              ...s,
              certificateUrls: [
                ...s.certificateUrls,
                certificate.certificateUrl,
              ],
            }
          : s,
      );
    }
    return services;
  } else {
    return [
      ...services,
      {
        ...certificate.service,
        certificateUrls: [certificate.certificateUrl],
      },
    ];
  }
};

export const extractMediaIdFromUrlSimple = (
  certificateUrl: string,
): string | null => {
  return certificateUrl.split("/media/")[1] || null;
};

export const createMediaModalState = (url: string) => {
  return {
    isOpen: true,
    mediaItem: {
      id: "certificate",
      url: url,
      fileName: "Certificate",
      contentType: "image/jpeg",
    },
    loading: false,
    error: null,
  };
};

export const createClosedMediaModalState = () => {
  return {
    isOpen: false,
    mediaItem: null,
    loading: false,
    error: null,
  };
};
