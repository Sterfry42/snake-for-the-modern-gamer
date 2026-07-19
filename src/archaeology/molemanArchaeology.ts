import { ARTIFACT_DEFINITIONS, type ArtifactDefinition } from '../artifacts/artifacts.js';
import { i18n } from '../i18n/i18nManager.js';
import { getItem } from '../inventory/itemRegistry.js';
import { clamp } from '../core/math.js';

export type DigSiteVariantId = 'forest' | 'ocean' | 'deep';

export type ArchaeologyTileKind =
  | 'dirt'
  | 'stone'
  | 'roots'
  | 'clay'
  | 'shell'
  | 'bone'
  | 'normal'
  | 'skittish'
  | 'pearl'
  | 'yuzu'
  | 'gold'
  | 'wasabi'
  | 'cold-beer'
  | 'artifact-cache';

export interface ArchaeologyTileDefinition {
  id: ArchaeologyTileKind;
  i18nLabel: string;
  color: number;
  textColor: string;
  matchable: boolean;
  appleItemId?: string;
}

export interface DigSiteVariant {
  id: DigSiteVariantId;
  i18nNameKey: string;
  tilePool: readonly ArchaeologyTileKind[];
  appleTiles: readonly ArchaeologyTileKind[];
  foremanLine: string;
}

export interface ArchaeologyRewardBundle {
  apples: Record<string, number>;
  equipment: Record<string, number>;
  supplies: Record<string, number>;
  artifacts: string[];
  score: number;
}

export interface ArchaeologyMatchEvent {
  tileId: ArchaeologyTileKind;
  count: number;
  chain: number;
  score: number;
  apples: Record<string, number>;
}

export interface ArchaeologyBoardCell {
  x: number;
  y: number;
  tile: ArchaeologyTileKind;
}

export interface ArchaeologyGravityMove {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  tile: ArchaeologyTileKind;
}

export type ArchaeologySessionEvent =
  | { kind: 'swap'; x: number; y: number }
  | { kind: 'match'; cells: ArchaeologyBoardCell[]; chain: number; score: number }
  | { kind: 'blast'; cells: ArchaeologyBoardCell[]; origins: ArchaeologyBoardCell[] }
  | { kind: 'pop'; cell: ArchaeologyBoardCell; index: number; total: number; chain: number }
  | { kind: 'gravity'; moves: ArchaeologyGravityMove[] }
  | { kind: 'raise'; depth: number }
  | { kind: 'reward'; label: string; cells?: ArchaeologyBoardCell[] }
  | { kind: 'cache'; artifactName: string }
  | { kind: 'game-over' };

export interface ArchaeologySessionSnapshot {
  variant: DigSiteVariant;
  board: readonly (ArchaeologyTileKind | null)[][];
  incomingRow: readonly (ArchaeologyTileKind | null)[];
  cursor: { x: number; y: number };
  depth: number;
  score: number;
  chain: number;
  maxChain: number;
  rewards: ArchaeologyRewardBundle;
  pendingMessages: string[];
  gameOver: boolean;
  riseProgress: number;
  resolving: boolean;
  highlightedCells: readonly ArchaeologyBoardCell[];
  poppingCell: ArchaeologyBoardCell | null;
  fallingMoves: readonly ArchaeologyGravityMove[];
  gravityProgress: number;
  stackDanger: number;
  topGraceProgress: number;
  topGraceActive: boolean;
}

export interface ArchaeologyTuning {
  rewardLuck?: number;
  equipmentRewardChance?: number;
  excavationAppleBonus?: number;
  goldAppleFrequency?: number;
}

const TOP_GRACE_MS = 3000;

