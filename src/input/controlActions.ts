export type ControlActionId =
  | 'move.up'
  | 'move.down'
  | 'move.left'
  | 'move.right'
  | 'interact.confirm'
  | 'back.cancel'
  | 'ability.primary'
  | 'aim.fire'
  | 'menu.pause'
  | 'map.toggle'
  | 'save.quick';

export type InputModeId = 'keyboardMouse' | 'controller' | 'mobile';

export type ControlCategoryId = 'movement' | 'actions' | 'system';

export interface ControlBinding {
  label: string;
}

export interface ControlAction {
  id: ControlActionId;
  label: string;
  category: ControlCategoryId;
  description: string;
  defaultBindings: Partial<Record<InputModeId, readonly ControlBinding[]>>;
  rebindable: boolean;
  advanced?: boolean;
  hidden?: boolean;
}

export const CONTROL_CATEGORIES: Record<ControlCategoryId, string> = {
  movement: 'Movement',
  actions: 'Actions',
  system: 'System',
};

export const INPUT_MODES: readonly { id: InputModeId; label: string; description: string }[] = [
  {
    id: 'keyboardMouse',
    label: 'Mouse + Keyboard',
    description: 'Default desktop controls.',
  },
  {
    id: 'controller',
    label: 'Controller',
    description: 'Controller mapping foundation for a future pass.',
  },
  {
    id: 'mobile',
    label: 'Mobile',
    description: 'Touch controls shown on coarse pointer devices.',
  },
];

const bind = (...labels: string[]): readonly ControlBinding[] => labels.map((label) => ({ label }));

export const CONTROL_ACTIONS: readonly ControlAction[] = [
  {
    id: 'move.up',
    label: 'Move Up',
    category: 'movement',
    description: 'Move north in gameplay contexts.',
    defaultBindings: {
      keyboardMouse: bind('W', 'Arrow Up'),
      controller: bind('D-pad Up', 'Left Stick Up'),
      mobile: bind('Swipe Up', 'Virtual D-pad Up'),
    },
    rebindable: true,
  },
  {
    id: 'move.down',
    label: 'Move Down',
    category: 'movement',
    description: 'Move south in gameplay contexts.',
    defaultBindings: {
      keyboardMouse: bind('S', 'Arrow Down'),
      controller: bind('D-pad Down', 'Left Stick Down'),
      mobile: bind('Swipe Down', 'Virtual D-pad Down'),
    },
    rebindable: true,
  },
  {
    id: 'move.left',
    label: 'Move Left',
    category: 'movement',
    description: 'Move west in gameplay contexts.',
    defaultBindings: {
      keyboardMouse: bind('A', 'Arrow Left'),
      controller: bind('D-pad Left', 'Left Stick Left'),
      mobile: bind('Swipe Left', 'Virtual D-pad Left'),
    },
    rebindable: true,
  },
  {
    id: 'move.right',
    label: 'Move Right',
    category: 'movement',
    description: 'Move east in gameplay contexts.',
    defaultBindings: {
      keyboardMouse: bind('D', 'Arrow Right'),
      controller: bind('D-pad Right', 'Left Stick Right'),
      mobile: bind('Swipe Right', 'Virtual D-pad Right'),
    },
    rebindable: true,
  },
  {
    id: 'interact.confirm',
    label: 'Interact / Confirm',
    category: 'actions',
    description: 'Talk, select, confirm, enter shops, and activate focused UI choices.',
    defaultBindings: {
      keyboardMouse: bind('E', 'UI Click'),
      controller: bind('A / South Button'),
      mobile: bind('Tap', 'Interact Button'),
    },
    rebindable: true,
  },
  {
    id: 'back.cancel',
    label: 'Back / Cancel',
    category: 'actions',
    description: 'Close screens, back out of menus, and cancel contextual actions.',
    defaultBindings: {
      keyboardMouse: bind('Escape'),
      controller: bind('B / East Button'),
      mobile: bind('Back Button'),
    },
    rebindable: true,
  },
  {
    id: 'ability.primary',
    label: 'Primary Ability',
    category: 'actions',
    description: 'Use the primary equipped or unlocked ability.',
    defaultBindings: {
      keyboardMouse: bind('Q'),
      controller: bind('X / West Button', 'Right Bumper'),
      mobile: bind('Ability Button'),
    },
    rebindable: true,
  },
  {
    id: 'aim.fire',
    label: 'Aim / Fire / Throw',
    category: 'actions',
    description: 'Resolve pointer or trigger-style targeting.',
    defaultBindings: {
      keyboardMouse: bind('Mouse Click', 'Pointer Click'),
      controller: bind('Right Trigger'),
      mobile: bind('Tap Target', 'Fire Button'),
    },
    rebindable: true,
  },
  {
    id: 'menu.pause',
    label: 'Pause / Menu',
    category: 'system',
    description: 'Open or close the pause menu.',
    defaultBindings: {
      keyboardMouse: bind('Space'),
      controller: bind('Start'),
      mobile: bind('Menu Button'),
    },
    rebindable: true,
  },
  {
    id: 'map.toggle',
    label: 'Toggle Map',
    category: 'system',
    description: 'Show or hide the map view.',
    defaultBindings: {
      keyboardMouse: bind('M'),
      controller: bind('Select / View'),
      mobile: bind('Map Button'),
    },
    rebindable: true,
  },
  {
    id: 'save.quick',
    label: 'Quick Save',
    category: 'system',
    description: 'Save the current run when quick saving is available.',
    defaultBindings: {
      keyboardMouse: bind('G'),
      controller: [],
      mobile: [],
    },
    rebindable: true,
  },
];

