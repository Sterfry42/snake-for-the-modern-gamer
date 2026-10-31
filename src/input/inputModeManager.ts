import type { InputModeId } from './controlActions.js';

type InputModeListener = (mode: InputModeId) => void;

export class InputModeManager {
  private activeMode: InputModeId;
  private readonly listeners = new Set<InputModeListener>();

  constructor(initialMode: InputModeId = 'keyboardMouse') {
    this.activeMode = initialMode;
  }

  getMode(): InputModeId {
    return this.activeMode;
  }

  setMode(mode: InputModeId): boolean {
    if (this.activeMode === mode) {
      return false;
    }
    this.activeMode = mode;
    for (const listener of this.listeners) {
      listener(mode);
    }
    return true;
  }

  markKeyboardInput(): boolean {
    return this.setMode('keyboardMouse');
  }

  markMouseInput(): boolean {
    return this.setMode('keyboardMouse');
  }

  markTouchInput(): boolean {
    return this.setMode('mobile');
  }

  markControllerInput(): boolean {
    return this.setMode('controller');
  }

  onChange(listener: InputModeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
