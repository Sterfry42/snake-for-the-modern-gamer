import { describe, expect, it } from 'vitest';

import { toYouTubeEmbedUrl, YouTubeEmbedManager } from './youtubeEmbedManager.js';

class FakeElement {
  readonly style: Record<string, string> = {};
  parentElement: FakeElement | null = null;
  readonly children: FakeElement[] = [];
  className = '';
  title = '';
  src = '';
  allow = '';
  allowFullscreen = false;
  referrerPolicy = '';

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

class FakeCanvas extends FakeElement {
  width = 800;
  height = 600;

  getBoundingClientRect(): DOMRect {
    return {
      bottom: 600,
      height: 600,
      left: 0,
      right: 800,
      top: 0,
      width: 800,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
  }
}

class FakeDocument {
  readonly body = new FakeElement();

  createElement(tagName: string): HTMLElement {
    const element = new FakeElement();
    if (tagName === 'iframe') {
      return element as unknown as HTMLIFrameElement;
    }
    return element as unknown as HTMLElement;
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

function asCanvas(element: FakeCanvas): HTMLCanvasElement {
  return element as unknown as HTMLCanvasElement;
}

function asFakeElement(element: HTMLElement | null): FakeElement {
  if (!element) {
    throw new Error('Expected fake element.');
  }
  return element as unknown as FakeElement;
}

describe('YouTubeEmbedManager', () => {
  it('converts common YouTube URLs to iframe embed URLs', () => {
    expect(toYouTubeEmbedUrl('https://www.youtube.com/watch?v=M7lc1UVf-VE')).toBe(
      'https://www.youtube.com/embed/M7lc1UVf-VE?playsinline=1&rel=0',
    );
    expect(toYouTubeEmbedUrl('https://youtu.be/M7lc1UVf-VE?t=1m5s')).toBe(
      'https://www.youtube.com/embed/M7lc1UVf-VE?playsinline=1&rel=0&start=65',
    );
    expect(toYouTubeEmbedUrl('https://www.youtube.com/shorts/M7lc1UVf-VE')).toBe(
      'https://www.youtube.com/embed/M7lc1UVf-VE?playsinline=1&rel=0',
    );
    expect(toYouTubeEmbedUrl('https://www.youtube.com/playlist?list=PLC77007E23FF423C6')).toBe(
      'https://www.youtube.com/embed?playsinline=1&rel=0&listType=playlist&list=PLC77007E23FF423C6',
    );
  });

  it('moves one iframe between pause panel and top-right gameplay mode', () => {
    const document = new FakeDocument();
    const panelSlot = new FakeElement();
    const canvas = new FakeCanvas();
    const manager = new YouTubeEmbedManager({
      document: document as unknown as Document,
      storage: new MemoryStorage(),
    });

    manager.showInPanel(asHtmlElement(panelSlot));
    manager.loadUrl('https://www.youtube.com/watch?v=M7lc1UVf-VE');
    const host = asFakeElement(manager.getHostForTest());

    expect(host.parentElement).toBe(panelSlot);
    expect(host.children).toHaveLength(1);
    expect(host.children[0]?.src).toBe(
      'https://www.youtube.com/embed/M7lc1UVf-VE?playsinline=1&rel=0',
    );

    manager.showGameplay(asCanvas(canvas));

    expect(host.parentElement).toBe(document.body);
    expect(host.style.left).toBe('532px');
    expect(host.style.top).toBe('12px');
    expect(host.style.zIndex).toBe('1200');
    expect(host.children).toHaveLength(1);

    manager.showInPanel(asHtmlElement(panelSlot));

    expect(host.parentElement).toBe(panelSlot);
    expect(host.children).toHaveLength(1);
  });

  it('persists the last YouTube URL', () => {
    const storage = new MemoryStorage();
    const manager = new YouTubeEmbedManager({
      document: new FakeDocument() as unknown as Document,
      storage,
    });

    manager.loadUrl('https://youtu.be/M7lc1UVf-VE');

    const restored = new YouTubeEmbedManager({
      document: new FakeDocument() as unknown as Document,
      storage,
    });

    expect(restored.getLastUrl()).toBe('https://youtu.be/M7lc1UVf-VE');
  });
});
