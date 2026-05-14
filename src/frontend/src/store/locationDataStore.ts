import { create } from "zustand";
import {
  fetchProvinces,
  fetchMunicipalities,
  fetchBarangays,
} from "../data/phLocations";

interface LocationDataState {
  // Data
  provinces: string[];
  municipalities: string[];
  barangays: string[];

  // Loading states
  provincesLoading: boolean;
  municipalitiesLoading: boolean;
  barangaysLoading: boolean;

  // Selection tracking
  selectedProvince: string;
  selectedMunicipality: string;

  // Actions
  loadProvinces: () => Promise<void>;
  selectProvince: (province: string) => Promise<void>;
  selectMunicipality: (province: string, municipality: string) => Promise<void>;
  clearMunicipalities: () => void;
  clearBarangays: () => void;
}

export const useLocationDataStore = create<LocationDataState>()((set, get) => ({
  // Initial state
  provinces: [],
  municipalities: [],
  barangays: [],
  provincesLoading: false,
  municipalitiesLoading: false,
  barangaysLoading: false,
  selectedProvince: "",
  selectedMunicipality: "",

  /**
   * Load all province names. No-ops if already loaded or in progress.
   */
  loadProvinces: async () => {
    const state = get();
    if (state.provinces.length > 0 || state.provincesLoading) return;

    set({ provincesLoading: true });
    try {
      const data = await fetchProvinces();
      set({ provinces: data, provincesLoading: false });
    } catch (error) {
      console.error("Failed to load provinces:", error);
      set({ provincesLoading: false });
    }
  },

  /**
   * Set the selected province and load its municipalities.
   * Clears barangays when province changes.
   */
  selectProvince: async (province: string) => {
    set({
      selectedProvince: province,
      selectedMunicipality: "",
      municipalities: [],
      barangays: [],
    });

    if (!province) return;

    set({ municipalitiesLoading: true });
    try {
      const data = await fetchMunicipalities(province);
      set({ municipalities: data, municipalitiesLoading: false });
    } catch (error) {
      console.error("Failed to load municipalities:", error);
      set({ municipalitiesLoading: false });
    }
  },

  /**
   * Set the selected municipality and load its barangays.
   */
  selectMunicipality: async (province: string, municipality: string) => {
    set({ selectedMunicipality: municipality, barangays: [] });

    if (!municipality) return;

    set({ barangaysLoading: true });
    try {
      const data = await fetchBarangays(province, municipality);
      set({ barangays: data, barangaysLoading: false });
    } catch (error) {
      console.error("Failed to load barangays:", error);
      set({ barangaysLoading: false });
    }
  },

  /**
   * Clear municipality list (e.g., when province is deselected).
   */
  clearMunicipalities: () => {
    set({
      municipalities: [],
      selectedMunicipality: "",
      barangays: [],
    });
  },

  /**
   * Clear barangay list (e.g., when municipality is deselected).
   */
  clearBarangays: () => {
    set({ barangays: [] });
  },
}));
