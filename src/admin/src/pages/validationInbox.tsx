import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ValidationInboxHeader,
  ValidationInboxStats,
  CertificateSection,
  MediaViewModal,
  CertificateCard,
  ProcessedCertificateCard,
} from "../components";
import {
  calculateStats,
  extractMediaIdFromUrl,
  addCertificateToServices,
  extractMediaIdFromUrlSimple,
  createMediaModalState,
  createClosedMediaModalState,
} from "../utils/validationInboxUtils";

export const ValidationInboxPage: React.FC = () => {
  const navigate = useNavigate();
  const [servicesWithCertificates, setServicesWithCertificates] = useState<
    any[]
  >([]);
  const [certificateLoading, setCertificateLoading] = useState(false);
  const [approvingCertificate, setApprovingCertificate] = useState<
    string | null
  >(null);
  const [rejectingCertificate, setRejectingCertificate] = useState<
    string | null
  >(null);

  // Statistics state
  const [stats, setStats] = useState({
    totalCertificates: 0,
    certificatesPending: 0,
    completedToday: 0,
    completedTotal: 0,
    rejectedTotal: 0,
  });

  // Certificate validation state
  const [approvedCertificates, setApprovedCertificates] = useState<any[]>([]);
  const [rejectedCertificates, setRejectedCertificates] = useState<any[]>([]);

  const [mediaModal, setMediaModal] = useState<{
    isOpen: boolean;
    mediaItem: {
      id: string;
      url: string;
      fileName: string;
      contentType: string;
    } | null;
    loading: boolean;
    error: string | null;
  }>({
    isOpen: false,
    mediaItem: null,
    loading: false,
    error: null,
  });

  // Mobile bottom action bar visibility
  const [showMobileBar, setShowMobileBar] = useState(false);

  // Calculate statistics
  useEffect(() => {
    const statsData = calculateStats(
      servicesWithCertificates,
      approvedCertificates,
      rejectedCertificates,
    );
    setStats(statsData);
  }, [servicesWithCertificates, approvedCertificates, rejectedCertificates]);

  // Load services with certificates
  const loadServicesWithCertificates = async () => {
    setCertificateLoading(true);
    try {
      const { adminServiceCanister } = await import(
        "../services/adminServiceCanister"
      );
      const services = await adminServiceCanister.getServicesWithCertificates();
      setServicesWithCertificates(services);
    } catch (error) {
      console.error("Error loading services with certificates:", error);
    } finally {
      setCertificateLoading(false);
    }
  };

  // Load validated certificates from backend
  const loadValidatedCertificates = async () => {
    try {
      const { adminServiceCanister } = await import(
        "../services/adminServiceCanister"
      );
      const validatedCerts =
        await adminServiceCanister.getValidatedCertificates();
      setApprovedCertificates(validatedCerts);
    } catch (error) {
      console.error("Error loading validated certificates:", error);
    }
  };

  // Load rejected certificates from backend
  const loadRejectedCertificates = async () => {
    try {
      const { adminServiceCanister } = await import(
        "../services/adminServiceCanister"
      );
      const rejectedCerts =
        await adminServiceCanister.getRejectedCertificates();
      setRejectedCertificates(rejectedCerts);
    } catch (error) {
      console.error("Error loading rejected certificates:", error);
    }
  };

  // Load initial data on mount
  useEffect(() => {
    loadServicesWithCertificates();
    loadValidatedCertificates();
    loadRejectedCertificates();
  }, []);

  // Show mobile bottom action bar when header scrolls out
  useEffect(() => {
    const onScroll = () => setShowMobileBar(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleApproveCertificate = async (
    service: any,
    certificateIndex: number,
    certificateUrl: string,
  ) => {
    const certificateKey = `${service.serviceId}-${certificateIndex}`;
    setApprovingCertificate(certificateKey);
    try {
      const mediaId = await extractMediaIdFromUrl(certificateUrl);

      if (!mediaId || mediaId.trim() === "") {
        throw new Error("Media ID is required but was empty or invalid");
      }

      const { adminServiceCanister } = await import(
        "../services/adminServiceCanister"
      );
      await adminServiceCanister.updateCertificateValidationStatus(
        mediaId,
        "Validated",
      );

      await Promise.all([
        loadServicesWithCertificates(),
        loadValidatedCertificates(),
        loadRejectedCertificates(),
      ]);
    } catch (error) {
      console.error("Error approving certificate:", error);
    } finally {
      setApprovingCertificate(null);
    }
  };

  const handleRejectCertificate = async (
    service: any,
    certificateIndex: number,
    certificateUrl: string,
  ) => {
    const certificateKey = `${service.serviceId}-${certificateIndex}`;
    setRejectingCertificate(certificateKey);
    try {
      const mediaId = await extractMediaIdFromUrl(certificateUrl);

      if (!mediaId || mediaId.trim() === "") {
        throw new Error("Media ID is required but was empty or invalid");
      }

      const { adminServiceCanister } = await import(
        "../services/adminServiceCanister"
      );
      await adminServiceCanister.updateCertificateValidationStatus(
        mediaId,
        "Rejected",
      );

      await Promise.all([
        loadServicesWithCertificates(),
        loadValidatedCertificates(),
        loadRejectedCertificates(),
      ]);
    } catch (error) {
      console.error("Error rejecting certificate:", error);
    } finally {
      setRejectingCertificate(null);
    }
  };
  const handleUndoCertificate = async (certificate: any) => {
    try {
      const mediaId = extractMediaIdFromUrlSimple(certificate.certificateUrl);

      if (mediaId) {
        // Reset validation status to Pending in media canister
        const { adminServiceCanister } = await import(
          "../services/adminServiceCanister"
        );
        await adminServiceCanister.updateCertificateValidationStatus(
          mediaId,
          "Pending",
        );
      }

      // Remove from approved/rejected lists using the unique ID
      setApprovedCertificates((prev) =>
        prev.filter((cert) => cert.id !== certificate.id),
      );
      setRejectedCertificates((prev) =>
        prev.filter((cert) => cert.id !== certificate.id),
      );

      // Reload pending certificates to show the undone certificate
      await loadServicesWithCertificates();

      // Add the certificate back to pending list
      setServicesWithCertificates((prev) =>
        addCertificateToServices(prev, certificate),
      );
    } catch (error) {
      console.error("Error undoing certificate:", error);
    }
  };

  const handleViewCertificate = (url: string) => {
    setMediaModal(createMediaModalState(url));
  };

  // Handle modal close
  const handleCloseMediaModal = () => {
    setMediaModal(createClosedMediaModalState());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Media View Modal */}
      <MediaViewModal
        isOpen={mediaModal.isOpen}
        onClose={handleCloseMediaModal}
        mediaItem={mediaModal.mediaItem}
        loading={mediaModal.loading}
        error={mediaModal.error}
      />

      <ValidationInboxHeader showMobileBar={showMobileBar} />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <ValidationInboxStats stats={stats} />

          {/* Pending Validations List */}
          <CertificateSection
            title="Pending Certificate Validations"
            description="Review and approve submitted certificate images from service providers"
            badge={
              stats.certificatesPending > 0
                ? {
                    text: `${stats.certificatesPending} pending`,
                    color: "yellow",
                  }
                : undefined
            }
            loading={certificateLoading}
            emptyMessage={{
              title: "All caught up!",
              description:
                "No services with certificates to validate at the moment.",
            }}
          >
            {servicesWithCertificates.flatMap((service) => {
              return service.certificateUrls.map(
                (url: string, index: number) => {
                  return (
                    <CertificateCard
                      key={`${service.serviceId}-${index}`}
                      service={service}
                      certificateUrl={url}
                      certificateIndex={index}
                      onViewCertificate={handleViewCertificate}
                      onApprove={handleApproveCertificate}
                      onReject={handleRejectCertificate}
                      isApproving={
                        approvingCertificate === `${service.serviceId}-${index}`
                      }
                      isRejecting={
                        rejectingCertificate === `${service.serviceId}-${index}`
                      }
                      onCardClick={(
                        service,
                        _certificateIndex,
                        _certificateUrl,
                      ) => {
                        navigate(
                          `/user/${service.providerId}/services/${service.serviceId}?from=validation-inbox`,
                        );
                      }}
                    />
                  );
                },
              );
            })}
          </CertificateSection>

          {/* Completed Certificate Validations */}
          <CertificateSection
            title="Completed Certificate Validations"
            description="Successfully approved certificate validations"
            badge={{
              text: `${approvedCertificates.length} completed`,
              color: "green",
            }}
            emptyMessage={{
              title: "No completed validations",
              description: "Approved certificates will appear here.",
            }}
          >
            {approvedCertificates.map((certificate) => (
              <ProcessedCertificateCard
                key={certificate.id}
                certificate={certificate}
                onViewCertificate={handleViewCertificate}
                onUndo={handleUndoCertificate}
                isApproved={true}
                onCardClick={(service, certificateIndex, certificateUrl) => {
                  console.log("Validated certificate card clicked:", {
                    service,
                    certificateIndex,
                    certificateUrl,
                  });
                }}
              />
            ))}
          </CertificateSection>

          {/* Rejected Certificate Validations */}
          <CertificateSection
            title="Rejected Certificate Validations"
            description="Certificate validations that were rejected"
            badge={{
              text: `${rejectedCertificates.length} rejected`,
              color: "red",
            }}
            emptyMessage={{
              title: "No rejected validations",
              description: "Rejected certificates will appear here.",
            }}
          >
            {rejectedCertificates.map((certificate) => (
              <ProcessedCertificateCard
                key={certificate.id}
                certificate={certificate}
                onViewCertificate={handleViewCertificate}
                onUndo={handleUndoCertificate}
                isApproved={false}
                onCardClick={(service, certificateIndex, certificateUrl) => {
                  console.log("Rejected certificate card clicked:", {
                    service,
                    certificateIndex,
                    certificateUrl,
                  });
                }}
              />
            ))}
          </CertificateSection>
        </div>
      </main>
    </div>
  );
};
