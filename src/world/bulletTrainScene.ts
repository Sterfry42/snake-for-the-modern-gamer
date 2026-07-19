import Phaser from 'phaser';


/** Callback invoked when the bullet train ride completes. */
export interface BulletTrainArrivalData {
  destinationRoomId: string;
  destinationExitX: number;
  destinationExitY: number;
  arrivalFlavor: string;
  displayName?: string;
}

/**
 * Configuration for the bullet train ride animation.
 * Used by SnakeScene to run the ride inline without creating a separate scene.
 */
export interface BulletTrainRideConfig {
  journey: {
    stationRoomId: string;
    stationEntranceX: number;
    stationEntranceY: number;
    destinationRoomId: string;
    destinationExitX: number;
    destinationExitY: number;
    transitRooms: string[];
    transitProgress: number;
    startedAtMs: number;
    durationMs: number;
  };
  arrivalFlavor: string;
  destinationRoomId: string;
  destinationExitX: number;
  destinationExitY: number;
  stationRoomId: string;
  /** Optional coordinate string for the destination (e.g., "(-3, 2, 0)"). */
  destinationCoordinates?: string;
  onArrival: (arrivalData: BulletTrainArrivalData) => void;
}

/**
 * Runs the bullet train ride animation inline within the current scene.
 * This avoids scene lifecycle issues that corrupt the parent scene's Layers.
 */
