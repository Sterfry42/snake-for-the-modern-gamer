import type Phaser from 'phaser';
import type { Actor } from '../actors/actorTypes.js';
import { getActorPresentation } from '../actors/actorPresentation.js';
import { WorldVisualAssets } from './presentation/worldVisualAssets.js';

/** Presentation only: positions, speech, and NPC lifetimes come from the authority. */
export class ConnectedNpcRenderer {
  private readonly assets: WorldVisualAssets;
  private readonly entries = new Map<
    string,
    {
      sprite: Phaser.GameObjects.Image;
      label: Phaser.GameObjects.Text;
    }
  >();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly cell: number,
    private readonly onTalk: (actorId: string) => void,
  ) {
    this.assets = new WorldVisualAssets(scene);
  }

  render(actors: readonly Actor[], nowMs: number): void {
    const visible = new Set<string>();
    for (const actor of actors) {
      if (!actor.presence?.materialized || actor.health?.state === 'dead') continue;
      visible.add(actor.id);
      const texture = this.assets.getNpcTexture(actor).defaultTextureKey;
      let entry = this.entries.get(actor.id);
      if (!entry) {
        entry = {
          sprite: this.scene.add
            .image(0, 0, texture)
            .setDepth(20)
            .setDisplaySize(this.cell * 0.84, this.cell * 0.84),
          label: this.scene.add
            .text(0, 0, '', {
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#fff4cf',
              stroke: '#071019',
              strokeThickness: 3,
              align: 'center',
              wordWrap: { width: 220, useAdvancedWrap: true },
            })
            .setOrigin(0.5, 1)
            .setDepth(25),
        };
        entry.sprite
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.onTalk(actor.id));
        this.entries.set(actor.id, entry);
      }
      const x = (actor.presence.position.x + 0.5) * this.cell;
      const y = (actor.presence.position.y + 0.5) * this.cell;
      const presentation = getActorPresentation(actor);
      const speech = presentation.speech;
      const speechVisible =
        speech && (speech.expiresAtMs === undefined || speech.expiresAtMs > nowMs);
      const indicators = presentation.indicators.map((indicator) => indicator.glyph).join(' ');
      entry.sprite
        .setTexture(texture)
        .setPosition(x, y - 2)
        .setVisible(true);
      entry.label
        .setText([
          ...(speechVisible ? [speech.text] : []),
          `${actor.displayName}${presentation.sleepMarker ? ' Zzz' : ''}${indicators ? ` ${indicators}` : ''}`,
        ])
        .setPosition(x, Math.max(28, y - this.cell * 0.5))
        .setVisible(true);
    }
    for (const [id, entry] of this.entries) {
      if (visible.has(id)) continue;
      entry.sprite.destroy();
      entry.label.destroy();
      this.entries.delete(id);
    }
  }

  destroy(): void {
    for (const entry of this.entries.values()) {
      entry.sprite.destroy();
      entry.label.destroy();
    }
    this.entries.clear();
  }
}
