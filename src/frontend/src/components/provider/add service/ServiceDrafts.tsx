import { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import BookingDrafts from "../../client/BookingDrafts";
import {
  saveFilesToIDB,
  getFilesFromIDB,
  getFilesEntries,
  deleteDraftFromIDB,
} from "../../../utils/draftStorage";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";

interface Props {
  formData: any;
  setFormData: (f: any) => void;
  serviceImageFiles: File[];
  setServiceImageFiles: (files: File[]) => void;
  imagePreviews: string[];
  setImagePreviews: (p: string[]) => void;
  certificationFiles: File[];
  setCertificationFiles: (files: File[]) => void;
  certificationPreviews: string[];
  setCertificationPreviews: (p: string[]) => void;
  initialServiceState: any;
  navigate: (to: any, opts?: any) => void;
}

// This component consolidates all draft/localStorage/IDB logic and renders
// the restore + exit (save draft) modals and the yellow draft banner.
const ServiceDrafts = forwardRef((props: Props, ref) => {
  const {
    formData,
    setFormData,
    serviceImageFiles,
    setServiceImageFiles,
    imagePreviews,
    setImagePreviews,
    certificationFiles,
    setCertificationFiles,
    certificationPreviews,
    setCertificationPreviews,
    initialServiceState,
    navigate,
  } = props;

  const ADD_SERVICE_DRAFT_KEY = "add_service_draft_v1";

  const [loadedDraft, setLoadedDraft] = useState<any | null>(null);
  const [draftAvailable, setDraftAvailable] = useState(false);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );

  // Detect draft on mount but DO NOT auto-restore
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADD_SERVICE_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft) {
        setLoadedDraft(draft);
        setDraftAvailable(true);
        setShowRestorePrompt(true);
      }
    } catch (e) {
      // ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced autosave of draft (do NOT try to save File objects)
  useEffect(() => {
    const handler = setTimeout(() => {
      try {
        const toSave = {
          formData: {
            // only save serializable fields from formData to avoid large blobs
            ...formData,
          },
          imagePreviews: imagePreviews || [],
          certificationPreviews: certificationPreviews || [],
        };
        localStorage.setItem(ADD_SERVICE_DRAFT_KEY, JSON.stringify(toSave));
      } catch (e) {
        // ignore quota errors
      }
    }, 700);
    return () => clearTimeout(handler);
  }, [formData, imagePreviews, certificationPreviews]);

  // Helper: save draft including file blobs to IndexedDB
  const saveDraftIncludingFiles = async () => {
    setIsSavingDraft(true);
    try {
      const toSave = {
        formData: { ...formData },
        // previews are already serializable
        imagePreviews: imagePreviews || [],
        certificationPreviews: certificationPreviews || [],
      };
      localStorage.setItem(ADD_SERVICE_DRAFT_KEY, JSON.stringify(toSave));

      // Save files to IDB so previews can persist across sessions
      if (serviceImageFiles && serviceImageFiles.length > 0) {
        await saveFilesToIDB(ADD_SERVICE_DRAFT_KEY, serviceImageFiles, "img");
      }
      if (certificationFiles && certificationFiles.length > 0) {
        await saveFilesToIDB(ADD_SERVICE_DRAFT_KEY, certificationFiles, "cert");
      }
      toast.success("Draft saved");
    } catch (e) {
      console.error("Failed to save draft:", e);
      toast.error("Failed to save draft");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const clearDraftCompletely = async () => {
    try {
      localStorage.removeItem(ADD_SERVICE_DRAFT_KEY);
      await deleteDraftFromIDB(ADD_SERVICE_DRAFT_KEY);
    } catch (e) {}
    setLoadedDraft(null);
    setDraftAvailable(false);
    setShowRestorePrompt(false);
  };

  const handleRestoreDraft = async () => {
    if (!loadedDraft) return;
    try {
      if (loadedDraft.formData)
        setFormData((prev: any) => ({ ...prev, ...loadedDraft.formData }));
      // Try to load files from IDB (will fall back to previews stored in localStorage)
      try {
        const imgUrls = await getFilesFromIDB(ADD_SERVICE_DRAFT_KEY, "img");
        const certUrls = await getFilesFromIDB(ADD_SERVICE_DRAFT_KEY, "cert");
        if (imgUrls && imgUrls.length > 0) setImagePreviews(imgUrls);
        else if (loadedDraft.imagePreviews)
          setImagePreviews(loadedDraft.imagePreviews);
        if (certUrls && certUrls.length > 0) setCertificationPreviews(certUrls);
        else if (loadedDraft.certificationPreviews)
          setCertificationPreviews(loadedDraft.certificationPreviews);

        // Reconstruct File objects from IDB entries so submission works
        try {
          const imgEntries = await getFilesEntries(
            ADD_SERVICE_DRAFT_KEY,
            "img",
          );
          if (imgEntries && imgEntries.length > 0) {
            // set previews from blobs (preserve order)
            setImagePreviews(
              imgEntries.map((e) => URL.createObjectURL(e.blob)),
            );
            const restoredImgFiles = imgEntries.map((e, i) => {
              const name = e.name || `draft-img-${i}`;
              const type =
                e.type ||
                (e.blob && (e.blob as Blob).type) ||
                "application/octet-stream";
              const lastModified = e.lastModified || Date.now();
              return new File([e.blob], name, { type, lastModified });
            });
            if (restoredImgFiles.length > 0)
              setServiceImageFiles(restoredImgFiles);
          }

          const certEntries = await getFilesEntries(
            ADD_SERVICE_DRAFT_KEY,
            "cert",
          );
          if (certEntries && certEntries.length > 0) {
            setCertificationPreviews(
              certEntries.map((e) => URL.createObjectURL(e.blob)),
            );
            const restoredCertFiles = certEntries.map((e, i) => {
              const name = e.name || `draft-cert-${i}`;
              const type =
                e.type ||
                (e.blob && (e.blob as Blob).type) ||
                "application/octet-stream";
              const lastModified = e.lastModified || Date.now();
              return new File([e.blob], name, { type, lastModified });
            });
            if (restoredCertFiles.length > 0)
              setCertificationFiles(restoredCertFiles);
          }
        } catch (err) {
          // ignore file reconstruction errors
        }
      } catch (e) {
        // fallback to stored previews
        if (loadedDraft.imagePreviews)
          setImagePreviews(loadedDraft.imagePreviews);
        if (loadedDraft.certificationPreviews)
          setCertificationPreviews(loadedDraft.certificationPreviews);
      }
    } catch (e) {
      // ignore
    }
    setShowRestorePrompt(false);
    setDraftAvailable(false);
    setLoadedDraft(null);
  };

  const handleDiscardDraft = async () => {
    await clearDraftCompletely();
    setShowRestorePrompt(false);
  };

  const handleSaveDraftAndExit = async () => {
    setShowExitPrompt(false);
    try {
      await saveDraftIncludingFiles();
    } finally {
      const to = pendingNavigation;
      setPendingNavigation(null);
      if (to) {
        navigate(to);
      } else {
        navigate(-1);
      }
    }
  };

  const handleDontSaveAndExit = async () => {
    setShowExitPrompt(false);
    await clearDraftCompletely();
    const to = pendingNavigation;
    setPendingNavigation(null);
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  // Called by navigation UI to ask for permission before navigating away.
  // Return false to prevent immediate navigation. Caller may later call
  // navigate() after user confirms via the modal.
  const handleNavigateAttempt = (to: string): boolean => {
    // If there are no unsaved changes, allow navigation immediately
    const hasChanges =
      JSON.stringify(formData) !== JSON.stringify(initialServiceState) ||
      serviceImageFiles.length > 0 ||
      certificationFiles.length > 0;
    if (!hasChanges) return true;

    // Otherwise store target and show exit prompt, cancel navigation now
    setPendingNavigation(to);
    setShowExitPrompt(true);
    return false;
  };

  // Expose imperative methods to the parent
  useImperativeHandle(ref, () => ({
    handleNavigateAttempt,
    showExitPromptNow: () => setShowExitPrompt(true),
  }));

  return (
    <>
      {/* Restore Draft Modal */}
      {/* Use centralized draft modal for consistency */}
      <BookingDrafts
        {...({
          isOpen: showRestorePrompt,
          onClose: () => setShowRestorePrompt(false),
          onRestore: handleRestoreDraft,
          onDiscard: handleDiscardDraft,
          title: "Restore service draft?",
          message:
            "We found a saved draft for this service. Would you like to restore your progress now?",
          restoreLabel: "Restore",
          discardLabel: "Discard",
          closeLabel: "Not now",
        } as any)}
      />

      {/* Exit (Save Draft) Modal */}
      {showExitPrompt &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
              <h2 className="mb-2 text-lg font-bold">Save draft?</h2>
              <p className="mb-4 text-sm text-gray-600">
                You haven't finished creating this service. Would you like to
                save your current progress as a draft?
              </p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setShowExitPrompt(false)}
                  className="w-full rounded-md border px-2 py-2 text-xs text-gray-700 hover:bg-gray-50 lg:px-4 lg:py-2 lg:text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDontSaveAndExit}
                  className="w-full rounded-md border px-2 py-2 text-xs text-red-600 hover:bg-red-50 lg:px-4 lg:py-2 lg:text-sm"
                >
                  Don't Save
                </button>
                <button
                  onClick={handleSaveDraftAndExit}
                  disabled={isSavingDraft}
                  className="w-full rounded-md bg-blue-600 px-2 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 lg:px-4 lg:py-2 lg:text-sm"
                >
                  {isSavingDraft ? "Saving..." : "Save Draft"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Draft available banner (uses draftAvailable state) */}
      {draftAvailable && !showRestorePrompt && (
        <div className="fixed left-0 right-0 top-16 z-40 flex justify-center">
          <div className="mx-4 flex flex-col items-center gap-4 rounded-md border border-yellow-200 bg-yellow-50 p-3">
            <div className="flex items-start gap-3">
              <ExclamationCircleIcon className="h-6 w-6 text-yellow-600" />
              <p className="text-sm font-medium text-yellow-800">
                A saved draft for this service is available.
              </p>
            </div>
            <div className="flex w-full justify-center gap-2">
              <button
                onClick={handleDiscardDraft}
                className="flex-1 rounded-md border px-3 py-1 text-sm text-red-600 hover:bg-red-50"
              >
                Discard
              </button>
              <button
                onClick={handleRestoreDraft}
                className="flex-1 rounded-md bg-yellow-600 px-3 py-1 text-sm font-medium text-white hover:bg-yellow-700"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default ServiceDrafts;
