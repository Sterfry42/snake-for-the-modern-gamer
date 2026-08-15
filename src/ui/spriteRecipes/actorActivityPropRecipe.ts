import type { ActorActivityPropKind } from '../../actors/actorActivityProps.js';
import type { RuntimeSpriteRecipe } from '../runtimeSpriteFactory.js';

export type ActorActivityPropVariant = ActorActivityPropKind;

export interface ActorActivityPropPalette {
  outlineColor: string;
  metalColor: string;
  leatherColor: string;
  clothColor: string;
  accentColor: string;
}

const VARIANTS: readonly ActorActivityPropVariant[] = [
  'sword',
  'bow',
  'merchant-bag',
  'shield',
  'fishing-rod',
  'sleep-zzz',
];

export const actorActivityPropRecipe: RuntimeSpriteRecipe<
  ActorActivityPropVariant,
  ActorActivityPropPalette
> = {
  id: 'actor-activity-prop',
  variants: VARIANTS,
  getPaletteKey(palette): string {
    return [
      palette.outlineColor,
      palette.metalColor,
      palette.leatherColor,
      palette.clothColor,
      palette.accentColor,
    ].join('-');
  },
  draw(context, variant, size, palette): void {
    context.save();
    context.imageSmoothingEnabled = false;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.clearRect(0, 0, size, size);

    switch (variant) {
      case 'sword':
        drawSword(context, size, palette);
        break;
      case 'bow':
        drawBow(context, size, palette);
        break;
      case 'merchant-bag':
        drawBag(context, size, palette);
        break;
      case 'shield':
        drawShield(context, size, palette);
        break;
      case 'fishing-rod':
        drawFishingRod(context, size, palette);
        break;
      case 'sleep-zzz':
        drawSleepZzz(context, size, palette);
        break;
    }

    context.restore();
  },
};

function drawSword(
  context: CanvasRenderingContext2D,
  size: number,
  palette: ActorActivityPropPalette,
): void {
  context.strokeStyle = palette.outlineColor;
  context.lineWidth = Math.max(2, size * 0.14);
  context.beginPath();
  context.moveTo(size * 0.22, size * 0.78);
  context.lineTo(size * 0.76, size * 0.24);
  context.stroke();
  context.strokeStyle = palette.metalColor;
  context.lineWidth = Math.max(1, size * 0.08);
  context.stroke();
  context.strokeStyle = palette.leatherColor;
  context.lineWidth = Math.max(2, size * 0.16);
  context.beginPath();
  context.moveTo(size * 0.18, size * 0.62);
  context.lineTo(size * 0.38, size * 0.82);
  context.stroke();
}

function drawBow(
  context: CanvasRenderingContext2D,
  size: number,
  palette: ActorActivityPropPalette,
): void {
  context.strokeStyle = palette.outlineColor;
  context.lineWidth = Math.max(2, size * 0.12);
  context.beginPath();
  context.arc(size * 0.5, size * 0.5, size * 0.34, -1.35, 1.35);
  context.stroke();
  context.strokeStyle = palette.leatherColor;
  context.lineWidth = Math.max(1, size * 0.08);
  context.stroke();
  context.strokeStyle = palette.metalColor;
  context.lineWidth = Math.max(1, size * 0.05);
  context.beginPath();
  context.moveTo(size * 0.42, size * 0.17);
  context.lineTo(size * 0.42, size * 0.83);
  context.stroke();
}

function drawBag(
  context: CanvasRenderingContext2D,
  size: number,
  palette: ActorActivityPropPalette,
): void {
  context.fillStyle = palette.outlineColor;
  context.fillRect(size * 0.2, size * 0.34, size * 0.6, size * 0.46);
  context.fillStyle = palette.leatherColor;
  context.fillRect(size * 0.26, size * 0.4, size * 0.48, size * 0.34);
  context.strokeStyle = palette.outlineColor;
  context.lineWidth = Math.max(1, size * 0.08);
  context.beginPath();
  context.arc(size * 0.5, size * 0.42, size * 0.18, Math.PI, 0);
  context.stroke();
  context.fillStyle = palette.accentColor;
  context.fillRect(size * 0.45, size * 0.52, size * 0.1, size * 0.1);
}

function drawShield(
  context: CanvasRenderingContext2D,
  size: number,
  palette: ActorActivityPropPalette,
): void {
  context.fillStyle = palette.outlineColor;
  context.beginPath();
  context.moveTo(size * 0.5, size * 0.16);
  context.lineTo(size * 0.78, size * 0.28);
  context.lineTo(size * 0.68, size * 0.72);
  context.lineTo(size * 0.5, size * 0.86);
  context.lineTo(size * 0.32, size * 0.72);
  context.lineTo(size * 0.22, size * 0.28);
  context.closePath();
  context.fill();
  context.fillStyle = palette.clothColor;
  context.fillRect(size * 0.36, size * 0.3, size * 0.28, size * 0.42);
  context.fillStyle = palette.accentColor;
  context.fillRect(size * 0.47, size * 0.24, size * 0.06, size * 0.52);
}

function drawFishingRod(
  context: CanvasRenderingContext2D,
  size: number,
  palette: ActorActivityPropPalette,
): void {
  context.strokeStyle = palette.outlineColor;
  context.lineWidth = Math.max(2, size * 0.1);
  context.beginPath();
  context.moveTo(size * 0.24, size * 0.82);
  context.lineTo(size * 0.76, size * 0.18);
  context.stroke();
  context.strokeStyle = palette.leatherColor;
  context.lineWidth = Math.max(1, size * 0.06);
  context.stroke();
  context.strokeStyle = palette.metalColor;
  context.lineWidth = Math.max(1, size * 0.04);
  context.beginPath();
  context.moveTo(size * 0.72, size * 0.22);
  context.quadraticCurveTo(size * 0.86, size * 0.48, size * 0.62, size * 0.62);
  context.stroke();
}

function drawSleepZzz(
  context: CanvasRenderingContext2D,
  size: number,
  palette: ActorActivityPropPalette,
): void {
  context.font = `bold ${Math.floor(size * 0.38)}px sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = Math.max(2, size * 0.08);
  context.strokeStyle = palette.outlineColor;
  context.fillStyle = palette.accentColor;
  context.strokeText('Z', size * 0.34, size * 0.7);
  context.fillText('Z', size * 0.34, size * 0.7);
  context.font = `bold ${Math.floor(size * 0.28)}px sans-serif`;
  context.strokeText('z', size * 0.58, size * 0.48);
  context.fillText('z', size * 0.58, size * 0.48);
  context.font = `bold ${Math.floor(size * 0.2)}px sans-serif`;
  context.strokeText('z', size * 0.76, size * 0.28);
  context.fillText('z', size * 0.76, size * 0.28);
}
