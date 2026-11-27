import { describe, expect, it } from 'vitest';
import { ComputerRuntime } from '../computerRuntime.js';
import { VirtualFileSystem } from '../virtualFileSystem.js';

function setup() {
  const notifications: string[] = [];
  const context = {
    readStatus: () => 'Score: 42',
    readSystemConfig: () => 'seed=42',
    notify: (message: string) => notifications.push(message),
  };
  return { computer: new ComputerRuntime('home-pc', 'home', context), context, notifications };
}

describe('SnekOS', () => {
  it('persists quoted paths, text files, and themes independently of a shell session', () => {
    const { computer, context } = setup();
    expect(computer.execute('mkdir "my notes"').output).toBe('');
    expect(computer.execute('cd "my notes"').output).toBe('');
    expect(computer.execute('write report.txt "an apple a day"').output).toBe('');
    expect(computer.execute('config set system.theme amber').output).toBe('Theme updated');
    const restored = new ComputerRuntime('home-pc', 'home', context, computer.serialize());
    expect(restored.execute('cat "my notes/report.txt"').output).toBe('an apple a day');
    expect(restored.getTheme()).toBe('amber');
    const second = new ComputerRuntime('second-pc', 'home', context);
    expect(second.execute('ls').output).not.toContain('my notes');
  });

  it('protects system paths and reads the config from the current host', () => {
    const { computer, context } = setup();
    expect(computer.execute('write ../../etc/system.conf bad').output).toContain('Protected');
    expect(computer.execute('cat /etc/system.conf').output).toContain('seed=42');
    context.readSystemConfig = () => 'seed=999';
    expect(computer.execute('cat /etc/system.conf').output).toContain('seed=999');
    expect(computer.execute('snake status').output).toBe('Score: 42');
  });

  it('supports multiline edit and finite scripts but refuses nested execution', () => {
    const { computer } = setup();
    const edit = computer.execute('edit scripts/demo.sh').edit;
    expect(edit?.path).toBe('/home/snake/scripts/demo.sh');
    computer.saveEdit('scripts/demo.sh', 'echo hello\nrun scripts/demo.sh\necho unreachable');
    const result = computer.execute('run scripts/demo.sh');
    expect(result.output).toBe('hello\nLine 2: Nested scripts are not supported');
  });

  it('runs only enabled, matching, validated hooks and disables a removed hook', () => {
    const { computer, context, notifications } = setup();
    computer.saveEdit(
      'mods/apples.hook',
      'on item.picked_up\nif equals "apple"\nnotify "Apple acquired"',
    );
    computer.dispatch('item.picked_up', 'apple');
    expect(notifications).toEqual([]);
    expect(computer.execute('mod enable apples').output).toBe('Mod enabled');
    const restored = new ComputerRuntime('home-pc', 'home', context, computer.serialize());
    restored.dispatch('item.picked_up', 'pear');
    restored.dispatch('item.picked_up', 'apple');
    expect(notifications).toEqual(['Apple acquired']);
    restored.execute('rm mods/apples.hook');
    restored.saveEdit('mods/apples.hook', 'on item.picked_up\nnotify "unexpected"');
    restored.dispatch('item.picked_up', 'apple');
    expect(notifications).toEqual(['Apple acquired']);
    restored.saveEdit('mods/bad.hook', 'on terminal_open\nexec arbitrary-code');
    expect(restored.execute('mod enable bad').output).toContain('Expected notify');
  });

  it('uses independent NPC content and prevents writes as a visitor', () => {
    const { context } = setup();
    const mayor = new ComputerRuntime('townhall', 'mayor', context);
    expect(mayor.execute('cat notes/budget.txt').output).toContain('statue');
    expect(mayor.execute('write notes/budget.txt changed').output).toContain('Permission denied');
    expect(mayor.execute('config set system.theme amber').output).toContain('Permission denied');
  });

  it('bounds file size and rejects noncanonical or orphaned saved paths', () => {
    const fs = new VirtualFileSystem();
    expect(() => fs.write('/big', 'a'.repeat(16_385))).toThrow('File too large');
    const orphan = () => new VirtualFileSystem([['/missing/file', { kind: 'file', content: '' }]]);
    expect(orphan).toThrow('Parent directory');
    const invalidPath = () => new VirtualFileSystem([['/../bad', { kind: 'directory' }]]);
    expect(invalidPath).toThrow('Invalid saved path');
  });
});
