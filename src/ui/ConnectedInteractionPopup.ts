import type Phaser from 'phaser';
import { ChoicePopup, type ChoiceOption } from './choicePopup.js';
import type { ClientCommand, CommandResult } from '../session/ClientCommand.js';
import type { ConnectedInteractionView } from '../session/ConnectedInteraction.js';

/** Reuses the normal choice UI; every actionable option comes from a snapshot. */
export class ConnectedInteractionPopup {
  private readonly popup: ChoicePopup;
  private latest: ConnectedInteractionView | null = null;
  private signature = '';
  private pending = false;
  private disposed = false;
  private error = '';

  constructor(
    scene: Phaser.Scene,
    private readonly playerId: () => string,
    private readonly send: (command: ClientCommand) => Promise<CommandResult>,
  ) {
    this.popup = new ChoicePopup(scene);
  }

  render(view: ConnectedInteractionView | null): void {
    if (this.disposed) return;
    this.latest = view;
    if (!view) {
      this.signature = '';
      this.error = '';
      if (this.popup.isVisible()) this.popup.hide();
      return;
    }
    const signature = JSON.stringify([view, this.pending, this.error]);
    if (signature === this.signature && this.popup.isVisible()) return;
    this.signature = signature;
    const options: ChoiceOption[] = [];
    if (view.description || this.error || this.pending)
      options.push({
        id: '_description',
        title: this.pending
          ? 'Working...'
          : this.error
            ? 'Could not complete action'
            : 'Conversation',
        description: [this.error, view.description].filter(Boolean).join('\n\n'),
        disabled: true,
      });
    options.push(
      ...view.options.map((option) => ({
        id: option.id,
        title: option.label,
        description: option.description,
        disabled: this.pending || !option.enabled,
      })),
    );
    this.popup.show(view.title, options, (optionId) => {
      if (this.pending || this.disposed) return;
      void this.submit(view.id, optionId);
    });
    this.popup.setDepth(150);
  }

  handleKey(event: KeyboardEvent): boolean {
    if (!this.latest && !this.pending) return false;
    event.preventDefault();
    if (!this.pending && !event.repeat) this.popup.handleKeyboardEvent(event);
    return true;
  }

  destroy(): void {
    this.disposed = true;
    this.latest = null;
    this.popup.destroy();
  }

  private async submit(menuId: number, optionId: string): Promise<void> {
    this.pending = true;
    this.error = '';
    this.render(this.latest);
    try {
      const result = await this.send({
        type: 'selectInteraction',
        playerId: this.playerId(),
        menuId,
        optionId,
      });
      if (!result.ok) this.error = result.reason ?? 'That action is not available.';
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    } finally {
      this.pending = false;
      this.render(this.latest);
    }
  }
}
