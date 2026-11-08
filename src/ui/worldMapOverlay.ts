import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import { formatRoomId, parseCoordinateRoomId, type RoomCoordinate } from '../world/roomAddress.js';
import { TreeViewportController } from './core/TreeViewportController.js';
import type { UiRect } from './core/UiLayout.js';
import {
  WORLD_MAP_ROOM_SIZE,
  mapPointToRoom,
  roomToMapPoint,
  visibleMapRooms,
} from './worldMapGeometry.js';

interface WorldMapOverlayOptions {
  parent: Phaser.GameObjects.Container;
  viewport: UiRect;
  detail: UiRect;
  worldOffset: { x: number; y: number };
}

const COLOR = {
  unexplored: 0x13212d,
  discovered: 0x386c9c,
  selected: 0xffe09a,
  current: 0x5dd6a2,
  grid: 0x31516a,
  quest: 0xffd166,
  home: 0xffffff,
  origin: 0x9ad1ff,
};

/**
 * The atlas is an inspectable view of known rooms, not a second world generator.
 * Unvisited coordinates remain uncharted, even when a quest marker points at them.
 */
export class WorldMapOverlay {
  private readonly root: Phaser.GameObjects.Container;
  private readonly mapGraphics: Phaser.GameObjects.Graphics;
  private readonly maskShape: Phaser.GameObjects.Graphics;
  private readonly controller: TreeViewportController;
  private readonly title: Phaser.GameObjects.Text;
  private readonly floorLabel: Phaser.GameObjects.Text;
  private readonly zoomLabel: Phaser.GameObjects.Text;
  private readonly detailsTitle: Phaser.GameObjects.Text;
  private readonly detailsCoordinates: Phaser.GameObjects.Text;
  private readonly detailsBody: Phaser.GameObjects.Text;
  private readonly questButton: Phaser.GameObjects.Text;
  private readonly viewport: UiRect;
  private readonly worldOffset: { x: number; y: number };
  private floor = 0;
  private selected: RoomCoordinate | null = null;
  private initialized = false;
  private visible = false;
  private dragging = false;
  private known = new Set<string>();

