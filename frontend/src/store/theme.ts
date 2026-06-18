import { create } from 'zustand';
import type { Theme, ThemeStrategy, ThemePreferences } from '@/types';
import { profileApi } from '@/utils/api';

const THEME_STORAGE_KEY = 'theme-preferences';

const DEFAULT_PREFERENCES: ThemePreferences = {
  strategy: 'system',
  manualTheme: 'light',
  schedule: {
    lightStart: '07:00',
    darkStart: '19:00',
  },
};

function getStoredPreferences(): ThemePreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_PREFERENCES;
}

function setStoredPreferences(prefs: ThemePreferences): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(prefs));
}

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

function getScheduledTheme(schedule: ThemePreferences['schedule']): Theme {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const { hours: lightHours, minutes: lightMinutes } = parseTime(schedule.lightStart);
  const { hours: darkHours, minutes: darkMinutes } = parseTime(schedule.darkStart);
  const lightStartMinutes = lightHours * 60 + lightMinutes;
  const darkStartMinutes = darkHours * 60 + darkMinutes;

  if (lightStartMinutes < darkStartMinutes) {
    return currentMinutes >= lightStartMinutes && currentMinutes < darkStartMinutes ? 'light' : 'dark';
  } else {
    return currentMinutes >= darkStartMinutes && currentMinutes < lightStartMinutes ? 'dark' : 'light';
  }
}

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.style.colorScheme = theme;
  root.setAttribute('data-theme-applied', 'true');
}

function computeResolvedTheme(preferences: ThemePreferences): Theme {
  switch (preferences.strategy) {
    case 'manual':
      return preferences.manualTheme;
    case 'system':
      return getSystemTheme();
    case 'schedule':
      return getScheduledTheme(preferences.schedule);
    default:
      return 'light';
  }
}

interface ThemeState {
  preferences: ThemePreferences;
  resolvedTheme: Theme;
  isTransitioning: boolean;
  autoSaveEnabled: boolean;
  setStrategy: (strategy: ThemeStrategy) => void;
  setManualTheme: (theme: Theme) => void;
  setSchedule: (schedule: ThemePreferences['schedule']) => void;
  toggleManualTheme: () => void;
  syncFromUser: () => Promise<void>;
  enableAutoSave: (enabled: boolean) => void;
}

let systemMediaQuery: MediaQueryList | null = null;
let scheduleTimer: ReturnType<typeof setInterval> | null = null;
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function setupSystemListener(callback: () => void): void {
  if (typeof window === 'undefined') return;
  if (systemMediaQuery) {
    systemMediaQuery.removeEventListener('change', callback);
  }
  systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  systemMediaQuery.addEventListener('change', callback);
}

function setupScheduleTimer(callback: () => void): void {
  if (scheduleTimer) {
    clearInterval(scheduleTimer);
    scheduleTimer = null;
  }
  scheduleTimer = setInterval(callback, 60 * 1000);
}

function cleanupListeners(): void {
  if (systemMediaQuery) {
    systemMediaQuery.removeEventListener('change', () => {});
    systemMediaQuery = null;
  }
  if (scheduleTimer) {
    clearInterval(scheduleTimer);
    scheduleTimer = null;
  }
}

export const useThemeStore = create<ThemeState>()((set, get) => {
  const initialPrefs = getStoredPreferences();
  const initialTheme = computeResolvedTheme(initialPrefs);

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    const alreadyApplied =
      root.classList.contains(initialTheme) ||
      root.getAttribute('data-theme-applied') === 'true';
    if (!alreadyApplied) {
      applyTheme(initialTheme);
    }
  }

  const debouncedSaveToUser = () => {
    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer);
    }
    saveDebounceTimer = setTimeout(() => {
      if (!get().autoSaveEnabled) return;
      try {
        const { preferences } = get();
        profileApi.updateThemePreferences(preferences).catch(() => {
          // ignore save errors
        });
      } catch {
        // ignore
      }
    }, 1000);
  };

  const handleThemeChange = () => {
    const { preferences } = get();
    const newTheme = computeResolvedTheme(preferences);
    const currentTheme = get().resolvedTheme;
    if (newTheme !== currentTheme) {
      set({ isTransitioning: true });
      applyTheme(newTheme);
      set({ resolvedTheme: newTheme });
      requestAnimationFrame(() => {
        setTimeout(() => set({ isTransitioning: false }), 300);
      });
    }
  };

  const updatePreferences = (newPrefs: ThemePreferences) => {
    setStoredPreferences(newPrefs);
    set({ preferences: newPrefs });
    if (get().autoSaveEnabled) {
      debouncedSaveToUser();
    }
  };

  if (initialPrefs.strategy === 'system') {
    setupSystemListener(handleThemeChange);
  } else if (initialPrefs.strategy === 'schedule') {
    setupScheduleTimer(handleThemeChange);
  }

  return {
    preferences: initialPrefs,
    resolvedTheme: initialTheme,
    isTransitioning: false,
    autoSaveEnabled: false,

    setStrategy: (strategy: ThemeStrategy) => {
      const prefs = { ...get().preferences, strategy };
      updatePreferences(prefs);

      cleanupListeners();

      if (strategy === 'system') {
        setupSystemListener(handleThemeChange);
      } else if (strategy === 'schedule') {
        setupScheduleTimer(handleThemeChange);
      }

      handleThemeChange();
    },

    setManualTheme: (theme: Theme) => {
      const prefs = { ...get().preferences, manualTheme: theme };
      updatePreferences(prefs);
      if (prefs.strategy === 'manual') {
        handleThemeChange();
      }
    },

    setSchedule: (schedule: ThemePreferences['schedule']) => {
      const prefs = { ...get().preferences, schedule };
      updatePreferences(prefs);
      if (prefs.strategy === 'schedule') {
        handleThemeChange();
      }
    },

    toggleManualTheme: () => {
      const current = get().preferences.manualTheme;
      const next: Theme = current === 'light' ? 'dark' : 'light';
      get().setManualTheme(next);
    },

    syncFromUser: async () => {
      try {
        const userPrefs = await profileApi.getThemePreferences();
        if (userPrefs) {
          const prefs = { ...DEFAULT_PREFERENCES, ...userPrefs };
          setStoredPreferences(prefs);
          set({ preferences: prefs });

          cleanupListeners();
          if (prefs.strategy === 'system') {
            setupSystemListener(handleThemeChange);
          } else if (prefs.strategy === 'schedule') {
            setupScheduleTimer(handleThemeChange);
          }

          handleThemeChange();
        }
      } catch {
        // ignore sync errors - use local preferences
      }
    },

    enableAutoSave: (enabled: boolean) => {
      set({ autoSaveEnabled: enabled });
      if (enabled) {
        debouncedSaveToUser();
      } else if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
        saveDebounceTimer = null;
      }
    },
  };
});

export default useThemeStore;
