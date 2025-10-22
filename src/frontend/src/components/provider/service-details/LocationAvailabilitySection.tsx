import React, { useState, useEffect } from "react";
import {
  MapPinIcon,
  CalendarDaysIcon,
  HomeIcon,
  PencilIcon,
} from "@heroicons/react/24/solid";
import Tooltip from "./Tooltip";
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
    <section className="flex flex-col gap-6 rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-lg">
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="flex items-center gap-2 text-xl font-bold text-blue-800">
          <MapPinIcon className="h-6 w-6 text-blue-400" />
          Location & Availability
        </h3>
        <Tooltip
          content={`Cannot edit with ${activeBookingsCount} active booking${activeBookingsCount !== 1 ? "s" : ""}`}
          disabled={hasActiveBookings}
        >
          <button
            onClick={hasActiveBookings ? undefined : onEdit}
            className={`rounded-full p-2 transition-colors hover:bg-blue-100 ${hasActiveBookings ? "cursor-not-allowed opacity-50" : ""}`}
            aria-label="Edit location and availability"
            disabled={hasActiveBookings}
          >
            <PencilIcon className="h-5 w-5 text-blue-500" />
          </button>
        </Tooltip>
      </div>

      {savingLocationAvailability ? (
        // Skeleton UI when saving
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-full rounded-lg bg-blue-200/50"></div>
          <div className="h-10 w-full rounded-lg bg-blue-200/50"></div>
          <div className="h-32 w-full rounded-lg bg-blue-200/50"></div>
        </div>
      ) : editLocationAvailability ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-blue-700">
                Province
                <span className="ml-1 text-red-500">*</span>
              </label>
              <select
                value={editedState}
                onChange={handleProvinceChange}
                className="w-full rounded-md border border-blue-200 bg-white/80 px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:ring-blue-500"
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
              <label className="mb-1 block text-xs font-semibold text-blue-700">
                City/Municipality
                <span className="ml-1 text-red-500">*</span>
              </label>
              <select
                value={editedCity}
                onChange={handleCityChange}
                disabled={!editedState}
                className="w-full rounded-md border border-blue-200 bg-white/80 px-3 py-2 text-sm text-blue-900 focus:border-blue-500 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
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
            <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-blue-700">
              <CalendarDaysIcon className="h-4 w-4 text-blue-400" />
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
              className="rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={savingLocationAvailability}
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
            <label className="text-l mb-1 flex items-center gap-2 font-semibold text-blue-700">
              <HomeIcon className="h-4 w-4 text-blue-400" />
              Address
            </label>
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900">
              {service.location.city}
              {service.location.state && `, ${service.location.state}`}
            </div>
          </div>
          <div>
            <label className="text-l mb-1 flex items-center gap-2 font-semibold text-blue-700">
              <CalendarDaysIcon className="h-4 w-4 text-blue-400" />
              Availability
            </label>
            <div className="flex flex-wrap justify-center gap-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-4 text-sm font-medium text-blue-900">
              {service.weeklySchedule?.filter(
                (entry: any) => entry.availability.isAvailable,
              ).length ? (
                [...service.weeklySchedule]
                  .filter((entry: any) => entry.availability.isAvailable)
                  .sort((a: any, b: any) => dayOrder[a.day] - dayOrder[b.day])
                  .map((entry: any) => (
                    <div
                      key={entry.day}
                      className="flex w-full flex-col items-start rounded-xl border border-blue-100 bg-white/80 p-3 shadow sm:w-auto sm:min-w-[140px]"
                    >
                      <span className="mb-2 flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-blue-800 shadow-sm">
                        <CalendarDaysIcon className="h-4 w-4 text-blue-400" />
                        {entry.day}
                      </span>
                      {entry.availability.slots &&
                      entry.availability.slots.length > 0 ? (
                        <ul className="ml-1 space-y-1">
                          {entry.availability.slots.map(
                            (slot: any, idx: number) => (
                              <li
                                key={idx}
                                className="flex items-center gap-2 text-xs text-blue-900"
                              >
                                <span className="inline-block rounded bg-blue-100 px-2 py-0.5 font-semibold text-blue-700">
                                  {formatTime(slot.startTime)} -{" "}
                                  {formatTime(slot.endTime)}
                                </span>
                              </li>
                            ),
                          )}
                        </ul>
                      ) : (
                        <span className="text-xs text-blue-400">No slots</span>
                      )}
                    </div>
                  ))
              ) : (
                <span className="text-blue-400">Not specified</span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default LocationAvailabilitySection;
