import Phaser from 'phaser';
import { Feature } from '../feature.js';
import type SnakeScene from '../../scenes/snakeScene.js';

class CoordinatesFeature extends Feature {
  private coordinatesText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('coordinates', 'Coordinates HUD');
  }

  override onRegister(scene: SnakeScene): void {
    if (!this.coordinatesText) {
      this.coordinatesText = scene.add
        .text(10, 44, this.composeLabel(scene), {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#9ad1ff',
          lineSpacing: 2,
        })
        .setDepth(10);
    }
  }

  override onRender(scene: SnakeScene): void {
    const suppressed =
      !!scene.getFlag<boolean>('ui.suppressHud') &&
      !scene.snakeGame.hasArtifactCoordinatesAlwaysVisible();
    this.coordinatesText?.setVisible(!suppressed);
    if (!suppressed) {
      this.coordinatesText?.setPosition(10, scene.snakeGame.isRaccoonMode() ? 82 : 54);
      this.coordinatesText?.setText(this.composeLabel(scene));
    }
  }

  private composeLabel(scene: SnakeScene): string {
    const roomId = scene.currentRoomId;
    if (roomId.startsWith('cave:')) {
      return 'Pos: Cave | Local Subroom';
    }
    if (!/^-?\d+,-?\d+,-?\d+$/.test(roomId)) {
      return 'Pos: Interior | Local Room';
    }
    const [roomX, roomY, roomZ] = roomId.split(',').map(Number);
    return `Pos: X=${roomX} Y=${roomY} | Z=${roomZ}`;
  }
}

export default new CoordinatesFeature();
