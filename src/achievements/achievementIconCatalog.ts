import Phaser from 'phaser';
import type { AchievementDefinition } from './achievementTypes.js';

const SIZE = 32;
const PIXEL = 2;

function hash(value: string): number {
  let result = 2166136261;
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return result >>> 0;
}

function pixel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  w = 1,
  h = 1,
): void {
  context.fillStyle = color;
  context.fillRect(x * PIXEL, y * PIXEL, w * PIXEL, h * PIXEL);
}

function rect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  pixel(context, x, y, color, w, h);
}

function drawApple(context: CanvasRenderingContext2D, gold: boolean): void {
  const body = gold ? '#f6c945' : '#ef4b4b';
  rect(context, 5, 5, 6, 7, '#351d25');
  rect(context, 4, 7, 8, 4, '#351d25');
  rect(context, 5, 6, 6, 6, body);
  rect(context, 6, 7, 2, 3, gold ? '#fff09a' : '#ff7676');
  rect(context, 8, 2, 2, 4, '#70452b');
  rect(context, 10, 2, 3, 2, '#54b76b');
  if (gold) {
    pixel(context, 2, 4, '#fff7c2');
    pixel(context, 13, 6, '#fff7c2');
    pixel(context, 3, 13, '#fff7c2');
  }
}

function drawSnake(context: CanvasRenderingContext2D, accent: string): void {
  rect(context, 3, 9, 3, 3, '#17392f');
  rect(context, 5, 8, 3, 3, accent);
  rect(context, 7, 7, 3, 3, accent);
  rect(context, 9, 6, 4, 4, '#7ee4b1');
  rect(context, 12, 7, 2, 2, '#b6ffcf');
  pixel(context, 12, 6, '#ffffff');
  pixel(context, 13, 9, '#ef4b4b');
}

function drawHeart(context: CanvasRenderingContext2D, baby: boolean): void {
  rect(context, 3, 4, 4, 4, '#ff6b8f');
  rect(context, 9, 4, 4, 4, '#ff6b8f');
  rect(context, 4, 7, 8, 4, '#ff6b8f');
  rect(context, 6, 11, 4, 2, '#ff6b8f');
  if (baby) {
    rect(context, 6, 6, 4, 4, '#ffd7b5');
    pixel(context, 7, 7, '#38242c');
    pixel(context, 9, 7, '#38242c');
  }
}

function drawEquipment(context: CanvasRenderingContext2D, id: string): void {
  const color = id.includes('secondChance') ? '#ffdf72' : '#77baff';
  rect(context, 4, 3, 8, 3, '#263746');
  rect(context, 3, 5, 10, 7, color);
  rect(context, 5, 6, 6, 5, '#1d2d38');
  rect(context, 7, 7, 2, 3, color);
  if (id.includes('swim')) {
    rect(context, 2, 12, 5, 2, '#49c8ef');
    rect(context, 9, 12, 5, 2, '#49c8ef');
  }
}

function drawDrink(context: CanvasRenderingContext2D): void {
  rect(context, 4, 3, 7, 10, '#e7f1fa');
  rect(context, 5, 5, 5, 7, '#d69a32');
  rect(context, 11, 6, 3, 5, '#e7f1fa');
  rect(context, 12, 7, 1, 3, '#10212d');
  rect(context, 5, 3, 5, 2, '#fff3c4');
}

function drawMeal(context: CanvasRenderingContext2D): void {
  rect(context, 3, 5, 10, 2, '#e5aa4f');
  rect(context, 4, 7, 8, 2, '#68b85e');
  rect(context, 3, 9, 10, 2, '#8e4b32');
  rect(context, 4, 11, 8, 2, '#e5aa4f');
  pixel(context, 5, 4, '#fff1a5');
  pixel(context, 9, 4, '#fff1a5');
}

