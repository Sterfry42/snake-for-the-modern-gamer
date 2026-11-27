import { resolvePath, VirtualFileSystem } from './virtualFileSystem.js';
import type { FileEntry } from './virtualFileSystem.js';

export type ComputerTemplate = 'home' | 'barkeep' | 'mayor';
export type ComputerEvent = 'terminal_open' | 'item.picked_up' | 'quest.completed' | 'room.changed';
export type TerminalTheme = 'green' | 'amber' | 'white';

export interface ComputerSaveData {
  files: FileEntry[];
  enabledMods: string[];
  theme: TerminalTheme;
}

export interface ComputerContext {
  /** Supplied by the game authority, not by player-entered commands. */
  readStatus(): string;
  readSystemConfig(): string;
  notify(message: string): void;
}

export interface ShellResult {
  output: string;
  clear?: boolean;
  edit?: { path: string; content: string };
}

interface Hook {
  event: ComputerEvent;
  action: 'notify';
  message: string;
  equals?: string;
}

const EVENTS: readonly ComputerEvent[] = [
  'terminal_open',
  'item.picked_up',
  'quest.completed',
  'room.changed',
];
const MAX_MODS = 16;
const MAX_COMMAND_LENGTH = 4096;
const MAX_SCRIPT_LINES = 64;
const CONFIG = '/etc/system.conf';

function parseWords(line: string): string[] {
  const words: string[] = [];
  let word = '';
  let quote = '';
  let started = false;
  for (const ch of line.trim()) {
    if (quote) {
      if (ch === quote) quote = '';
      else word += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
    } else if (/\s/u.test(ch)) {
      if (started) words.push(word);
      word = '';
      started = false;
    } else {
      word += ch;
      started = true;
    }
  }
  if (quote) throw new Error('Unclosed quote');
  if (started) words.push(word);
  return words;
}

function parseHook(content: string): Hook {
  const lines = content.split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
  if (lines.length < 2 || lines.length > 3) throw new Error('Expected on, optional if, and notify');
  const [on, eventName, ...extra] = parseWords(lines[0] ?? '');
  const event = EVENTS.find((value) => value === eventName);
  if (on !== 'on' || !event || extra.length) throw new Error('Unknown hook event');
  let equals: string | undefined;
  if (lines.length === 3) {
    const [keyword, operator, value, ...rest] = parseWords(lines[1] ?? '');
    if (keyword !== 'if' || operator !== 'equals' || value === undefined || rest.length) {
      throw new Error('Expected if equals "value"');
    }
    equals = value;
  }
  const [action, ...message] = parseWords(lines[lines.length - 1] ?? '');
  const text = message.join(' ');
  if (action !== 'notify' || !text || text.length > 240) throw new Error('Expected notify "message" (max 240 characters)');
  return { event, action: 'notify', message: text, equals };
}

function seedFiles(template: ComputerTemplate): VirtualFileSystem {
  const fs = new VirtualFileSystem();
  for (const dir of ['/etc', '/home', `/home/${template === 'home' ? 'snake' : template}`]) fs.mkdir(dir);
  const home = `/home/${template === 'home' ? 'snake' : template}`;
  fs.mkdir(`${home}/mods`);
  fs.mkdir(`${home}/notes`);
  fs.mkdir(`${home}/scripts`);
  fs.write(`${home}/readme.txt`, 'Welcome to SnekOS. Type help to learn the commands.\n');
  if (template === 'barkeep') fs.write(`${home}/notes/stock.txt`, 'Order more cider. Stop extending credit to goblins.\n');
  if (template === 'mayor') fs.write(`${home}/notes/budget.txt`, 'Proposed budget: roads, streetlights, and a very large statue.\n');
  if (template === 'home') fs.write(`${home}/mods/welcome.hook`, 'on terminal_open\nnotify "An apple a day keeps the maze away."\n');
  return fs;
}

/** One runtime per machine. The host owns machine identity, authorization and saves. */
export class ComputerRuntime {
  private fs: VirtualFileSystem;
  private enabledMods = new Set<string>();
  private cwd: string;
  private theme: TerminalTheme = 'green';
  readonly home: string;
  readonly username: string;

