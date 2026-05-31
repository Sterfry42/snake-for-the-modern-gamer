export class TextureAtlas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private textures: Map<string, string> = new Map();

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  build(blockTypes: Array<{ id: string; color: string }>, tileSize: number = 16): void {
    const cols = Math.ceil(Math.sqrt(blockTypes.length));
    const rows = Math.ceil(blockTypes.length / cols);
    this.canvas.width = cols * tileSize;
    this.canvas.height = rows * tileSize;

    this.ctx.fillStyle = '#ff00ff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < blockTypes.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * tileSize;
      const y = row * tileSize;
      const { id, color } = blockTypes[i]!;

      this.ctx.fillStyle = color;
      this.ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
      this.ctx.strokeStyle = darkenColor(color, 0.3);
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1);

      // Add texture pattern
      if (id === 'cobblestone' || id === 'stone') {
        this.ctx.fillStyle = darkenColor(color, 0.15);
        for (let p = 0; p < 4; p++) {
          const px = x + 2 + Math.random() * (tileSize - 6);
          const py = y + 2 + Math.random() * (tileSize - 6);
          this.ctx.fillRect(px, py, 3, 2);
        }
      } else if (id === 'dirt' || id === 'grass') {
        this.ctx.fillStyle = darkenColor(color, 0.2);
        for (let p = 0; p < 6; p++) {
          const px = x + 2 + Math.random() * (tileSize - 4);
          const py = y + 2 + Math.random() * (tileSize - 4);
          this.ctx.fillRect(px, py, 2, 2);
        }
      } else if (id === 'wood' || id === 'planks') {
        this.ctx.fillStyle = darkenColor(color, 0.1);
        for (let p = 0; p < 3; p++) {
          this.ctx.fillRect(x + 2, y + 2 + p * 5, tileSize - 4, 1);
        }
      } else if (id === 'torch') {
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(x + 6, y + 8, 4, 7);
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillRect(x + 5, y + 3, 6, 6);
      } else if (id === 'lava') {
        this.ctx.fillStyle = '#FF6347';
        this.ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
        this.ctx.fillStyle = '#FFA500';
        this.ctx.fillRect(x + 4, y + 4, tileSize - 8, tileSize - 8);
      }

      this.textures.set(id, '');
    }
  }

  getTexture(key: string): string {
    return key;
  }
}

function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const newR = Math.floor(r * (1 - factor));
  const newG = Math.floor(g * (1 - factor));
  const newB = Math.floor(b * (1 - factor));
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}