export const ARCHAEOLOGY_TILE_DEFINITIONS: Record<ArchaeologyTileKind, ArchaeologyTileDefinition> =
  {
    dirt: {
      id: 'dirt',
      i18nLabel: 'archaeologyTileDirt',
      color: 0xd8a35a,
      textColor: '#33220f',
      matchable: true,
    },
    stone: {
      id: 'stone',
      i18nLabel: 'archaeologyTileStone',
      color: 0xb9c6d2,
      textColor: '#19212a',
      matchable: true,
    },
    roots: {
      id: 'roots',
      i18nLabel: 'archaeologyTileRoots',
      color: 0x63c66f,
      textColor: '#113218',
      matchable: true,
    },
    clay: {
      id: 'clay',
      i18nLabel: 'archaeologyTileClay',
      color: 0xf08b6d,
      textColor: '#3b1810',
      matchable: true,
    },
    shell: {
      id: 'shell',
      i18nLabel: 'archaeologyTileShell',
      color: 0xfff0c9,
      textColor: '#4b3516',
      matchable: true,
    },
    bone: {
      id: 'bone',
      i18nLabel: 'archaeologyTileBone',
      color: 0xf0e6c9,
      textColor: '#3a321f',
      matchable: true,
    },
    normal: {
      id: 'normal',
      i18nLabel: 'archaeologyTileNormalApple',
      color: 0xff5555,
      textColor: '#4a0505',
      matchable: true,
      appleItemId: 'apple-normal',
    },
    skittish: {
      id: 'skittish',
      i18nLabel: 'archaeologyTileSkittishApple',
      color: 0xff7f73,
      textColor: '#520b0b',
      matchable: true,
      appleItemId: 'apple-skittish',
    },
    pearl: {
      id: 'pearl',
      i18nLabel: 'archaeologyTilePearlApple',
      color: 0x8df3ff,
      textColor: '#08323a',
      matchable: true,
      appleItemId: 'apple-pearl',
    },
    yuzu: {
      id: 'yuzu',
      i18nLabel: 'archaeologyTileYuzuApple',
      color: 0xffe45f,
      textColor: '#4c3200',
      matchable: true,
      appleItemId: 'apple-yuzu',
    },
    gold: {
      id: 'gold',
      i18nLabel: 'archaeologyTileGoldenApple',
      color: 0xffce37,
      textColor: '#4a2f00',
      matchable: true,
      appleItemId: 'apple-gold',
    },
    wasabi: {
      id: 'wasabi',
      i18nLabel: 'archaeologyTileWasabiApple',
      color: 0x9ee84a,
      textColor: '#183005',
      matchable: true,
      appleItemId: 'apple-wasabi',
    },
    'cold-beer': {
      id: 'cold-beer',
      i18nLabel: 'archaeologyTileColdBeerApple',
      color: 0xf5a623,
      textColor: '#4a3000',
      matchable: true,
      appleItemId: 'apple-cold-beer',
    },
    'artifact-cache': {
      id: 'artifact-cache',
      i18nLabel: 'archaeologyTileArtifactCache',
      color: 0xc18cff,
      textColor: '#2a0b44',
      matchable: true,
    },
  };

export function resolveTileLabel(kind: ArchaeologyTileKind): string {
  return ARCHAEOLOGY_TILE_DEFINITIONS[kind].i18nLabel;
}

export const DIG_SITE_VARIANTS: readonly DigSiteVariant[] = [
  {
    id: 'forest',
    i18nNameKey: 'archaeologyForestDig',
    tilePool: ['dirt', 'stone', 'roots', 'normal'],
    appleTiles: ['normal'],
    foremanLine: 'Found roots, stones, and apples. That is normal enough. We keep digging.',
  },
  {
    id: 'ocean',
    i18nNameKey: 'archaeologyOceanDig',
    tilePool: ['dirt', 'clay', 'shell', 'pearl', 'yuzu'],
    appleTiles: ['pearl', 'yuzu'],
    foremanLine: 'Not sure why the sea is under here. Good shells, though.',
  },
  {
    id: 'deep',
    i18nNameKey: 'archaeologyDeepDig',
    tilePool: ['stone', 'bone', 'roots', 'gold', 'wasabi'],
    appleTiles: ['gold', 'wasabi'],
    foremanLine: 'Found six apples and a sword once. We filed it under Tuesday.',
  },
];

export function resolveVariantName(variant: DigSiteVariant): string {
  return variant.i18nNameKey;
}

const SUPPLY_REWARDS = ['rope', 'lead', 'animal-bait', 'healing-potion'] as const;
const EQUIPMENT_REWARDS = [
  'boots-quick',
  'helm-seer',
  'ring-seismic',
  'gloves-mason',
  'cloak-veil',
] as const;
const RARE_EQUIPMENT_REWARDS = [
  'amulet-phoenix',
  'belt-regenerator',
  'amulet-scavenger',
  'helm-cave-echo',
] as const;

