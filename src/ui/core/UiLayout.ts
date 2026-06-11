import Phaser from 'phaser';

export interface UiRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UiTextOptions {
  color?: string;
  fontSize?: string;
  fontStyle?: string;
  align?: 'left' | 'center' | 'right';
  wordWrapWidth?: number;
}

export interface UiButtonOptions {
  id: string;
  rect: UiRect;
  label: string;
  enabled: boolean;
  fill: number;
  stroke: number;
  disabledFill: number;
  disabledStroke: number;
  textColor?: string;
  disabledTextColor?: string;
  onClick: () => void;
}

export interface UiCardOptions {
  rect: UiRect;
  fill: number;
  stroke: number;
  alpha?: number;
  strokeAlpha?: number;
  radius?: number;
}

export function insetRect(rect: UiRect, amount: number): UiRect {
  return {
    x: rect.x + amount,
    y: rect.y + amount,
    width: Math.max(0, rect.width - amount * 2),
    height: Math.max(0, rect.height - amount * 2),
  };
}

export function rectContains(rect: UiRect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

export function addUiText(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  x: number,
  y: number,
  value: string,
  options: UiTextOptions = {},
): Phaser.GameObjects.Text {
  const text = scene.add
    .text(x, y, value, {
      fontFamily: 'monospace',
      fontSize: options.fontSize ?? '13px',
      fontStyle: options.fontStyle,
      color: options.color ?? '#ffffff',
      align: options.align ?? 'left',
      wordWrap: options.wordWrapWidth ? { width: options.wordWrapWidth } : undefined,
    })
    .setOrigin(options.align === 'center' ? 0.5 : options.align === 'right' ? 1 : 0, 0);
  parent.add(text);
  return text;
}

export function addUiButton(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  graphics: Phaser.GameObjects.Graphics,
  options: UiButtonOptions,
): Phaser.GameObjects.Zone {
  const { rect, enabled } = options;
  const availableTextWidth = Math.max(8, rect.width - 10);
  const estimatedWidth = options.label.length * 7;
  const fontSize = estimatedWidth > availableTextWidth ? '10px' : '12px';
  graphics
    .fillStyle(enabled ? options.fill : options.disabledFill, enabled ? 0.28 : 0.68)
    .fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 5);
  graphics
    .lineStyle(1, enabled ? options.stroke : options.disabledStroke, enabled ? 0.9 : 0.7)
    .strokeRoundedRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1, 5);

  const text = scene.add
    .text(rect.x + rect.width / 2, rect.y + rect.height / 2, options.label, {
      fontFamily: 'monospace',
      fontSize,
      fontStyle: 'bold',
      color: enabled ? (options.textColor ?? '#ffffff') : (options.disabledTextColor ?? '#7895b4'),
      align: 'center',
      fixedWidth: availableTextWidth,
    })
    .setOrigin(0.5);
  parent.add(text);

  const zone = scene.add
    .zone(rect.x, rect.y, rect.width, rect.height)
    .setOrigin(0, 0)
    .setInteractive({ useHandCursor: enabled });
  zone.setData('uiButtonId', options.id);
  zone.on('pointerdown', () => {
    if (options.enabled) {
      options.onClick();
    }
  });
  parent.add(zone);
  return zone;
}

export function drawUiCard(graphics: Phaser.GameObjects.Graphics, options: UiCardOptions): void {
  const radius = options.radius ?? 6;
  graphics
    .fillStyle(options.fill, options.alpha ?? 0.74)
    .fillRoundedRect(
      options.rect.x,
      options.rect.y,
      options.rect.width,
      options.rect.height,
      radius,
    );
  graphics
    .lineStyle(1, options.stroke, options.strokeAlpha ?? 0.75)
    .strokeRoundedRect(
      options.rect.x + 0.5,
      options.rect.y + 0.5,
      options.rect.width - 1,
      options.rect.height - 1,
      radius,
    );
}

export function addUiBadge(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  graphics: Phaser.GameObjects.Graphics,
  rect: UiRect,
  label: string,
  fill: number,
  stroke: number,
  textColor = '#ffffff',
): Phaser.GameObjects.Text {
  drawUiCard(graphics, { rect, fill, stroke, alpha: 0.26, strokeAlpha: 0.8, radius: 5 });
  return addUiText(scene, parent, rect.x + rect.width / 2, rect.y + 4, label, {
    align: 'center',
    color: textColor,
    fontSize: '11px',
    fontStyle: 'bold',
  });
}