function drawWorld(context: CanvasRenderingContext2D, id: string): void {
  const isTown = id.includes('towns');
  const isCave = id.includes('caves');
  if (isTown) {
    rect(context, 2, 7, 12, 7, '#9a6550');
    rect(context, 4, 4, 8, 3, '#d48555');
    rect(context, 7, 10, 2, 4, '#38242c');
    pixel(context, 4, 9, '#fff3a8');
    pixel(context, 11, 9, '#fff3a8');
  } else if (isCave) {
    rect(context, 1, 6, 14, 8, '#34404a');
    rect(context, 4, 8, 8, 6, '#101820');
    pixel(context, 3, 5, '#697887');
    pixel(context, 12, 4, '#697887');
  } else {
    rect(context, 2, 2, 12, 12, '#315c75');
    rect(context, 4, 4, 4, 3, '#6ecb76');
    rect(context, 8, 8, 4, 4, '#6ecb76');
    rect(context, 3, 10, 3, 2, '#6ecb76');
  }
}

function drawGuild(context: CanvasRenderingContext2D): void {
  rect(context, 3, 3, 10, 10, '#3b2d4c');
  rect(context, 5, 5, 6, 6, '#17131f');
  rect(context, 7, 4, 2, 8, '#c7a45b');
  pixel(context, 6, 8, '#c7a45b');
  pixel(context, 9, 8, '#c7a45b');
}

function drawFish(context: CanvasRenderingContext2D, legendary: boolean): void {
  rect(context, 3, 6, 8, 5, legendary ? '#f0ca5b' : '#56b8d8');
  rect(context, 1, 7, 3, 3, legendary ? '#d89d32' : '#357b9b');
  rect(context, 11, 7, 3, 3, legendary ? '#fff09a' : '#79d9ef');
  pixel(context, 9, 7, '#ffffff');
  pixel(context, 10, 7, '#17212b');
}

function drawArtifact(context: CanvasRenderingContext2D, id: string): void {
  const color = id.includes('chain') ? '#f19a62' : '#b58cff';
  rect(context, 5, 2, 6, 12, '#332943');
  rect(context, 6, 3, 4, 10, color);
  rect(context, 7, 5, 2, 5, '#fff0ba');
  if (id.includes('depth')) {
    rect(context, 2, 12, 12, 2, '#78533d');
  }
}

function drawCard(context: CanvasRenderingContext2D, seed: number): void {
  rect(context, 3, 2, 10, 12, '#f0e7cf');
  rect(context, 4, 3, 8, 10, '#293b4a');
  const color = seed % 2 ? '#ff6b8f' : '#70d6ff';
  rect(context, 7, 6, 2, 4, color);
  rect(context, 6, 7, 4, 2, color);
}

function drawBoss(context: CanvasRenderingContext2D, id: string): void {
  const dennis = id.includes('Freak');
  const color = dennis ? (id.includes('Freaker') ? '#7b28a8' : '#a54ed1') : '#d5b27a';
  rect(context, 3, 3, 10, 10, '#24172c');
  rect(context, 4, 4, 8, 8, color);
  rect(context, 5, 6, 2, 2, '#ffffff');
  rect(context, 9, 6, 2, 2, '#ffffff');
  pixel(context, 6, 7, '#17131f');
  pixel(context, 10, 7, '#17131f');
  rect(context, 6, 10, 4, 1, dennis ? '#ffd4ff' : '#5b3428');
  if (!dennis) {
    rect(context, 5, 2, 6, 2, '#3b2b24');
  }
}

function drawSkill(context: CanvasRenderingContext2D, all: boolean): void {
  rect(context, 7, 2, 2, 12, '#9ad1ff');
  rect(context, 3, 5, 10, 2, '#9ad1ff');
  rect(context, 2, 4, 3, 3, '#5dd6a2');
  rect(context, 11, 4, 3, 3, '#ffd166');
  if (all) {
    rect(context, 6, 11, 4, 3, '#ffbdfd');
  }
}

