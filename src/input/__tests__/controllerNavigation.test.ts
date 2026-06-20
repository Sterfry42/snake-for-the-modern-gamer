import { describe, expect, it } from 'vitest';
import { ControllerNavigationManager } from '../controllerNavigation.js';

describe('ControllerNavigationManager', () => {
  it('moves through enabled items and skips disabled items', () => {
    const focused: string[] = [];
    const nav = new ControllerNavigationManager();
    nav.setContext({
      id: 'menu',
      selectedIndex: 0,
      items: [
        { id: 'one', label: 'One', onConfirm: () => {}, onFocus: () => focused.push('one') },
        { id: 'two', label: 'Two', disabled: true, onConfirm: () => {} },
        { id: 'three', label: 'Three', onConfirm: () => {}, onFocus: () => focused.push('three') },
      ],
    });

    expect(nav.handle('down')).toBe(true);
    expect(nav.getSelectedItem()?.id).toBe('three');
    expect(focused).toEqual(['one', 'three']);
  });

  it('confirms the selected item and cancels with the context handler', () => {
    const events: string[] = [];
    const nav = new ControllerNavigationManager();
    nav.setContext({
      id: 'choices',
      selectedIndex: 0,
      items: [{ id: 'yes', label: 'Yes', onConfirm: () => events.push('confirm') }],
      onCancel: () => events.push('cancel'),
    });

    expect(nav.handle('confirm')).toBe(true);
    expect(nav.handle('cancel')).toBe(true);
    expect(events).toEqual(['confirm', 'cancel']);
  });

  it('routes shoulder and trigger tab commands to context handlers', () => {
    const events: string[] = [];
    const nav = new ControllerNavigationManager();
    nav.setContext({
      id: 'tabs',
      selectedIndex: 0,
      items: [],
      onPrimaryTabPrevious: () => {
        events.push('lb');
        return true;
      },
      onPrimaryTabNext: () => {
        events.push('rb');
        return true;
      },
      onSubTabPrevious: () => {
        events.push('lt');
        return true;
      },
      onSubTabNext: () => {
        events.push('rt');
        return true;
      },
    });

    nav.handle('primaryTabPrevious');
    nav.handle('primaryTabNext');
    nav.handle('subTabPrevious');
    nav.handle('subTabNext');

    expect(events).toEqual(['lb', 'rb', 'lt', 'rt']);
  });
});
