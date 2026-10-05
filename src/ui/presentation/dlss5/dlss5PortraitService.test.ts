import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { Dlss5PortraitService, type Dlss5PortraitLoader } from './dlss5PortraitService.js';
import type { Dlss5PortraitIdentity } from './portraitResolver.js';

class FakePortraitLoader implements Dlss5PortraitLoader {
  readonly requested: string[] = [];
  private readonly cached = new Map<string, string>();
  private resolvers: Array<(value: string | null) => void> = [];

  getCachedTexture(identity: Dlss5PortraitIdentity): string | null {
    return this.cached.get(identity.key) ?? null;
  }

  loadTexture(identity: Dlss5PortraitIdentity): Promise<string | null> {
    this.requested.push(identity.key);
    return new Promise((resolve) => {
      this.resolvers.push((value) => {
        if (value) {
          this.cached.set(identity.key, value);
        }
        resolve(value);
      });
    });
  }

  resolveNext(value: string | null): void {
    const resolver = this.resolvers.shift();
    resolver?.(value);
  }

  clear(): void {
    this.cached.clear();
    this.resolvers = [];
  }
}

function identity(index: number): Dlss5PortraitIdentity {
  return { key: `dlss5-portrait:${index}`, index };
}

describe('DLSS 5 portrait service', () => {
  it('prefetches remote portrait jobs with a bounded shared queue', async () => {
    const loader = new FakePortraitLoader();
    const service = new Dlss5PortraitService({} as Phaser.Scene, 2, loader);

    service.prefetch(identity(1));
    service.prefetch(identity(2));
    service.prefetch(identity(3));

    expect(loader.requested).toEqual(['dlss5-portrait:1', 'dlss5-portrait:2']);

    loader.resolveNext('texture-1');
    await Promise.resolve();

    expect(loader.requested).toEqual(['dlss5-portrait:1', 'dlss5-portrait:2', 'dlss5-portrait:3']);
  });

  it('does not enqueue cached or duplicate portrait work', () => {
    const loader = new FakePortraitLoader();
    const service = new Dlss5PortraitService({} as Phaser.Scene, 1, loader);
    const first = identity(1);

    service.prefetch(first);
    service.prefetch(first);

    expect(loader.requested).toEqual(['dlss5-portrait:1']);
  });
});
