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
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 lg:text-xl">
          <MapPinIcon className="h-6 w-6 text-yellow-500" />
          Location & Availability
        </h3>
        <Tooltip
          content={`Cannot edit with ${activeBookingsCount} active booking${activeBookingsCount !== 1 ? "s" : ""}`}
          showWhenDisabled={hasActiveBookings}
        >
          <button
            onClick={hasActiveBookings ? undefined : onEdit}
            className={`rounded-full bg-gray-50 p-2.5 transition-colors hover:bg-yellow-50 hover:text-yellow-600 ${hasActiveBookings ? "cursor-not-allowed opacity-50" : ""}`}
            aria-label="Edit location and availability"
            disabled={hasActiveBookings}
          >
            <PencilIcon className="h-5 w-5 text-gray-500" />
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
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Province
                <span className="ml-1 text-[11px] font-normal text-gray-500">
                  (Required)
                </span>
              </label>
              <select
                value={editedState}
                onChange={handleProvinceChange}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-yellow-500 focus:ring-yellow-500"
              >
                <option value="">Select Province</option>
                {phLocations.provinces.map((prov: any) => (
                  <option key={prov.name} value={prov.name}>
                    {prov.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                City/Municipality
                <span className="ml-1 text-[11px] font-normal text-gray-500">
                  (Required)
                </span>
              </label>
              <select
                value={editedCity}
                onChange={handleCityChange}
                disabled={!editedState}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-yellow-500 focus:ring-yellow-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50"
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
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <CalendarDaysIcon className="h-5 w-5 text-yellow-500" />
              Availability
            </label>
            <AvailabilityEditor
              weeklySchedule={editedWeeklySchedule}
              setWeeklySchedule={setEditedWeeklySchedule as any}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onCancel}
              className="rounded-xl px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={savingLocationAvailability}
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={savingLocationAvailability}
            >
              {savingLocationAvailability && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              )}
              {savingLocationAvailability ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 pt-2">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <HomeIcon className="h-5 w-5 text-yellow-500" />
              Address
            </label>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm font-medium text-gray-900">
              {service.location.city}
              {service.location.state && `, ${service.location.state}`}
            </div>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <CalendarDaysIcon className="h-5 w-5 text-yellow-500" />
              Availability
            </label>
            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
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
                      className="flex w-full flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-50">
                          <CalendarDaysIcon className="h-4 w-4 text-yellow-600" />
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {entry.day}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:gap-1.5">
                        {entry.availability.slots.map(
                          (slot: any, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center whitespace-nowrap rounded-lg bg-gray-100 px-3 py-1.5 text-[13px] font-semibold text-gray-700"
                            >
                              {formatTime(slot.startTime)} -{" "}
                              {formatTime(slot.endTime)}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  ))
              ) : (
                <span className="py-2 text-center text-sm font-medium text-gray-500">
                  Not specified
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default LocationAvailabilitySection;
