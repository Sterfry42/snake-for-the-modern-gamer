import Phaser from 'phaser';
import type { RollercoasterTheme, RollercoasterCarVisual } from './rollercoasterTypes.js';
import { getSpeedProfile, THEME_CONFIG } from './rollercoasterService.js';

/** Callback invoked when the rollercoaster ride completes. */
export interface RollercoasterArrivalData {
  destinationRoomId: string;
  destinationExitX: number;
  destinationExitY: number;
  arrivalFlavor: string;
  displayName?: string;
  theme: RollercoasterTheme;
}

/** Configuration for the rollercoaster ride animation. */
export interface RollercoasterRideConfig {
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
    maxHeightReached: number;
    turnsCompleted: number;
  };
  arrivalFlavor: string;
  destinationRoomId: string;
  destinationExitX: number;
  destinationExitY: number;
  stationRoomId: string;
  destinationCoordinates?: string;
  theme: RollercoasterTheme;
  onArrival: (arrivalData: RollercoasterArrivalData) => void;
}

/**
 * Runs the rollercoaster ride animation inline within the current scene.
 * Features: lift hill → drop → loops → station arrival with dynamic scenery.
 */
export function runRollercoasterRide(scene: Phaser.Scene, config: RollercoasterRideConfig): void {
  const { width, height } = scene.scale;
  const { journey, arrivalFlavor, destinationRoomId, destinationExitX, destinationExitY, destinationCoordinates, theme, onArrival } = config;
  const profile = getSpeedProfile(theme);
  const themeColors = THEME_CONFIG[theme].colors;
  const carVisual: RollercoasterCarVisual = {
    bodyColor: themeColors[0],
    stripeColor: themeColors[1],
    wheelColor: 0x333333,
    seatColor: 0x555555,
  };

  // Total ride duration
  const totalDuration = journey.durationMs;

  // === PHASE 1: BOARDING (0-10%) ===
  const boardingDuration = totalDuration * 0.1;
  const boardingText = scene.add.text(width / 2, height * 0.45, '🎢 Boarding...', {
    fontFamily: 'monospace',
    fontSize: '28px',
    color: '#ffffff',
  }).setOrigin(0.5).setDepth(600);

  // === PHASE 2: LIFT HILL (10-30%) ===
  const climbStart = boardingDuration;
  const climbDuration = totalDuration * 0.2;

  // === PHASE 3: DROP & MAIN RIDE (30-80%) ===
  const dropStart = climbStart + climbDuration;
  const mainRideDuration = totalDuration * 0.5;

  // === PHASE 4: BRAKING & ARRIVAL (80-100%) ===
  const brakeStart = dropStart + mainRideDuration;
  const arrivalDuration = totalDuration - brakeStart;

  // Main ride canvas
  const rideCanvas = scene.add.graphics().setDepth(500).setScrollFactor(0);

  // Sky background
  const skyGradient = scene.add.graphics().setDepth(499).setScrollFactor(0);
  drawSkyGradient(skyGradient, width, height, theme);

  // Scenery canvas (mountains, buildings, etc.)
  const sceneryCanvas = scene.add.graphics().setDepth(501).setScrollFactor(0);

  // Track canvas
  const trackCanvas = scene.add.graphics().setDepth(502).setScrollFactor(0);

  // Car canvas
  const carCanvas = scene.add.graphics().setDepth(503).setScrollFactor(0);

  // HUD elements
  const speedBar = scene.add.graphics().setDepth(600).setScrollFactor(0);
  const altitudeBar = scene.add.graphics().setDepth(600).setScrollFactor(0);

  const speedText = scene.add.text(width * 0.85, height * 0.05, 'SPEED', {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#ffffff',
  }).setOrigin(0.5).setDepth(600).setScrollFactor(0);

  const altitudeText = scene.add.text(width * 0.85, height * 0.12, 'ALTITUDE', {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#ffffff',
  }).setOrigin(0.5).setDepth(600).setScrollFactor(0);

  // Speed lines overlay
  const speedLinesCanvas = scene.add.graphics().setDepth(504).setScrollFactor(0);

  // Status text at bottom
  const statusText = scene.add.text(width / 2, height * 0.9, '', {
    fontFamily: 'monospace',
    fontSize: '16px',
    color: '#ffffff',
    align: 'center',
    wordWrap: { width: width * 0.7 },
  }).setOrigin(0.5).setDepth(600).setScrollFactor(0);

  // Arrival flavor text
  const flavorText = scene.add.text(width / 2, height * 0.15, '', {
    fontFamily: 'monospace',
    fontSize: '16px',
    color: '#ffffff',
    align: 'center',
    wordWrap: { width: width * 0.6 },
  }).setOrigin(0.5).setDepth(600).setScrollFactor(0);

  // Destination display
  const destDisplay = scene.add.text(width / 2, height * 0.05, '', {
    fontFamily: 'monospace',
    fontSize: '14px',
    color: `#${(themeColors[0] ?? 0xff6b44).toString(16).padStart(6, '0')}`,
    fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(600).setScrollFactor(0);

  const destName = destinationRoomId.replace(/,/g, '.');
  const coordLine = destinationCoordinates ? `\n[${destinationCoordinates}]` : '';
  destDisplay.setText(`🎢 ROLLERCOASTER → ${destName}${coordLine}`);

  // Scenery offset for parallax
  let sceneryOffset = 0;
  let lastSpeed = 0;
  let maxAltitude = 0;

  // Main ride animation loop
  const rideState = { progress: 0 };
  const rideTween = scene.tweens.add({
    targets: rideState,
    progress: 1,
    duration: totalDuration,
    ease: 'Linear',
    onUpdate: () => {
      const progress = rideState.progress;
      const elapsed = progress * totalDuration;
      sceneryOffset += 2 + progress * 5;

      // Calculate speed based on phase
      let speed: number;
      let altitude: number;
      let phaseLabel: string;

      if (progress < 0.1) {
        // Boarding
        speed = 0;
        altitude = 0;
        phaseLabel = '🎫 Boarding...';
      } else if (progress < 0.3) {
        // Climbing
        const climbProgress = (progress - 0.1) / 0.2;
        speed = profile.climbSpeed * climbProgress;
        altitude = climbProgress;
        phaseLabel = '⬆️ Climbing...';
        if (climbProgress > 0.8) {
          phaseLabel = '😱 TOP OF THE HILL!';
        }
      } else if (progress < 0.8) {
        // Main ride
        const rideProgress = (progress - 0.3) / 0.5;
        // Speed profile: fast drop, loops, then braking
        if (rideProgress < 0.15) {
          // Big drop
          speed = profile.peakSpeed * (0.5 + rideProgress / 0.15 * 0.5);
          altitude = 1 - rideProgress / 0.15 * 0.6;
        } else if (rideProgress < 0.7) {
          // Loops and turns
          const loopPhase = (rideProgress - 0.15) / 0.55;
          speed = profile.peakSpeed * (0.7 + Math.sin(loopPhase * Math.PI * 3) * 0.3);
          altitude = 0.4 + Math.sin(loopPhase * Math.PI * 2) * 0.3;
        } else {
          // Braking
          const brakePhase = (rideProgress - 0.7) / 0.3;
          speed = profile.peakSpeed * (1 - brakePhase * 0.8);
          altitude = 0.4 * (1 - brakePhase);
        }
        phaseLabel = '🎢 WHEEE!';
      } else {
        // Arrival
        const arrivalProgress = (progress - 0.8) / 0.2;
        speed = profile.brakeSpeed * (1 - arrivalProgress);
        altitude = 0;
        phaseLabel = '🛑 Arriving...';
      }

      maxAltitude = Math.max(maxAltitude, altitude);

      // Clear canvases
      rideCanvas.clear();
      sceneryCanvas.clear();
      trackCanvas.clear();
      carCanvas.clear();
      speedLinesCanvas.clear();
      speedBar.clear();
      altitudeBar.clear();

      // Draw parallax scenery
      drawParallaxScenery(sceneryCanvas, width, height, sceneryOffset, theme, progress);

      // Draw track
      drawRollercoasterTrack(trackCanvas, width, height, progress, theme);

      // Draw car at track position
      drawRollercoasterCar(carCanvas, width, height, progress, speed, carVisual, theme);

      // Speed lines at high speed
      if (speed > 0.5) {
        drawSpeedLines(speedLinesCanvas, width, height, sceneryOffset, speed);
      }

      // Draw HUD
      drawSpeedBar(speedBar, width, height * 0.75, speed / profile.peakSpeed);
      drawAltitudeBar(altitudeBar, width, height * 0.82, altitude);

      // Update texts
      statusText.setText(phaseLabel);
      speedText.setText(`SPEED: ${(speed * 100).toFixed(0)} km/h`);
      altitudeText.setText(`ALT: ${(altitude * 100).toFixed(0)}m`);

      // Show flavor text at arrival
      if (progress >= 0.95) {
        flavorText.setText(arrivalFlavor);
        flavorText.setAlpha(Math.min(1, (progress - 0.95) * 20));
      } else {
        flavorText.setAlpha(0);
      }

      lastSpeed = speed;
    },
    onComplete: () => {
      // Clean up
      scene.tweens.getTweens().forEach((t) => t.destroy());
      rideCanvas.destroy();
      skyGradient.destroy();
      sceneryCanvas.destroy();
      trackCanvas.destroy();
      carCanvas.destroy();
      speedLinesCanvas.destroy();
      speedBar.destroy();
      altitudeBar.destroy();
      boardingText.destroy();
      statusText.destroy();
      flavorText.destroy();
      destDisplay.destroy();
      speedText.destroy();
      altitudeText.destroy();

      onArrival({
        destinationRoomId,
        destinationExitX,
        destinationExitY,
        arrivalFlavor,
        theme,
      });
    },
  });

  // Fade in boarding text
  scene.tweens.add({
    targets: boardingText,
    alpha: 1,
    duration: 500,
  });

  // Fade out boarding text at climb start
  scene.time.delayedCall(boardingDuration, () => {
    scene.tweens.add({
      targets: boardingText,
      alpha: 0,
      duration: 300,
      onComplete: () => boardingText.destroy(),
    });
  });
}

function drawSkyGradient(graphics: Phaser.GameObjects.Graphics, width: number, height: number, theme: RollercoasterTheme): void {
  const themeColors = THEME_CONFIG[theme].colors;
  const skyColors: Record<RollercoasterTheme, [number, number]> = {
    'thunder-ridge': [0x87ceeb, 0xb0c4de],
    'neon-nights': [0x0a0a2e, themeColors[0]],
    'jungle-jolt': [0x228b22, 0x32cd32],
    'arctic-avalanche': [0xe0ffff, 0x87ceeb],
    'volcanic-veer': [0xff4500, 0x8b0000],
    'cosmic-corkscrew': [0x0a0020, themeColors[0]],
  };
  const [topColor, bottomColor] = skyColors[theme];

  graphics.fillStyle(topColor, 0.6);
  graphics.fillRect(0, 0, width, height);
  graphics.fillStyle(bottomColor, 0.4);
  graphics.fillRect(0, height * 0.5, width, height * 0.5);
}

function drawParallaxScenery(
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  offset: number,
  theme: RollercoasterTheme,
  _progress: number,
): void {
  const themeColors = THEME_CONFIG[theme].colors;

  // Far mountains/buildings (slow parallax)
  graphics.fillStyle(0x000000, 0.15);
  for (let i = 0; i < 8; i++) {
    const bx = ((i * 200 - offset * 0.3) % (width + 400)) - 200;
    const bh = 80 + Math.sin(i * 1.5) * 40;
    graphics.fillRect(bx, height * 0.55 - bh, 100, bh + 200);
  }

  // Mid-ground structures (medium parallax)
  graphics.fillStyle(themeColors[0], 0.2);
  for (let i = 0; i < 6; i++) {
    const sx = ((i * 280 - offset * 0.7) % (width + 500)) - 250;
    const sh = 60 + Math.sin(i * 2.1) * 30;
    graphics.fillRect(sx, height * 0.6 - sh, 80, sh + 200);
  }

  // Stars for cosmic theme
  if (theme === 'cosmic-corkscrew') {
    graphics.fillStyle(0xffffff, 0.6);
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 97 + offset * 0.1) % width);
      const sy = (i * 53) % (height * 0.5);
      graphics.fillCircle(sx, sy, 1.5);
    }
  }
}

