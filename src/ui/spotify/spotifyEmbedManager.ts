const SPOTIFY_IFRAME_API_SRC = 'https://open.spotify.com/embed/iframe-api/v1';
const SPOTIFY_SCRIPT_ID = 'spotify-iframe-api';
const SPOTIFY_LAST_ENTITY_STORAGE_KEY = 'snake.spotify.lastEntityUrl';
const SPOTIFY_API_TIMEOUT_MS = 10_000;

export interface SpotifyEmbedController {
  loadEntity(spotifyUriOrUrl: string, preferVideo?: boolean, startAt?: number): void;
  destroy(): void;
}

export interface SpotifyIframeApi {
  createController(
    element: HTMLElement,
    options: SpotifyControllerOptions,
    callback: (controller: SpotifyEmbedController) => void,
  ): void;
}

export interface SpotifyControllerOptions {
  width: string | number;
  height: string | number;
  uri?: string;
  url?: string;
}

type SpotifyWindow = Window &
  typeof globalThis & {
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
  };

export interface SpotifyEmbedManagerOptions {
  document?: Document;
  window?: SpotifyWindow;
  storage?: Storage;
  loadApi?: () => Promise<SpotifyIframeApi>;
  apiTimeoutMs?: number;
}

let spotifyApiPromise: Promise<SpotifyIframeApi> | null = null;

function isSpotifyUrlOrUri(value: string): boolean {
  return (
    /^spotify:[a-z]+:[\w-]+/i.test(value) ||
    /^https:\/\/open\.spotify\.com\/[a-z]+\/[\w-]+/i.test(value)
  );
}

function loadSpotifyIframeApi(
  win: SpotifyWindow,
  doc: Document,
  timeoutMs: number,
): Promise<SpotifyIframeApi> {
  if (spotifyApiPromise) {
    return spotifyApiPromise;
  }

  spotifyApiPromise = new Promise((resolve, reject) => {
    const previousReady = win.onSpotifyIframeApiReady;
    const timeout = win.setTimeout(() => {
      reject(new Error('Spotify iframe API failed to load.'));
    }, timeoutMs);

    win.onSpotifyIframeApiReady = (api: SpotifyIframeApi) => {
      win.clearTimeout(timeout);
      previousReady?.(api);
      resolve(api);
    };

    if (doc.getElementById(SPOTIFY_SCRIPT_ID)) {
      return;
    }

    const script = doc.createElement('script');
    script.id = SPOTIFY_SCRIPT_ID;
    script.src = SPOTIFY_IFRAME_API_SRC;
    script.async = true;
    script.addEventListener('error', () => {
      win.clearTimeout(timeout);
      reject(new Error('Spotify iframe API script failed to load.'));
    });
    doc.body.append(script);
  });

  return spotifyApiPromise;
}

export class SpotifyEmbedManager {
  private readonly document?: Document;
  private readonly window?: SpotifyWindow;
  private readonly storage?: Storage;
  private readonly loadApiOverride?: () => Promise<SpotifyIframeApi>;
  private readonly apiTimeoutMs: number;
  private host: HTMLElement | null = null;
  private controller: SpotifyEmbedController | null = null;
  private controllerPromise: Promise<SpotifyEmbedController> | null = null;
  private lastLoadedEntityUrl: string | null = null;

  constructor(options: SpotifyEmbedManagerOptions = {}) {
    this.document = options.document ?? (typeof document !== 'undefined' ? document : undefined);
    this.window = options.window ?? (typeof window !== 'undefined' ? window : undefined);
    this.storage =
      options.storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    this.loadApiOverride = options.loadApi;
    this.apiTimeoutMs = options.apiTimeoutMs ?? SPOTIFY_API_TIMEOUT_MS;
  }

  getLastEntityUrl(): string | null {
    try {
      return this.storage?.getItem(SPOTIFY_LAST_ENTITY_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  hasController(): boolean {
    return this.controller !== null || this.controllerPromise !== null;
  }

  getHostForTest(): HTMLElement | null {
    return this.host;
  }

  ensureMounted(container: HTMLElement): void {
    const host = this.ensureHost();
    if (host.parentElement !== container) {
      container.append(host);
    }
    this.applyShownStyles(host);
  }

  show(container: HTMLElement): void {
    this.ensureMounted(container);
  }

  hide(): void {
    if (!this.host) {
      return;
    }
    this.document?.body.append(this.host);
    this.applyParkedStyles(this.host);
  }

  async loadEntity(spotifyUriOrUrl: string): Promise<void> {
    const entityUrl = spotifyUriOrUrl.trim();
    if (!entityUrl) {
      throw new Error('Paste a Spotify URL first.');
    }
    if (!isSpotifyUrlOrUri(entityUrl)) {
      throw new Error('That does not look like a Spotify URL.');
    }

    const controller = await this.ensureController(entityUrl);
    if (this.lastLoadedEntityUrl !== entityUrl) {
      controller.loadEntity(entityUrl);
      this.lastLoadedEntityUrl = entityUrl;
    }
    this.persistLastEntityUrl(entityUrl);
  }

  destroy(): void {
    this.controller?.destroy();
    this.controller = null;
    this.controllerPromise = null;
    this.host?.remove();
    this.host = null;
  }

  private ensureHost(): HTMLElement {
    if (this.host) {
      return this.host;
    }
    if (!this.document) {
      throw new Error('Spotify embed requires a browser document.');
    }
    const host = this.document.createElement('div');
    host.className = 'spotify-embed-manager__host';
    this.applyParkedStyles(host);
    this.host = host;
    return host;
  }

  private async ensureController(initialEntityUrl: string): Promise<SpotifyEmbedController> {
    if (this.controller) {
      return this.controller;
    }
    if (this.controllerPromise) {
      return this.controllerPromise;
    }

    const host = this.ensureHost();
    const apiPromise = this.loadApiOverride
      ? this.loadApiOverride()
      : this.window && this.document
        ? loadSpotifyIframeApi(this.window, this.document, this.apiTimeoutMs)
        : Promise.reject(new Error('Spotify iframe API is unavailable.'));

    this.controllerPromise = apiPromise.then(
      (api) =>
        new Promise<SpotifyEmbedController>((resolve) => {
          api.createController(
            host,
            {
              width: '100%',
              height: 232,
              url: initialEntityUrl,
            },
            (controller) => {
              this.controller = controller;
              this.lastLoadedEntityUrl = initialEntityUrl;
              resolve(controller);
            },
          );
        }),
    );

    return this.controllerPromise;
  }

  private persistLastEntityUrl(entityUrl: string): void {
    try {
      this.storage?.setItem(SPOTIFY_LAST_ENTITY_STORAGE_KEY, entityUrl);
    } catch {
      // Settings persistence is best-effort in private or restricted contexts.
    }
  }

  private applyShownStyles(host: HTMLElement): void {
    host.style.position = 'relative';
    host.style.left = 'auto';
    host.style.top = 'auto';
    host.style.width = '100%';
    host.style.height = '232px';
    host.style.opacity = '1';
    host.style.pointerEvents = 'auto';
    host.style.display = 'block';
  }

  private applyParkedStyles(host: HTMLElement): void {
    host.style.position = 'fixed';
    host.style.left = '-10000px';
    host.style.top = '-10000px';
    host.style.width = '1px';
    host.style.height = '1px';
    host.style.opacity = '0';
    host.style.pointerEvents = 'none';
    host.style.display = 'block';
  }
}