  constructor(
    readonly hostname: string,
    readonly template: ComputerTemplate,
    private readonly context: ComputerContext,
    saved?: ComputerSaveData,
    private readonly writable = template === 'home',
  ) {
    this.username = template === 'home' ? 'snake' : template;
    this.home = `/home/${this.username}`;
    this.cwd = this.home;
    this.fs = saved ? new VirtualFileSystem(saved.files) : seedFiles(template);
    if (!this.fs.isDirectory(this.home)) throw new Error('Missing home directory');
    if (saved) {
      if (['green', 'amber', 'white'].includes(saved.theme)) this.theme = saved.theme;
      for (const name of this.writable ? saved.enabledMods.slice(0, MAX_MODS) : []) {
        try {
          this.readHook(name);
          this.enabledMods.add(name);
        } catch {
          // A removed or invalid hook must not run after restore.
        }
      }
    }
  }

  serialize(): ComputerSaveData {
    return { files: this.fs.serialize(), enabledMods: [...this.enabledMods], theme: this.theme };
  }

  getTheme(): TerminalTheme {
    return this.theme;
  }

  prompt(): string {
    const location = this.cwd === this.home ? '~' : this.cwd;
    return `${this.username}@${this.hostname}:${location}$ `;
  }

  private path(input: string): string {
    const expanded = input === '~' || input.startsWith('~/') ? `${this.home}${input.slice(1)}` : input;
    return resolvePath(this.cwd, expanded);
  }

  private assertWritable(path: string): void {
    if (!this.writable) throw new Error('Permission denied');
    if (!path.startsWith(`${this.home}/`)) throw new Error('Protected system path');
  }

  private readFile(path: string): string {
    if (path === CONFIG) {
      return `[system]\nhostname=${this.hostname}\ntheme=${this.theme}\n\n[game]\n${this.context.readSystemConfig()}\n`;
    }
    return this.fs.read(path);
  }

  saveEdit(path: string, content: string): void {
    const resolved = this.path(path);
    this.assertWritable(resolved);
    this.fs.write(resolved, content);
  }

  private disableRemovedHook(path: string): void {
    const prefix = `${this.home}/mods/`;
    if (path.startsWith(prefix) && path.endsWith('.hook')) {
      this.enabledMods.delete(path.slice(prefix.length, -5));
    }
  }

  private readHook(name: string): Hook {
    if (!/^[a-zA-Z0-9_-]{1,48}$/u.test(name)) throw new Error('Invalid mod name');
    return parseHook(this.fs.read(`${this.home}/mods/${name}.hook`));
  }

  dispatch(event: ComputerEvent, value?: string): string[] {
    if (!this.writable) return [];
    const errors: string[] = [];
    for (const name of this.enabledMods) {
      try {
        const hook = this.readHook(name);
        if (hook.event === event && (hook.equals === undefined || hook.equals === value)) {
          this.context.notify(hook.message);
        }
      } catch (error) {
        errors.push(`${name}: ${error instanceof Error ? error.message : 'Hook failed'}`);
      }
    }
    return errors;
  }

  execute(line: string): ShellResult {
    try {
      return this.run(line, false);
    } catch (error) {
      return { output: `Error: ${error instanceof Error ? error.message : 'Command failed'}` };
    }
  }

