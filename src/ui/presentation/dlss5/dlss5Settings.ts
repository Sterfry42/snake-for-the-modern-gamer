export interface Dlss5Settings {
  enabled: boolean;
}

export const DLSS5_STORAGE_KEY = 'snake.dlss5.enabled';

export function isDlss5Supported(): boolean {
  return typeof document !== 'undefined';
}

export function loadDlss5Settings(): Dlss5Settings {
  if (typeof window === 'undefined') {
    return { enabled: false };
  }

  try {
    return { enabled: window.localStorage.getItem(DLSS5_STORAGE_KEY) === 'true' };
  } catch {
    return { enabled: false };
  }
}

export function saveDlss5Settings(settings: Dlss5Settings): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(DLSS5_STORAGE_KEY, settings.enabled ? 'true' : 'false');
  } catch {
    // Presentation settings are best-effort in private or restricted contexts.
  }
}
