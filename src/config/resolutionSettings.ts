export type ResolutionSettingId = 'full' | 'half' | 'quarter';

export interface ResolutionSetting {
  id: ResolutionSettingId;
  label: string;
  width: number;
  height: number;
  zoom: number;
}

export const RESOLUTION_SETTINGS: readonly ResolutionSetting[] = [
  { id: 'full', label: '768 x 576', width: 768, height: 576, zoom: 1 },
  { id: 'half', label: '384 x 288', width: 384, height: 288, zoom: 0.5 },
  { id: 'quarter', label: '192 x 144', width: 192, height: 144, zoom: 0.25 },
] as const;

const RESOLUTION_STORAGE_KEY = 'snake.resolution';

export function getResolutionSetting(id: string | null | undefined): ResolutionSetting {
  return RESOLUTION_SETTINGS.find((setting) => setting.id === id) ?? RESOLUTION_SETTINGS[0]!;
}

export function loadResolutionSetting(): ResolutionSetting {
  if (typeof window === 'undefined') {
    return RESOLUTION_SETTINGS[0]!;
  }
  return getResolutionSetting(window.localStorage.getItem(RESOLUTION_STORAGE_KEY));
}

export function saveResolutionSetting(id: ResolutionSettingId): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(RESOLUTION_STORAGE_KEY, id);
}
