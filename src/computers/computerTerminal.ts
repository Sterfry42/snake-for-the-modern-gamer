import type { ComputerRuntime } from './computerRuntime.js';

interface TerminalOptions {
  runtime: ComputerRuntime;
  /** Persist through the owning game/save system. */
  onChange(): void;
  onClose(): void;
}

/** Browser panel. The caller must own modal input routing and authorization. */
export function openComputerTerminal(options: TerminalOptions): () => void {
  const { runtime } = options;
  const dialog = document.createElement('dialog');
  dialog.className = 'snekos-terminal';
  dialog.setAttribute('aria-label', `${runtime.hostname} terminal`);
  Object.assign(dialog.style, {
    width: 'min(760px, 90vw)',
    height: 'min(560px, 80vh)',
    padding: '16px',
    background: '#101713',
    border: '2px solid #66776c',
    borderRadius: '8px',
    font: '15px/1.5 monospace',
    boxSizing: 'border-box',
    overflow: 'hidden',
  });
  const layout = document.createElement('div');
  Object.assign(layout.style, {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    gap: '10px',
  });
  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  });
  const title = document.createElement('strong');
  title.textContent = `SnekOS 0.1 — ${runtime.hostname}`;
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Disconnect ×';
  header.append(title, close);
  const output = document.createElement('pre');
  output.setAttribute('role', 'log');
  output.setAttribute('aria-live', 'polite');
  Object.assign(output.style, {
    flex: '1',
    minHeight: '0',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    margin: '0',
  });
  const form = document.createElement('form');
  Object.assign(form.style, { display: 'flex', alignItems: 'center', gap: '6px' });
  const prompt = document.createElement('span');
  prompt.style.overflowWrap = 'anywhere';
  const input = document.createElement('input');
  input.setAttribute('aria-label', 'Shell command');
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.maxLength = 4096;
  Object.assign(input.style, {
    flex: '1',
    minWidth: '0',
    background: '#15201a',
    border: '1px solid #66776c',
    color: 'inherit',
    font: 'inherit',
    padding: '6px',
  });
  form.append(prompt, input);
  layout.append(header, output, form);
  dialog.append(layout);
  let history: string[] = [];
  let historyIndex = 0;
  let draft = '';
  let closed = false;

  const append = (text: string): void => {
    output.textContent = `${output.textContent ?? ''}${text}\n`.slice(-65_536);
    output.scrollTop = output.scrollHeight;
  };
  const refresh = (): void => {
    const colors = { green: '#a7f3b6', amber: '#ffc66b', white: '#e7eae8' };
    dialog.style.color = colors[runtime.getTheme()];
    prompt.textContent = runtime.prompt();
  };
  const finish = (): void => {
    if (closed) return;
    closed = true;
    dialog.remove();
    options.onClose();
  };
  const disconnect = (): void => {
    if (dialog.open) dialog.close();
    finish();
  };
  const editFile = (path: string, content: string): void => {
    form.hidden = true;
    form.style.display = 'none';
    output.hidden = true;
    const editor = document.createElement('div');
    Object.assign(editor.style, {
      display: 'flex',
      flexDirection: 'column',
      flex: '1',
      minHeight: '0',
      gap: '8px',
    });
    const label = document.createElement('label');
    label.textContent = `Editing ${path}`;
    const area = document.createElement('textarea');
    area.setAttribute('aria-label', `Contents of ${path}`);
    area.value = content;
    area.maxLength = 16384;
    area.spellcheck = false;
    Object.assign(area.style, {
      flex: '1',
      resize: 'none',
      color: 'inherit',
      background: '#15201a',
      font: 'inherit',
    });
    const actions = document.createElement('div');
    const save = document.createElement('button');
    save.textContent = 'Save';
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    const error = document.createElement('span');
    error.setAttribute('role', 'alert');
    actions.append(save, cancel, error);
    editor.append(label, area, actions);
    layout.append(editor);
    const returnToShell = (): void => {
      editor.remove();
      output.hidden = false;
      form.hidden = false;
      form.style.display = 'flex';
      input.focus();
    };
    cancel.addEventListener('click', returnToShell);
    save.addEventListener('click', () => {
      try {
        runtime.saveEdit(path, area.value);
        options.onChange();
        append(`Saved ${path}`);
        returnToShell();
      } catch (failure) {
        error.textContent = failure instanceof Error ? failure.message : 'Save failed';
      }
    });
    area.focus();
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const line = input.value;
    if (!line.trim()) return;
    append(`${runtime.prompt()}${line}`);
    history = [...history, line].slice(-100);
    historyIndex = history.length;
    draft = '';
    input.value = '';
    const result = runtime.execute(line);
    if (result.clear) output.textContent = '';
    if (result.output) append(result.output);
    refresh();
    options.onChange();
    if (result.edit) editFile(result.edit.path, result.edit.content);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIndex === history.length) draft = input.value;
      const delta = event.key === 'ArrowUp' ? -1 : 1;
      historyIndex = Math.max(0, Math.min(history.length, historyIndex + delta));
      const previous = history[historyIndex] ?? '';
      input.value = historyIndex === history.length ? draft : previous;
    } else if (event.ctrlKey && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      output.textContent = '';
    }
  });
  // Keep normal terminal key events from bubbling to document-level game listeners.
  // Capture-phase or Phaser handlers still need to be suspended by the caller.
  for (const type of ['keydown', 'keyup', 'keypress']) {
    dialog.addEventListener(type, (event) => event.stopPropagation());
  }
  close.addEventListener('click', disconnect);
  dialog.addEventListener('close', finish);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    disconnect();
  });
  document.body.append(dialog);
  try {
    dialog.showModal();
  } catch (error) {
    dialog.remove();
    throw error;
  }
  append('SnekOS 0.1 — Type help to begin.');
  for (const error of runtime.dispatch('terminal_open')) append(error);
  refresh();
  input.focus();
  return disconnect;
}