function drawRollercoasterTrack(
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  progress: number,
  theme: RollercoasterTheme,
): void {
  const themeColors = THEME_CONFIG[theme].colors;
  const trackColor = themeColors[0];

  // Draw a winding track that the car follows
  graphics.lineStyle(6, trackColor, 0.8);
  graphics.beginPath();

  const trackPoints = 20;
  for (let i = 0; i <= trackPoints; i++) {
    const t = i / trackPoints;
    const x = width * 0.1 + t * width * 0.8;
    // Track shape: lift hill, drop, loops, flat, brake
    let y: number;
    if (t < 0.15) {
      // Lift hill
      y = height * 0.7 - t / 0.15 * height * 0.4;
    } else if (t < 0.25) {
      // Drop
      y = height * 0.3 + (t - 0.15) / 0.1 * height * 0.3;
    } else if (t < 0.5) {
      // Loops and turns (wavy)
      y = height * 0.6 + Math.sin((t - 0.25) / 0.25 * Math.PI * 4) * height * 0.15;
    } else if (t < 0.8) {
      // More thrills
      y = height * 0.55 + Math.sin((t - 0.5) / 0.3 * Math.PI * 3) * height * 0.12;
    } else {
      // Braking run
      y = height * 0.55 + (t - 0.8) / 0.2 * height * 0.15;
    }

    if (i === 0) {
      graphics.moveTo(x, y);
    } else {
      graphics.lineTo(x, y);
    }
  }
  graphics.strokePath();

  // Track supports
  graphics.lineStyle(3, 0x666666, 0.4);
  for (let i = 0; i < trackPoints; i += 2) {
    const t = i / trackPoints;
    const x = width * 0.1 + t * width * 0.8;
    let y: number;
    if (t < 0.15) {
      y = height * 0.7 - t / 0.15 * height * 0.4;
    } else if (t < 0.25) {
      y = height * 0.3 + (t - 0.15) / 0.1 * height * 0.3;
    } else if (t < 0.5) {
      y = height * 0.6 + Math.sin((t - 0.25) / 0.25 * Math.PI * 4) * height * 0.15;
    } else if (t < 0.8) {
      y = height * 0.55 + Math.sin((t - 0.5) / 0.3 * Math.PI * 3) * height * 0.12;
    } else {
      y = height * 0.55 + (t - 0.8) / 0.2 * height * 0.15;
    }
    graphics.lineBetween(x, y, x, y + 60);
  }
}

