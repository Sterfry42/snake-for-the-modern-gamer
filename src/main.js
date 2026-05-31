import './style.css'


import Phaser from "phaser";
import SnakeScene from "./scenes/snakeScene.js";
import { loadResolutionSetting } from "./config/resolutionSettings.js";

const resolution = loadResolutionSetting();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 768,
  height: 576,
  zoom: resolution.zoom,
  parent: undefined,
  backgroundColor: "#0b0f14",
  pixelArt: true,
  scene: [SnakeScene],
  audio: {
    context: new (window.AudioContext || window.webkitAudioContext)(),
  },
});

// Give the game canvas focus when it's ready
game.events.on(Phaser.Core.Events.READY, () => {
  (game.canvas.attributes.getNamedItem('tabindex') || game.canvas.setAttribute('tabindex', '1'));
  game.canvas.focus();
});
