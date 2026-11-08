/**
 * Touch capability detection for the mobile controls deck.
 *
 * Browser touch detection is a minefield. In particular, WebKitGTK (the
 * engine behind KDE Plasma Mobile's Angelfish browser) never reports
 * `navigator.maxTouchPoints` — WebKit hardcodes it to 0 on every port
 * except iOS — and its `(pointer: coarse)` media query is unreliable.
 * On those browsers the deck can only be inferred from the legacy
 * `ontouchstart` window property or from a real `touchstart` event.
 *
 * The wise old snake trusted the first tap over the spec sheet.
 */

export type TouchControlsPreference = 'auto' | 'on' | 'off';

export const TOUCH_CONTROLS_STORAGE_KEY = 'snake.touchControls';

/** Injectable environment so the decision logic stays unit-testable. */
export interface TouchDetectionEnvironment {
  maxTouchPoints: number;
  matchesMedia: (query: string) => boolean;
  hasTouchStartProperty: boolean;
  /** A real touch event was observed since page load. */
  sawTouchEvent: boolean;
}

export function loadTouchControlsPreference(
  storage: { getItem(key: string): string | null } | undefined = globalThis.localStorage,
): TouchControlsPreference {
  const raw = storage?.getItem(TOUCH_CONTROLS_STORAGE_KEY);
  return raw === 'on' || raw === 'off' ? raw : 'auto';
}

export function saveTouchControlsPreference(
  preference: TouchControlsPreference,
  storage: { setItem(key: string, value: string): void } | undefined = globalThis.localStorage,
): void {
  try {
    storage?.setItem(TOUCH_CONTROLS_STORAGE_KEY, preference);
  } catch {
    // Settings persistence is best-effort in private or restricted contexts.
  }
}

export function nextTouchControlsPreference(
  preference: TouchControlsPreference,
): TouchControlsPreference {
  switch (preference) {
    case 'auto':
      return 'on';
    case 'on':
      return 'off';
    default:
      return 'auto';
  }
}

/**
 * Decides whether the deck should exist for the current preference.
 * `on` always wins, `off` always loses, and `auto` trusts any touch signal.
 */
export function shouldShowTouchControls(
  preference: TouchControlsPreference,
  env: TouchDetectionEnvironment,
): boolean {
  if (preference === 'on') {
    return true;
  }
  if (preference === 'off') {
    return false;
  }
  return hasTouchSignal(env);
}

export function hasTouchSignal(env: TouchDetectionEnvironment): boolean {
  if (env.maxTouchPoints > 0) {
    return true;
  }
  if (env.matchesMedia('(pointer: coarse)')) {
    return true;
  }
  if (env.matchesMedia('(any-pointer: coarse)')) {
    return true;
  }
  // WebKit (GTK/WPE) exposes legacy touch event handlers on window even
  // though maxTouchPoints stays 0, so this is the only static signal it
  // gives touch-only devices like Plasma Mobile.
  if (env.hasTouchStartProperty) {
    return true;
  }
  if (env.sawTouchEvent) {
    return true;
  }
  return false;
}

let runtimeTouchSeen = false;

/** True once a real touch event has been observed in this page. */
export function hasRuntimeTouchSignal(): boolean {
  return runtimeTouchSeen;
}

/**
 * Watches for the first real `touchstart`. Static detection can miss
 * exotic browsers, so the first tap is treated as proof the device has a
 * touchscreen. Returns an unsubscribe function.
 */
export function observeRuntimeTouch(onTouch: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const handle = (): void => {
    runtimeTouchSeen = true;
    window.removeEventListener('touchstart', handle, true);
    onTouch();
  };
  window.addEventListener('touchstart', handle, { once: true, passive: true, capture: true });
  return () => {
    window.removeEventListener('touchstart', handle, true);
  };
}

/** Builds the detection environment from the real browser globals. */
export function createBrowserTouchEnvironment(): TouchDetectionEnvironment {
  const matchesMedia = (query: string): boolean => {
    try {
      return window.matchMedia?.(query)?.matches === true;
    } catch {
      return false;
    }
  };
  return {
    maxTouchPoints: typeof navigator !== 'undefined' ? (navigator.maxTouchPoints ?? 0) : 0,
    matchesMedia,
    hasTouchStartProperty: typeof window !== 'undefined' && 'ontouchstart' in window,
    sawTouchEvent: hasRuntimeTouchSignal(),
  };
}
