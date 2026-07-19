import type { ControlActionId } from '../input/controlActions.js';

const isCoarsePointer = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const coarseMediaQuery = window.matchMedia?.('(pointer: coarse)');
  if (coarseMediaQuery?.matches) {
    return true;
  }

  if (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) {
    return true;
  }

  return false;
};

export interface MobileControls {
  destroy(): void;
}

interface MobileControlsOptions {
  onDirection: (x: number, y: number) => void;
  onTogglePause: () => void;
  onAction?: (actionId: ControlActionId) => void;
}

export interface SwipePoint {
  x: number;
  y: number;
}

export type SwipeDirection = { x: 0; y: -1 } | { x: 0; y: 1 } | { x: -1; y: 0 } | { x: 1; y: 0 };

export function resolveSwipeDirection(
  start: SwipePoint,
  end: SwipePoint,
  thresholdPx = 32,
): SwipeDirection | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.hypot(dx, dy) < thresholdPx) {
    return null;
  }

  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: dx > 0 ? 1 : -1, y: 0 };
  }

  return { x: 0, y: dy > 0 ? 1 : -1 };
}

const vibrate = () => {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }

  navigator.vibrate(18);
};

function bindPress(
  button: HTMLButtonElement,
  handler: (event: PointerEvent) => void,
  cleanupCallbacks: Array<() => void>,
): void {
  const cancelContextMenu = (event: Event) => event.preventDefault();

  button.addEventListener('pointerdown', handler);
  button.addEventListener('contextmenu', cancelContextMenu);

  cleanupCallbacks.push(() => {
    button.removeEventListener('pointerdown', handler);
    button.removeEventListener('contextmenu', cancelContextMenu);
  });
}

function createButton(options: {
  className: string;
  label: string;
  ariaLabel: string;
  onPress: (event: PointerEvent) => void;
  cleanupCallbacks: Array<() => void>;
}): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = options.className;
  button.textContent = options.label;
  button.setAttribute('aria-label', options.ariaLabel);
  bindPress(button, options.onPress, options.cleanupCallbacks);
  return button;
}

function createDirectionHandler(
  options: MobileControlsOptions,
  x: SwipeDirection['x'],
  y: SwipeDirection['y'],
): (event: PointerEvent) => void {
  return (event: PointerEvent) => {
    event.preventDefault();
    vibrate();
    options.onDirection(x, y);
  };
}

function fireAction(options: MobileControlsOptions, actionId: ControlActionId): void {
  options.onAction?.(actionId);
  if (actionId === 'menu.pause') {
    options.onTogglePause();
  }
}

