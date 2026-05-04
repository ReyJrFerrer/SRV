import { XMarkIcon, PlayIcon } from "@heroicons/react/24/outline";
import SpotlightTour from "./SpotlightTour";

export interface TourOption {
  name: string;
  flowType:
    | "client"
    | "provider"
    | "client-service"
    | "client-bookings"
    | "client-booking-details"
    | "client-ratings"
    | "client-profile"
    | "client-receipt"
    | "provider-bookings"
    | "provider-services";
  description: string;
  icon?: string;
}

interface TourSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTour: (tour: TourOption) => void;
  tours: TourOption[];
  selectedTour?: TourOption | null;
  onTourComplete?: () => void;
}

export function TourSelectorModal({
  isOpen,
  onClose,
  onSelectTour,
  tours,
  selectedTour,
  onTourComplete,
}: TourSelectorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="animate-in fade-in zoom-in-95 relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">
            Select a Tour
          </h2>
          <button
            onClick={onClose}
            className="rounded-full bg-gray-50 p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Tour Options */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          <div className="space-y-3">
            {tours.map((tour, index) => (
              <button
                key={index}
                onClick={() => onSelectTour(tour)}
                className="flex w-full items-start gap-4 rounded-2xl border border-gray-200 p-4 text-left transition-all hover:border-blue-300 hover:bg-blue-50 active:scale-[0.98]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <PlayIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{tour.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {tour.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Render the tour if a tour is selected */}
      {selectedTour && (
        <SpotlightTour
          flowType={selectedTour.flowType}
          onTourComplete={() => {
            if (onTourComplete) {
              onTourComplete();
            }
            onClose();
          }}
        />
      )}
    </div>
  );
}

export default TourSelectorModal;
