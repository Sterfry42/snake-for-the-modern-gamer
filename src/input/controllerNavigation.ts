export type ControllerNavCommand =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'confirm'
  | 'cancel'
  | 'primary'
  | 'menu'
  | 'map'
  | 'primaryTabPrevious'
  | 'primaryTabNext'
  | 'subTabPrevious'
  | 'subTabNext';

export interface ControllerFocusableItem {
  id: string;
  label: string;
  disabled?: boolean;
  rect?: { x: number; y: number; width: number; height: number };
  onConfirm: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export interface ControllerNavContext {
  id: string;
  items: ControllerFocusableItem[];
  selectedIndex: number;
  orientation?: 'vertical' | 'horizontal' | 'grid';
  columns?: number;
  onCancel?: () => void;
  onMoveLeft?: () => boolean;
  onMoveRight?: () => boolean;
  onMoveUp?: () => boolean;
  onMoveDown?: () => boolean;
  onPrimaryTabPrevious?: () => boolean;
  onPrimaryTabNext?: () => boolean;
  onSubTabPrevious?: () => boolean;
  onSubTabNext?: () => boolean;
}

export class ControllerNavigationManager {
  private context: ControllerNavContext | null = null;

  setContext(context: ControllerNavContext | null): void {
    this.context?.items[this.context.selectedIndex]?.onBlur?.();
    this.context = context ? { ...context, selectedIndex: this.coerceIndex(context) } : null;
    this.context?.items[this.context.selectedIndex]?.onFocus?.();
  }

  getContext(): ControllerNavContext | null {
    return this.context;
  }

  getSelectedItem(): ControllerFocusableItem | null {
    if (!this.context) {
      return null;
    }
    return this.context.items[this.context.selectedIndex] ?? null;
  }

  handle(command: ControllerNavCommand): boolean {
    const context = this.context;
    if (!context) {
      return false;
    }

    switch (command) {
      case 'confirm':
        return this.confirm(context);
      case 'cancel':
        context.onCancel?.();
        return Boolean(context.onCancel);
      case 'primary':
      case 'menu':
      case 'map':
        return false;
      case 'primaryTabPrevious':
        return context.onPrimaryTabPrevious?.() ?? false;
      case 'primaryTabNext':
        return context.onPrimaryTabNext?.() ?? false;
      case 'subTabPrevious':
        return context.onSubTabPrevious?.() ?? false;
      case 'subTabNext':
        return context.onSubTabNext?.() ?? false;
      case 'up':
        return context.onMoveUp?.() || this.move(-this.stepForVertical(context));
      case 'down':
        return context.onMoveDown?.() || this.move(this.stepForVertical(context));
      case 'left':
        return context.onMoveLeft?.() || this.move(-this.stepForHorizontal(context));
      case 'right':
        return context.onMoveRight?.() || this.move(this.stepForHorizontal(context));
    }
  }

  move(delta: number): boolean {
    if (!this.context || this.context.items.length === 0) {
      return false;
    }
    const next = this.findNextEnabledIndex(this.context, delta);
    if (next === this.context.selectedIndex) {
      return false;
    }
    this.context.items[this.context.selectedIndex]?.onBlur?.();
    this.context.selectedIndex = next;
    this.context.items[this.context.selectedIndex]?.onFocus?.();
    return true;
  }

  private confirm(context: ControllerNavContext): boolean {
    const item = context.items[context.selectedIndex];
    if (!item || item.disabled) {
      return false;
    }
    item.onConfirm();
    return true;
  }

  private coerceIndex(context: ControllerNavContext): number {
    if (context.items.length === 0) {
      return 0;
    }
    const initial = Math.min(Math.max(0, context.selectedIndex), context.items.length - 1);
    if (!context.items[initial]?.disabled) {
      return initial;
    }
    return this.findNextEnabledIndex({ ...context, selectedIndex: initial }, 1);
  }

  private findNextEnabledIndex(context: ControllerNavContext, delta: number): number {
    if (context.items.length === 0) {
      return 0;
    }
    const direction = delta >= 0 ? 1 : -1;
    const step = Math.max(1, Math.abs(delta));
    let index = context.selectedIndex;
    for (let attempts = 0; attempts < context.items.length; attempts += 1) {
      index = (index + direction * step + context.items.length) % context.items.length;
      if (!context.items[index]?.disabled) {
        return index;
      }
    }
    return context.selectedIndex;
  }

  private stepForVertical(context: ControllerNavContext): number {
    return context.orientation === 'grid' ? Math.max(1, context.columns ?? 1) : 1;
  }

  private stepForHorizontal(context: ControllerNavContext): number {
    return context.orientation === 'vertical' ? 1 : 1;
  }
}
