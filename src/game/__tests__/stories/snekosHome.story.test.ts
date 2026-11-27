import { describe, expect, it } from 'vitest';
import { createHeadlessScenario } from '../../../test/headless/headlessScenario.js';
import {
  HOME_COMPUTER_FLAG,
  PERSONAL_COMPUTER_ITEM_ID,
  townComputerLocation,
} from '../../../computers/computerWorld.js';

describe('SNEKOS-001', () => {
  it('installs one home PC, persists files and mods, and dispatches hooks while closed', () => {
    const scenario = createHeadlessScenario({ seed: 'snekos-home' });
    const game = scenario.game;
    const inventory = game.getInventory();
    inventory.addItem(PERSONAL_COMPUTER_ITEM_ID, 2);
    expect(game.placeHomeComputer().ok).toBe(false);
    expect(inventory.getItemCount(PERSONAL_COMPUTER_ITEM_ID)).toBe(2);

    const roomId = '0,-1,0';
    const room = game.getRoom(roomId);
    const rowIndex = room.layout.findIndex((row) => row.includes('WW'));
    const columnIndex = room.layout[rowIndex].indexOf('WW');
    const position = { x: columnIndex, y: rowIndex };
    game.moveToRoom(roomId, position);
    game.forceDirection(1, 0);
    expect(game.placeHomeComputer().ok).toBe(true);
    expect(inventory.getItemCount(PERSONAL_COMPUTER_ITEM_ID)).toBe(1);
    expect(game.placeHomeComputer().ok).toBe(false);
    expect(inventory.getItemCount(PERSONAL_COMPUTER_ITEM_ID)).toBe(1);
    expect(room.layout[position.y][position.x + 1]).toBe('W');
    const computer = game.getComputerInRoom(roomId);
    expect(computer).toMatchObject({ x: position.x + 1, y: position.y, template: 'home' });

    const runtime = game.openNearbyComputer(() => {});
    expect(runtime).toBeDefined();
    if (!runtime) return;
    expect(runtime.execute('write notes/hello.txt "Hello, Snake"').output).toBe('');
    const hook = 'on room.changed\nif equals "0,0,0"\nnotify "Homeward"';
    runtime.saveEdit('mods/arrival.hook', hook);
    expect(runtime.execute('mod enable arrival').output).toBe('Mod enabled');
    expect(runtime.execute('cat /etc/system.conf').output).toContain('grid.cols=');
    expect(runtime.execute('snake inventory').output).toContain('Personal Computer: 1');
    expect(runtime.execute('snake quests').output).toBe('No accepted quests');
    expect(runtime.execute('config get game.minimap.unlocked').output).toBe('false');
    const enableMap = 'config set game.minimap.enabled true';
    expect(runtime.execute(enableMap).output).toContain('Minimap is locked');
    game.setFlag('ui.minimap.unlocked', true);
    expect(runtime.execute(enableMap).output).toBe('Minimap setting updated');
    expect(runtime.execute('config get game.minimap.enabled').output).toBe('true');
    expect(game.getFlag('ui.minimap.enabled')).toBe(true);
    expect(runtime.execute('config set game.grid.cols 999').output).toContain('Usage:');
    expect(game.persistNearbyComputer(runtime)).toBe(true);
    expect(game.getSaveData().flags[HOME_COMPUTER_FLAG]).toBeDefined();

    const restored = scenario.saveAndReload().game;
    restored.moveToRoom(roomId, position);
    const reopened = restored.openNearbyComputer(() => {});
    expect(reopened?.execute('cat notes/hello.txt').output).toBe('Hello, Snake');
    expect(reopened?.execute('mod list').output).toContain('arrival: enabled');
    expect(reopened?.execute('config get game.minimap.enabled').output).toBe('true');

    restored.moveToRoom('0,0,0', { x: 5, y: 5 });
    expect(restored.openNearbyComputer(() => {})).toBeUndefined();
    const notifications: string[] = [];
    const errors = restored.dispatchHomeComputerEvent('room.changed', '0,0,0', (message) => {
      notifications.push(message);
    });
    expect(errors).toEqual([]);
    expect(notifications).toEqual(['Homeward']);
  });

  it('finds stable NPC counter locations without changing terrain', () => {
    const room = {
      id: 'test-tavern',
      layout: ['#####', '#AAW#', '#WWW#', '#####'],
    };
    expect(townComputerLocation(room, 'tavern')).toMatchObject({
      x: 1,
      y: 1,
      roomId: room.id,
      template: 'barkeep',
    });
    expect(townComputerLocation(room, 'townHall')).toMatchObject({
      x: 1,
      y: 1,
      template: 'mayor',
    });
    expect(townComputerLocation(room, 'generalStore')).toBeUndefined();
    expect(room.layout).toEqual(['#####', '#AAW#', '#WWW#', '#####']);
  });
});
