import { create } from "zustand";
import { persist } from "zustand/middleware";

const defaultSettings = {
  // Risk Scoring Weights
  tabSwitchWeight: 35,
  pasteWeight: 30,
  mouseEntropyWeight: 20,
  keystrokeWeight: 15,

  // Thresholds
  lowRiskThreshold: 25,
  mediumRiskThreshold: 50,
  highRiskThreshold: 75,

  // Time Settings
  calibrationTime: 10,
  riskUpdateInterval: 4,
  examDuration: 120,

  // Auto Actions
  autoWarnThreshold: 60,
  autoTerminateThreshold: 85,
  enableAutoActions: true,

  // Monitoring Features
  trackMouseMovement: true,
  trackTabSwitching: true,
  trackCopyPaste: true,
  trackKeystroke: true,
  trackFocus: true,

  // Notifications
  enableWarnings: true,
  warningDuration: 15
};

const useSettingsStore = create(
  persist(
    (set, get) => ({
      settings: defaultSettings,

      updateSetting: (key, value) => {
        set((state) => ({
          settings: {
            ...state.settings,
            [key]: value
          }
        }));
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...newSettings
          }
        }));
      },

      resetSettings: () => {
        set({ settings: defaultSettings });
      },

      getSetting: (key) => {
        return get().settings[key];
      }
    }),
    {
      name: "amrita-proctor-settings"
    }
  )
);

export default useSettingsStore;
