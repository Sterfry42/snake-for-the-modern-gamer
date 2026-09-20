import { YouTubeEmbedManager } from './youtubeEmbedManager.js';

export interface YouTubePanelBounds {
  overlayX: number;
  overlayY: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface YouTubePanelOptions {
  document?: Document;
  canvas?: HTMLCanvasElement;
  manager?: YouTubeEmbedManager;
}

export class YouTubePanel {
  private readonly document?: Document;
  private readonly canvas?: HTMLCanvasElement;
  private readonly manager: YouTubeEmbedManager;
  private root: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;
  private status: HTMLDivElement | null = null;
  private embedSlot: HTMLDivElement | null = null;
  private restoredUrlRequested = false;

  constructor(options: YouTubePanelOptions = {}) {
    this.document = options.document ?? (typeof document !== 'undefined' ? document : undefined);
    this.canvas =
      options.canvas ??
      (typeof document !== 'undefined'
        ? ((document.querySelector('canvas') as HTMLCanvasElement | null) ?? undefined)
        : undefined);
    this.manager = options.manager ?? new YouTubeEmbedManager({ document: this.document });
  }

  show(bounds: YouTubePanelBounds): void {
    const root = this.ensureRoot();
    this.positionRoot(root, bounds);
    root.style.display = 'block';
    this.input!.value = (this.input!.value || this.manager.getLastUrl()) ?? '';
    this.manager.showInPanel(this.embedSlot!);

    const restoredUrl = this.manager.getLastUrl();
    if (restoredUrl && !this.restoredUrlRequested && !this.manager.hasEmbed()) {
      this.restoredUrlRequested = true;
      this.setStatus('Loading saved YouTube embed...', false);
      this.loadUrl(restoredUrl, 'Saved YouTube embed loaded.');
    } else if (!restoredUrl) {
      this.setStatus('Paste a YouTube video, short, or playlist URL.', false);
    }
  }

  hideForPauseMenu(): void {
    this.root?.style.setProperty('display', 'none');
    this.manager.hide();
  }

  showForGameplay(): void {
    this.root?.style.setProperty('display', 'none');
    if (!this.canvas) {
      this.manager.hide();
      return;
    }
    this.manager.showGameplay(this.canvas);
  }

  destroy(): void {
    this.manager.destroy();
    this.root?.remove();
    this.root = null;
    this.input = null;
    this.status = null;
    this.embedSlot = null;
  }

  getManagerForTest(): YouTubeEmbedManager {
    return this.manager;
  }

  private ensureRoot(): HTMLDivElement {
    if (this.root) {
      return this.root;
    }
    if (!this.document) {
      throw new Error('YouTube panel requires a browser document.');
    }

    const root = this.document.createElement('div');
    root.className = 'youtube-panel';
    root.addEventListener('pointerdown', (event) => event.stopPropagation());
    root.addEventListener('keydown', (event) => event.stopPropagation());

    const title = this.document.createElement('div');
    title.className = 'youtube-panel__title';
    title.textContent = 'YOUTUBE';

    const label = this.document.createElement('label');
    label.className = 'youtube-panel__label';
    label.textContent = 'YouTube URL';

    const row = this.document.createElement('div');
    row.className = 'youtube-panel__row';

    const input = this.document.createElement('input');
    input.className = 'youtube-panel__input';
    input.type = 'url';
    input.placeholder = 'https://www.youtube.com/watch?v=...';
    input.value = this.manager.getLastUrl() ?? '';

    const button = this.document.createElement('button');
    button.className = 'youtube-panel__button';
    button.type = 'button';
    button.textContent = 'Load';
    button.addEventListener('click', () => this.loadCurrentInput());

    const status = this.document.createElement('div');
    status.className = 'youtube-panel__status';

    const embedSlot = this.document.createElement('div');
    embedSlot.className = 'youtube-panel__embed-slot';

    row.append(input, button);
    root.append(title, label, row, status, embedSlot);
    this.document.body.append(root);

    this.root = root;
    this.input = input;
    this.status = status;
    this.embedSlot = embedSlot;
    return root;
  }

  private loadCurrentInput(): void {
    this.loadUrl(this.input?.value ?? '', 'Loaded. Close pause to pin the video top-right.');
  }

  private loadUrl(url: string, successMessage: string): void {
    try {
      this.manager.loadUrl(url);
      this.setStatus(successMessage, false);
    } catch (error: unknown) {
      this.setStatus(this.getErrorMessage(error), true);
    }
  }

  private setStatus(message: string, error: boolean): void {
    if (!this.status) {
      return;
    }
    this.status.textContent = message;
    this.status.classList.toggle('youtube-panel__status--error', error);
  }

  private positionRoot(root: HTMLDivElement, bounds: YouTubePanelBounds): void {
    const canvasRect = this.canvas?.getBoundingClientRect();
    const scaleX = canvasRect && this.canvas ? canvasRect.width / this.canvas.width : 1;
    const scaleY = canvasRect && this.canvas ? canvasRect.height / this.canvas.height : 1;
    const left = (canvasRect?.left ?? 0) + (bounds.overlayX + bounds.x) * scaleX;
    const top = (canvasRect?.top ?? 0) + (bounds.overlayY + bounds.y) * scaleY;

    root.style.left = `${left}px`;
    root.style.top = `${top}px`;
    root.style.width = `${bounds.width * scaleX}px`;
    root.style.height = `${bounds.height * scaleY}px`;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'YouTube embed failed to load.';
  }
}