function drawSymbol(context: CanvasRenderingContext2D, kind: string, variant?: string): void {
  const colors: Record<string, string> = {
    enemy: '#d85b62',
    gun: '#b9c7d5',
    bigIron: '#d8b06c',
    cowbell: '#e6bd4f',
    wards: '#b58cff',
    katana: '#75e0b1',
    loadout: '#77baff',
    hazardHot: '#ff713f',
    hazardCold: '#77cfff',
    house: '#d79562',
    quest: '#f3df8c',
    treasure: '#e7b84f',
    wanted: '#e85d5d',
    divorce: '#ff7898',
    fishJournal: '#64c5df',
    artifactCollection: '#b58cff',
    angel: variant === 'goblin' ? '#83c85d' : '#f5ecba',
    companion: '#7ee4b1',
    caveRush: '#ef4b4b',
    shopBuyout: '#d9b45f',
  };
  const color = colors[kind] ?? '#9ad1ff';
  if (kind === 'enemy') {
    rect(context, 2, 4, 5, 3, '#d85b62');
    rect(context, 2, 10, 5, 3, '#d85b62');
    rect(context, 6, 6, 3, 6, '#391d26');
    rect(context, 9, 7, 5, 4, '#7ee4b1');
    pixel(context, 12, 7, '#ffffff');
    pixel(context, 13, 10, '#ef4b4b');
    pixel(context, 6, 7, '#fff3d6');
    pixel(context, 6, 10, '#fff3d6');
  } else if (kind === 'quest') {
    rect(context, 3, 2, 10, 12, '#d8c18d');
    rect(context, 5, 4, 6, 1, '#69543a');
    rect(context, 5, 7, 4, 1, '#69543a');
    rect(context, 5, 10, 2, 2, '#5dd6a2');
    pixel(context, 7, 11, '#5dd6a2');
    pixel(context, 8, 10, '#5dd6a2');
  } else if (kind === 'treasure') {
    rect(context, 2, 6, 12, 7, '#6f4028');
    rect(context, 3, 4, 10, 4, '#a86435');
    rect(context, 3, 8, 10, 2, '#d7a84b');
    rect(context, 7, 8, 2, 3, '#fff09a');
    pixel(context, 3, 2, '#ffd166');
    pixel(context, 12, 3, '#ffd166');
  } else if (kind === 'companion') {
    drawSnake(context, '#5dd6a2');
    rect(context, 2, 3, 3, 3, '#6cb4ff');
    rect(context, 4, 2, 4, 3, '#9ad1ff');
    pixel(context, 7, 2, '#ffffff');
  } else if (kind === 'caveRush') {
    rect(context, 1, 3, 14, 11, '#3d4650');
    rect(context, 4, 6, 8, 8, '#101820');
    rect(context, 6, 8, 5, 5, '#ef4b4b');
    rect(context, 8, 6, 2, 3, '#70452b');
    pixel(context, 3, 5, '#ffd166');
    pixel(context, 13, 7, '#ffd166');
  } else if (kind === 'shopBuyout') {
    rect(context, 2, 4, 12, 2, '#8b6847');
    rect(context, 2, 9, 12, 2, '#8b6847');
    rect(context, 3, 11, 2, 3, '#5c4535');
    rect(context, 11, 11, 2, 3, '#5c4535');
    rect(context, 7, 2, 2, 2, '#d9b45f');
    pixel(context, 8, 7, '#8a9aaa');
  } else if (kind === 'card') {
    drawCard(context, hash(variant ?? 'card'));
  } else if (kind === 'bigIron') {
    rect(context, 2, 3, 12, 2, '#8a5c35');
    rect(context, 4, 1, 8, 3, '#c58a4d');
    rect(context, 4, 7, 9, 3, '#b9c7d5');
    rect(context, 9, 10, 3, 4, '#70513e');
    pixel(context, 13, 8, '#ffd166');
  } else if (kind === 'cowbell') {
    rect(context, 5, 2, 6, 3, '#7a5431');
    rect(context, 3, 5, 10, 7, '#e6bd4f');
    rect(context, 5, 6, 6, 5, '#f6d978');
    rect(context, 7, 12, 2, 2, '#8a5c35');
    pixel(context, 2, 7, '#fff3a8');
    pixel(context, 13, 6, '#fff3a8');
  } else if (kind === 'wards') {
    rect(context, 6, 2, 4, 12, '#f0e7cf');
    rect(context, 2, 6, 12, 4, '#f0e7cf');
    rect(context, 7, 4, 2, 8, '#b58cff');
    rect(context, 4, 7, 8, 2, '#b58cff');
    pixel(context, 3, 3, '#ff713f');
    pixel(context, 12, 3, '#77cfff');
    pixel(context, 12, 12, '#75e0b1');
  } else if (kind === 'gun') {
    rect(context, 3, 6, 9, 3, color);
    rect(context, 8, 9, 3, 4, '#70513e');
    pixel(context, 13, 7, '#ffd166');
  } else if (kind === 'katana') {
    rect(context, 7, 2, 2, 10, color);
    rect(context, 5, 11, 6, 2, '#d7b760');
    pixel(context, 13, 4, '#6f7c86');
  } else if (kind === 'house') {
    rect(context, 3, 7, 10, 7, color);
    rect(context, 5, 4, 6, 4, '#b85e4f');
    rect(context, 7, 10, 2, 4, '#35252a');
  } else if (kind === 'angel') {
    rect(context, 6, 5, 4, 7, color);
    rect(context, 2, 6, 4, 4, color);
    rect(context, 10, 6, 4, 4, color);
    rect(context, 5, 2, 6, 2, '#ffd166');
  } else if (kind === 'hazardHot' || kind === 'hazardCold') {
    rect(context, 6, 3, 4, 10, color);
    rect(context, 4, 9, 8, 4, color);
    pixel(context, 8, 1, color);
  } else if (kind === 'divorce') {
    drawHeart(context, false);
    rect(context, 7, 3, 2, 11, '#0b1622');
  } else if (kind === 'fishJournal') {
    drawFish(context, true);
    rect(context, 2, 12, 12, 2, '#f0e7cf');
  } else if (kind === 'artifactCollection') {
    drawArtifact(context, 'collection');
    pixel(context, 3, 4, '#ffd166');
    pixel(context, 13, 5, '#ffd166');
  } else {
    rect(context, 3, 3, 10, 10, '#263746');
    rect(context, 5, 5, 6, 6, color);
    rect(context, 7, 2, 2, 3, color);
  }
}