function drawRollercoasterCar(
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  progress: number,
  speed: number,
  carVisual: RollercoasterCarVisual,
  theme: RollercoasterTheme,
): void {
  // Calculate car position on track
  const trackPoints = 20;
  const carIndex = Math.min(progress * (trackPoints - 1), trackPoints - 1);
  const t = carIndex;

  const x = width * 0.1 + (t / (trackPoints - 1)) * width * 0.8;
  let y: number;
  if (t / (trackPoints - 1) < 0.15) {
    y = height * 0.7 - (t / (trackPoints - 1)) / 0.15 * height * 0.4;
  } else if (t / (trackPoints - 1) < 0.25) {
    y = height * 0.3 + ((t / (trackPoints - 1)) - 0.15) / 0.1 * height * 0.3;
  } else if (t / (trackPoints - 1) < 0.5) {
    y = height * 0.6 + Math.sin(((t / (trackPoints - 1)) - 0.25) / 0.25 * Math.PI * 4) * height * 0.15;
  } else if (t / (trackPoints - 1) < 0.8) {
    y = height * 0.55 + Math.sin(((t / (trackPoints - 1)) - 0.5) / 0.3 * Math.PI * 3) * height * 0.12;
  } else {
    y = height * 0.55 + ((t / (trackPoints - 1)) - 0.8) / 0.2 * height * 0.15;
  }

  // Car bob based on speed
  const bobAmount = speed * 3;
  const carY = y - 15 + Math.sin(Date.now() * 0.02) * bobAmount;

  // Car body
  graphics.fillStyle(carVisual.bodyColor, 0.9);
  graphics.fillRect(x - 18, carY - 8, 36, 16);

  // Stripe
  graphics.fillStyle(carVisual.stripeColor, 0.7);
  graphics.fillRect(x - 18, carY - 2, 36, 4);

  // Snake silhouette in the car
  graphics.fillStyle(0x44aa44, 0.8);
  graphics.fillCircle(x, carY - 4, 5);
  graphics.fillRect(x - 3, carY + 2, 6, 6);

  // Wheels
  graphics.fillStyle(carVisual.wheelColor, 0.9);
  graphics.fillCircle(x - 12, carY + 10, 4);
  graphics.fillCircle(x + 12, carY + 10, 4);

  // Wheels spin based on speed
  graphics.lineStyle(2, 0x888888, 0.5);
  const wheelAngle = Date.now() * 0.01 * speed;
  graphics.lineBetween(x - 12 + Math.cos(wheelAngle) * 3, carY + 10 + Math.sin(wheelAngle) * 3, x - 12 - Math.cos(wheelAngle) * 3, carY + 10 - Math.sin(wheelAngle) * 3);
  graphics.lineBetween(x + 12 + Math.cos(wheelAngle) * 3, carY + 10 + Math.sin(wheelAngle) * 3, x + 12 - Math.cos(wheelAngle) * 3, carY + 10 - Math.sin(wheelAngle) * 3);

  // Safety bar
  graphics.lineStyle(2, 0x888888, 0.6);
  graphics.lineBetween(x - 10, carY - 8, x + 10, carY - 8);
}