export function runBulletTrainRide(scene: Phaser.Scene, config: BulletTrainRideConfig): void {
  const { width, height } = scene.scale;
  const { arrivalFlavor, destinationRoomId, destinationExitX, destinationExitY, destinationCoordinates, onArrival } = config;

  // Create overlay graphics for the train interior (high depth to cover everything)
  const overlayGraphics = scene.add.graphics().setDepth(500).setScrollFactor(0);

  // Draw train interior background
  overlayGraphics.fillStyle(0x3a2a1a);
  overlayGraphics.fillRect(0, 0, width, height);

  // Ceiling
  overlayGraphics.fillStyle(0x6b4423);
  overlayGraphics.fillRect(0, 0, width, height * 0.08);

  // Walls
  overlayGraphics.fillStyle(0x8b6914);
  overlayGraphics.fillRect(0, 0, width * 0.15, height);
  overlayGraphics.fillRect(width * 0.85, 0, width * 0.15, height);

  // Floor
  overlayGraphics.fillStyle(0x5a4a10);
  overlayGraphics.fillRect(0, height * 0.92, width, height * 0.08);

  // Window frame
  overlayGraphics.lineStyle(4, 0x2a1a0a);
  overlayGraphics.strokeRect(width * 0.15, height * 0.08, width * 0.7, height * 0.52);

  // Window glass
  overlayGraphics.fillStyle(0x4a5a6a);
  overlayGraphics.fillRect(width * 0.15 + 2, height * 0.08 + 2, width * 0.7 - 4, height * 0.52 - 4);

  // Luggage rack
  overlayGraphics.fillStyle(0x7a5a2a);
  overlayGraphics.fillRect(width * 0.2, height * 0.06, width * 0.6, 8);

  // Passenger silhouettes with bobbing animation
  const passengerHeads: { y: number; obj: { y: number } }[] = [];
  for (let i = 0; i < 3; i++) {
    const sx = width * 0.2 + i * (width * 0.2);
    const sy = height * 0.68;

    // Seat
    overlayGraphics.fillStyle(0x3a3a3a);
    overlayGraphics.fillRect(sx - 10, sy + 10, 20, 30);

    // Head
    overlayGraphics.fillStyle(0x2a2a2a);
    overlayGraphics.fillCircle(sx, sy, 8);

    // Store for animation
    const headObj = { y: sy };
    passengerHeads.push({ y: sy, obj: headObj });

    scene.tweens.add({
      targets: headObj,
      y: sy + 2,
      duration: 800 + i * 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        overlayGraphics.fillStyle(0x2a2a2a);
        overlayGraphics.fillCircle(sx, headObj.y, 8);
      },
    });
  }

  // LED display with destination name and coordinates
  const destinationName = destinationRoomId.replace(/,/g, '.');
  const coordLine = destinationCoordinates ? `\n[${destinationCoordinates}]` : '';
  const ledDisplayText = scene.add.text(width / 2, height * 0.86 + 14, `JADE PEAK EXPRESS → ${destinationName}${coordLine}`, {
    fontFamily: 'monospace',
    fontSize: '14px',
    color: '#ff6b44',
    fontStyle: 'bold',
  })
    .setOrigin(0.5)
    .setDepth(600)

  // Window scenery animation (mountains and cherry blossoms)
  let windowOffset = 0;
  const sceneryGraphics = scene.add.graphics().setDepth(501).setScrollFactor(0);
  scene.tweens.add({
    targets: sceneryGraphics,
    duration: 1,
    repeat: -1,
    onUpdate: () => {
      sceneryGraphics.clear();
      windowOffset += 1;

      // Mountain silhouette
      sceneryGraphics.fillStyle(0x4a6741, 0.6);
      sceneryGraphics.beginPath();
      sceneryGraphics.moveTo(width * 0.15, height * 0.6);
      for (let i = 0; i <= 10; i++) {
        const mx = width * 0.15 + (width * 0.7) * (i / 10);
        const my = height * 0.3 + Math.sin((i + windowOffset * 0.02) * 0.8) * 40;
        sceneryGraphics.lineTo(mx, my);
      }
      sceneryGraphics.lineTo(width * 0.85, height * 0.6);
      sceneryGraphics.closePath();
      sceneryGraphics.fillPath();

      // Cherry blossom petals
      sceneryGraphics.fillStyle(0xffb3ba, 0.5);
      for (let i = 0; i < 12; i++) {
        const px = width * 0.2 + ((i * 67 + windowOffset * 0.5) % (width * 0.6));
        const py = height * 0.15 + Math.sin((i * 31 + windowOffset * 0.03) * 1.3) * 30 + (i * 13) % 40;
        sceneryGraphics.fillCircle(px, py, 3);
      }

      // Speed lines
      sceneryGraphics.lineStyle(2, 0xffffff, 0.3);
      for (let i = 0; i < 8; i++) {
        const lx = width * 0.15 + ((i * 97 + windowOffset * 2) % (width * 0.7));
        const ly = height * 0.15 + (i * 23) % (height * 0.4);
        sceneryGraphics.lineBetween(lx, ly, lx - 30, ly);
      }
    },
  });

  // Show arrival flavor text at the end
  const flavorText = scene.add.text(width / 2, height * 0.12, '', {
    fontFamily: 'monospace',
    fontSize: '16px',
    color: '#ffffff',
    align: 'center',
    wordWrap: { width: width * 0.6 },
  })
    .setOrigin(0.5)
    .setAlpha(0)
    .setDepth(600);

  // Timeline: 0-800ms departing, 800-1600ms accelerating, 1600-3200ms cruising, 3200-4000ms decelerating, 4000ms+ arriving
  scene.time.delayedCall(4000, () => {
    // Show flavor text
    flavorText.setText(arrivalFlavor);
    scene.tweens.add({
      targets: flavorText,
      alpha: 1,
      duration: 800,
      ease: 'Sine.easeOut',
      onComplete: () => {
        // Wait for player to read, then clean up and transition
        scene.time.delayedCall(1500, () => {
          // Destroy all tweens
          scene.tweens.getTweens().forEach((t) => t.destroy());

          // Destroy overlay objects
          overlayGraphics.destroy();
          sceneryGraphics.destroy();
          ledDisplayText.destroy();
          flavorText.destroy();

          // Call the arrival callback
          onArrival({
            destinationRoomId,
            destinationExitX,
            destinationExitY,
            arrivalFlavor,
          });
        });
      },
    });
  });
}
