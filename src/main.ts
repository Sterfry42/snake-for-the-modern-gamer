import './style.css';

import Phaser from 'phaser';
import { defaultGameConfig } from './config/gameConfig.js';
import SnakeScene from './scenes/snakeScene.js';
import { loadResolutionSetting } from './config/resolutionSettings.js';
import { initializeDebugRuntime } from './debug/debugRuntime.js';

const resolution = loadResolutionSetting();

initializeDebugRuntime({
  urlSearch: window.location.search,
  appVersion: import.meta.env.MODE,
  gameConfigSummary: {
    grid: defaultGameConfig.grid,
    world: defaultGameConfig.world,
    snake: {
      initialLength: defaultGameConfig.snake.initialBody.length,
      initialDirection: defaultGameConfig.snake.initialDirection,
    },
  },
});

const audioContextCtor = window.AudioContext || window.webkitAudioContext;

// The fixed logical size of the game world. FIT scaling renders this size
// into the shell, so every scene keeps its original 768x576 coordinates.
const GAME_WIDTH = 768;
const GAME_HEIGHT = 576;

/**
 * Sizes the #game-shell to the visible screen. The resolution setting's
 * zoom acts as a global scale factor (FIT scaling ignores the Scale
 * Manager's zoom, so the title screen's performance option still works).
 * On touch devices in portrait, the shell also shrinks up above the fixed
 * mobile controls deck so the play area never hides under the dpad.
 */
function measureGameShell(shell: HTMLElement, zoom: number): void {
  const portrait = window.matchMedia('(orientation: portrait)').matches;
  const deck = document.querySelector<HTMLElement>('.mobile-controls__shell');
  const reserved = portrait && deck ? Math.ceil(deck.getBoundingClientRect().height) : 0;

  shell.style.setProperty('--game-shell-reserved', `${reserved}px`);
  shell.style.width = `${Math.max(0, window.innerWidth * zoom)}px`;
  shell.style.height = `${Math.max(0, (window.innerHeight - reserved) * zoom)}px`;
}

/**
 * Wires up live resizes for the shell: window resizes, orientation flips,
 * and the mobile controls deck appearing, disappearing, or changing size.
 */
function observeGameShell(shell: HTMLElement, zoom: number, onChanged: () => void): void {
  let deck: HTMLElement | null = null;
  let deckObserver: ResizeObserver | null = null;

  const apply = () => {
    measureGameShell(shell, zoom);
    onChanged();
  };

  const adoptDeck = (next: HTMLElement | null) => {
    if (next === deck) {
      return;
    }
    deckObserver?.disconnect();
    deckObserver = null;
    deck = next;
    if (deck) {
      deckObserver = new ResizeObserver(apply);
      deckObserver.observe(deck);
    }
    apply();
  };

  const refreshDeck = () => {
    adoptDeck(document.querySelector<HTMLElement>('.mobile-controls__shell'));
  };

  // The deck is mounted by the scene after boot, so watch the body for it.
  const bodyWatcher = new MutationObserver(refreshDeck);
  bodyWatcher.observe(document.body, { childList: true });

  const portraitQuery = window.matchMedia('(orientation: portrait)');
  window.addEventListener('resize', apply);
  portraitQuery.addEventListener('change', apply);

  apply();
}

const shell = document.getElementById('game-shell');

if (!shell) {
  throw new Error('Missing #game-shell container');
}

// Size the shell before the game boots so the Scale Manager sees a real parent.
measureGameShell(shell, resolution.zoom);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: shell,
  backgroundColor: '#0b0f14',
  pixelArt: true,
  scene: [SnakeScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  audio: {
    context: new (audioContextCtor ?? AudioContext)(),
  },
});

// The wise old snake's obstacles were always ladders; the shell is ours.
observeGameShell(shell, resolution.zoom, () => game.scale.refresh());

// Give the game canvas focus when it's ready
game.events.on(Phaser.Core.Events.READY, () => {
  if (!game.canvas.attributes.getNamedItem('tabindex')) {
    game.canvas.setAttribute('tabindex', '1');
  }
  game.canvas.focus();
});
