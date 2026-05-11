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
}

export function createMobileControls(options: MobileControlsOptions): MobileControls | null {
  if (!isCoarsePointer()) {
    return null;
  }

  const container = document.createElement('div');
  container.className = 'mobile-controls';

  const dpad = document.createElement('div');
  dpad.className = 'mobile-controls__dpad';

  const actions = document.createElement('div');
  actions.className = 'mobile-controls__actions';

  const cleanupCallbacks: Array<() => void> = [];

  const addDirectionalButton = (label: string, x: number, y: number, className: string) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `mobile-controls__button mobile-controls__button--${className}`;
    button.setAttribute('aria-label', label);
    button.textContent = label;

    const handler = (event: PointerEvent) => {
      event.preventDefault();
      options.onDirection(x, y);
    };

    const cancelContextMenu = (event: Event) => event.preventDefault();

    button.addEventListener('pointerdown', handler);
    button.addEventListener('contextmenu', cancelContextMenu);

    cleanupCallbacks.push(() => {
      button.removeEventListener('pointerdown', handler);
      button.removeEventListener('contextmenu', cancelContextMenu);
    });

    dpad.appendChild(button);
  };

  // Layout: create 9 slots for a simple D-pad layout
  const layout: Array<Array<{ label?: string; x?: number; y?: number; className?: string }>> = [
    [{}, { label: '▲', x: 0, y: -1, className: 'up' }, {}],
    [
      { label: '◀', x: -1, y: 0, className: 'left' },
      {},
      { label: '▶', x: 1, y: 0, className: 'right' },
    ],
    [{}, { label: '▼', x: 0, y: 1, className: 'down' }, {}],
  ];

  for (const row of layout) {
    for (const cell of row) {
      if (
        cell.label &&
        typeof cell.x === 'number' &&
        typeof cell.y === 'number' &&
        cell.className
      ) {
        addDirectionalButton(cell.label, cell.x, cell.y, cell.className);
      } else {
        const spacer = document.createElement('div');
        spacer.className = 'mobile-controls__spacer';
        dpad.appendChild(spacer);
      }
    }
  }

  const pauseButton = document.createElement('button');
  pauseButton.type = 'button';
  pauseButton.className = 'mobile-controls__button mobile-controls__button--pause';
  pauseButton.textContent = 'Menu';
  pauseButton.setAttribute('aria-label', 'Toggle menu');

  const pauseHandler = (event: PointerEvent) => {
    event.preventDefault();
    options.onTogglePause();
  };

  const cancelPauseContextMenu = (event: Event) => event.preventDefault();

  pauseButton.addEventListener('pointerdown', pauseHandler);
  pauseButton.addEventListener('contextmenu', cancelPauseContextMenu);

  cleanupCallbacks.push(() => {
    pauseButton.removeEventListener('pointerdown', pauseHandler);
    pauseButton.removeEventListener('contextmenu', cancelPauseContextMenu);
  });

  actions.appendChild(pauseButton);

  container.appendChild(dpad);
  container.appendChild(actions);

  document.body.appendChild(container);

  return {
    destroy: () => {
      for (const cleanup of cleanupCallbacks) {
        cleanup();
      }
      container.remove();
    },
  };
}