export function createMobileControls(options: MobileControlsOptions): MobileControls | null {
  if (!isCoarsePointer()) {
    return null;
  }

  const cleanupCallbacks: Array<() => void> = [];
  const container = document.createElement('div');
  container.className = 'mobile-controls mobile-controls--handheld';

  const shell = document.createElement('div');
  shell.className = 'mobile-controls__shell';
  shell.setAttribute('aria-label', 'Mobile controls');

  const swipeLayer = document.createElement('div');
  swipeLayer.className = 'mobile-controls__swipe-layer';
  swipeLayer.setAttribute('aria-hidden', 'true');

  let swipeStart: SwipePoint | null = null;
  let swipePointerId: number | null = null;

  const handleSwipeStart = (event: PointerEvent) => {
    event.preventDefault();
    swipePointerId = event.pointerId;
    swipeStart = { x: event.clientX, y: event.clientY };
    swipeLayer.setPointerCapture?.(event.pointerId);
  };
  const handleSwipeEnd = (event: PointerEvent) => {
    event.preventDefault();
    if (!swipeStart || swipePointerId !== event.pointerId) return;
    const direction = resolveSwipeDirection(swipeStart, { x: event.clientX, y: event.clientY });
    swipeStart = null;
    swipePointerId = null;
    if (!direction) return;
    vibrate();
    options.onDirection(direction.x, direction.y);
  };
  const handleSwipeCancel = (event: PointerEvent) => {
    event.preventDefault();
    swipeStart = null;
    swipePointerId = null;
  };

  swipeLayer.addEventListener('pointerdown', handleSwipeStart);
  swipeLayer.addEventListener('pointerup', handleSwipeEnd);
  swipeLayer.addEventListener('pointercancel', handleSwipeCancel);
  cleanupCallbacks.push(() => {
    swipeLayer.removeEventListener('pointerdown', handleSwipeStart);
    swipeLayer.removeEventListener('pointerup', handleSwipeEnd);
    swipeLayer.removeEventListener('pointercancel', handleSwipeCancel);
  });

  const dpadPanel = document.createElement('section');
  dpadPanel.className = 'mobile-controls__dpad-panel';
  dpadPanel.setAttribute('aria-label', 'Movement controls');
  const dpad = document.createElement('div');
  dpad.className = 'mobile-controls__dpad-cross';

  const directions = [
    { label: '▲', ariaLabel: 'Move up', x: 0, y: -1, className: 'up' },
    { label: '◀', ariaLabel: 'Move left', x: -1, y: 0, className: 'left' },
    { label: '▶', ariaLabel: 'Move right', x: 1, y: 0, className: 'right' },
    { label: '▼', ariaLabel: 'Move down', x: 0, y: 1, className: 'down' },
  ] as const;

  for (const direction of directions) {
    dpad.appendChild(
      createButton({
        className: `mobile-controls__dpad-button mobile-controls__dpad-button--${direction.className}`,
        label: direction.label,
        ariaLabel: direction.ariaLabel,
        onPress: createDirectionHandler(options, direction.x, direction.y),
        cleanupCallbacks,
      }),
    );
  }
  const dpadCenter = document.createElement('div');
  dpadCenter.className = 'mobile-controls__dpad-center';
  dpadCenter.setAttribute('aria-hidden', 'true');
  dpad.appendChild(dpadCenter);
  dpadPanel.appendChild(dpad);

  const centerPanel = document.createElement('section');
  centerPanel.className = 'mobile-controls__center-panel';
  centerPanel.setAttribute('aria-label', 'System controls');

  const createActionHandler = (actionId: ControlActionId) => (event: PointerEvent) => {
    event.preventDefault();
    vibrate();
    fireAction(options, actionId);
  };

  centerPanel.appendChild(
    createButton({
      className: 'mobile-controls__utility-button mobile-controls__utility-button--select',
      label: 'Select',
      ariaLabel: 'Toggle map',
      onPress: createActionHandler('map.toggle'),
      cleanupCallbacks,
    }),
  );
  centerPanel.appendChild(
    createButton({
      className: 'mobile-controls__utility-button mobile-controls__utility-button--start',
      label: 'Start',
      ariaLabel: 'Toggle menu',
      onPress: createActionHandler('menu.pause'),
      cleanupCallbacks,
    }),
  );

  const actionPanel = document.createElement('section');
  actionPanel.className = 'mobile-controls__action-panel';
  actionPanel.setAttribute('aria-label', 'Action controls');
  actionPanel.appendChild(
    createButton({
      className: 'mobile-controls__action-button mobile-controls__action-button--x',
      label: 'X',
      ariaLabel: 'Use context ability',
      onPress: createActionHandler('ability.context'),
      cleanupCallbacks,
    }),
  );
  actionPanel.appendChild(
    createButton({
      className: 'mobile-controls__action-button mobile-controls__action-button--b',
      label: 'B',
      ariaLabel: 'Back or cancel',
      onPress: createActionHandler('back.cancel'),
      cleanupCallbacks,
    }),
  );
  actionPanel.appendChild(
    createButton({
      className: 'mobile-controls__action-button mobile-controls__action-button--a',
      label: 'A',
      ariaLabel: 'Interact or confirm',
      onPress: createActionHandler('interact.confirm'),
      cleanupCallbacks,
    }),
  );

  shell.appendChild(swipeLayer);
  shell.appendChild(dpadPanel);
  shell.appendChild(centerPanel);
  shell.appendChild(actionPanel);
  container.appendChild(shell);
  document.body.appendChild(container);

  return {
    destroy: () => {
      for (const cleanup of cleanupCallbacks) cleanup();
      container.remove();
    },
  };
}