export class MolemanArchaeologySession {
  readonly cols = 6;
  readonly rows = 12;
  readonly variant: DigSiteVariant;
  private board: (ArchaeologyTileKind | null)[][];
  private incomingRow: (ArchaeologyTileKind | null)[];
  private cursor = { x: 2, y: 6 };
  private depth = 1;
  private score = 0;
  private chain = 0;
  private maxChain = 0;
  private riseProgress = 0;
  private gameOver = false;
  private topGraceRemainingMs = 0;
  private resolver:
    | {
        kind: 'highlight';
        timerMs: number;
        cells: ArchaeologyBoardCell[];
        matchedCells: ArchaeologyBoardCell[];
        chain: number;
      }
    | {
        kind: 'pop';
        timerMs: number;
        cells: ArchaeologyBoardCell[];
        matchedCells: ArchaeologyBoardCell[];
        index: number;
        chain: number;
        scored: boolean;
      }
    | {
        kind: 'gravity';
        timerMs: number;
        durationMs: number;
        moves: ArchaeologyGravityMove[];
        chain: number;
      }
    | null = null;
  private chainSeed = 0;
  private activePoppingCell: ArchaeologyBoardCell | null = null;
  private visibleGravityMoves: ArchaeologyGravityMove[] = [];
  private readonly pendingMessages: string[] = [];
  private readonly pendingEvents: ArchaeologySessionEvent[] = [];
  private readonly rewards: ArchaeologyRewardBundle = {
    apples: {},
    equipment: {},
    supplies: {},
    artifacts: [],
    score: 0,
  };
  private i18nResolveFn?: (key: string) => string;

