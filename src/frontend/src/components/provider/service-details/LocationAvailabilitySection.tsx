import React, { useState, useEffect } from "react";
import {
  MapPinIcon,
  CalendarDaysIcon,
  HomeIcon,
  PencilIcon,
} from "@heroicons/react/24/solid";
import Tooltip from "../../common/Tooltip";
import AvailabilityEditor, { WeeklyScheduleEntry } from "./AvailabilityEditor";
import { formatTime } from "./timeUtils";
import phLocations from "../../../data/ph_locations.json";

interface Props {
  editLocationAvailability: boolean;
  hasActiveBookings: boolean;
  activeBookingsCount: number;
  editedCity: string;
  editedState: string;
  setEditedCity: (v: string) => void;
  setEditedState: (v: string) => void;
  editedWeeklySchedule: WeeklyScheduleEntry[];
  setEditedWeeklySchedule: (v: WeeklyScheduleEntry[]) => void;
  savingLocationAvailability: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  service: any;
}

const LocationAvailabilitySection: React.FC<Props> = ({
  editLocationAvailability,
  hasActiveBookings,
  activeBookingsCount,
  editedCity,
  editedState,
  setEditedCity,
  setEditedState,
  editedWeeklySchedule,
  setEditedWeeklySchedule,
  savingLocationAvailability,
  onEdit,
  onCancel,
  onSave,
  service,
}) => {
  const dayOrder: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  // State for managing city options based on selected province
  const [cityOptions, setCityOptions] = useState<string[]>([]);

  // Update city options when province changes
  useEffect(() => {
    if (editedState) {
      const provinceObj = phLocations.provinces.find(
        (prov: any) => prov.name === editedState,
      );
      if (provinceObj) {
        setCityOptions(provinceObj.municipalities.map((m: any) => m.name));
      } else {
        setCityOptions([]);
      }
    } else {
      setCityOptions([]);
    }
  }, [editedState]);

  // Initialize city options when entering edit mode
  useEffect(() => {
    if (editLocationAvailability && editedState) {
      const provinceObj = phLocations.provinces.find(
        (prov: any) => prov.name === editedState,
      );
      if (provinceObj) {
        setCityOptions(provinceObj.municipalities.map((m: any) => m.name));
      }
    }
  }, [editLocationAvailability, editedState]);

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const province = e.target.value;
    setEditedState(province);
    setEditedCity(""); // Reset city when province changes
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const city = e.target.value;
    setEditedCity(city);
  };

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="text-md flex items-center gap-2 font-bold text-gray-900 lg:text-xl">
          <MapPinIcon className="h-6 w-6 text-yellow-600" />
          Location & Availability
        </h3>
        <Tooltip
          content={`Cannot edit with ${activeBookingsCount} active booking${activeBookingsCount !== 1 ? "s" : ""}`}
          showWhenDisabled={hasActiveBookings}
        >
          <button
            onClick={hasActiveBookings ? undefined : onEdit}
            className={`rounded-full p-2 transition-colors hover:bg-gray-100 ${hasActiveBookings ? "cursor-not-allowed opacity-50" : ""}`}
            aria-label="Edit location and availability"
            disabled={hasActiveBookings}
          >
            <PencilIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        </Tooltip>
      </div>

      {savingLocationAvailability ? (
        // Skeleton UI when saving
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-full rounded-lg bg-gray-200"></div>
          <div className="h-10 w-full rounded-lg bg-gray-200"></div>
          <div className="h-32 w-full rounded-lg bg-gray-200"></div>
        </div>
      ) : editLocationAvailability ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                Province
                <span className="ml-1 text-[10px] font-normal text-gray-500">
                  (Required)
                </span>
              </label>
              <select
                value={editedState}
                onChange={handleProvinceChange}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-yellow-500 focus:ring-yellow-500"
              >
                <option value="">Select Province</option>
                {phLocations.provinces.map((prov: any) => (
                  <option key={prov.name} value={prov.name}>
                    {prov.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                City/Municipality
                <span className="ml-1 text-[10px] font-normal text-gray-500">
                  (Required)
                </span>
              </label>
              <select
                value={editedCity}
                onChange={handleCityChange}
                disabled={!editedState}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-yellow-500 focus:ring-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select City / Municipality</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-700">
              <CalendarDaysIcon className="h-4 w-4 text-yellow-600" />
              Availability
            </label>
            <AvailabilityEditor
              weeklySchedule={editedWeeklySchedule}
              setWeeklySchedule={setEditedWeeklySchedule as any}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={savingLocationAvailability}
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="inline-flex items-center gap-2 rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={savingLocationAvailability}
            >
              {savingLocationAvailability && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              )}
              {savingLocationAvailability ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-l mb-1 flex items-center gap-2 font-semibold text-gray-700">
              <HomeIcon className="h-4 w-4 text-yellow-600" />
              Address
            </label>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900">
              {service.location.city}
              {service.location.state && `, ${service.location.state}`}
            </div>
          </div>
          <div>
            <label className="text-l mb-1 flex items-center gap-2 font-semibold text-gray-700">
              <CalendarDaysIcon className="h-4 w-4 text-yellow-600" />
              Availability
            </label>
            <div className="flex flex-wrap justify-center gap-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-4 text-sm font-medium text-gray-900">
              {service.weeklySchedule?.filter(
                (entry: any) =>
                  entry.availability.isAvailable &&
                  entry.availability.slots &&
                  entry.availability.slots.length > 0,
              ).length ? (
                [...service.weeklySchedule]
                  .filter(
                    (entry: any) =>
                      entry.availability.isAvailable &&
                      entry.availability.slots &&
                      entry.availability.slots.length > 0,
                  )
                  .sort((a: any, b: any) => dayOrder[a.day] - dayOrder[b.day])
                  .map((entry: any) => (
                    <div
                      key={entry.day}
                      className="flex w-full flex-col items-start rounded-xl border border-gray-200 bg-white p-3 shadow sm:w-auto sm:min-w-[140px]"
                    >
                      <span className="mb-2 flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-gray-900 shadow-sm">
                        <CalendarDaysIcon className="h-4 w-4 text-yellow-600" />
                        {entry.day}
                      </span>
                      <ul className="ml-1 space-y-1">
                        {entry.availability.slots.map(
                          (slot: any, idx: number) => (
                            <li
                              key={idx}
                              className="flex items-center gap-2 text-xs text-gray-900"
                            >
                              <span className="inline-block rounded bg-gray-100 px-2 py-0.5 font-semibold text-gray-700">
                                {formatTime(slot.startTime)} -{" "}
                                {formatTime(slot.endTime)}
                              </span>
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  ))
              ) : (
                <span className="text-yellow-600">Not specified</span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default LocationAvailabilitySection;
