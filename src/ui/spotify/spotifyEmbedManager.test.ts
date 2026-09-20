import { describe, expect, it, vi } from 'vitest';

import {
  SpotifyEmbedManager,
  type SpotifyEmbedController,
  type SpotifyIframeApi,
} from './spotifyEmbedManager.js';

class FakeElement {
  readonly style: Record<string, string> = {};
  parentElement: FakeElement | null = null;
  readonly children: FakeElement[] = [];
  className = '';

  append(...nodes: FakeElement[]): void {
    for (const node of nodes) {
      node.remove();
      node.parentElement = this;
      this.children.push(node);
    }
  }

  remove(): void {
    if (!this.parentElement) {
      return;
    }
    const siblings = this.parentElement.children;
    const index = siblings.indexOf(this);
    if (index >= 0) {
      siblings.splice(index, 1);
    }
    this.parentElement = null;
  }
}

class FakeDocument {
  readonly body = new FakeElement();

  createElement(): HTMLElement {
    return asHtmlElement(new FakeElement());
  }
}

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function asHtmlElement(element: FakeElement): HTMLElement {
  return element as unknown as HTMLElement;
}

function asFakeElement(element: HTMLElement | null): FakeElement {
  if (!element) {
    throw new Error('Expected fake element.');
  }
  return element as unknown as FakeElement;
}

function createSpotifyApi() {
  const controller: SpotifyEmbedController = {
    loadEntity: vi.fn(),
    destroy: vi.fn(),
  };
  const createController = vi.fn<SpotifyIframeApi['createController']>((_element, _options, cb) => {
    cb(controller);
  });
  const api: SpotifyIframeApi = { createController };
  return { api, controller, createController };
}

describe('SpotifyEmbedManager', () => {
  it('creates one controller and reuses it across show, hide, and show', async () => {
    const document = new FakeDocument();
    const firstSlot = new FakeElement();
    const secondSlot = new FakeElement();
    const { api, controller, createController } = createSpotifyApi();
    const manager = new SpotifyEmbedManager({
      document: document as unknown as Document,
      storage: new MemoryStorage(),
      loadApi: () => Promise.resolve(api),
    });

    manager.show(asHtmlElement(firstSlot));
    await manager.loadEntity('https://open.spotify.com/track/abc123');
    const host = asFakeElement(manager.getHostForTest());

    expect(createController).toHaveBeenCalledTimes(1);
    expect(host.parentElement).toBe(firstSlot);

    manager.hide();

    expect(controller.destroy).not.toHaveBeenCalled();
    expect(host.parentElement).toBe(document.body);
    expect(host.style.left).toBe('-10000px');

    manager.show(asHtmlElement(secondSlot));
    await manager.loadEntity('https://open.spotify.com/track/abc123');

    expect(createController).toHaveBeenCalledTimes(1);
    expect(host.parentElement).toBe(secondSlot);
    expect(controller.destroy).not.toHaveBeenCalled();
  });

  it('loads a second URL through the existing controller instead of recreating the iframe', async () => {
    const { api, controller, createController } = createSpotifyApi();
    const manager = new SpotifyEmbedManager({
      document: new FakeDocument() as unknown as Document,
      storage: new MemoryStorage(),
      loadApi: () => Promise.resolve(api),
    });

    manager.show(asHtmlElement(new FakeElement()));
    await manager.loadEntity('https://open.spotify.com/album/first');
    await manager.loadEntity('https://open.spotify.com/playlist/second');

    expect(createController).toHaveBeenCalledTimes(1);
    expect(controller.loadEntity).toHaveBeenCalledTimes(1);
    expect(controller.loadEntity).toHaveBeenCalledWith('https://open.spotify.com/playlist/second');
  });

  it('persists and restores the last Spotify URL', async () => {
    const storage = new MemoryStorage();
    const { api } = createSpotifyApi();
    const manager = new SpotifyEmbedManager({
      document: new FakeDocument() as unknown as Document,
      storage,
      loadApi: () => Promise.resolve(api),
    });

    manager.show(asHtmlElement(new FakeElement()));
    await manager.loadEntity('https://open.spotify.com/track/persisted');

    const restored = new SpotifyEmbedManager({
      document: new FakeDocument() as unknown as Document,
      storage,
      loadApi: () => Promise.resolve(api),
    });

    expect(restored.getLastEntityUrl()).toBe('https://open.spotify.com/track/persisted');
  });

  it('surfaces API load failures without destroying the parked host', async () => {
    const document = new FakeDocument();
    const slot = new FakeElement();
    const manager = new SpotifyEmbedManager({
      document: document as unknown as Document,
      storage: new MemoryStorage(),
      loadApi: () => Promise.reject(new Error('Spotify unavailable')),
    });

    manager.show(asHtmlElement(slot));
    await expect(manager.loadEntity('https://open.spotify.com/track/failure')).rejects.toThrow(
      'Spotify unavailable',
    );

    const host = asFakeElement(manager.getHostForTest());
    manager.hide();

    expect(host.parentElement).toBe(document.body);
    expect(host.style.pointerEvents).toBe('none');
  });
});