export function getVisibleControlActions(): readonly ControlAction[] {
  return CONTROL_ACTIONS.filter((action) => !action.hidden && !action.advanced);
}

export function getControlActionsByCategory(
  category: ControlCategoryId,
  actions: readonly ControlAction[] = getVisibleControlActions(),
): readonly ControlAction[] {
  return actions.filter((action) => action.category === category);
}

export function getDefaultBindingsForMode(
  actionId: ControlActionId,
  mode: InputModeId,
): readonly ControlBinding[] {
  return CONTROL_ACTIONS.find((action) => action.id === actionId)?.defaultBindings[mode] ?? [];
}

export interface ControlBindingOverrides {
  keyboardMouse?: Partial<Record<ControlActionId, readonly ControlBinding[]>>;
  controller?: Partial<Record<ControlActionId, readonly ControlBinding[]>>;
  mobile?: Partial<Record<ControlActionId, readonly ControlBinding[]>>;
}

const CONTROL_BINDINGS_STORAGE_KEY = 'snake.controls.bindings.v1';
let cachedOverrides: ControlBindingOverrides | null = null;

function normalizeBindingLabel(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '');
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage ?? null;
}

function sanitizeOverrides(value: unknown): ControlBindingOverrides {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const result: ControlBindingOverrides = {};
  for (const mode of INPUT_MODES) {
    const modeValue = (value as Record<string, unknown>)[mode.id];
    if (!modeValue || typeof modeValue !== 'object') {
      continue;
    }
    const modeOverrides: Partial<Record<ControlActionId, readonly ControlBinding[]>> = {};
    for (const action of CONTROL_ACTIONS) {
      const bindings = (modeValue as Record<string, unknown>)[action.id];
      if (!Array.isArray(bindings)) {
        continue;
      }
      const cleaned = bindings
        .filter((binding): binding is ControlBinding => {
          return (
            Boolean(binding) &&
            typeof binding === 'object' &&
            typeof (binding as ControlBinding).label === 'string'
          );
        })
        .map((binding) => ({ label: binding.label.trim() }))
        .filter((binding) => binding.label.length > 0);
      modeOverrides[action.id] = cleaned;
    }
    result[mode.id] = modeOverrides;
  }
  return result;
}

