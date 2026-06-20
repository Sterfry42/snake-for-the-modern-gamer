import { describe, expect, it } from 'vitest';
import { InputModeManager } from '../inputModeManager.js';

describe('InputModeManager', () => {
  it('switches to controller only after controller input is marked', () => {
    const modes: string[] = [];
    const manager = new InputModeManager();
    manager.onChange((mode) => modes.push(mode));

    expect(manager.getMode()).toBe('keyboardMouse');
    manager.markControllerInput();

    expect(manager.getMode()).toBe('controller');
    expect(modes).toEqual(['controller']);
  });

  it('switches back to keyboard and mouse modes from controller', () => {
    const manager = new InputModeManager('controller');

    manager.markKeyboardInput();
    expect(manager.getMode()).toBe('keyboardMouse');

    manager.markControllerInput();
    manager.markMouseInput();
    expect(manager.getMode()).toBe('keyboardMouse');
  });

  it('keeps mobile separate from controller', () => {
    const manager = new InputModeManager();

    manager.markTouchInput();
    expect(manager.getMode()).toBe('mobile');

    manager.markControllerInput();
    expect(manager.getMode()).toBe('controller');
  });
});
