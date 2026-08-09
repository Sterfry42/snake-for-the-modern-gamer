import { SpotifyEmbedManager } from './spotifyEmbedManager.js';

export interface SpotifyPanelBounds {
  overlayX: number;
  overlayY: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpotifyPanelOptions {
  document?: Document;
  canvas?: HTMLCanvasElement;
  manager?: SpotifyEmbedManager;
}

export class SpotifyPanel {
  private readonly document?: Document;
  private readonly canvas?: HTMLCanvasElement;
  private readonly manager: SpotifyEmbedManager;
  private root: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;
  private status: HTMLDivElement | null = null;
  private embedSlot: HTMLDivElement | null = null;
  private restoredEntityRequested = false;

  constructor(options: SpotifyPanelOptions = {}) {
    this.document = options.document ?? (typeof document !== 'undefined' ? document : undefined);
    this.canvas =
      options.canvas ??
      (typeof document !== 'undefined'
        ? ((document.querySelector('canvas') as HTMLCanvasElement | null) ?? undefined)
        : undefined);
    this.manager = options.manager ?? new SpotifyEmbedManager({ document: this.document });
  }

  show(bounds: SpotifyPanelBounds): void {
    const root = this.ensureRoot();
    this.positionRoot(root, bounds);
    root.style.display = 'block';
    this.input!.value = (this.input!.value || this.manager.getLastEntityUrl()) ?? '';
    this.manager.show(this.embedSlot!);

    const restoredUrl = this.manager.getLastEntityUrl();
    if (restoredUrl && !this.restoredEntityRequested && !this.manager.hasController()) {
      this.restoredEntityRequested = true;
      this.setStatus('Loading saved Spotify embed...', false);
      this.manager
        .loadEntity(restoredUrl)
        .then(() => this.setStatus('Saved Spotify embed loaded. Press play in Spotify.', false))
        .catch((error: unknown) => this.setStatus(this.getErrorMessage(error), true));
    } else if (!restoredUrl) {
      this.setStatus('Paste a Spotify track, album, or playlist URL.', false);
    }
  }

  hide(): void {
    this.root?.style.setProperty('display', 'none');
    this.manager.hide();
  }

  destroy(): void {
    this.manager.destroy();
    this.root?.remove();
    this.root = null;
    this.input = null;
    this.status = null;
    this.embedSlot = null;
  }

  getManagerForTest(): SpotifyEmbedManager {
    return this.manager;
  }

  private ensureRoot(): HTMLDivElement {
    if (this.root) {
      return this.root;
    }
    if (!this.document) {
      throw new Error('Spotify panel requires a browser document.');
    }

    const root = this.document.createElement('div');
    root.className = 'spotify-panel';
    root.addEventListener('pointerdown', (event) => event.stopPropagation());
    root.addEventListener('keydown', (event) => event.stopPropagation());

    const title = this.document.createElement('div');
    title.className = 'spotify-panel__title';
    title.textContent = 'SPOTIFY';

    const label = this.document.createElement('label');
    label.className = 'spotify-panel__label';
    label.textContent = 'Spotify URL';

    const row = this.document.createElement('div');
    row.className = 'spotify-panel__row';

    const input = this.document.createElement('input');
    input.className = 'spotify-panel__input';
    input.type = 'url';
    input.placeholder = 'https://open.spotify.com/...';
    input.value = this.manager.getLastEntityUrl() ?? '';

    const button = this.document.createElement('button');
    button.className = 'spotify-panel__button';
    button.type = 'button';
    button.textContent = 'Load';
    button.addEventListener('click', () => this.loadCurrentInput());

    const status = this.document.createElement('div');
    status.className = 'spotify-panel__status';

    const embedSlot = this.document.createElement('div');
    embedSlot.className = 'spotify-panel__embed-slot';

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
    const value = this.input?.value ?? '';
    this.setStatus('Loading Spotify embed...', false);
    this.manager
      .loadEntity(value)
      .then(() => this.setStatus('Loaded. Use Spotify controls to play.', false))
      .catch((error: unknown) => this.setStatus(this.getErrorMessage(error), true));
  }

  private setStatus(message: string, error: boolean): void {
    if (!this.status) {
      return;
    }
    this.status.textContent = message;
    this.status.classList.toggle('spotify-panel__status--error', error);
  }

  private positionRoot(root: HTMLDivElement, bounds: SpotifyPanelBounds): void {
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
    return error instanceof Error ? error.message : 'Spotify embed failed to load.';
  }
}
