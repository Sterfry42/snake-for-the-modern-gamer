const YOUTUBE_LAST_URL_STORAGE_KEY = 'snake.youtube.lastUrl';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

export interface YouTubeEmbedManagerOptions {
  document?: Document;
  storage?: Storage;
}

export function toYouTubeEmbedUrl(rawUrl: string): string {
  const value = rawUrl.trim();
  if (!value) {
    throw new Error('Paste a YouTube URL first.');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('That does not look like a YouTube URL.');
  }

  const host = url.hostname.toLowerCase();
  const params = new URLSearchParams({
    playsinline: '1',
    rel: '0',
  });
  const start = getStartSeconds(url);
  if (start > 0) {
    params.set('start', String(start));
  }

  if (host === 'youtu.be') {
    const videoId = firstPathPart(url);
    if (!videoId) {
      throw new Error('That YouTube URL is missing a video id.');
    }
    return buildVideoEmbedUrl(videoId, params);
  }

  if (!YOUTUBE_HOSTS.has(host)) {
    throw new Error('That does not look like a YouTube URL.');
  }

  const videoId =
    url.searchParams.get('v') ??
    pathValueAfter(url, 'embed') ??
    pathValueAfter(url, 'shorts') ??
    pathValueAfter(url, 'live');
  if (videoId) {
    return buildVideoEmbedUrl(videoId, params);
  }

  const playlistId = url.searchParams.get('list');
  if (playlistId) {
    params.set('listType', 'playlist');
    params.set('list', playlistId);
    return `https://www.youtube.com/embed?${params.toString()}`;
  }

  throw new Error('That YouTube URL is missing a video or playlist id.');
}

export class YouTubeEmbedManager {
  private readonly document?: Document;
  private readonly storage?: Storage;
  private host: HTMLDivElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private lastEmbedUrl: string | null = null;

  constructor(options: YouTubeEmbedManagerOptions = {}) {
    this.document = options.document ?? (typeof document !== 'undefined' ? document : undefined);
    this.storage =
      options.storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  }

  getLastUrl(): string | null {
    try {
      return this.storage?.getItem(YOUTUBE_LAST_URL_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  hasEmbed(): boolean {
    return this.iframe !== null;
  }

  getHostForTest(): HTMLElement | null {
    return this.host;
  }

  loadUrl(rawUrl: string): void {
    const inputUrl = rawUrl.trim();
    const embedUrl = toYouTubeEmbedUrl(inputUrl);
    const iframe = this.ensureIframe();
    if (this.lastEmbedUrl !== embedUrl) {
      iframe.src = embedUrl;
      this.lastEmbedUrl = embedUrl;
    }
    this.persistLastUrl(inputUrl);
  }

  showInPanel(container: HTMLElement): void {
    const host = this.ensureHost();
    if (host.parentElement !== container) {
      container.append(host);
    }
    this.applyPanelStyles(host);
  }

  showGameplay(canvas: HTMLCanvasElement): void {
    if (!this.iframe) {
      this.hide();
      return;
    }
    const host = this.ensureHost();
    if (host.parentElement !== this.document?.body) {
      this.document?.body.append(host);
    }
    this.applyGameplayStyles(host, canvas);
  }

  hide(): void {
    if (!this.host) {
      return;
    }
    this.document?.body.append(this.host);
    this.applyParkedStyles(this.host);
  }

  destroy(): void {
    this.host?.remove();
    this.host = null;
    this.iframe = null;
    this.lastEmbedUrl = null;
  }

  private ensureHost(): HTMLDivElement {
    if (this.host) {
      return this.host;
    }
    if (!this.document) {
      throw new Error('YouTube embed requires a browser document.');
    }
    const host = this.document.createElement('div');
    host.className = 'youtube-embed-manager__host';
    this.applyParkedStyles(host);
    this.host = host;
    return host;
  }

  private ensureIframe(): HTMLIFrameElement {
    if (this.iframe) {
      return this.iframe;
    }
    if (!this.document) {
      throw new Error('YouTube embed requires a browser document.');
    }
    const iframe = this.document.createElement('iframe');
    iframe.className = 'youtube-embed-manager__iframe';
    iframe.title = 'YouTube video player';
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    this.ensureHost().append(iframe);
    this.iframe = iframe;
    return iframe;
  }

  private persistLastUrl(inputUrl: string): void {
    try {
      this.storage?.setItem(YOUTUBE_LAST_URL_STORAGE_KEY, inputUrl);
    } catch {
      // Settings persistence is best-effort in private or restricted contexts.
    }
  }

  private applyPanelStyles(host: HTMLElement): void {
    host.style.position = 'relative';
    host.style.left = 'auto';
    host.style.top = 'auto';
    host.style.width = '100%';
    host.style.height = '100%';
    host.style.opacity = '1';
    host.style.pointerEvents = 'auto';
    host.style.display = 'block';
    host.style.zIndex = 'auto';
  }

  private applyGameplayStyles(host: HTMLElement, canvas: HTMLCanvasElement): void {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(220, Math.min(360, Math.floor(rect.width * 0.32)));
    const height = Math.floor((width * 9) / 16);
    const margin = 12;
    host.style.position = 'fixed';
    host.style.left = `${Math.max(margin, rect.right - width - margin)}px`;
    host.style.top = `${Math.max(margin, rect.top + margin)}px`;
    host.style.width = `${width}px`;
    host.style.height = `${height}px`;
    host.style.opacity = '1';
    host.style.pointerEvents = 'auto';
    host.style.display = 'block';
    host.style.zIndex = '1200';
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
    host.style.zIndex = 'auto';
  }
}

function buildVideoEmbedUrl(videoId: string, params: URLSearchParams): string {
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

function firstPathPart(url: URL): string | null {
  return url.pathname.split('/').filter(Boolean)[0] ?? null;
}

function pathValueAfter(url: URL, segment: string): string | null {
  const parts = url.pathname.split('/').filter(Boolean);
  const index = parts.indexOf(segment);
  return index >= 0 ? (parts[index + 1] ?? null) : null;
}

function getStartSeconds(url: URL): number {
  const start = url.searchParams.get('start');
  if (start) {
    return parseTimeValue(start);
  }
  const t = url.searchParams.get('t');
  return t ? parseTimeValue(t) : 0;
}

function parseTimeValue(value: string): number {
  const simpleSeconds = Number.parseInt(value, 10);
  if (/^\d+s?$/.test(value) && Number.isFinite(simpleSeconds)) {
    return simpleSeconds;
  }

  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(value);
  if (!match) {
    return 0;
  }
  const hours = Number.parseInt(match[1] ?? '0', 10);
  const minutes = Number.parseInt(match[2] ?? '0', 10);
  const seconds = Number.parseInt(match[3] ?? '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}