export function ensureAchievementPortrait(
  scene: Phaser.Scene,
  definition: AchievementDefinition,
): string {
  const key = `achievement-portrait:${definition.id}`;
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, SIZE, SIZE);
  const context = texture.getContext();
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, SIZE, SIZE);
  rect(context, 0, 0, 16, 16, '#0b1622');
  const seed = hash(definition.id);
  if (definition.id === 'core.firstApple') drawApple(context, false);
  else if (
    [
      'enemy',
      'gun',
      'bigIron',
      'cowbell',
      'wards',
      'katana',
      'loadout',
      'hazardHot',
      'hazardCold',
      'house',
      'quest',
      'treasure',
      'wanted',
      'divorce',
      'fishJournal',
      'artifactCollection',
      'angel',
      'card',
      'companion',
      'caveRush',
      'shopBuyout',
    ].includes(definition.icon.kind)
  )
    drawSymbol(context, definition.icon.kind, definition.icon.variant);
  else if (definition.category === 'stats' || definition.category === 'rivals')
    drawSnake(context, definition.category === 'rivals' ? '#e09a55' : '#5dd6a2');
  else if (definition.id === 'food.drunk') drawDrink(context);
  else if (definition.id === 'food.comboMeal') drawMeal(context);
  else if (definition.category === 'equipment') drawEquipment(context, definition.id);
  else if (definition.category === 'relationships')
    drawHeart(context, definition.id.includes('child'));
  else if (
    definition.category === 'towns' ||
    definition.category === 'exploration' ||
    definition.category === 'caves'
  )
    drawWorld(context, definition.id);
  else if (definition.category === 'guild') drawGuild(context);
  else if (definition.category === 'fishing')
    drawFish(context, definition.id.includes('legendary'));
  else if (definition.category === 'archaeology') drawArtifact(context, definition.id);
  else if (definition.category === 'bosses') drawBoss(context, definition.id);
  else if (definition.category === 'skillTree')
    drawSkill(context, definition.id.includes('allBranches'));
  else drawSnake(context, '#9ad1ff');
  pixel(context, 1 + (seed % 3), 1, `#${(seed & 0xffffff).toString(16).padStart(6, '0')}`);
  texture.refresh();
  return key;
}
