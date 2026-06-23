import { describe, expect, it } from 'vitest';
import {
  CONTROL_CATEGORIES,
  clearControlBindingOverridesForTest,
  formatBindingsForDisplay,
  getBindingsForMode,
  getControlActionsByCategory,
  getDefaultBindingsForMode,
  getVisibleControlActions,
  isKeyboardInputForAction,
  resetBindingsForMode,
  setExclusiveControllerBinding,
  setBindingsForMode,
} from '../controlActions.js';

describe('control action registry', () => {
  it('includes the core visible action ids', () => {
    const ids = getVisibleControlActions().map((action) => action.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        'move.up',
        'move.down',
        'move.left',
        'move.right',
        'interact.confirm',
        'back.cancel',
        'ability.primary',
        'aim.fire',
        'menu.pause',
        'map.toggle',
        'save.quick',
      ]),
    );
  });

  it('groups movement actions under Movement', () => {
    const movementIds = getControlActionsByCategory('movement').map((action) => action.id);

    expect(CONTROL_CATEGORIES.movement).toBe('Movement');
    expect(movementIds).toEqual(['move.up', 'move.down', 'move.left', 'move.right']);
  });

  it('keeps keyboard movement defaults on WASD and arrows', () => {
    expect(
      getDefaultBindingsForMode('move.up', 'keyboardMouse').map((binding) => binding.label),
    ).toEqual(['W', 'Arrow Up']);
    expect(
      getDefaultBindingsForMode('move.left', 'keyboardMouse').map((binding) => binding.label),
    ).toEqual(['A', 'Arrow Left']);
  });

  it('does not expose contextual duplicate action ids', () => {
    const ids = getVisibleControlActions().map((action) => action.id);

    expect(ids).not.toContain('fishing.reelLeft');
    expect(ids).not.toContain('arcade.moveLeft');
    expect(ids).not.toContain('manualRoom.moveLeft');
    expect(ids).not.toContain('inspect');
  });

  it('excludes hidden and advanced controls from the main visible list', () => {
    expect(getVisibleControlActions().every((action) => !action.hidden && !action.advanced)).toBe(
      true,
    );
  });

  it('formats multiple bindings for display', () => {
    expect(formatBindingsForDisplay(getDefaultBindingsForMode('move.right', 'keyboardMouse'))).toBe(
      'D / Arrow Right',
    );
    expect(formatBindingsForDisplay([])).toBe('No default');
  });

  it('uses custom bindings when present and can reset to defaults', () => {
    clearControlBindingOverridesForTest();
    setBindingsForMode('move.up', 'keyboardMouse', [{ label: 'I' }]);

    expect(getBindingsForMode('move.up', 'keyboardMouse')).toEqual([{ label: 'I' }]);
    expect(isKeyboardInputForAction('i', 'move.up')).toBe(true);
    expect(isKeyboardInputForAction('w', 'move.up')).toBe(false);

    resetBindingsForMode('move.up', 'keyboardMouse');
    expect(getBindingsForMode('move.up', 'keyboardMouse')).toEqual(
      getDefaultBindingsForMode('move.up', 'keyboardMouse'),
    );
    clearControlBindingOverridesForTest();
  });

  it('moves a captured controller button to one action exclusively', () => {
    clearControlBindingOverridesForTest();
    setExclusiveControllerBinding('save.quick', { label: 'Right Bumper' });

    expect(getBindingsForMode('save.quick', 'controller')).toEqual([{ label: 'Right Bumper' }]);
    expect(getBindingsForMode('ability.primary', 'controller')).toEqual([{ label: 'West Button' }]);
    clearControlBindingOverridesForTest();
  });
});