  private run(line: string, inScript: boolean): ShellResult {
    if (line.length > MAX_COMMAND_LENGTH) throw new Error('Command too long');
    const [command, ...args] = parseWords(line);
    const arg = args[0];
    const requireArg = (): string => {
      if (!arg) throw new Error('Missing argument');
      return arg;
    };
    const output = (text = ''): ShellResult => ({ output: text });
    switch (command) {
      case undefined:
        return output();
      case 'help':
        return output('help pwd ls cd mkdir touch cat echo write rm cp mv edit run clear whoami hostname snake config mod\nUse quotes for spaces; run executes up to 64 lines. mod help explains hooks.');
      case 'pwd':
        return output(this.cwd);
      case 'whoami':
        return output(this.username);
      case 'hostname':
        return output(this.hostname);
      case 'clear':
        return { output: '', clear: !inScript };
      case 'ls': {
        const path = this.path(arg ?? '.');
        const names = this.fs.list(path);
        if (path === '/etc' && !names.includes('system.conf')) names.push('system.conf');
        return output(names.join('  '));
      }
      case 'cd': {
        const path = this.path(arg ?? '~');
        if (!this.fs.isDirectory(path)) throw new Error('Not a directory');
        this.cwd = path;
        return output();
      }
      case 'cat':
        return output(this.readFile(this.path(requireArg())));
      case 'echo':
        return output(args.join(' '));
      case 'mkdir': {
        const path = this.path(requireArg());
        this.assertWritable(path);
        this.fs.mkdir(path);
        return output();
      }
      case 'touch': {
        const path = this.path(requireArg());
        this.assertWritable(path);
        if (!this.fs.exists(path)) this.fs.write(path, '');
        else this.fs.read(path);
        return output();
      }
      case 'write':
        this.saveEdit(requireArg(), args.slice(1).join(' '));
        return output();
      case 'rm': {
        const path = this.path(requireArg());
        this.assertWritable(path);
        if (this.cwd === path || this.cwd.startsWith(`${path}/`)) throw new Error('Directory in use');
        if (path === `${this.home}/mods` || path === `${this.home}/scripts`) throw new Error('System folder');
        this.fs.remove(path);
        this.disableRemovedHook(path);
        return output();
      }
      case 'cp':
      case 'mv': {
        const source = this.path(requireArg());
        if (!args[1]) throw new Error('Missing destination');
        const destination = this.path(args[1]);
        this.assertWritable(destination);
        if (source === destination) throw new Error('Same file');
        if (this.fs.exists(destination)) throw new Error('Destination already exists');
        if (command === 'mv') this.assertWritable(source);
        this.fs.write(destination, this.readFile(source));
        if (command === 'mv') {
          this.fs.remove(source);
          this.disableRemovedHook(source);
        }
        return output();
      }
      case 'edit':
      case 'nano': {
        if (inScript) throw new Error('Editor requires an interactive session');
        const path = this.path(requireArg());
        this.assertWritable(path);
        return { output: '', edit: { path, content: this.fs.exists(path) ? this.fs.read(path) : '' } };
      }
      case 'run': {
        if (inScript) throw new Error('Nested scripts are not supported');
        const lines = this.readFile(this.path(requireArg())).split('\n');
        if (lines.length > MAX_SCRIPT_LINES) throw new Error('Script too long');
        const results: string[] = [];
        for (const [index, scriptLine] of lines.entries()) {
          if (!scriptLine.trim() || scriptLine.trim().startsWith('#')) continue;
          try {
            const result = this.run(scriptLine, true);
            if (result.output) results.push(result.output);
          } catch (error) {
            results.push(`Line ${index + 1}: ${error instanceof Error ? error.message : 'Command failed'}`);
            break;
          }
        }
        return output(results.join('\n').slice(0, 65_536));
      }
      case 'snake':
        if (arg === 'status') return output(this.context.readStatus());
        throw new Error('Usage: snake status');
      case 'config':
        if (arg === 'list') return output(this.readFile(CONFIG));
        if (arg === 'get' && args[1] === 'system.theme') return output(this.theme);
        if (arg === 'set' && args[1] === 'system.theme') {
          if (!this.writable) throw new Error('Permission denied');
          const value = args[2];
          if (value !== 'green' && value !== 'amber' && value !== 'white') throw new Error('Theme must be green, amber, or white');
          this.theme = value;
          return output('Theme updated');
        }
        throw new Error('Usage: config list | config get system.theme | config set system.theme green');
      case 'mod': {
        const name = args[1];
        if (arg === 'help') return output('Create ~/mods/name.hook with lines: on EVENT, optional if equals "value", notify "message".\nEvents: ' + EVENTS.join(', ') + '\nmod enable name | mod disable name | mod list');
        if (arg === 'list') return output(this.fs.list(`${this.home}/mods`).filter((file) => file.endsWith('.hook')).map((file) => `${file.slice(0, -5)}: ${this.enabledMods.has(file.slice(0, -5)) ? 'enabled' : 'disabled'}`).join('\n'));
        if (!this.writable) throw new Error('Permission denied');
        if (!name) throw new Error('Missing mod name');
        if (arg === 'enable') {
          this.readHook(name);
          if (!this.enabledMods.has(name) && this.enabledMods.size >= MAX_MODS) throw new Error('Too many enabled mods');
          this.enabledMods.add(name);
          return output('Mod enabled');
        }
        if (arg === 'disable') {
          this.enabledMods.delete(name);
          return output('Mod disabled');
        }
        throw new Error('Usage: mod help');
      }
      default:
        throw new Error(`Command not found: ${command}`);
    }
  }
}
