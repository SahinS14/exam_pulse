import { create } from "zustand";

import {
  USER_SCOPED_KEYS,
  getScopedSecureItem,
  setScopedSecureItem,
  removeScopedSecureItem,
} from "../utils/userScopedState";

const saveContext = async ({ selectedBranch, selectedSemester }) =>
  setScopedSecureItem(
    USER_SCOPED_KEYS.browseContext,
    JSON.stringify({
      selectedBranch,
      selectedSemester,
    })
  );

const clearContextStorage = async () =>
  removeScopedSecureItem(USER_SCOPED_KEYS.browseContext);

export const useAppStore = create((set) => ({
  selectedBranch: null,
  selectedSemester: null,
  hydrated: false,
  hydrateContext: async () => {
    try {
      const storedContext = await getScopedSecureItem(USER_SCOPED_KEYS.browseContext);

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
