import type { UiRect } from './UiLayout.js';

export type UiFocusDirection = 'up' | 'down' | 'left' | 'right';

export interface UiFocusEntry {
  id: string;
  rect: UiRect;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onConfirm?: () => void;
}

export interface UiFocusSnapshot {
  activeId: string | null;
  entries: readonly UiFocusEntry[];
}

function rectCenter(rect: UiRect): { x: number; y: number } {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function isCandidateInDirection(from: UiRect, to: UiRect, direction: UiFocusDirection): boolean {
  const a = rectCenter(from);
  const b = rectCenter(to);
  switch (direction) {
    case 'up':
      return b.y < a.y - 1;
    case 'down':
      return b.y > a.y + 1;
    case 'left':
      return b.x < a.x - 1;
    case 'right':
      return b.x > a.x + 1;
  }
}

function directionalDistance(from: UiRect, to: UiRect, direction: UiFocusDirection): number {
  const a = rectCenter(from);
  const b = rectCenter(to);
  const primary =
    direction === 'up' || direction === 'down' ? Math.abs(b.y - a.y) : Math.abs(b.x - a.x);
  const secondary =
    direction === 'up' || direction === 'down' ? Math.abs(b.x - a.x) : Math.abs(b.y - a.y);
  return primary * 1000 + secondary;
}

export class UiFocusManager {
  private readonly entries = new Map<string, UiFocusEntry>();
  private activeId: string | null = null;

  register(entry: UiFocusEntry): void {
    this.entries.set(entry.id, entry);
    if (!this.activeId && !entry.disabled) {
      this.setActive(entry.id);
    }
  }

  unregister(id: string): void {
    const wasActive = this.activeId === id;
    this.entries.delete(id);
    if (wasActive) {
      this.activeId = null;
      this.focusFirst();
    }
  }

  clear(): void {
    for (const entry of this.entries.values()) {
      if (entry.id === this.activeId) {
        entry.onBlur?.();
      }
    }
    this.entries.clear();
    this.activeId = null;
  }

  snapshot(): UiFocusSnapshot {
    return {
      activeId: this.activeId,
      entries: [...this.entries.values()],
    };
  }

  getActive(): UiFocusEntry | null {
    return this.activeId ? (this.entries.get(this.activeId) ?? null) : null;
  }

  setActive(id: string): boolean {
    const next = this.entries.get(id);
    if (!next || next.disabled || next.id === this.activeId) {
      return false;
    }
    this.getActive()?.onBlur?.();
    this.activeId = next.id;
    next.onFocus?.();
    return true;
  }

  focusFirst(): boolean {
    const first = [...this.entries.values()].find((entry) => !entry.disabled);
    return first ? this.setActive(first.id) : false;
  }

  focusAt(x: number, y: number): boolean {
    const hit = [...this.entries.values()].find(
      (entry) =>
        !entry.disabled &&
        x >= entry.rect.x &&
        x <= entry.rect.x + entry.rect.width &&
        y >= entry.rect.y &&
        y <= entry.rect.y + entry.rect.height,
    );
    return hit ? this.setActive(hit.id) : false;
  }

  move(direction: UiFocusDirection): boolean {
    const active = this.getActive();
    if (!active) {
      return this.focusFirst();
    }
    const candidates = [...this.entries.values()]
      .filter((entry) => !entry.disabled && entry.id !== active.id)
      .filter((entry) => isCandidateInDirection(active.rect, entry.rect, direction))
      .sort(
        (a, b) =>
          directionalDistance(active.rect, a.rect, direction) -
          directionalDistance(active.rect, b.rect, direction),
      );
    return candidates[0] ? this.setActive(candidates[0].id) : false;
  }

  confirm(): boolean {
    const active = this.getActive();
    if (!active || active.disabled || !active.onConfirm) {
      return false;
    }
    active.onConfirm();
    return true;
  }
}
