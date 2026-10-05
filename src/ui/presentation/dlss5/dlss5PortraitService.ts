import Phaser from 'phaser';
import {
  AnalogPortraitProcessor,
  type AnalogPortraitProcessorOptions,
} from './analogPortraitProcessor.js';
import {
  resolveDlss5PortraitIdentity,
  type Dlss5PortraitCandidate,
  type Dlss5PortraitIdentity,
} from './portraitResolver.js';

export interface Dlss5PortraitLoader {
  getCachedTexture(identity: Dlss5PortraitIdentity): string | null;
  loadTexture(
    identity: Dlss5PortraitIdentity,
    options?: AnalogPortraitProcessorOptions,
  ): Promise<string | null>;
  clear(): void;
}

interface Dlss5PortraitJob {
  identity: Dlss5PortraitIdentity;
  options: AnalogPortraitProcessorOptions;
}

export class Dlss5PortraitService {
  private readonly queued = new Map<string, Dlss5PortraitJob>();
  private readonly active = new Set<string>();

  constructor(
    scene: Phaser.Scene,
    private readonly concurrency: number = 3,
    private readonly loader: Dlss5PortraitLoader = new AnalogPortraitProcessor(scene),
  ) {}

  getCachedTexture(identity: Dlss5PortraitIdentity): string | null {
    return this.loader.getCachedTexture(identity);
  }

  loadTexture(
    identity: Dlss5PortraitIdentity,
    options: AnalogPortraitProcessorOptions = {},
  ): Promise<string | null> {
    this.queued.delete(identity.key);
    return this.loader.loadTexture(identity, options);
  }

  prefetchCandidate(
    candidate: Dlss5PortraitCandidate,
    options: AnalogPortraitProcessorOptions = {},
  ): void {
    const identity = resolveDlss5PortraitIdentity(candidate);
    if (identity) {
      this.prefetch(identity, options);
    }
  }

  prefetch(identity: Dlss5PortraitIdentity, options: AnalogPortraitProcessorOptions = {}): void {
    if (
      this.loader.getCachedTexture(identity) ||
      this.active.has(identity.key) ||
      this.queued.has(identity.key)
    ) {
      return;
    }

    this.queued.set(identity.key, { identity, options });
    this.pump();
  }

  clear(): void {
    this.queued.clear();
    this.active.clear();
    this.loader.clear();
  }

  private pump(): void {
    while (this.active.size < this.concurrency) {
      const next = this.queued.entries().next();
      if (next.done) {
        return;
      }

      const [key, job] = next.value;
      this.queued.delete(key);
      this.active.add(key);
      void this.loader.loadTexture(job.identity, job.options).finally(() => {
        this.active.delete(key);
        this.pump();
      });
    }
  }
}