export function loadControlBindingOverrides(): ControlBindingOverrides {
  if (cachedOverrides) {
    return cachedOverrides;
  }

  const storage = getStorage();
  if (!storage) {
    cachedOverrides = {};
    return cachedOverrides;
  }

  try {
    const raw = storage.getItem(CONTROL_BINDINGS_STORAGE_KEY);
    cachedOverrides = raw ? sanitizeOverrides(JSON.parse(raw)) : {};
  } catch {
    cachedOverrides = {};
  }
  return cachedOverrides;
}

export function saveControlBindingOverrides(overrides: ControlBindingOverrides): void {
  cachedOverrides = sanitizeOverrides(overrides);
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(CONTROL_BINDINGS_STORAGE_KEY, JSON.stringify(cachedOverrides));
  } catch {
    // Persistence is best effort; the current session still uses cached overrides.
  }
}

export function clearControlBindingOverridesForTest(): void {
  cachedOverrides = {};
}

export function getBindingsForMode(
  actionId: ControlActionId,
  mode: InputModeId,
): readonly ControlBinding[] {
  const override = loadControlBindingOverrides()[mode]?.[actionId];
  if (override) {
    return override;
  }
  return getDefaultBindingsForMode(actionId, mode);
}

export function setBindingsForMode(
  actionId: ControlActionId,
  mode: InputModeId,
  bindings: readonly ControlBinding[],
): void {
  const overrides = { ...loadControlBindingOverrides() };
  overrides[mode] = { ...(overrides[mode] ?? {}), [actionId]: bindings };
  saveControlBindingOverrides(overrides);
}

export function resetBindingsForMode(actionId: ControlActionId, mode: InputModeId): void {
  const overrides = { ...loadControlBindingOverrides() };
  if (!overrides[mode]?.[actionId]) {
    return;
  }
  const modeOverrides = { ...overrides[mode] };
  delete modeOverrides[actionId];
  overrides[mode] = modeOverrides;
  saveControlBindingOverrides(overrides);
}

export function resetAllBindingsForMode(mode: InputModeId): void {
  const overrides = { ...loadControlBindingOverrides() };
  delete overrides[mode];
  saveControlBindingOverrides(overrides);
}

export function isControlActionAvailableForMode(
  actionId: ControlActionId,
  mode: InputModeId,
): boolean {
  return getBindingsForMode(actionId, mode).length > 0;
}

export function formatBindingsForDisplay(bindings: readonly ControlBinding[]): string {
  return bindings.length > 0 ? bindings.map((binding) => binding.label).join(' / ') : 'No default';
}

export function getPrimaryBindingLabelForDisplay(
  actionId: ControlActionId,
  mode: InputModeId = 'keyboardMouse',
): string {
  const bindings = getBindingsForMode(actionId, mode);
  return bindings.find((binding) => !/click|pointer/i.test(binding.label))?.label ?? bindings[0]?.label ?? 'Unbound';
}

export function getKeyboardEventBindingLabel(event: KeyboardEvent): string {
  if (event.key === ' ') {
    return 'Space';
  }
  if (event.key.startsWith('Arrow')) {
    return event.key.replace('Arrow', 'Arrow ');
  }
  if (event.key.length === 1) {
    return event.key.toUpperCase();
  }
  return event.key;
}

export function isKeyboardInputForAction(key: string, actionId: ControlActionId): boolean {
  const normalizedKey = normalizeBindingLabel(key === ' ' || key === 'spacebar' ? 'Space' : key);
  return getBindingsForMode(actionId, 'keyboardMouse').some(
    (binding) => normalizeBindingLabel(binding.label) === normalizedKey,
  );
}

export function isKeyboardEventForAction(
  event: KeyboardEvent,
  actionId: ControlActionId,
): boolean {
  return isKeyboardInputForAction(getKeyboardEventBindingLabel(event), actionId);
}
