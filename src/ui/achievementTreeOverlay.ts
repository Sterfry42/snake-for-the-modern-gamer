import Phaser from 'phaser';
import {
  computeAchievementDetailLayout,
  type AchievementDetailLayout,
} from '../achievements/achievementDetailLayout.js';
import { ensureAchievementPortrait } from '../achievements/achievementIconCatalog.js';
import type { AchievementManager } from '../achievements/achievementManager.js';
import { getAchievementReward } from '../achievements/achievementRewards.js';
import { exceededDragThreshold } from '../achievements/achievementTreeLayout.js';
import type {
  AchievementDefinition,
  AchievementUnlockResult,
} from '../achievements/achievementTypes.js';
import type { UiRect } from './core/UiLayout.js';

interface NodeView {
  definition: AchievementDefinition;
  container: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Rectangle;
  frame: Phaser.GameObjects.Rectangle;
  portrait: Phaser.GameObjects.Image;
  progress: Phaser.GameObjects.Text;
  check: Phaser.GameObjects.Text;
}

export interface AchievementTreeOverlayOptions {
  parent: Phaser.GameObjects.Container;
  viewport: UiRect;
  detail: UiRect;
  worldOffset: { x: number; y: number };
}

export class AchievementTreeOverlay {
  private readonly root: Phaser.GameObjects.Container;
  private readonly tree: Phaser.GameObjects.Container;
  private readonly lines: Phaser.GameObjects.Graphics;
  private readonly chrome: Phaser.GameObjects.Graphics;
  private readonly nodes = new Map<string, NodeView>();
  private readonly detailsTitle: Phaser.GameObjects.Text;
  private readonly detailsStatusLabel: Phaser.GameObjects.Text;
  private readonly detailsStatus: Phaser.GameObjects.Text;
  private readonly detailsDescription: Phaser.GameObjects.Text;
  private readonly detailRows: Array<{
    label: Phaser.GameObjects.Text;
    value: Phaser.GameObjects.Text;
  }>;
  private readonly detailsPortrait: Phaser.GameObjects.Image;
  private readonly summary: Phaser.GameObjects.Text;
  private readonly zoomText: Phaser.GameObjects.Text;
  private readonly viewport: UiRect;
  private readonly detail: UiRect;
  private readonly detailLayout: AchievementDetailLayout;
  private pan = { x: 0, y: 0 };
  private zoom = 0.9;
  private drag: {
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    moved: boolean;
  } | null = null;
  private selectedId: string | null = null;
  private visible = false;
  private readonly unlockQueue: AchievementUnlockResult[] = [];
  private unlockToastActive = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly manager: AchievementManager,
    options: AchievementTreeOverlayOptions,
  ) {
    this.viewport = options.viewport;
    this.detail = options.detail;
    this.detailLayout = computeAchievementDetailLayout(this.detail);
    this.chrome = scene.add.graphics();
    const viewportZone = scene.add
      .zone(this.viewport.x, this.viewport.y, this.viewport.width, this.viewport.height)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    this.lines = scene.add.graphics();
    this.tree = scene.add.container(this.viewport.x, this.viewport.y, [this.lines]);

    const maskShape = scene.make.graphics({
      x: options.worldOffset.x + this.viewport.x,
      y: options.worldOffset.y + this.viewport.y,
    });
    maskShape.fillStyle(0xffffff).fillRect(0, 0, this.viewport.width, this.viewport.height);
    this.tree.setMask(maskShape.createGeometryMask());

    this.summary = scene.add.text(this.viewport.x + 12, this.viewport.y + 8, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#9ad1ff',
    });
    this.zoomText = scene.add
      .text(this.viewport.x + this.viewport.width - 12, this.viewport.y + 8, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#fff3a8',
      })
      .setOrigin(1, 0);
    const rootButton = scene.add
      .text(this.viewport.x + this.viewport.width - 12, this.viewport.y + 29, ' ROOT ', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#fff3a8',
        backgroundColor: '#3b3520',
        padding: { x: 4, y: 3 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    const zoomIn = scene.add
      .text(this.viewport.x + 12, this.viewport.y + this.viewport.height - 27, ' + ', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#ffffff',
        backgroundColor: '#244155',
        padding: { x: 5, y: 2 },
      })
      .setInteractive({ useHandCursor: true });
    const zoomOut = scene.add
      .text(this.viewport.x + 52, this.viewport.y + this.viewport.height - 27, ' - ', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#ffffff',
        backgroundColor: '#244155',
        padding: { x: 5, y: 2 },
      })
      .setInteractive({ useHandCursor: true });

    this.detailsPortrait = scene.add
      .image(
        this.detailLayout.portrait.x,
        this.detailLayout.portrait.y,
        ensureAchievementPortrait(scene, this.manager.getDefinitions()[0]),
      )
      .setDisplaySize(this.detailLayout.portrait.size, this.detailLayout.portrait.size)
      .setVisible(false);
    this.detailsTitle = scene.add
      .text(this.detailLayout.title.x, this.detailLayout.title.y, 'Select an achievement', {
        fontFamily: 'monospace',
        fontSize: '17px',
        color: '#ffffff',
        wordWrap: { width: this.detailLayout.title.width },
        align: 'center',
      })
      .setOrigin(0, 0)
      .setMaxLines(2);
    this.detailsDescription = scene.add
      .text(
        this.detailLayout.description.x,
        this.detailLayout.description.y,
        'Select a portrait to inspect its progress.',
        {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#d7e8f5',
          wordWrap: { width: this.detailLayout.description.width },
          align: 'center',
          lineSpacing: 2,
        },
      )
      .setMaxLines(3);
    this.detailsStatusLabel = scene.add.text(
      this.detailLayout.status.x + 9,
      this.detailLayout.status.y + 6,
      'STATUS',
      {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#6f9fbd',
      },
    );
    this.detailsStatus = scene.add.text(
      this.detailLayout.status.x + 9,
      this.detailLayout.status.y + 20,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffffff',
      },
    );

    const rowDefinitions = [
      { label: 'SECTION', rect: this.detailLayout.section },
      { label: 'CATEGORY', rect: this.detailLayout.category },
      { label: 'PROGRESS', rect: this.detailLayout.progress },
      { label: 'REWARD', rect: this.detailLayout.reward },
    ];
    this.detailRows = rowDefinitions.map((row) => ({
      label: scene.add.text(row.rect.x + 8, row.rect.y + 6, row.label, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#6f9fbd',
      }),
      value: scene.add
        .text(row.rect.x + 8, row.rect.y + 21, '--', {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#ffffff',
          wordWrap: { width: row.rect.width - 16 },
          lineSpacing: 0,
        })
        .setMaxLines(2),
    }));

    this.root = scene.add
      .container(0, 0, [
        this.chrome,
        viewportZone,
        this.tree,
        this.summary,
        this.zoomText,
        rootButton,
        zoomIn,
        zoomOut,
        this.detailsPortrait,
        this.detailsTitle,
        this.detailsDescription,
        this.detailsStatusLabel,
        this.detailsStatus,
        ...this.detailRows.flatMap((row) => [row.label, row.value]),
      ])
      .setVisible(false);
    options.parent.add(this.root);
    this.createNodes();
    viewportZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.beginDrag(pointer));
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.moveDrag(pointer));
    scene.input.on('pointerup', () => {
      this.drag = null;
    });
    rootButton.on('pointerdown', () => this.centerOnRoot(true));
    zoomIn.on('pointerdown', () => this.setZoom(this.zoom + 0.15));
    zoomOut.on('pointerdown', () => this.setZoom(this.zoom - 0.15));
    this.drawChrome();
  }

  show(): void {
    this.setVisible(true);
  }
  hide(): void {
    this.setVisible(false);
  }
  setVisible(visible: boolean): void {
    this.visible = visible;
    this.root.setVisible(visible);
    if (visible) {
      this.refresh();
      if (!this.selectedId) this.centerOnRoot(false);
    }
  }
  isVisible(): boolean {
    return this.visible;
  }

  handleWheel(pointer: Phaser.Input.Pointer, deltaY: number): boolean {
    if (!this.visible || !this.containsPointer(pointer)) return false;
    const localX = pointer.x - this.root.parentContainer!.x - this.viewport.x;
    const localY = pointer.y - this.root.parentContainer!.y - this.viewport.y;
    this.setZoom(this.zoom + (deltaY < 0 ? 0.12 : -0.12), { x: localX, y: localY });
    return true;
  }

  refresh(): void {
    const complete = this.manager
      .getDefinitions()
      .filter((definition) => this.manager.isCompleted(definition.id)).length;
    const total = this.manager.getDefinitions().length;
    this.summary.setText(`${complete}/${total} COMPLETE`);
    this.zoomText.setText(`${Math.round(this.zoom * 100)}%  WHEEL TO ZOOM`);
    for (const view of this.nodes.values()) {
      const status = this.manager.getAchievementStatus(view.definition.id);
      const color =
        status === 'completed' ? 0x5dd6a2 : status === 'available' ? 0xffd166 : 0x647280;
      view.frame
        .setStrokeStyle(status === 'completed' ? 3 : 2, color)
        .setFillStyle(status === 'locked' ? 0x111923 : 0x1d2d38, 1);
      view.portrait.setAlpha(status === 'locked' ? 0.38 : 1).clearTint();
      if (status === 'locked') view.portrait.setTint(0x8d99a3);
      view.glow.setFillStyle(
        color,
        status === 'completed' ? 0.18 : status === 'available' ? 0.12 : 0.02,
      );
      const progress = this.manager.getProgress(view.definition.id);
      view.progress.setText(
        progress && status !== 'completed' ? `${progress.current}/${progress.target}` : '',
      );
      view.check.setVisible(status === 'completed');
    }
    this.drawConnections();
    if (this.selectedId) this.showDetails(this.selectedId);
  }

  showUnlock(unlock: AchievementUnlockResult): void {
    this.unlockQueue.push(unlock);
    this.showNextUnlock();
  }

  private showNextUnlock(): void {
    if (this.unlockToastActive) return;
    const unlock = this.unlockQueue.shift();
    if (!unlock) return;
    this.unlockToastActive = true;
    const texture = ensureAchievementPortrait(
      this.scene,
      this.manager.getDefinitions().find((definition) => definition.id === unlock.id) ??
        this.manager.getDefinitions()[0],
    );
    const width = Math.min(430, this.scene.scale.width - 30);
    const container = this.scene.add.container(this.scene.scale.width / 2, 22).setDepth(100);
    const bg = this.scene.add
      .rectangle(0, 0, width, 78, 0x10251c, 0.98)
      .setOrigin(0.5, 0)
      .setStrokeStyle(3, 0x5dd6a2);
    const portrait = this.scene.add.image(-width / 2 + 44, 39, texture).setDisplaySize(52, 52);
    const text = this.scene.add.text(
      -width / 2 + 82,
      9,
      `ACHIEVEMENT GET!  +${unlock.scoreReward} SCORE\n${unlock.name}\n${unlock.description}`,
      {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffffff',
        lineSpacing: 2,
        wordWrap: { width: width - 96 },
      },
    );
    container.add([bg, portrait, text]).setAlpha(0).setY(-80);
    this.scene.tweens.add({
      targets: container,
      alpha: 1,
      y: 22,
      duration: 220,
      hold: 2600,
      yoyo: true,
      onComplete: () => {
        container.destroy();
        this.unlockToastActive = false;
        this.showNextUnlock();
      },
    });
  }

  private createNodes(): void {
    for (const definition of this.manager.getDefinitions()) {
      const glow = this.scene.add.rectangle(0, 0, 70, 70, 0xffffff, 0.05);
      const frame = this.scene.add
        .rectangle(0, 0, 58, 58, 0x17212b, 1)
        .setStrokeStyle(2, 0x647280)
        .setInteractive({ useHandCursor: true });
      const portrait = this.scene.add
        .image(0, -3, ensureAchievementPortrait(this.scene, definition))
        .setDisplaySize(42, 42);
      const progress = this.scene.add
        .text(0, 23, '', {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#ffffff',
          backgroundColor: '#071019',
          padding: { x: 2, y: 1 },
        })
        .setOrigin(0.5);
      const check = this.scene.add
        .text(21, -22, 'v', {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#b6ffcf',
          backgroundColor: '#174733',
          padding: { x: 2, y: 1 },
        })
        .setOrigin(0.5)
        .setVisible(false);
      const container = this.scene.add.container(definition.tree.x, definition.tree.y, [
        glow,
        frame,
        portrait,
        progress,
        check,
      ]);
      frame.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.beginDrag(pointer));
      portrait
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', (pointer: Phaser.Input.Pointer) => this.beginDrag(pointer))
        .on('pointerup', () => {
          if (!this.drag?.moved) this.showDetails(definition.id);
        });
      frame.on('pointerup', () => {
        if (!this.drag?.moved) this.showDetails(definition.id);
      });
      frame.on('pointerover', () =>
        this.scene.tweens.add({ targets: [container], scaleX: 1.08, scaleY: 1.08, duration: 90 }),
      );
      frame.on('pointerout', () =>
        this.scene.tweens.add({ targets: [container], scaleX: 1, scaleY: 1, duration: 110 }),
      );
      this.tree.add(container);
      this.nodes.set(definition.id, {
        definition,
        container,
        glow,
        frame,
        portrait,
        progress,
        check,
      });
    }
  }

  private showDetails(id: string): void {
    this.selectedId = id;
    const definition = this.manager.getDefinitions().find((candidate) => candidate.id === id);
    if (!definition) return;
    const status = this.manager.getAchievementStatus(id);
    const progress = this.manager.getProgress(id);
    const missing = (definition.prerequisites ?? [])
      .filter((parent) => !this.manager.isCompleted(parent))
      .map(
        (parent) =>
          this.manager.getDefinitions().find((candidate) => candidate.id === parent)?.name ??
          parent,
      );
    const color =
      status === 'completed' ? '#5dd6a2' : status === 'available' ? '#ffd166' : '#8b99a6';
    this.detailsPortrait
      .setTexture(ensureAchievementPortrait(this.scene, definition))
      .setDisplaySize(this.detailLayout.portrait.size, this.detailLayout.portrait.size)
      .setVisible(true)
      .clearTint();
    if (status === 'locked') this.detailsPortrait.setTint(0x8d99a3);
    this.detailsTitle.setText(definition.name).setColor('#ffffff');
    this.detailsDescription.setText(
      definition.secret && status !== 'completed' ? '???' : definition.description,
    );
    this.detailsStatus.setText(status.toUpperCase()).setColor(color);
    const progressText = progress
      ? `${progress.current} / ${progress.target} ${definition.progress?.label ?? ''}`
      : status === 'completed'
        ? 'COMPLETE'
        : missing.length
          ? `REQUIRES ${missing.join(', ')}`
          : 'READY';
    const values = [
      definition.tree.section.toUpperCase(),
      definition.category.toUpperCase(),
      progressText,
      `+${getAchievementReward(definition)} SCORE`,
    ];
    this.detailRows.forEach((row, index) => row.value.setText(values[index] ?? '--'));
    const view = this.nodes.get(id);
    if (view)
      this.scene.tweens.add({
        targets: view.glow,
        alpha: { from: 1, to: 0.35 },
        duration: 280,
        yoyo: true,
      });
  }

  private drawChrome(): void {
    this.chrome.clear();
    this.chrome
      .fillStyle(0x08131d, 0.94)
      .fillRoundedRect(
        this.viewport.x,
        this.viewport.y,
        this.viewport.width,
        this.viewport.height,
        7,
      );
    this.chrome
      .lineStyle(2, 0x31566d, 0.95)
      .strokeRoundedRect(
        this.viewport.x + 1,
        this.viewport.y + 1,
        this.viewport.width - 2,
        this.viewport.height - 2,
        7,
      );
    this.chrome
      .fillStyle(0x0b1622, 0.96)
      .fillRoundedRect(this.detail.x, this.detail.y, this.detail.width, this.detail.height, 7);
    this.chrome
      .lineStyle(2, 0x31566d, 0.95)
      .strokeRoundedRect(
        this.detail.x + 1,
        this.detail.y + 1,
        this.detail.width - 2,
        this.detail.height - 2,
        7,
      );
    const cards = [
      { rect: this.detailLayout.status, fill: 0x122534, border: 0x426982 },
      { rect: this.detailLayout.section, fill: 0x101f2c, border: 0x294b61 },
      { rect: this.detailLayout.category, fill: 0x101f2c, border: 0x294b61 },
      { rect: this.detailLayout.progress, fill: 0x1e1d16, border: 0x76652e },
      { rect: this.detailLayout.reward, fill: 0x13251d, border: 0x357255 },
    ];
    for (const { rect, fill, border } of cards) {
      this.chrome
        .fillStyle(fill, 0.96)
        .fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 5)
        .lineStyle(1, border, 0.95)
        .strokeRoundedRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1, 5);
      this.chrome
        .fillStyle(border, 0.72)
        .fillRect(rect.x + 1, rect.y + 7, 3, Math.max(10, rect.height - 14));
    }
    for (let x = this.viewport.x + 16; x < this.viewport.x + this.viewport.width; x += 32) {
      this.chrome
        .lineStyle(1, 0x1b3342, 0.28)
        .lineBetween(x, this.viewport.y + 1, x, this.viewport.y + this.viewport.height - 1);
    }
    for (let y = this.viewport.y + 16; y < this.viewport.y + this.viewport.height; y += 32) {
      this.chrome
        .lineStyle(1, 0x1b3342, 0.28)
        .lineBetween(this.viewport.x + 1, y, this.viewport.x + this.viewport.width - 1, y);
    }
  }

  private drawConnections(): void {
    this.lines.clear();
    for (const view of this.nodes.values()) {
      for (const parentId of view.definition.prerequisites ?? []) {
        const parent = this.nodes.get(parentId);
        if (!parent) continue;
        const status = this.manager.getAchievementStatus(view.definition.id);
        const color =
          status === 'completed' ? 0x5dd6a2 : status === 'available' ? 0xffd166 : 0x46535e;
        const x1 = parent.definition.tree.x;
        const y1 = parent.definition.tree.y;
        const x2 = view.definition.tree.x;
        const y2 = view.definition.tree.y;
        const midX = x1 + (x2 - x1) * 0.5;
        this.lines
          .lineStyle(status === 'locked' ? 2 : 4, color, status === 'locked' ? 0.45 : 0.88)
          .beginPath()
          .moveTo(x1, y1)
          .lineTo(midX, y1)
          .lineTo(midX, y2)
          .lineTo(x2, y2)
          .strokePath();
        if (status !== 'locked') this.lines.fillStyle(color, 0.9).fillCircle(midX, y2, 3);
      }
    }
  }

  private beginDrag(pointer: Phaser.Input.Pointer): void {
    if (!this.visible) return;
    this.drag = {
      startX: pointer.x,
      startY: pointer.y,
      panX: this.pan.x,
      panY: this.pan.y,
      moved: false,
    };
  }

  private moveDrag(pointer: Phaser.Input.Pointer): void {
    if (!this.visible || !this.drag || !pointer.isDown) return;
    this.drag.moved ||= exceededDragThreshold(
      { x: this.drag.startX, y: this.drag.startY },
      { x: pointer.x, y: pointer.y },
    );
    if (!this.drag.moved) return;
    this.setPan({
      x: this.drag.panX + pointer.x - this.drag.startX,
      y: this.drag.panY + pointer.y - this.drag.startY,
    });
  }

  private centerOnRoot(animate: boolean): void {
    const root = this.manager
      .getDefinitions()
      .find((definition) => definition.id === 'core.firstApple')?.tree ?? { x: 0, y: 0 };
    const target = {
      x: this.viewport.width / 2 - root.x * this.zoom,
      y: this.viewport.height / 2 - root.y * this.zoom,
    };
    if (animate) {
      this.scene.tweens.add({
        targets: this.pan,
        x: target.x,
        y: target.y,
        duration: 260,
        ease: 'Cubic.easeOut',
        onUpdate: () => this.applyTransform(),
      });
    } else this.setPan(target);
  }

  private setZoom(
    rawZoom: number,
    anchor = { x: this.viewport.width / 2, y: this.viewport.height / 2 },
  ): void {
    const nextZoom = Phaser.Math.Clamp(rawZoom, 0.3, 1.65);
    if (Math.abs(nextZoom - this.zoom) < 0.001) return;
    const worldX = (anchor.x - this.pan.x) / this.zoom;
    const worldY = (anchor.y - this.pan.y) / this.zoom;
    this.zoom = nextZoom;
    this.setPan({ x: anchor.x - worldX * nextZoom, y: anchor.y - worldY * nextZoom });
    this.zoomText.setText(`${Math.round(this.zoom * 100)}%  WHEEL TO ZOOM`);
  }

  private setPan(pan: { x: number; y: number }): void {
    const xs = this.manager.getDefinitions().map((definition) => definition.tree.x * this.zoom);
    const ys = this.manager.getDefinitions().map((definition) => definition.tree.y * this.zoom);
    const padding = 90;
    const minX = this.viewport.width - padding - Math.max(...xs);
    const maxX = padding - Math.min(...xs);
    const minY = this.viewport.height - padding - Math.max(...ys);
    const maxY = padding - Math.min(...ys);
    this.pan = {
      x: Phaser.Math.Clamp(pan.x, Math.min(minX, maxX), Math.max(minX, maxX)),
      y: Phaser.Math.Clamp(pan.y, Math.min(minY, maxY), Math.max(minY, maxY)),
    };
    this.applyTransform();
  }

  private applyTransform(): void {
    this.tree
      .setPosition(this.viewport.x + this.pan.x, this.viewport.y + this.pan.y)
      .setScale(this.zoom);
  }

  private containsPointer(pointer: Phaser.Input.Pointer): boolean {
    const parent = this.root.parentContainer;
    if (!parent) return false;
    const x = pointer.x - parent.x;
    const y = pointer.y - parent.y;
    return (
      x >= this.viewport.x &&
      x <= this.viewport.x + this.viewport.width &&
      y >= this.viewport.y &&
      y <= this.viewport.y + this.viewport.height
    );
  }
}