  constructor(
    private readonly scene: SnakeScene,
    options: WorldMapOverlayOptions,
  ) {
    this.viewport = options.viewport;
    this.worldOffset = options.worldOffset;
    this.controller = new TreeViewportController({
      width: this.viewport.width,
      height: this.viewport.height,
      minZoom: 0.4,
      maxZoom: 3,
      initialZoom: 1,
      padding: 160,
    });

    const background = scene.add
      .rectangle(
        this.viewport.x,
        this.viewport.y,
        this.viewport.width,
        this.viewport.height,
        0x0b1622,
        0.9,
      )
      .setOrigin(0)
      .setStrokeStyle(1, COLOR.grid, 0.85);
    this.mapGraphics = scene.add.graphics();
    const mapLayer = scene.add.container(this.viewport.x, this.viewport.y, [this.mapGraphics]);
    this.maskShape = scene.make.graphics({
      x: this.worldOffset.x + this.viewport.x,
      y: this.worldOffset.y + this.viewport.y,
    });
    this.maskShape.fillStyle(0xffffff).fillRect(0, 0, this.viewport.width, this.viewport.height);
    mapLayer.setMask(this.maskShape.createGeometryMask());

    const viewportZone = scene.add
      .zone(this.viewport.x, this.viewport.y, this.viewport.width, this.viewport.height)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });

    this.title = scene.add.text(this.viewport.x + 12, this.viewport.y + 9, 'WORLD ATLAS', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#9ad1ff',
      backgroundColor: '#0b1622',
      padding: { x: 5, y: 3 },
    });
    this.floorLabel = scene.add
      .text(this.viewport.x + this.viewport.width - 12, this.viewport.y + 12, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#fff3a8',
        backgroundColor: '#0b1622',
        padding: { x: 3, y: 3 },
      })
      .setOrigin(1, 0);
    this.zoomLabel = scene.add.text(this.viewport.x + 13, this.viewport.y + 47, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#a3bfd1',
      backgroundColor: '#0b1622',
      padding: { x: 3, y: 2 },
    });

    this.detailsTitle = scene.add.text(options.detail.x + 13, options.detail.y + 14, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#fff3a8',
      wordWrap: { width: options.detail.width - 26 },
    });
    this.detailsCoordinates = scene.add.text(options.detail.x + 13, options.detail.y + 55, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#9ad1ff',
      wordWrap: { width: options.detail.width - 26 },
    });
    this.detailsBody = scene.add
      .text(options.detail.x + 13, options.detail.y + 100, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#d7e8f5',
        wordWrap: { width: options.detail.width - 28 },
        lineSpacing: 5,
      })
      .setMaxLines(17);

    this.root = scene.add
      .container(0, 0, [
        background,
        mapLayer,
        viewportZone,
        this.title,
        this.floorLabel,
        this.zoomLabel,
        this.detailsTitle,
        this.detailsCoordinates,
        this.detailsBody,
      ])
      .setVisible(false);
    options.parent.add(this.root);

    const top = this.viewport.y + 77;
    const left = this.viewport.x + 11;
    this.addButton(left, top, 'Z +', () => this.stepFloor(1));
    this.addButton(left + 51, top, 'Z -', () => this.stepFloor(-1));
    this.addButton(left + 105, top, ' + ', () => this.zoom(0.2));
    this.addButton(left + 146, top, ' - ', () => this.zoom(-0.2));
    const compact = this.viewport.width < 350;
    const bottom = this.viewport.y + this.viewport.height - (compact ? 57 : 29);
    this.addButton(left, bottom, ' YOU ', () => this.focusCurrent());
    this.addButton(left + 69, bottom, ' HOME ', () => this.focus({ x: 0, y: -1, z: 0 }));
    this.questButton = this.addButton(
      left + (compact ? 0 : 149),
      bottom + (compact ? 28 : 0),
      ' QUEST ',
      () => this.focusQuest(),
    );
    this.addButton(left + (compact ? 86 : 241), bottom + (compact ? 28 : 0), ' 0,0,0 ', () =>
      this.focus({ x: 0, y: 0, z: 0 }),
    );

    viewportZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.visible) return;
      this.dragging = true;
      this.controller.beginDrag({ x: pointer.x, y: pointer.y });
    });
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.visible || !this.dragging || !pointer.isDown) return;
      if (this.controller.moveDrag({ x: pointer.x, y: pointer.y })) this.redraw();
    });
    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      const didDrag = this.controller.endDrag();
      this.dragging = false;
      if (!didDrag && this.contains(pointer)) {
        const position = this.toLocal(pointer);
        this.selected = mapPointToRoom(
          position,
          { pan: this.controller.pan, zoom: this.controller.zoom },
          this.floor,
        );
        this.redraw();
      }
    });
  }

  private addButton(
    x: number,
    y: number,
    label: string,
    action: () => void,
  ): Phaser.GameObjects.Text {
    const button = this.scene.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#244155',
        padding: { x: 4, y: 4 },
      })
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => {
      if (this.visible) action();
    });
    this.root.add(button);
    return button;
  }

  setVisible(visible: boolean): void {
    const opening = visible && !this.visible;
    this.visible = visible;
    this.root.setVisible(visible);
    if (!visible) {
      this.dragging = false;
      this.controller.endDrag();
      return;
    }
    if (opening && !this.initialized) {
      this.initialized = true;
      this.focusCurrent();
    } else {
      this.refresh();
    }
  }

  handleWheel(pointer: Phaser.Input.Pointer, deltaY: number): boolean {
    if (!this.visible || !this.contains(pointer)) return false;
    this.zoom(deltaY < 0 ? 0.17 : -0.17, this.toLocal(pointer));
    return true;
  }

  handleControllerSelect(dx: number, dy: number): boolean {
    if (!this.visible) return false;
    const room = this.selected ?? this.current();
    this.selected = { x: room.x + dx, y: room.y + dy, z: this.floor };
    this.rebuildBounds();
    const point = this.controller.worldToViewport(roomToMapPoint(this.selected));
    if (
      point.x < 20 ||
      point.y < 20 ||
      point.x > this.viewport.width - 20 ||
      point.y > this.viewport.height - 20
    ) {
      this.controller.centerOn(roomToMapPoint(this.selected));
    }
    this.redraw();
    return true;
  }

  handleControllerPan(dx: number, dy: number): boolean {
    if (!this.visible) return false;
    this.controller.panBy(dx, dy);
    this.redraw();
    return true;
  }

  handleControllerZoom(delta: number): boolean {
    if (!this.visible) return false;
    this.zoom(delta);
    return true;
  }

  handleControllerConfirm(): boolean {
    if (!this.visible) return false;
    this.focus(this.selected ?? this.current());
    return true;
  }

  stepFloor(delta: number): void {
    if (!this.visible) return;
    this.floor += delta;
    const room = this.selected ?? this.current();
    this.selected = { x: room.x, y: room.y, z: this.floor };
    this.refresh();
  }

  private zoom(delta: number, anchor?: { x: number; y: number }): void {
    this.controller.zoomAround(
      this.controller.zoom + delta,
      anchor ?? { x: this.viewport.width / 2, y: this.viewport.height / 2 },
    );
    this.redraw();
  }

  private focusCurrent(): void {
    this.focus(this.current());
  }

  private focusQuest(): void {
    const marker = this.scene
      .getQuestMapMarkers()
      .find((entry) => parseCoordinateRoomId(entry.roomId));
    if (!marker) return;
    const room = parseCoordinateRoomId(marker.roomId);
    if (room) this.focus(room);
  }

  private focus(room: RoomCoordinate): void {
    this.floor = room.z;
    this.selected = { ...room };
    this.rebuildBounds();
    this.controller.centerOn(roomToMapPoint(room));
    this.redraw();
  }

  private current(): RoomCoordinate {
    const room = parseCoordinateRoomId(this.scene.currentRoomId);
    return room ?? { x: 0, y: 0, z: 0 };
  }

  private contains(pointer: Phaser.Input.Pointer): boolean {
    const local = this.toLocal(pointer);
    return (
      local.x >= 0 &&
      local.y >= 0 &&
      local.x < this.viewport.width &&
      local.y < this.viewport.height
    );
  }

  private toLocal(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    return {
      x: pointer.x - this.worldOffset.x - this.viewport.x,
      y: pointer.y - this.worldOffset.y - this.viewport.y,
    };
  }

  refresh(): void {
    if (!this.visible) return;
    this.rebuildBounds();
    this.redraw();
  }

  private rebuildBounds(): void {
    const rooms = this.scene
      .getGeneratedRoomsOnCurrentLevel()
      .map((id) => parseCoordinateRoomId(id))
      .filter((room): room is NonNullable<typeof room> => room !== null && room.z === this.floor);
    this.known = new Set(rooms.map((room) => room.roomId));
    const points: RoomCoordinate[] = [
      ...rooms,
      ...this.scene
        .getQuestMapMarkers()
        .map((marker) => parseCoordinateRoomId(marker.roomId))
        .filter((room): room is NonNullable<typeof room> => room !== null && room.z === this.floor),
    ];
    if (this.floor === 0) {
      points.push({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
    }
    const current = this.current();
    if (current.z === this.floor) points.push(current);
    if (this.selected && this.selected.z === this.floor) points.push(this.selected);
    if (points.length === 0) points.push({ x: 0, y: 0, z: this.floor });
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    // Give the player room to inspect beyond the last visited cell.
    this.controller.setWorldPoints([
      roomToMapPoint({ x: minX - 6, y: minY - 6 }),
      roomToMapPoint({ x: maxX + 6, y: maxY + 6 }),
    ]);
  }

  private redraw(): void {
    if (!this.visible) return;
    const graphics = this.mapGraphics;
    graphics.clear();
    const size = WORLD_MAP_ROOM_SIZE * this.controller.zoom;
    const bounds = visibleMapRooms(this.viewport.width, this.viewport.height, {
      pan: this.controller.pan,
      zoom: this.controller.zoom,
    });
    const current = this.current();
    const currentId = formatRoomId(current);
    const selectedId = this.selected ? formatRoomId(this.selected) : '';
    const markers = this.scene.getQuestMapMarkers();
    const markerRooms = new Set(markers.map((marker) => marker.roomId));
    const claims = new Map(
      this.scene.snakeGame.getRoomClaims().map((claim) => [claim.roomId, claim]),
    );
    const farmRooms = new Set(this.scene.snakeGame.getFarmRoomIds());
    const playerId = this.scene.snakeGame.getLocalPlayerId();

    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        const id = formatRoomId({ x, y, z: this.floor });
        const topLeft = this.controller.worldToViewport({
          x: x * WORLD_MAP_ROOM_SIZE,
          y: y * WORLD_MAP_ROOM_SIZE,
        });
        const known = this.known.has(id);
        const highlighted = id === selectedId;
        const occupied = id === currentId;
        const landmark = this.floor === 0 && ((x === 0 && y === 0) || (x === 0 && y === -1));
        graphics
          .fillStyle(
            occupied ? COLOR.current : known ? COLOR.discovered : COLOR.unexplored,
            known || occupied ? 0.87 : landmark || markerRooms.has(id) ? 0.5 : 0.19,
          )
          .fillRect(topLeft.x + 1, topLeft.y + 1, Math.max(1, size - 2), Math.max(1, size - 2));
        graphics
          .lineStyle(
            highlighted ? 3 : occupied ? 2 : 1,
            highlighted ? COLOR.selected : COLOR.grid,
            highlighted ? 1 : 0.45,
          )
          .strokeRect(topLeft.x + 0.5, topLeft.y + 0.5, size - 1, size - 1);
        const claim = claims.get(id);
        if (claim) {
          graphics
            .lineStyle(2, claim.ownerId === playerId ? 0x80dc82 : 0xf5aa60, 1)
            .strokeRect(topLeft.x + 3, topLeft.y + 3, Math.max(1, size - 6), Math.max(1, size - 6));
        }
        if (farmRooms.has(id)) {
          graphics
            .fillStyle(0xa2d879, 1)
            .fillCircle(topLeft.x + size * 0.75, topLeft.y + size * 0.75, Math.max(2, size * 0.08));
        }
      }
    }

    const markerPosition = (room: RoomCoordinate) =>
      this.controller.worldToViewport(roomToMapPoint(room));
    if (this.floor === 0) {
      const origin = markerPosition({ x: 0, y: 0, z: 0 });
      graphics.lineStyle(2, COLOR.origin, 1);
      graphics.lineBetween(origin.x - 6, origin.y, origin.x + 6, origin.y);
      graphics.lineBetween(origin.x, origin.y - 6, origin.x, origin.y + 6);
      const home = markerPosition({ x: 0, y: -1, z: 0 });
      graphics.fillStyle(COLOR.home, 1);
      graphics.fillTriangle(home.x - 7, home.y - 2, home.x + 7, home.y - 2, home.x, home.y - 10);
      graphics.fillRect(home.x - 5, home.y - 2, 10, 9);
    }

    for (const marker of markers) {
      const room = parseCoordinateRoomId(marker.roomId);
      if (!room || room.z !== this.floor) continue;
      const point = markerPosition(room);
      graphics.lineStyle(2, marker.color ?? COLOR.quest, 1);
      graphics.strokeCircle(point.x, point.y, Math.max(6, Math.min(12, size * 0.25)));
      graphics.fillStyle(marker.color ?? COLOR.quest, 1);
      if (marker.kind === 'turn-in') {
        graphics.fillTriangle(
          point.x,
          point.y - 5,
          point.x - 4,
          point.y + 4,
          point.x + 4,
          point.y + 4,
        );
      } else {
        graphics.fillCircle(point.x, point.y, 3);
      }
    }

    if (current.z === this.floor) {
      const point = markerPosition(current);
      graphics.lineStyle(2, 0x081b20, 1).strokeCircle(point.x, point.y, 5);
      graphics.fillStyle(COLOR.current, 1).fillCircle(point.x, point.y, 4);
    }

    this.floorLabel.setText('LAYER ' + this.floor);
    this.zoomLabel.setText(
      Math.round(this.controller.zoom * 100) + '%  |  drag to pan  |  scroll to zoom',
    );
    this.questButton.setAlpha(markers.length > 0 ? 1 : 0.4);
    this.updateDetails();
  }

  private updateDetails(): void {
    const selected = this.selected ?? this.current();
    const id = formatRoomId(selected);
    const markers = this.scene.getQuestMapMarkers().filter((marker) => marker.roomId === id);
    const explored = this.known.has(id);
    const room = explored ? this.scene.snakeGame.peekCachedRoom(id) : undefined;
    const current = this.current();
    const status =
      id === formatRoomId(current) ? 'YOUR LOCATION' : explored ? 'DISCOVERED' : 'UNCHARTED';
    const biome = room?.biomeId
      ? room.biomeId.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
      : 'Unknown region';
    const points = [
      ...(room?.town ? ['Town'] : []),
      ...(room?.village ? ['Village'] : []),
      ...(room?.goblinCamp ? ['Goblin camp'] : []),
      ...(room?.molemanDigSite ? ['Dig site'] : []),
      ...(room?.treasure ? ['Treasure'] : []),
      ...(room?.powerup ? ['Powerup'] : []),
    ];
    if (selected.z === 0 && selected.x === 0 && selected.y === -1) points.push('Home');
    if (selected.z === 0 && selected.x === 0 && selected.y === 0) points.push('World origin');

    const claim = this.scene.snakeGame.getRoomClaims().find((entry) => entry.roomId === id);
    if (claim)
      points.push(
        claim.ownerId === this.scene.snakeGame.getLocalPlayerId()
          ? 'Your land claim'
          : `Land claimed by ${claim.ownerId}`,
      );
    if (this.scene.snakeGame.getFarmRoomIds().includes(id)) points.push('Cultivated land');

    this.detailsTitle.setText(status);
    this.detailsCoordinates.setText('ROOM  ' + id + '\n' + biome);
    const lines = [
      'Position',
      'X  ' + selected.x + '   Y  ' + selected.y + '   Z  ' + selected.z,
      '',
      'From player',
      'X  ' +
        (selected.x - current.x) +
        '   Y  ' +
        (selected.y - current.y) +
        '   Z  ' +
        (selected.z - current.z),
      '',
      'Points of interest',
      ...(points.length > 0 ? points : ['None marked']),
      '',
      'Quest markers',
      ...(markers.length > 0
        ? markers.map((marker) => marker.label + ' (' + marker.kind + ')')
        : ['None']),
      '',
      explored ? 'This zone has been mapped.' : 'Terrain unknown. No exploration is revealed.',
    ];
    this.detailsBody.setText(lines.join('\n'));
  }

  destroy(): void {
    this.controller.endDrag();
    this.root.destroy(true);
    this.maskShape.destroy();
  }
}
