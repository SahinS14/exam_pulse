import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const APP_CONTEXT_KEY = "appBrowseContext";

const saveContext = async ({ selectedBranch, selectedSemester }) => {
  await SecureStore.setItemAsync(
    APP_CONTEXT_KEY,
    JSON.stringify({
      selectedBranch,
      selectedSemester,
    })
  );
};

const clearContextStorage = async () => {
  await SecureStore.deleteItemAsync(APP_CONTEXT_KEY);
};

export const useAppStore = create((set) => ({
  selectedBranch: null,
  selectedSemester: null,
  hydrated: false,
  hydrateContext: async () => {
    try {
      const storedContext = await SecureStore.getItemAsync(APP_CONTEXT_KEY);

      if (!storedContext) {
        set({
          selectedBranch: null,
          selectedSemester: null,
          hydrated: true,
        });
        return;
      }

      const parsedContext = JSON.parse(storedContext);

      set({
        selectedBranch: parsedContext.selectedBranch || null,
        selectedSemester: parsedContext.selectedSemester || null,
        hydrated: true,
      });
    } catch (error) {
      await clearContextStorage();
      set({
        selectedBranch: null,
        selectedSemester: null,
        hydrated: true,
      });
    }
  },
  setSelectedBranch: async (branch) => {
    const nextState = {
      selectedBranch: branch,
      selectedSemester: null,
    };

    await saveContext(nextState);
    set(nextState);
  },
  setSelectedSemester: async (semester) => {
    let nextState;

    set((state) => {
      nextState = {
        selectedBranch: state.selectedBranch,
        selectedSemester: semester,
      };

      return {
        selectedSemester: semester,
      };
    });

    await saveContext(nextState);
  },
  clearContext: async () => {
    await clearContextStorage();
    set({
      selectedBranch: null,
      selectedSemester: null,
      hydrated: true,
    });
  },
}));
