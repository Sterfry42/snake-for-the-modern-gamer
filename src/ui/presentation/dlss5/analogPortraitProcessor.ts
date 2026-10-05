import Phaser from 'phaser';
import type { Dlss5PortraitIdentity } from './portraitResolver.js';
import { fetchDlss5PortraitRow } from './huggingFacePortraitSource.js';

export interface AnalogPortraitProcessorOptions {
  size?: number;
}

export class AnalogPortraitProcessor {
  private readonly cache = new Map<string, string>();
  private readonly pending = new Map<string, Promise<string | null>>();
  private readonly failed = new Set<string>();

  constructor(private readonly scene: Phaser.Scene) {}

  getCachedTexture(identity: Dlss5PortraitIdentity): string | null {
    const cached = this.cache.get(identity.key);
    return cached && this.scene.textures.exists(cached) ? cached : null;
  }

  loadTexture(
    identity: Dlss5PortraitIdentity,
    options: AnalogPortraitProcessorOptions = {},
  ): Promise<string | null> {
    const cached = this.getCachedTexture(identity);
    if (cached) {
      return Promise.resolve(cached);
    }
    if (this.failed.has(identity.key)) {
      return Promise.resolve(null);
    }
    const pending = this.pending.get(identity.key);
    if (pending) {
      return pending;
    }

    const request = this.loadRemoteTexture(identity, options).finally(() => {
      this.pending.delete(identity.key);
    });
    this.pending.set(identity.key, request);
    return request;
  }

  private async loadRemoteTexture(
    identity: Dlss5PortraitIdentity,
    options: AnalogPortraitProcessorOptions,
  ): Promise<string | null> {
    const textureKey = `${identity.key}:analog`;
    try {
      const row = await fetchDlss5PortraitRow(identity.index);
      const image = await this.loadImage(row.imageUrl);
      if (!this.scene.textures.exists(textureKey)) {
        try {
          this.createTexture(textureKey, image, identity.index, options.size ?? 128);
        } catch (error) {
          console.warn('DLSS 5 analog portrait processing failed; using raw portrait.', error);
          this.scene.textures.addImage(textureKey, image);
        }
      }
      this.cache.set(identity.key, textureKey);
      return textureKey;
    } catch (error) {
      console.warn('DLSS 5 portrait reconstruction failed; using fallback portrait.', error);
      this.failed.add(identity.key);
      return null;
    }
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('DLSS 5 portrait image failed to load'));
      image.src = url;
    });
  }

  private createTexture(
    textureKey: string,
    image: HTMLImageElement,
    index: number,
    size: number,
  ): void {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const lowSize = Math.max(32, Math.floor(size / 4));
    const lowCanvas = document.createElement('canvas');
    lowCanvas.width = lowSize;
    lowCanvas.height = lowSize;
    const lowContext = lowCanvas.getContext('2d');
    if (!lowContext) {
      return;
    }

    lowContext.imageSmoothingEnabled = true;
    lowContext.drawImage(image, 0, 0, lowSize, lowSize);
    const source = lowContext.getImageData(0, 0, lowSize, lowSize);
    const data = source.data;
    for (let y = 0; y < lowSize; y += 1) {
      const scanline = y % 4 === 0 ? 0.72 : 1;
      for (let x = 0; x < lowSize; x += 1) {
        const offset = (y * lowSize + x) * 4;
        const red = data[offset]!;
        const green = data[offset + 1]!;
        const blue = data[offset + 2]!;
        const luma = red * 0.32 + green * 0.42 + blue * 0.26;
        const noise = (((x * 17 + y * 29 + index * 31) % 11) - 5) * 2;
        data[offset] = clampColor((luma * 1.08 + red * 0.18) * scanline + noise + 8);
        data[offset + 1] = clampColor((luma * 0.92 + green * 0.12) * scanline + noise);
        data[offset + 2] = clampColor((luma * 0.84 + blue * 0.16) * scanline + noise + 14);
      }
    }
    lowContext.putImageData(source, 0, 0);

    context.imageSmoothingEnabled = false;
    context.fillStyle = '#0b1118';
    context.fillRect(0, 0, size, size);
    context.drawImage(lowCanvas, 0, 0, size, size);
    context.fillStyle = 'rgba(120, 220, 255, 0.14)';
    for (let y = 3; y < size; y += 12) {
      const shift = ((y + index) % 3) - 1;
      context.fillRect(8 + shift, y, size - 16, 1);
    }
    context.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    context.strokeRect(0.5, 0.5, size - 1, size - 1);

    this.scene.textures.addCanvas(textureKey, canvas);
  }

  clear(): void {
    for (const textureKey of this.cache.values()) {
      if (this.scene.textures.exists(textureKey)) {
        this.scene.textures.remove(textureKey);
      }
    }
    this.cache.clear();
    this.pending.clear();
    this.failed.clear();
  }
}

function clampColor(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