function drawSpeedLines(graphics: Phaser.GameObjects.Graphics, width: number, height: number, offset: number, speed: number): void {
  const intensity = (speed - 0.5) * 2; // 0 to 1
  graphics.lineStyle(2, 0xffffff, 0.3 * intensity);

  for (let i = 0; i < 15; i++) {
    const lx = ((i * 97 + offset * 3) % width);
    const ly = height * 0.2 + (i * 47) % (height * 0.6);
    const lineLen = 20 + speed * 40;
    graphics.lineBetween(lx, ly, lx - lineLen, ly);
  }
}

function drawSpeedBar(graphics: Phaser.GameObjects.Graphics, x: number, y: number, normalizedSpeed: number): void {
  const barWidth = 100;
  const barHeight = 10;

  // Background
  graphics.fillStyle(0x000000, 0.5);
  graphics.fillRect(x - barWidth / 2 - 2, y - 2, barWidth + 4, barHeight + 4);

  // Fill
  const speedColor = normalizedSpeed > 0.8 ? 0xff0000 : normalizedSpeed > 0.5 ? 0xffaa00 : 0x44ff44;
  graphics.fillStyle(speedColor, 0.8);
  graphics.fillRect(x - barWidth / 2, y, barWidth * normalizedSpeed, barHeight);
}

function drawAltitudeBar(graphics: Phaser.GameObjects.Graphics, x: number, y: number, normalizedAltitude: number): void {
  const barWidth = 100;
  const barHeight = 10;

  // Background
  graphics.fillStyle(0x000000, 0.5);
  graphics.fillRect(x - barWidth / 2 - 2, y - 2, barWidth + 4, barHeight + 4);

  // Fill
  graphics.fillStyle(0x4488ff, 0.8);
  graphics.fillRect(x - barWidth / 2, y, barWidth * normalizedAltitude, barHeight);
}
