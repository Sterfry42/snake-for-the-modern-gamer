import type { ControllerNavCommand } from '../input/controllerNavigation.js';
import {
  loadServerConnectionSettings,
  normalizeServerUrl,
  normalizeDisplayName,
  saveServerConnectionSettings,
  serverGameUrl,
} from '../session/connectionSettings.js';
import './serverConnectionMenu.css';

/** Native text fields preserve selection, paste, mobile keyboards, and accessible labels. */
export class ServerConnectionMenu {
  private readonly root = document.createElement('div');
  private readonly form = document.createElement('form');
  private readonly url = document.createElement('input');
  private readonly name = document.createElement('input');
  private readonly error = document.createElement('p');
  private readonly enter = document.createElement('button');
  private readonly back = document.createElement('button');
  private previousFocus: Element | null = null;

  constructor(onBack: () => void) {
    this.root.className = 'server-connection-menu';
    this.root.hidden = true;
    this.form.setAttribute('role', 'dialog');
    this.form.setAttribute('aria-modal', 'true');
    this.form.setAttribute('aria-labelledby', 'server-connection-title');
    const title = document.createElement('h2');
    title.id = 'server-connection-title';
    title.textContent = 'Connect to a Server';
    const description = document.createElement('p');
    description.textContent = 'Choose your name and enter the world.';
    this.url.type = 'text';
    this.url.name = 'serverUrl';
    this.url.placeholder = 'ws://localhost:8787/game';
    this.url.required = true;
    this.url.autocomplete = 'off';
    this.url.spellcheck = false;
    this.url.autocapitalize = 'off';
    this.name.name = 'displayName';
    this.name.required = true;
    this.name.maxLength = 48;
    this.name.autocomplete = 'username';
    this.name.placeholder = 'Your name';
    this.error.setAttribute('role', 'alert');
    this.error.className = 'server-connection-menu__error';
    this.enter.type = 'submit';
    this.enter.textContent = 'Enter World';
    this.back.type = 'button';
    this.back.textContent = 'Back';
    this.back.addEventListener('click', () => {
      this.hide();
      onBack();
    });
    const buttons = document.createElement('div');
    buttons.className = 'server-connection-menu__buttons';
    buttons.append(this.back, this.enter);
    this.form.append(
      title,
      description,
      this.field('Server URL', this.url),
      this.field('Display name', this.name),
      this.error,
      buttons,
    );
    this.root.append(this.form);
    document.body.append(this.root);
    this.form.addEventListener('input', () => {
      this.error.textContent = '';
    });
    this.root.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        this.back.click();
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        this.handleController(event.shiftKey ? 'up' : 'down');
      }
    });
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      try {
        const settings = {
          serverUrl: normalizeServerUrl(this.url.value, location.protocol === 'https:'),
          displayName: normalizeDisplayName(this.name.value),
        };
        saveServerConnectionSettings(settings);
        this.enter.disabled = true;
        this.enter.textContent = 'Connecting…';
        window.location.assign(serverGameUrl(location.href, settings));
      } catch (error) {
        this.enter.disabled = false;
        this.enter.textContent = 'Enter World';
        this.error.textContent = error instanceof Error ? error.message : String(error);
        this.url.focus();
      }
    });
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

  show(): void {
    const settings = loadServerConnectionSettings(location.href);
    this.url.value = settings.serverUrl;
    this.name.value = settings.displayName;
    this.error.textContent = '';
    this.enter.disabled = false;
    this.enter.textContent = 'Enter World';
    this.previousFocus = document.activeElement;
    this.root.hidden = false;
    this.url.focus();
    this.url.select();
  }

  hide(): void {
    this.root.hidden = true;
    if (this.previousFocus instanceof HTMLElement) this.previousFocus.focus();
  }

  handleController(command: ControllerNavCommand): boolean {
    if (command === 'cancel' || command === 'menu') {
      this.back.click();
      return true;
    }
    const controls = [this.url, this.name, this.back, this.enter];
    const index = controls.findIndex((control) => control === document.activeElement);
    if (['up', 'down', 'left', 'right'].includes(command)) {
      const direction = command === 'up' || command === 'left' ? -1 : 1;
      controls[(index + direction + controls.length) % controls.length].focus();
      return true;
    }
    if (command === 'confirm') {
      if (document.activeElement === this.back) this.back.click();
      else if (document.activeElement === this.enter) this.form.requestSubmit();
      else controls[Math.min(index + 1, controls.length - 1)].focus();
      return true;
    }
    return false;
  }

  destroy(): void {
    this.root.remove();
  }

  private field(label: string, input: HTMLInputElement): HTMLLabelElement {
    const element = document.createElement('label');
    const text = document.createElement('span');
    text.textContent = label;
    element.append(text, input);
    return element;
  }
}
