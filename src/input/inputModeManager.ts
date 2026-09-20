export type ActiveInputMode = 'keyboardMouse' | 'controller' | 'mobile';

type InputModeListener = (mode: ActiveInputMode) => void;

export class InputModeManager {
  private activeMode: ActiveInputMode;
  private readonly listeners = new Set<InputModeListener>();

  constructor(initialMode: ActiveInputMode = 'keyboardMouse') {
    this.activeMode = initialMode;
  }

  getMode(): ActiveInputMode {
    return this.activeMode;
  }

  setMode(mode: ActiveInputMode): boolean {
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
