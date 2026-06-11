import Phaser from 'phaser';

import { uiColors } from '../theme/uiColors.js';
import { uiFrameKeys, uiFxKeys, uiIconKeys, uiTabIconKeys } from './uiAtlasKeys.js';

function generateFrameTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  fill: number,
  stroke: number,
  alpha = 0.9,
): void {
  if (scene.textures.exists(key)) {
    return;
  }
  const graphics = scene.add.graphics();
  const outerRadius = Math.max(0, Math.min(6, Math.floor(Math.min(width, height) / 2) - 1));
  const strokeWidth = Math.max(1, Math.min(2, Math.floor(Math.min(width, height) / 4)));
  graphics.fillStyle(fill, alpha).fillRoundedRect(0, 0, width, height, outerRadius);
  graphics
    .lineStyle(strokeWidth, stroke, 0.88)
    .strokeRoundedRect(
      strokeWidth / 2,
      strokeWidth / 2,
      Math.max(1, width - strokeWidth),
      Math.max(1, height - strokeWidth),
      outerRadius,
    );
  const innerInset = Math.min(5, Math.floor(Math.min(width, height) / 3));
  const innerWidth = width - innerInset * 2;
  const innerHeight = height - innerInset * 2;
  if (innerWidth > 2 && innerHeight > 2) {
    graphics
      .lineStyle(1, uiColors.panelGlow, 0.52)
      .strokeRoundedRect(
        innerInset,
        innerInset,
        innerWidth,
        innerHeight,
        Math.max(0, Math.min(3, Math.floor(Math.min(innerWidth, innerHeight) / 2) - 1)),
      );
  }
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

function generateIconTexture(
  scene: Phaser.Scene,
  key: string,
  draw: (graphics: Phaser.GameObjects.Graphics) => void,
): void {
  if (scene.textures.exists(key)) {
    return;
  }
  const graphics = scene.add.graphics();
  draw(graphics);
  graphics.generateTexture(key, 20, 20);
  graphics.destroy();
}

function generateTabIcon(
  scene: Phaser.Scene,
  key: string,
  accent: number,
  draw: (graphics: Phaser.GameObjects.Graphics, accent: number) => void,
): void {
  generateIconTexture(scene, key, (graphics) => draw(graphics, accent));
}

export function ensurePauseMenuGeneratedAssets(scene: Phaser.Scene): void {
  generateFrameTexture(
    scene,
    uiFrameKeys.outer,
    64,
    64,
    uiColors.panelBgPrimary,
    uiColors.panelBorder,
    0.98,
  );
  generateFrameTexture(
    scene,
    uiFrameKeys.panel,
    48,
    48,
    uiColors.panelBgSecondary,
    uiColors.panelBorderMuted,
    0.94,
  );
  generateFrameTexture(
    scene,
    uiFrameKeys.card,
    40,
    28,
    uiColors.panelBgInset,
    uiColors.panelBorderMuted,
    0.86,
  );
  generateFrameTexture(
    scene,
    uiFrameKeys.button,
    40,
    20,
    uiColors.panelBgInset,
    uiColors.panelBorder,
    0.9,
  );
  generateFrameTexture(
    scene,
    uiFrameKeys.buttonDisabled,
    40,
    20,
    uiColors.disabled,
    uiColors.locked,
    0.82,
  );
  generateFrameTexture(
    scene,
    uiFrameKeys.selection,
    44,
    24,
    uiColors.panelBgInset,
    uiColors.panelGlow,
    0.28,
  );
  generateFrameTexture(
    scene,
    uiFrameKeys.scrollRail,
    8,
    48,
    uiColors.panelBgInset,
    uiColors.panelBorderMuted,
    0.82,
  );
  generateFrameTexture(
    scene,
    uiFrameKeys.scrollThumb,
    8,
    24,
    uiColors.panelGlow,
    uiColors.panelBorder,
    0.88,
  );

  generateIconTexture(scene, uiIconKeys.check, (graphics) => {
    graphics
      .lineStyle(3, uiColors.success, 1)
      .beginPath()
      .moveTo(4, 10)
      .lineTo(8, 15)
      .lineTo(17, 4)
      .strokePath();
  });
  generateIconTexture(scene, uiIconKeys.lock, (graphics) => {
    graphics.lineStyle(2, 0x7895b4, 1).strokeRoundedRect(5, 9, 10, 8, 2);
    graphics.lineStyle(2, 0x7895b4, 1).strokeCircle(10, 9, 4);
    graphics.fillStyle(0x7895b4, 1).fillCircle(10, 13, 1.5);
  });
  generateIconTexture(scene, uiIconKeys.arrowUp, (graphics) => {
    graphics.fillStyle(uiColors.panelGlow, 1).fillTriangle(10, 4, 4, 14, 16, 14);
  });
  generateIconTexture(scene, uiIconKeys.arrowDown, (graphics) => {
    graphics.fillStyle(uiColors.panelGlow, 1).fillTriangle(4, 6, 16, 6, 10, 16);
  });
  generateIconTexture(scene, uiIconKeys.sparkle, (graphics) => {
    graphics.fillStyle(uiColors.panelGlow, 1).fillRect(9, 2, 2, 16).fillRect(2, 9, 16, 2);
    graphics.fillStyle(0xfff3a8, 1).fillRect(9, 9, 2, 2);
  });

  const drawSprout = (graphics: Phaser.GameObjects.Graphics, accent: number) => {
    graphics.lineStyle(2, accent, 1).lineBetween(10, 17, 10, 8);
    graphics.fillStyle(accent, 1).fillEllipse(6, 8, 8, 5).fillEllipse(14, 7, 8, 5);
  };
  const drawGear = (graphics: Phaser.GameObjects.Graphics, accent: number) => {
    graphics.lineStyle(2, accent, 1).strokeCircle(10, 10, 6);
    graphics.fillStyle(accent, 1);
    for (const [x, y] of [
      [9, 1],
      [9, 17],
      [1, 9],
      [17, 9],
    ]) {
      graphics.fillRect(x, y, 2, 2);
    }
    graphics.fillCircle(10, 10, 2);
  };
  const drawWorld = (graphics: Phaser.GameObjects.Graphics, accent: number) => {
    graphics.lineStyle(2, accent, 1).strokeCircle(10, 10, 7);
    graphics.lineStyle(1, accent, 0.9).lineBetween(3, 10, 17, 10).lineBetween(10, 3, 10, 17);
  };
  const drawSystem = (graphics: Phaser.GameObjects.Graphics, accent: number) => {
    graphics.lineStyle(2, accent, 1).strokeRect(4, 5, 12, 9);
    graphics.fillStyle(accent, 1).fillRect(7, 16, 6, 1).fillRect(8, 8, 4, 2);
  };
  const drawStar = (graphics: Phaser.GameObjects.Graphics, accent: number) => {
    graphics.fillStyle(accent, 1);
    graphics.fillTriangle(10, 2, 12, 8, 18, 8);
    graphics.fillTriangle(18, 8, 13, 12, 15, 18);
    graphics.fillTriangle(15, 18, 10, 14, 5, 18);
    graphics.fillTriangle(5, 18, 7, 12, 2, 8);
    graphics.fillTriangle(2, 8, 8, 8, 10, 2);
  };
  const drawBook = (graphics: Phaser.GameObjects.Graphics, accent: number) => {
    graphics.lineStyle(2, accent, 1).strokeRect(4, 5, 5, 11).strokeRect(10, 5, 6, 11);
    graphics.lineStyle(1, accent, 0.8).lineBetween(10, 5, 10, 16);
  };
  const drawHeart = (graphics: Phaser.GameObjects.Graphics, accent: number) => {
    graphics.fillStyle(accent, 1).fillCircle(7, 8, 4).fillCircle(13, 8, 4);
    graphics.fillTriangle(3, 10, 17, 10, 10, 18);
  };
  const drawMap = (graphics: Phaser.GameObjects.Graphics, accent: number) => {
    graphics.lineStyle(2, accent, 1).strokeRect(4, 4, 12, 12);
    graphics.lineStyle(1, accent, 0.8).lineBetween(8, 4, 8, 16).lineBetween(12, 4, 12, 16);
  };
  const drawBars = (graphics: Phaser.GameObjects.Graphics, accent: number) => {
    graphics.fillStyle(accent, 1).fillRect(4, 13, 3, 4).fillRect(9, 8, 3, 9).fillRect(14, 4, 3, 13);
  };
  const drawKey = (graphics: Phaser.GameObjects.Graphics, accent: number) => {
    graphics.lineStyle(2, accent, 1).strokeCircle(7, 8, 4).lineBetween(10, 10, 17, 17);
    graphics.lineStyle(2, accent, 1).lineBetween(14, 14, 17, 11);
  };

  generateTabIcon(scene, uiTabIconKeys.growth, uiColors.accentGrowth, drawSprout);
  generateTabIcon(scene, uiTabIconKeys.gear, uiColors.accentGear, drawGear);
  generateTabIcon(scene, uiTabIconKeys.world, uiColors.accentWorld, drawWorld);
  generateTabIcon(scene, uiTabIconKeys.system, uiColors.accentSystem, drawSystem);
  generateTabIcon(scene, uiTabIconKeys.skills, uiColors.accentCore, drawStar);
  generateTabIcon(scene, uiTabIconKeys.special, uiColors.accentCore, drawStar);
  generateTabIcon(scene, uiTabIconKeys.spells, uiColors.accentArcana, drawStar);
  generateTabIcon(scene, uiTabIconKeys.inventory, uiColors.accentGear, drawBook);
  generateTabIcon(scene, uiTabIconKeys.customize, uiColors.accentGear, drawStar);
  generateTabIcon(scene, uiTabIconKeys.cards, uiColors.accentGear, drawBook);
  generateTabIcon(scene, uiTabIconKeys.artifacts, uiColors.accentExploration, drawStar);
  generateTabIcon(scene, uiTabIconKeys.map, uiColors.accentWorld, drawMap);
  generateTabIcon(scene, uiTabIconKeys.dating, uiColors.accentSocial, drawHeart);
  generateTabIcon(scene, uiTabIconKeys.quests, uiColors.accentWorld, drawBook);
  generateTabIcon(scene, uiTabIconKeys.factions, uiColors.accentWorld, drawBars);
  generateTabIcon(scene, uiTabIconKeys.graph, uiColors.accentSystem, drawBars);
  generateTabIcon(scene, uiTabIconKeys.cheats, uiColors.accentSystem, drawKey);
  generateTabIcon(scene, uiTabIconKeys.info, uiColors.accentSystem, drawSystem);
  generateTabIcon(scene, uiTabIconKeys.people, uiColors.accentSocial, drawHeart);
  generateTabIcon(scene, uiTabIconKeys.destiny, uiColors.accentExploration, drawStar);

  if (!scene.textures.exists(uiFxKeys.glowDot)) {
    const graphics = scene.add.graphics();
    graphics.fillStyle(uiColors.panelGlow, 0.18).fillCircle(12, 12, 12);
    graphics.fillStyle(uiColors.panelGlow, 0.45).fillCircle(12, 12, 6);
    graphics.fillStyle(0xffffff, 0.9).fillCircle(12, 12, 2);
    graphics.generateTexture(uiFxKeys.glowDot, 24, 24);
    graphics.destroy();
  }
  if (!scene.textures.exists(uiFxKeys.cornerGlint)) {
    const graphics = scene.add.graphics();
    graphics.lineStyle(2, uiColors.panelGlow, 0.9).lineBetween(0, 2, 16, 2);
    graphics.lineStyle(2, uiColors.panelGlow, 0.9).lineBetween(2, 0, 2, 16);
    graphics.generateTexture(uiFxKeys.cornerGlint, 18, 18);
    graphics.destroy();
  }
}
