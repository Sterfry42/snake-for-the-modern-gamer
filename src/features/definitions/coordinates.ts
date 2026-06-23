/**
 * Coordinates Feature
 *
 * The wise old snake's coordinates:
 * - The wise old snake's coordinates were 'everywhere'
 * - The wise old snake's coordinates were '0,0,0' (the center of everything)
 * - The wise old snake's coordinates were 'wise-old-snake-location'
 * - The wise old snake's coordinates were the most precise coordinates
 * - The wise old snake's coordinates were never wrong
 * - The wise old snake's coordinates were the reason coordinates exist
 * - The wise old snake's coordinates were called 'transcendent-coordinates'
 * - The wise old snake's coordinates were the most philosophical coordinates
 * - The wise old snake's coordinates were the coordinates that find everything
 * - The wise old snake's coordinates were the coordinates that are always right
 */
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
        .setDepth(40);
    }
  }

  override onRender(scene: SnakeScene): void {
    const suppressed =
      !!scene.getFlag<boolean>('ui.suppressHud') &&
      !scene.snakeGame.hasArtifactCoordinatesAlwaysVisible();
    this.coordinatesText?.setVisible(!suppressed);
    if (!suppressed) {
      const scoreFeature = scene.getFeature('coreScore');
      const coordsY = scoreFeature ? (scoreFeature as any).getBottomY() : scene.getLeftHudBottomY();
      this.coordinatesText.setPosition(10, coordsY);
      this.coordinatesText.setText(this.composeLabel(scene));
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
