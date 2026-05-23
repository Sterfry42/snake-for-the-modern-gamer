export interface MenuDetails {
  title: string;
  body: string[];
  footer?: string;
}

export interface MenuAction {
  id: string;
  label: string;
  disabled?: boolean;
  reason?: string;
  run(): void;
}

export interface MenuListItem {
  id: string;
  label: string;
  subtitle?: string;
  disabled?: boolean;
  disabledReason?: string;
  count?: number;
  category?: string;
  renderDetails(): MenuDetails;
  actions?: MenuAction[];
}

export interface MenuTab {
  id: string;
  label: string;
  getItems(): MenuListItem[];
}

interface TabState {
  scrollIndex: number;
  selectedIndex: number;
}

export class ScrollableTabbedMenu {
  private openState = false;
  private activeTabId: string;
  private readonly tabState = new Map<string, TabState>();

  constructor(private readonly tabs: readonly MenuTab[], private readonly visibleItems = 8) {
    if (tabs.length === 0) {
      throw new Error('ScrollableTabbedMenu requires at least one tab.');
    }
    this.activeTabId = tabs[0].id;
    for (const tab of tabs) {
      this.tabState.set(tab.id, { scrollIndex: 0, selectedIndex: 0 });
    }
  }

  open(tabId = this.activeTabId): void {
    this.openState = true;
    this.switchTab(tabId);
  }

  close(): void {
    this.openState = false;
  }

  isOpen(): boolean {
    return this.openState;
  }

  switchTab(tabId: string): void {
    if (!this.tabs.some((tab) => tab.id === tabId)) {
      return;
    }
    this.activeTabId = tabId;
    this.clampActiveState();
  }

  scroll(delta: number): void {
    const state = this.getActiveState();
    const items = this.getActiveItems();
    state.scrollIndex = this.clamp(
      state.scrollIndex + Math.trunc(delta),
      0,
      Math.max(0, items.length - this.visibleItems),
    );
  }

  select(delta: number): void {
    const state = this.getActiveState();
    const items = this.getActiveItems();
    state.selectedIndex = this.clamp(state.selectedIndex + Math.trunc(delta), 0, Math.max(0, items.length - 1));
    if (state.selectedIndex < state.scrollIndex) {
      state.scrollIndex = state.selectedIndex;
    }
    if (state.selectedIndex >= state.scrollIndex + this.visibleItems) {
      state.scrollIndex = state.selectedIndex - this.visibleItems + 1;
    }
  }

  refresh(): void {
    this.clampActiveState();
  }

  getSnapshot(): {
    open: boolean;
    tabs: readonly MenuTab[];
    activeTabId: string;
    visibleItems: MenuListItem[];
    selectedItem: MenuListItem | null;
    details: MenuDetails | null;
    scrollIndex: number;
    selectedIndex: number;
  } {
    const state = this.getActiveState();
    const items = this.getActiveItems();
    const selectedItem = items[state.selectedIndex] ?? null;
    return {
      open: this.openState,
      tabs: this.tabs,
      activeTabId: this.activeTabId,
      visibleItems: items.slice(state.scrollIndex, state.scrollIndex + this.visibleItems),
      selectedItem,
      details: selectedItem?.renderDetails() ?? null,
      scrollIndex: state.scrollIndex,
      selectedIndex: state.selectedIndex,
    };
  }

  runAction(actionId: string): boolean {
    const item = this.getSnapshot().selectedItem;
    const action = item?.actions?.find((candidate) => candidate.id === actionId);
    if (!action || action.disabled) {
      return false;
    }
    action.run();
    this.refresh();
    return true;
  }

  private getActiveItems(): MenuListItem[] {
    return this.tabs.find((tab) => tab.id === this.activeTabId)?.getItems() ?? [];
  }

  private getActiveState(): TabState {
    let state = this.tabState.get(this.activeTabId);
    if (!state) {
      state = { scrollIndex: 0, selectedIndex: 0 };
      this.tabState.set(this.activeTabId, state);
    }
    return state;
  }

  private clampActiveState(): void {
    const state = this.getActiveState();
    const items = this.getActiveItems();
    state.selectedIndex = this.clamp(state.selectedIndex, 0, Math.max(0, items.length - 1));
    state.scrollIndex = this.clamp(state.scrollIndex, 0, Math.max(0, items.length - this.visibleItems));
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
