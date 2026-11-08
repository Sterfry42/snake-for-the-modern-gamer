import { clamp, stableStringHashUnsigned } from '../core/math.js';
import { getBiomeDefinition } from '../world/biomes.js';
import { resolveBiomeAtmosphere } from '../world/atmosphereResolver.js';
import { DAY_PHASE_DURATIONS_MS } from '../world/atmosphereTypes.js';
import type { AtmosphereState } from '../world/atmosphereTypes.js';
import type { BiomeId } from '../world/biomes.js';
import { getCrop } from './cropCatalog.js';
import { parseCoordinateRoomId } from '../world/roomAddress.js';
import type {
  FarmCell,
  FarmRoom,
  FarmingSaveData,
  SoilSubstrate,
  FarmIncident,
  FarmCrop,
} from './farmingTypes.js';

export const WORLD_DAY_MS = Object.values(DAY_PHASE_DURATIONS_MS).reduce(
  (sum, value) => sum + value,
  0,
);
export const SOIL_FERTILITY = { loam: 65, rich: 80, dry: 35, ash: 45, poor: 25, artificial: 70 };
export interface FarmShelter {
  greenhouse: boolean;
  irrigated?: boolean;
  scarecrow?: boolean;
}

/** World-owned overlays. Rendering, room entry and client count never advance this clock. */
export class FarmingState {
  private integratedCells = 0;
  diagnostics() {
    return {
      rooms: this.rooms.size,
      plots: [...this.rooms.values()].reduce((sum, room) => sum + room.cells.size, 0),
      integratedCells: this.integratedCells,
      pendingMs: this.pendingMs,
    };
  }
  private readonly rooms = new Map<
    string,
    { biomeId: BiomeId; cells: Map<string, FarmCell>; revision: number }
  >();
  private data: Omit<FarmingSaveData, 'rooms'> = this.empty();
  private pendingMs = 0;
  private empty(): Omit<FarmingSaveData, 'rooms'> {
    return {
      schemaVersion: 1,
      elapsedMs: 0,
      nextInstance: 1,
      pending: [],
      incidents: [],
      municipalBeds: [],
      annexOwners: [],
      actions: [],
      stolenLoot: [],
      lastDawn: -1,
    };
  }
  clear(): void {
    this.integratedCells = 0;
    this.rooms.clear();
    this.data = this.empty();
    this.pendingMs = 0;
  }
  get(roomId: string, x: number, y: number): FarmCell | undefined {
    return this.rooms.get(roomId)?.cells.get(`${x},${y}`);
  }
  cells(roomId: string): readonly FarmCell[] {
    return [...(this.rooms.get(roomId)?.cells.values() ?? [])];
  }
  roomIds(): string[] {
    return [...this.rooms.keys()];
  }
  get elapsedMs(): number {
    return this.data.elapsedMs;
  }
  actionNonce(playerId: string): number {
    return this.data.actions?.find((action) => action.playerId === playerId)?.nonce ?? 0;
  }
  till(
    roomId: string,
    biomeId: BiomeId,
    x: number,
    y: number,
    substrate: SoilSubstrate,
  ): FarmCell | undefined {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = { biomeId, cells: new Map(), revision: 0 };
      this.rooms.set(roomId, room);
    }
    const old = this.get(roomId, x, y);
    if (old) return old;
    if (room.cells.size >= 200) return undefined;
    const cell: FarmCell = {
      x,
      y,
      substrate,
      moisture: substrate === 'rich' ? 65 : 40,
      fertility: SOIL_FERTILITY[substrate],
      weeds: 0,
      revision: 1,
      magicBed: false,
    };
    room.cells.set(`${x},${y}`, cell);
    room.revision++;
    return cell;
  }
  touch(roomId: string, cell: FarmCell): void {
    cell.revision++;
    const room = this.rooms.get(roomId);
    if (room) room.revision++;
  }
  plant(cell: FarmCell, cropId: string, playerId: string): FarmCrop {
    cell.crop = {
      instanceId: `crop-${this.data.nextInstance++}`,
      cropId,
      plantedBy: playerId,
      progress: 0,
      stage: 'seeded',
      health: 100,
      regrowCount: 0,
      care: 0,
      exposure: 0,
      unsuitableDays: 0,
    };
    return cell.crop;
  }
  dawn(day: number, execute: () => void): void {
    if (day <= (this.data.lastDawn ?? -1)) return;
    this.data.lastDawn = day;
    execute();
  }
  storeLoot(actorId: string, itemId: string, count: number): void {
    const loot = this.data.stolenLoot ?? (this.data.stolenLoot = []);
    const existing = loot.find((entry) => entry.actorId === actorId && entry.itemId === itemId);
    if (existing) existing.count += count;
    else loot.push({ actorId, itemId, count });
  }
  carrying(actorId: string): boolean {
    return this.data.stolenLoot?.some((entry) => entry.actorId === actorId) ?? false;
  }
  takeLoot(actorId: string): Array<{ itemId: string; count: number }> {
    const loot = this.data.stolenLoot ?? [];
    const recovered = loot.filter((entry) => entry.actorId === actorId);
    this.data.stolenLoot = loot.filter((entry) => entry.actorId !== actorId);
    return recovered.map((entry) => ({ itemId: entry.itemId, count: entry.count }));
  }
  municipal(roomId: string, x: number, y: number) {
    return this.data.municipalBeds.find(
      (bed) => bed.roomId === roomId && bed.x === x && bed.y === y,
    );
  }
  designate(roomId: string, x: number, y: number): void {
    if (!this.municipal(roomId, x, y))
      this.data.municipalBeds.push({ roomId, x, y, farm: true, harvest: true });
  }
  hasAnnex(ownerId: string): boolean {
    return this.data.annexOwners.includes(ownerId);
  }
  markAnnex(ownerId: string): void {
    if (!this.hasAnnex(ownerId)) this.data.annexOwners.push(ownerId);
  }
  incidents(): readonly FarmIncident[] {
    return this.data.incidents;
  }
  incident(event: FarmIncident): boolean {
    if (this.data.incidents.some((old) => old.id === event.id)) return false;
    this.data.incidents.push(event);
    this.data.incidents = this.data.incidents.slice(-100);
    return true;
  }
  /** Fixed one-second integration grid; climate segments and fractional remainder survive saves. */
  advance(
    durationMs: number,
    climate: AtmosphereState,
    shelter: (roomId: string, cell: FarmCell) => FarmShelter,
  ): void {
    if (!Number.isFinite(durationMs) || durationMs <= 0) return;
    const previous = this.data.pending[this.data.pending.length - 1];
    if (previous && climateKey(previous.climate) !== climateKey(climate)) this.flush(shelter);
    let remaining = durationMs;
    while (remaining > 0) {
      const take = Math.min(remaining, 1000 - this.pendingMs);
      const last = this.data.pending[this.data.pending.length - 1];
      if (last && climateKey(last.climate) === climateKey(climate)) last.durationMs += take;
      else this.data.pending.push({ durationMs: take, climate: { ...climate } });
      this.pendingMs += take;
      this.data.elapsedMs += take;
      remaining -= take;
      if (this.pendingMs >= 1000) {
        for (const segment of this.data.pending)
          this.integrate(segment.durationMs / WORLD_DAY_MS, segment.climate, shelter);
        this.data.pending = [];
        this.pendingMs = 0;
      }
    }
  }
  flush(shelter: (roomId: string, cell: FarmCell) => FarmShelter): void {
    for (const segment of this.data.pending)
      this.integrate(segment.durationMs / WORLD_DAY_MS, segment.climate, shelter);
    this.data.pending = [];
    this.pendingMs = 0;
  }
  projection(roomIds: readonly string[], playerId: string): FarmingSaveData {
    const view = this.save(roomIds);
    view.pending = [];
    view.elapsedMs = Math.floor(view.elapsedMs / 1000) * 1000;
    view.actions = view.actions?.filter((action) => action.playerId === playerId);
    view.stolenLoot = [];
    return view;
  }
  private integrate(
    days: number,
    climate: AtmosphereState,
    shelter: (roomId: string, cell: FarmCell) => FarmShelter,
  ): void {
    for (const [roomId, room] of this.rooms) {
      const biome = getBiomeDefinition(room.biomeId);
      const local = resolveBiomeAtmosphere(biome, climate).localVisual;
      const rain = ['rain', 'monsoon', 'neonRain'].includes(local)
        ? 40
        : ['heavyRain', 'thunder'].includes(local)
          ? 65
          : ['mist', 'fog', 'caveDrip'].includes(local)
            ? 8
            : 0;
      for (const cell of room.cells.values()) {
        this.integratedCells++;
        const protection = shelter(roomId, cell);
        const dry = cell.substrate === 'dry' || biome.tags.includes('dry');
        const evaporation = protection.greenhouse
          ? 18
          : 18 +
            (dry ? 12 : biome.tags.includes('humid') ? -8 : 0) +
            (climate.globalWeather === 'heatwave' ? 25 : 0);
        cell.moisture = clamp(
          cell.moisture +
            days * ((protection.greenhouse ? 0 : rain * climate.weatherIntensity) - evaporation),
          0,
          100,
        );
        cell.weeds = clamp(cell.weeds + days * (cell.crop ? 1 : 4), 0, 100);
        const plant = cell.crop;
        if (!plant) {
          cell.fertility = clamp(cell.fertility + days * 2, 0, 100);
          continue;
        }
        if (plant.stage === 'withered') continue;
        const def = getCrop(plant.cropId);
        if (!def) continue;
        const validSeason = protection.greenhouse || def.seasons.includes(climate.season);
        plant.unsuitableDays = validSeason ? 0 : plant.unsuitableDays + days;
        const frost =
          !protection.greenhouse &&
          !def.coldTolerant &&
          (climate.globalWeather === 'coldfront' || ['snow', 'whiteout', 'sleet'].includes(local));
        const stress =
          (cell.moisture < 15 ? 8 : 0) +
          (frost ? 15 : 0) +
          (plant.unsuitableDays > 0.5 ? 12 : 0) +
          (cell.weeds > 70 ? 5 : 0) +
          (!protection.greenhouse && climate.globalWeather === 'storm' ? 5 : 0);
        plant.health = clamp(plant.health - stress * days, 0, 100);
        if (plant.health <= 0) {
          plant.stage = 'withered';
          this.touch(roomId, cell);
          continue;
        }
        const ideal = def.preferredTags.some((tag) => biome.tags.some((value) => value === tag));
        const harsh = (biome.tags.includes('cold') && !def.coldTolerant) || (dry && def.thirsty);
        const climateFactor = protection.greenhouse
          ? 1
          : !validSeason
            ? 0
            : ideal
              ? 1.25
              : harsh
                ? 0.55
                : 1;
        const water =
          cell.moisture < 15
            ? 0
            : cell.moisture < 30
              ? 0.5
              : cell.moisture > 80 && !def.thirsty
                ? 0.85
                : 1;
        const rate = clamp(
          climateFactor *
            water *
            (0.65 + (0.35 * cell.fertility) / 100) *
            Math.max(0.25, plant.health / 100),
          0,
          1.5,
        );
        plant.exposure += days;
        plant.care +=
          days * (stress === 0 && water === 1 ? (ideal && !protection.greenhouse ? 1.2 : 1) : -0.5);
        if (plant.progress < 1) {
          plant.progress = clamp(
            plant.progress +
              (days / (plant.regrowCount ? (def.regrowDays ?? def.growDays) : def.growDays)) * rate,
            0,
            1,
          );
          const stage = stageFor(plant);
          if (stage !== plant.stage) {
            plant.stage = stage;
            this.touch(roomId, cell);
          }
        }
      }
      room.revision++;
    }
  }
  quality(cell: FarmCell): 'normal' | 'good' | 'excellent' {
    const plant = cell.crop;
    if (!plant) return 'normal';
    const care = plant.care / Math.max(0.001, plant.exposure);
    const roll = stableStringHashUnsigned(plant.instanceId) % 100;
    return care > 0.85 && plant.health > 90 && roll < 40 + Math.max(0, care - 1) * 50
      ? 'excellent'
      : care > 0.5 && plant.health > 70
        ? 'good'
        : 'normal';
  }
  save(roomIds?: readonly string[]): FarmingSaveData {
    const rooms: FarmRoom[] = [...this.rooms]
      .filter(([id]) => !roomIds || roomIds.includes(id))
      .map(([roomId, room]) => ({
        roomId,
        biomeId: room.biomeId,
        revision: room.revision,
        cells: [...room.cells.values()],
      }));
    return structuredClone({ ...this.data, rooms });
  }
  load(save: FarmingSaveData | undefined, bounds = { cols: 512, rows: 512 }): void {
    this.clear();
    if (!save || save.schemaVersion !== 1) return;
    this.data.elapsedMs = finite(save.elapsedMs, 0, Number.MAX_SAFE_INTEGER);
    this.data.lastDawn = Number.isSafeInteger(save.lastDawn) ? save.lastDawn : -1;
    this.data.stolenLoot = (Array.isArray(save.stolenLoot) ? save.stolenLoot : [])
      .filter(
        (entry) =>
          entry &&
          typeof entry.actorId === 'string' &&
          typeof entry.itemId === 'string' &&
          Number.isSafeInteger(entry.count) &&
          entry.count > 0,
      )
      .slice(0, 1000)
      .map((entry) => ({ ...entry }));
    this.data.nextInstance = Math.max(
      1,
      Math.floor(finite(save.nextInstance, 1, Number.MAX_SAFE_INTEGER)),
    );
    this.data.annexOwners = (Array.isArray(save.annexOwners) ? save.annexOwners : [])
      .filter((id) => typeof id === 'string')
      .slice(0, 1000);
    this.data.actions = (Array.isArray(save.actions) ? save.actions : [])
      .filter(
        (action) =>
          action &&
          typeof action.playerId === 'string' &&
          Number.isSafeInteger(action.nonce) &&
          action.nonce > 0 &&
          typeof action.result?.ok === 'boolean',
      )
      .slice(0, 1000)
      .map((action) => structuredClone(action));
    const instanceIds = new Set<string>();
    for (const room of (Array.isArray(save.rooms) ? save.rooms : []).slice(0, 10000)) {
      if (!room || typeof room.roomId !== 'string' || !Array.isArray(room.cells)) continue;
      const address = parseCoordinateRoomId(room.roomId);
      if (!address || address.z !== 0) continue;
      const biome = getBiomeDefinition(room.biomeId);
      if (!biome) continue;
      for (const raw of room.cells.slice(0, 200)) {
        if (
          !raw ||
          !Number.isInteger(raw.x) ||
          !Number.isInteger(raw.y) ||
          raw.x < 0 ||
          raw.y < 0 ||
          raw.x >= bounds.cols ||
          raw.y >= bounds.rows
        )
          continue;
        if (this.get(room.roomId, raw.x, raw.y)) continue;
        const substrate = Object.prototype.hasOwnProperty.call(SOIL_FERTILITY, raw.substrate)
          ? raw.substrate
          : 'loam';
        const cell = this.till(
          room.roomId,
          getBiomeDefinition(room.biomeId).id,
          raw.x,
          raw.y,
          substrate,
        );
        if (!cell) continue;
        cell.revision = Math.floor(finite(raw.revision, 0, Number.MAX_SAFE_INTEGER));
        cell.moisture = finite(raw.moisture, 0, 100);
        cell.fertility = finite(raw.fertility, 0, 100);
        cell.weeds = finite(raw.weeds, 0, 100);
        cell.magicBed = raw.magicBed === true;
        if (room.roomId === '0,-1,0' && typeof raw.annexOwnerId === 'string')
          cell.annexOwnerId = raw.annexOwnerId;
        const plant = raw.crop;
        if (
          plant &&
          getCrop(plant.cropId) &&
          typeof plant.instanceId === 'string' &&
          !instanceIds.has(plant.instanceId) &&
          typeof plant.plantedBy === 'string'
        ) {
          instanceIds.add(plant.instanceId);
          cell.crop = {
            instanceId: plant.instanceId,
            cropId: plant.cropId,
            plantedBy: plant.plantedBy,
            progress: finite(plant.progress, 0, 1),
            stage: 'seeded',
            health: finite(plant.health, 0, 100),
            regrowCount: Math.floor(finite(plant.regrowCount, 0, 1000000)),
            care: finite(plant.care, -1000000, 1000000),
            exposure: finite(plant.exposure, 0, 1000000),
            unsuitableDays: finite(plant.unsuitableDays, 0, 1000000),
          };
          cell.crop.stage = stageFor(cell.crop);
          const number = Number(plant.instanceId.replace('crop-', ''));
          if (Number.isSafeInteger(number))
            this.data.nextInstance = Math.max(this.data.nextInstance, number + 1);
        }
      }
      const loaded = this.rooms.get(room.roomId);
      if (loaded) loaded.revision = Math.floor(finite(room.revision, 0, Number.MAX_SAFE_INTEGER));
    }
    this.data.incidents = (Array.isArray(save.incidents) ? save.incidents : [])
      .filter((event) => event && typeof event.id === 'string')
      .slice(-100)
      .map((event) => ({ ...event }));
    this.data.municipalBeds = (Array.isArray(save.municipalBeds) ? save.municipalBeds : [])
      .filter(
        (bed) =>
          bed &&
          typeof bed.roomId === 'string' &&
          Number.isInteger(bed.x) &&
          Number.isInteger(bed.y),
      )
      .slice(0, 10000)
      .map((bed) => ({ ...bed }));
    for (const segment of (Array.isArray(save.pending) ? save.pending : []).slice(0, 10)) {
      if (
        segment &&
        Number.isFinite(segment.durationMs) &&
        segment.durationMs > 0 &&
        this.pendingMs + segment.durationMs < 1000 &&
        validClimate(segment.climate)
      ) {
        this.data.pending.push(structuredClone(segment));
        this.pendingMs += segment.durationMs;
      }
    }
  }
  transact(
    playerId: string,
    nonce: number,
    execute: () => { ok: boolean; message?: string },
  ): { ok: boolean; message?: string } {
    const actions = this.data.actions ?? (this.data.actions = []);
    const previous = actions.find((action) => action.playerId === playerId);
    if (previous && nonce === previous.nonce) return { ...previous.result };
    if (!Number.isSafeInteger(nonce) || nonce !== (previous?.nonce ?? 0) + 1)
      return { ok: false, message: 'Stale agriculture action. Refresh the authoritative view.' };
    const result = execute();
    if (previous) {
      previous.nonce = nonce;
      previous.result = { ...result };
    } else actions.push({ playerId, nonce, result: { ...result } });
    return result;
  }
}
function finite(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? clamp(value, min, max) : min;
}
function stageFor(plant: FarmCrop): FarmCrop['stage'] {
  return plant.health <= 0
    ? 'withered'
    : plant.progress >= 1
      ? 'ready'
      : plant.progress >= 0.8
        ? 'mature'
        : plant.progress >= 0.5 || plant.regrowCount > 0
          ? 'young'
          : plant.progress >= 0.2
            ? 'sprout'
            : 'seeded';
}
function climateKey(state: AtmosphereState): string {
  return `${state.worldDay}:${state.dayPhase}:${state.season}:${state.globalWeather}:${state.weatherIntensity}`;
}
function validClimate(state: AtmosphereState): boolean {
  return Boolean(
    state &&
    ['spring', 'summer', 'autumn', 'winter'].includes(state.season) &&
    ['clear', 'rain', 'storm', 'fog', 'heatwave', 'coldfront', 'wind'].includes(
      state.globalWeather,
    ) &&
    Number.isFinite(state.weatherIntensity),
  );
}