  constructor(
    variant: DigSiteVariant,
    private readonly rng: () => number = Math.random,
    private readonly tuning: ArchaeologyTuning = {},
  ) {
    this.variant = variant;
    this.board = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => null),
    );
    for (let y = Math.floor(this.rows / 2); y < this.rows; y += 1) {
      for (let x = 0; x < this.cols; x += 1) {
        this.board[y]![x] = this.rollTileAvoiding(x, y);
      }
    }
    this.scrubInitialMatches();
    this.incomingRow = this.createIncomingRow();
    this.pendingMessages.push(`${this.resolveVariantName(variant)}: ${variant.foremanLine}`);
  }

  setI18nResolver(resolveFn: (key: string) => string): void {
    this.i18nResolveFn = resolveFn;
  }

  private resolveTileLabel(kind: ArchaeologyTileKind): string {
    return this.i18nResolveFn
      ? this.i18nResolveFn(ARCHAEOLOGY_TILE_DEFINITIONS[kind].i18nLabel)
      : ARCHAEOLOGY_TILE_DEFINITIONS[kind].i18nLabel;
  }

  private resolveVariantName(v: DigSiteVariant): string {
    return this.i18nResolveFn ? this.i18nResolveFn(v.i18nNameKey) : v.i18nNameKey;
  }

  getSnapshot(): ArchaeologySessionSnapshot {
    const highlightedCells =
      this.resolver?.kind === 'highlight' || this.resolver?.kind === 'pop'
        ? this.resolver.cells
        : [];
    const gravityProgress =
      this.resolver?.kind === 'gravity'
        ? clamp(1 - this.resolver.timerMs / Math.max(1, this.resolver.durationMs), 0, 1)
        : 1;
    return {
      variant: this.variant,
      board: this.board.map((row) => [...row]),
      incomingRow: [...this.incomingRow],
      cursor: { ...this.cursor },
      depth: this.depth,
      score: this.score,
      chain: this.chain,
      maxChain: this.maxChain,
      rewards: {
        apples: { ...this.rewards.apples },
        equipment: { ...this.rewards.equipment },
        supplies: { ...this.rewards.supplies },
        artifacts: [...this.rewards.artifacts],
        score: this.rewards.score,
      },
      pendingMessages: [...this.pendingMessages],
      gameOver: this.gameOver,
      riseProgress: this.riseProgress,
      resolving: this.resolver !== null,
      highlightedCells,
      poppingCell: this.activePoppingCell ? { ...this.activePoppingCell } : null,
      fallingMoves: this.visibleGravityMoves.map((move) => ({ ...move })),
      gravityProgress,
      stackDanger: this.getStackDanger(),
      topGraceProgress:
        this.topGraceRemainingMs > 0 ? clamp(1 - this.topGraceRemainingMs / TOP_GRACE_MS, 0, 1) : 0,
      topGraceActive: this.topGraceRemainingMs > 0,
    };
  }

  consumeMessages(): string[] {
    return this.pendingMessages.splice(0);
  }

  consumeEvents(): ArchaeologySessionEvent[] {
    return this.pendingEvents.splice(0);
  }

  moveCursor(dx: number, dy: number): void {
    if (this.gameOver) return;
    this.cursor.x = clamp(this.cursor.x + dx, 0, this.cols - 2);
    this.cursor.y = clamp(this.cursor.y + dy, 0, this.rows - 1);
  }

  swap(): boolean {
    if (this.gameOver) return false;
    const y = this.cursor.y;
    const x = this.cursor.x;
    if (this.resolver && this.isSwapLocked(x, y)) {
      return false;
    }
    const row = this.board[y];
    if (!row) return false;
    const left = row[x];
    row[x] = row[x + 1] ?? null;
    row[x + 1] = left ?? null;
    this.pendingEvents.push({ kind: 'swap', x, y });
    if (!this.resolver) {
      this.chain = 0;
      this.chainSeed = 0;
      if (!this.tryBeginGravityResolution(0)) {
        this.tryBeginMatchResolution(1);
      }
    }
    return true;
  }

  tick(deltaMs: number): void {
    if (this.gameOver) return;
    if (this.resolver) {
      this.tickResolver(deltaMs);
      return;
    }
    this.activePoppingCell = null;
    this.visibleGravityMoves = [];
    if (!this.board[0]?.some(Boolean)) {
      this.topGraceRemainingMs = 0;
    } else if (this.topGraceRemainingMs <= 0) {
      this.topGraceRemainingMs = TOP_GRACE_MS;
      this.riseProgress = 0;
      this.pendingMessages.push(t('ceilingPressure'));
      return;
    }
    if (this.topGraceRemainingMs > 0) {
      this.topGraceRemainingMs -= deltaMs;
      this.riseProgress = 0;
      if (this.topGraceRemainingMs <= 0 && this.board[0]?.some(Boolean)) {
        this.gameOver = true;
        this.pendingMessages.push(t('ceilingReached'));
        this.pendingEvents.push({ kind: 'game-over' });
      }
      return;
    }
    const speed = 0.0002 + this.depth * 0.000018;
    this.riseProgress += deltaMs * speed;
    while (this.riseProgress >= 1 && !this.gameOver) {
      this.riseProgress -= 1;
      this.pushRow();
    }
  }

  private pushRow(): void {
    if (this.board[0]?.some(Boolean)) {
      this.topGraceRemainingMs = TOP_GRACE_MS;
      this.riseProgress = 0;
      this.pendingMessages.push(t('ceilingPressure'));
      return;
    }
    this.board.shift();
    this.board.push(this.incomingRow);
    this.incomingRow = this.createIncomingRow();
    this.cursor.y = clamp(this.cursor.y - 1, 0, this.rows - 1);
    this.depth += 1;
    this.pendingEvents.push({ kind: 'raise', depth: this.depth });
    if (!this.tryBeginGravityResolution(0)) {
      this.tryBeginMatchResolution(1);
    }
  }

  private createIncomingRow(): (ArchaeologyTileKind | null)[] {
    const row: (ArchaeologyTileKind | null)[] = [];
    for (let x = 0; x < this.cols; x += 1) {
      const cacheChance = Math.min(0.02 + this.depth * 0.001, 0.08);
      if (this.rng() < cacheChance) {
        row.push('artifact-cache');
        continue;
      }
      row.push(this.rollIncomingTileAvoiding(row, x));
    }
    return row;
  }

  private rollTile(): ArchaeologyTileKind {
    const rareAppleBonus = this.tuning.goldAppleFrequency ?? 0;
    if (rareAppleBonus > 0 && this.rng() < rareAppleBonus) {
      return this.variant.appleTiles.includes('gold')
        ? 'gold'
        : (this.variant.appleTiles[1] ?? this.variant.appleTiles[0] ?? this.variant.tilePool[0])!;
    }
    return this.variant.tilePool[Math.floor(this.rng() * this.variant.tilePool.length)]!;
  }

  private rollTileAvoiding(x: number, y: number): ArchaeologyTileKind {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const tile = this.rollTile();
      const horizontal =
        x >= 2 && this.board[y]?.[x - 1] === tile && this.board[y]?.[x - 2] === tile;
      const vertical = y >= 2 && this.board[y - 1]?.[x] === tile && this.board[y - 2]?.[x] === tile;
      if (!horizontal && !vertical) return tile;
    }
    return this.rollTile();
  }

  private rollIncomingTileAvoiding(
    row: readonly (ArchaeologyTileKind | null)[],
    x: number,
  ): ArchaeologyTileKind {
    for (let attempt = 0; attempt < 18; attempt += 1) {
      const tile = this.rollTile();
      const horizontal = x >= 2 && row[x - 1] === tile && row[x - 2] === tile;
      const vertical =
        this.board[this.rows - 1]?.[x] === tile && this.board[this.rows - 2]?.[x] === tile;
      if (!horizontal && !vertical) return tile;
    }
    return this.rollTile();
  }

  private scrubInitialMatches(): void {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const matches = this.findMatchCells();
      if (matches.length === 0) return;
      for (const cell of matches) {
        this.board[cell.y]![cell.x] = this.rollTileForPosition(cell.x, cell.y);
      }
    }
  }

  private rollTileForPosition(x: number, y: number): ArchaeologyTileKind {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const tile = this.rollTile();
      if (!this.wouldCreateMatchAt(x, y, tile)) return tile;
    }
    return this.rollTile();
  }

  private wouldCreateMatchAt(x: number, y: number, tile: ArchaeologyTileKind): boolean {
    const horizontal = this.countRunWithCandidate(x, y, tile, 1, 0) >= 3;
    const vertical = this.countRunWithCandidate(x, y, tile, 0, 1) >= 3;
    return horizontal || vertical;
  }

  private countRunWithCandidate(
    x: number,
    y: number,
    tile: ArchaeologyTileKind,
    dx: number,
    dy: number,
  ): number {
    let count = 1;
    for (const direction of [-1, 1]) {
      let cursorX = x + dx * direction;
      let cursorY = y + dy * direction;
      while (cursorX >= 0 && cursorX < this.cols && cursorY >= 0 && cursorY < this.rows) {
        const current = this.board[cursorY]?.[cursorX] ?? null;
        if (current !== tile) break;
        count += 1;
        cursorX += dx * direction;
        cursorY += dy * direction;
      }
    }
    return count;
  }

  private isSwapLocked(x: number, y: number): boolean {
    const locked = new Set<string>();
    const state = this.resolver;
    if (state?.kind === 'highlight' || state?.kind === 'pop') {
      for (const cell of state.cells) locked.add(key(cell.x, cell.y));
    }
    if (this.activePoppingCell) locked.add(key(this.activePoppingCell.x, this.activePoppingCell.y));
    for (const move of this.visibleGravityMoves) {
      locked.add(key(move.fromX, move.fromY));
      locked.add(key(move.toX, move.toY));
    }
    return locked.has(key(x, y)) || locked.has(key(x + 1, y));
  }

  private tickResolver(deltaMs: number): void {
    const state = this.resolver;
    if (!state) return;
    state.timerMs -= deltaMs;
    if (state.kind === 'highlight') {
      this.activePoppingCell = null;
      this.visibleGravityMoves = [];
      if (state.timerMs <= 0) {
        this.resolver = {
          kind: 'pop',
          timerMs: 0,
          cells: state.cells,
          matchedCells: state.matchedCells,
          index: 0,
          chain: state.chain,
          scored: false,
        };
      }
      return;
    }
    if (state.kind === 'pop') {
      if (!state.scored) {
        this.scoreAndRewardMatches(state.matchedCells, state.chain);
        state.scored = true;
      }
      while (state.timerMs <= 0 && state.index < state.cells.length) {
        const cell = state.cells[state.index]!;
        this.activePoppingCell = cell;
        if (this.board[cell.y]?.[cell.x] === cell.tile) {
          this.board[cell.y]![cell.x] = null;
        }
        this.pendingEvents.push({
          kind: 'pop',
          cell,
          index: state.index,
          total: state.cells.length,
          chain: state.chain,
        });
        state.index += 1;
        state.timerMs += 82;
      }
      if (state.index >= state.cells.length && state.timerMs <= 0) {
        if (!this.tryBeginGravityResolution(state.chain)) {
          this.activePoppingCell = null;
          this.visibleGravityMoves = [];
          if (!this.tryBeginMatchResolution(state.chain + 1)) {
            this.chain = 0;
            this.chainSeed = 0;
            this.resolver = null;
          }
        }
      }
      return;
    }
    if (state.kind === 'gravity' && state.timerMs <= 0) {
      this.activePoppingCell = null;
      this.visibleGravityMoves = [];
      if (this.tryBeginGravityResolution(state.chain)) {
        return;
      }
      if (!this.tryBeginMatchResolution(state.chain + 1)) {
        this.chain = 0;
        this.chainSeed = 0;
        this.resolver = null;
      }
    }
  }

  private tryBeginMatchResolution(chain: number): boolean {
    if (this.tryBeginGravityResolution(Math.max(0, chain - 1))) {
      return true;
    }
    const cells = this.findMatchCells();
    if (cells.length === 0) return false;
    const blastOrigins = cells.filter((cell) => cell.tile === 'artifact-cache');
    const resolvedCells = this.expandArtifactBlast(cells, blastOrigins);
    this.chainSeed = Math.max(this.chainSeed, chain);
    this.chain = this.chainSeed;
    this.maxChain = Math.max(this.maxChain, this.chain);
    const score = this.estimateMatchScore(cells, this.chain);
    this.resolver = {
      kind: 'highlight',
      timerMs: 220,
      cells: resolvedCells,
      matchedCells: cells,
      chain: this.chain,
    };
    this.pendingEvents.push({ kind: 'match', cells, chain: this.chain, score });
    if (blastOrigins.length > 0) {
      this.pendingEvents.push({ kind: 'blast', cells: resolvedCells, origins: blastOrigins });
    }
    return true;
  }

  private expandArtifactBlast(
    matchedCells: readonly ArchaeologyBoardCell[],
    origins: readonly ArchaeologyBoardCell[],
  ): ArchaeologyBoardCell[] {
    const destroyed = new Map(matchedCells.map((cell) => [key(cell.x, cell.y), cell]));
    for (const origin of origins) {
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          if (dx * dx + dy * dy > 4) continue;
          const x = origin.x + dx;
          const y = origin.y + dy;
          const tile = this.board[y]?.[x] ?? null;
          if (tile) destroyed.set(key(x, y), { x, y, tile });
        }
      }
    }
    return [...destroyed.values()].sort((a, b) => a.y - b.y || a.x - b.x);
  }

  private tryBeginGravityResolution(chain: number): boolean {
    const moves = this.applyGravity();
    this.visibleGravityMoves = moves;
    if (moves.length === 0) {
      return false;
    }
    const durationMs = 300;
    this.resolver = {
      kind: 'gravity',
      timerMs: durationMs,
      durationMs,
      moves,
      chain,
    };
    this.pendingEvents.push({ kind: 'gravity', moves });
    return true;
  }

  private applyGravity(): ArchaeologyGravityMove[] {
    const moves: ArchaeologyGravityMove[] = [];
    for (let x = 0; x < this.cols; x += 1) {
      const stack: Array<{ tile: ArchaeologyTileKind; fromY: number }> = [];
      for (let y = this.rows - 1; y >= 0; y -= 1) {
        const tile = this.board[y]?.[x];
        if (tile) stack.push({ tile, fromY: y });
      }
      for (let y = this.rows - 1; y >= 0; y -= 1) {
        const entry = stack.shift() ?? null;
        this.board[y]![x] = entry?.tile ?? null;
        if (entry && entry.fromY !== y) {
          moves.push({ fromX: x, fromY: entry.fromY, toX: x, toY: y, tile: entry.tile });
        }
      }
    }
    return moves;
  }

  private findMatchCells(): ArchaeologyBoardCell[] {
    const matched = new Map<string, ArchaeologyBoardCell>();
    for (let y = 0; y < this.rows; y += 1) {
      let runStart = 0;
      for (let x = 1; x <= this.cols; x += 1) {
        if (x < this.cols && this.isSameMatchable(x, y, runStart, y)) continue;
        if (x - runStart >= 3) {
          for (let fillX = runStart; fillX < x; fillX += 1) {
            this.addMatchedCell(matched, fillX, y);
          }
        }
        runStart = x;
      }
    }
    for (let x = 0; x < this.cols; x += 1) {
      let runStart = 0;
      for (let y = 1; y <= this.rows; y += 1) {
        if (y < this.rows && this.isSameMatchable(x, y, x, runStart)) continue;
        if (y - runStart >= 3) {
          for (let fillY = runStart; fillY < y; fillY += 1) {
            this.addMatchedCell(matched, x, fillY);
          }
        }
        runStart = y;
      }
    }
    return [...matched.values()].sort((a, b) => a.y - b.y || a.x - b.x);
  }

  private addMatchedCell(matched: Map<string, ArchaeologyBoardCell>, x: number, y: number): void {
    const tile = this.board[y]?.[x] ?? null;
    if (!tile) return;
    matched.set(key(x, y), { x, y, tile });
  }

  private isSameMatchable(ax: number, ay: number, bx: number, by: number): boolean {
    const a = this.board[ay]?.[ax] ?? null;
    const b = this.board[by]?.[bx] ?? null;
    return Boolean(a && b && a === b && ARCHAEOLOGY_TILE_DEFINITIONS[a].matchable);
  }

  private estimateMatchScore(cells: readonly ArchaeologyBoardCell[], chain: number): number {
    const byTile = new Map<ArchaeologyTileKind, number>();
    for (const cell of cells) byTile.set(cell.tile, (byTile.get(cell.tile) ?? 0) + 1);
    let total = 0;
    for (const count of byTile.values()) {
      total += this.scoreForMatch(count, chain);
    }
    return total;
  }

  private scoreAndRewardMatches(cells: readonly ArchaeologyBoardCell[], chain: number): void {
    const byTile = new Map<ArchaeologyTileKind, number>();
    for (const cell of cells) {
      byTile.set(cell.tile, (byTile.get(cell.tile) ?? 0) + 1);
    }
    for (const [tile, count] of byTile) {
      const matchScore = this.scoreForMatch(count, chain);
      let awardedScore = matchScore;
      this.score += awardedScore;
      this.rewards.score += awardedScore;
      const apples = this.appleRewardFor(tile, count);
      for (const [itemId, amount] of Object.entries(apples)) {
        this.rewards.apples[itemId] = (this.rewards.apples[itemId] ?? 0) + amount;
      }
      if (tile === 'artifact-cache') {
        awardedScore += this.recoverArtifact({ baseScore: 9, duplicateBonus: 5 });
      }
      const appleCount = Object.values(apples).reduce((total, amount) => total + amount, 0);
      const label =
        appleCount > 0
          ? t('appleScore', { count: appleCount, score: awardedScore })
          : t('plusScore', { score: awardedScore });
      this.pendingMessages.push(label);
      this.pendingEvents.push({
        kind: 'reward',
        label,
        cells: cells.filter((cell) => cell.tile === tile),
      });
      this.rollChainRewards(chain);
    }
  }

  private appleRewardFor(tile: ArchaeologyTileKind, count: number): Record<string, number> {
    const appleItemId = ARCHAEOLOGY_TILE_DEFINITIONS[tile].appleItemId;
    if (!appleItemId) return {};
    const bonus = Math.max(0, Math.floor(this.tuning.excavationAppleBonus ?? 0));
    return { [appleItemId]: 1 + bonus + (count >= 5 ? 1 : 0) };
  }

  private rollChainRewards(chain: number): void {
    const luck = this.tuning.rewardLuck ?? 0;
    const equipmentBonus = this.tuning.equipmentRewardChance ?? 0;
    if (chain >= 3 && this.rng() < 0.22 + luck) {
      this.addReward(this.rewards.supplies, pick(SUPPLY_REWARDS, this.rng), 1);
    }
    if (chain >= 5 && this.rng() < 0.14 + luck + equipmentBonus) {
      this.addReward(this.rewards.equipment, pick(EQUIPMENT_REWARDS, this.rng), 1);
    }
    if (chain >= 7 && this.rng() < 0.08 + luck + equipmentBonus) {
      this.addReward(this.rewards.equipment, pick(RARE_EQUIPMENT_REWARDS, this.rng), 1);
    }
    if (chain >= 10 && this.rng() < 0.24 + luck) {
      this.recoverArtifact();
    }
  }

  private recoverArtifact(options: { baseScore?: number; duplicateBonus?: number } = {}): number {
    const artifact = this.rollArtifact();
    const baseScore = options.baseScore ?? 0;
    if (this.rewards.artifacts.includes(artifact.id)) {
      const duplicateScore = options.duplicateBonus ?? 4;
      const score = baseScore + duplicateScore;
      this.score += score;
      this.rewards.score += score;
      this.pendingMessages.push(t('artifactDuplicate', { name: artifact.name }));
      this.pendingEvents.push({
        kind: 'reward',
        label: t('artifactDuplicateShort', { name: artifact.name }),
      });
      this.pendingEvents.push({ kind: 'cache', artifactName: artifact.name });
      return score;
    }
    if (baseScore > 0) {
      this.score += baseScore;
      this.rewards.score += baseScore;
    }
    this.rewards.artifacts.push(artifact.id);
    this.pendingMessages.push(t('artifactRecovered', { name: artifact.name }));
    this.pendingEvents.push({
      kind: 'reward',
      label: t('artifactRecovered', { name: artifact.name }),
    });
    this.pendingEvents.push({ kind: 'cache', artifactName: artifact.name });
    return baseScore;
  }

  private rollArtifact(): ArtifactDefinition {
    const roll = this.rng() + (this.tuning.rewardLuck ?? 0) * 0.5;
    const rarity =
      roll > 0.96 ? 'legendary' : roll > 0.82 ? 'rare' : roll > 0.52 ? 'uncommon' : 'common';
    const candidates = ARTIFACT_DEFINITIONS.filter((artifact) => artifact.rarity === rarity);
    return pick(candidates.length > 0 ? candidates : ARTIFACT_DEFINITIONS, this.rng);
  }

  private addReward(target: Record<string, number>, itemId: string, count: number): void {
    target[itemId] = (target[itemId] ?? 0) + count;
    const label = t('recoveredItem', { name: getItem(itemId)?.name ?? itemId.replace(/-/g, ' ') });
    this.pendingMessages.push(label);
    this.pendingEvents.push({ kind: 'reward', label });
  }

  private scoreForMatch(count: number, chain: number): number {
    const matchScore = count <= 3 ? 1 : 1 + (count - 3) * 2;
    const chainBonus = Math.max(0, chain - 1);
    return matchScore + chainBonus;
  }

  private getStackDanger(): number {
    let topOccupied = this.rows;
    for (let y = 0; y < this.rows; y += 1) {
      if (this.board[y]?.some(Boolean)) {
        topOccupied = y;
        break;
      }
    }
    if (this.topGraceRemainingMs > 0) return 0;
    const dangerStartRow = Math.max(0, Math.floor(this.rows / 3) - 1);
    if (topOccupied > dangerStartRow) return 0;
    return clamp((dangerStartRow - topOccupied + 1) / (dangerStartRow + 1), 0, 1);
  }
}

export function getDigSiteVariant(id: DigSiteVariantId): DigSiteVariant {
  const variant =
    DIG_SITE_VARIANTS.find((candidate) => candidate.id === id) ?? DIG_SITE_VARIANTS[0]!;
  return {
    ...variant,
    foremanLine: i18n.getCommon(`archaeology.${variant.id}Line`),
  };
}

export function chooseDigSiteVariant(
  biomeId: string,
  rng: () => number = Math.random,
): DigSiteVariant {
  if (biomeId === 'sunken-ocean') return getDigSiteVariant('ocean');
  if (biomeId === 'sable-depths') return getDigSiteVariant('deep');
  if (rng() < 0.18) return getDigSiteVariant('deep');
  return getDigSiteVariant('forest');
}

function pick<T>(values: readonly T[], rng: () => number): T {
  return values[Math.floor(rng() * values.length)]!;
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

function t(key: string, replacements: Record<string, string | number> = {}): string {
  return Object.entries(replacements).reduce(
    (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
    i18n.getCommon(`archaeology.${key}`),
  );
}
