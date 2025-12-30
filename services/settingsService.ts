import { AppSettings } from '../types';

const SETTINGS_KEY = 'lasquadra_app_settings';

const DEFAULT_SETTINGS: AppSettings = {
  appName: 'LA SQUADRA',
  appLogoUrl: '/pwa-icon.png', // Default to local PWA icon
  launchAtStartup: false,
  minimizeToTray: false
};

export const SettingsService = {
  getSettings: (): AppSettings => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    try {
      const parsed = JSON.parse(stored);
      // Ensure new keys exist if loading from old local storage
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings: (settings: AppSettings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    // Update document title immediately
    document.title = settings.appName;
  }
};