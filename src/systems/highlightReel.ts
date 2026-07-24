import type { ModernRunEvent } from './modernRun.js';

export type HighlightClipKind =
  | 'apple-chain'
  | 'apple-stamp'
  | 'room-tour'
  | 'enemy-bite'
  | 'treasure-pop';

export interface HighlightClip {
  id: string;
  kind: HighlightClipKind;
  title: string;
  caption: string;
  roomId: string;
  hype: number;
  subscribers: number;
}

export interface HighlightChannelState {
  subscribers: number;
  hype: number;
  bestHype: number;
  rank: number;
  claimedRanks: number[];
}

export interface HighlightReelCounters {
  apples: number;
  rooms: number;
  enemies: number;
  treasures: number;
  clipsRecorded: number;
}

export interface HighlightReelState {
  channel: HighlightChannelState;
  clips: HighlightClip[];
  counters: HighlightReelCounters;
  seenAppleTypes: string[];
}

export interface HighlightReelUpdate {
  state: HighlightReelState;
  scoreBonus: number;
  growthBonus: number;
  messages: string[];
}

const MAX_CLIPS = 12;

const CHANNEL_RANKS = [
  { subscribers: 10, rank: 1, label: 'Sidewalk Famous', score: 12, growth: 0 },
  { subscribers: 35, rank: 2, label: 'Bodega Broadcast', score: 30, growth: 0 },
  { subscribers: 80, rank: 3, label: 'Late-Night Legend', score: 55, growth: 1 },
  { subscribers: 150, rank: 4, label: 'Museum of Motion', score: 90, growth: 1 },
] as const;

export function createHighlightReelState(): HighlightReelState {
  return {
    channel: { subscribers: 0, hype: 0, bestHype: 0, rank: 0, claimedRanks: [] },
    clips: [],
    counters: { apples: 0, rooms: 1, enemies: 0, treasures: 0, clipsRecorded: 0 },
    seenAppleTypes: [],
  };
}

export function normalizeHighlightReelState(value: unknown): HighlightReelState {
  if (!isRecord(value)) return createHighlightReelState();
  const channel = isRecord(value.channel) ? value.channel : {};
  const counters = isRecord(value.counters) ? value.counters : {};
  return {
    channel: {
      subscribers: positiveInteger(channel.subscribers),
      hype: positiveInteger(channel.hype),
      bestHype: positiveInteger(channel.bestHype),
      rank: positiveInteger(channel.rank),
      claimedRanks: numberList(channel.claimedRanks),
    },
    clips: Array.isArray(value.clips)
      ? value.clips.filter(isRecord).map(normalizeClip).slice(-MAX_CLIPS)
      : [],
    counters: {
      apples: positiveInteger(counters.apples),
      rooms: Math.max(1, positiveInteger(counters.rooms)),
      enemies: positiveInteger(counters.enemies),
      treasures: positiveInteger(counters.treasures),
      clipsRecorded: positiveInteger(counters.clipsRecorded),
    },
    seenAppleTypes: stringList(value.seenAppleTypes),
  };
}

export function processHighlightEvent(
  currentState: HighlightReelState,
  event: ModernRunEvent,
): HighlightReelUpdate {
  const state = cloneHighlightReelState(currentState);
  const messages: string[] = [];
  const newClips: HighlightClip[] = [];
  let scoreBonus = 0;
  let growthBonus = 0;

  if (event.kind === 'apple') {
    state.counters.apples += 1;
    if (event.appleTypeId && !state.seenAppleTypes.includes(event.appleTypeId)) {
      state.seenAppleTypes.push(event.appleTypeId);
      newClips.push(
        createClip(state, 'apple-stamp', event.roomId, {
          title: 'New Apple Stamp',
          caption: `${formatAppleType(event.appleTypeId)} enters the reel.`,
          hype: 3,
          subscribers: 2,
        }),
      );
    }
    if (event.streak >= 5) {
      newClips.push(
        createClip(state, 'apple-chain', event.roomId, {
          title: 'Chain With Intent',
          caption: `${event.streak} apples before the camera blinked.`,
          hype: Math.min(18, 4 + event.streak),
          subscribers: Math.min(14, Math.floor(event.streak / 2)),
        }),
      );
    }
  } else if (event.kind === 'room') {
    state.counters.rooms += 1;
    if (state.counters.rooms % 5 === 0) {
      newClips.push(
        createClip(state, 'room-tour', event.roomId, {
          title: 'Room Tour',
          caption: `${state.counters.rooms} rooms, all angles, no filler.`,
          hype: 8,
          subscribers: 6,
        }),
      );
    }
  } else if (event.kind === 'enemy') {
    state.counters.enemies += 1;
    newClips.push(
      createClip(state, 'enemy-bite', event.roomId, {
        title: event.humanoid ? 'Messy Street Food' : 'Predator Cut',
        caption: event.humanoid
          ? 'A hostile critic got reviewed by teeth.'
          : 'Clean bite. No notes.',
        hype: event.humanoid ? 12 : 7,
        subscribers: event.humanoid ? 8 : 4,
      }),
    );
  } else {
    state.counters.treasures += 1;
    newClips.push(
      createClip(state, 'treasure-pop', event.roomId, {
        title: 'Chest Opened on Camera',
        caption: 'Loot reveal with proper lighting.',
        hype: 9,
        subscribers: 5,
      }),
    );
  }

  for (const clip of newClips) {
    publishClip(state, clip);
    scoreBonus += Math.max(1, Math.floor(clip.hype / 3));
    messages.push(`HIGHLIGHT: ${clip.title}. +${clip.subscribers} subscribers.`);
  }

  const rankUpdate = updateChannelRank(state);
  state.channel = rankUpdate.channel;
  scoreBonus += rankUpdate.scoreBonus;
  growthBonus += rankUpdate.growthBonus;
  messages.push(...rankUpdate.messages);

  return { state, scoreBonus, growthBonus, messages };
}

export function getHighlightReelSummary(state: HighlightReelState): string {
  const latest = state.clips[state.clips.length - 1];
  return `Subscribers ${state.channel.subscribers}; Hype ${state.channel.hype}; Rank ${state.channel.rank}; Latest ${latest?.title ?? 'none'}`;
}

function createClip(
  state: HighlightReelState,
  kind: HighlightClipKind,
  roomId: string,
  clip: Omit<HighlightClip, 'id' | 'kind' | 'roomId'>,
): HighlightClip {
  return {
    id: `clip-${state.counters.clipsRecorded + 1}`,
    kind,
    roomId,
    ...clip,
  };
}

function publishClip(state: HighlightReelState, clip: HighlightClip): void {
  state.counters.clipsRecorded += 1;
  state.clips.push(clip);
  state.clips = state.clips.slice(-MAX_CLIPS);
  state.channel.subscribers += clip.subscribers;
  state.channel.hype += clip.hype;
  state.channel.bestHype = Math.max(state.channel.bestHype, state.channel.hype);
}

function updateChannelRank(state: HighlightReelState): {
  channel: HighlightChannelState;
  scoreBonus: number;
  growthBonus: number;
  messages: string[];
} {
  const channel = { ...state.channel, claimedRanks: [...state.channel.claimedRanks] };
  let scoreBonus = 0;
  let growthBonus = 0;
  const messages: string[] = [];
  for (const rank of CHANNEL_RANKS) {
    if (channel.subscribers >= rank.subscribers && !channel.claimedRanks.includes(rank.rank)) {
      channel.rank = Math.max(channel.rank, rank.rank);
      channel.claimedRanks.push(rank.rank);
      scoreBonus += rank.score;
      growthBonus += rank.growth;
      messages.push(
        `CHANNEL RANK: ${rank.label}. +${rank.score} score${
          rank.growth > 0 ? `, +${rank.growth} growth` : ''
        }.`,
      );
    }
  }
  channel.claimedRanks.sort((a, b) => a - b);
  return { channel, scoreBonus, growthBonus, messages };
}

function normalizeClip(value: Record<string, unknown>): HighlightClip {
  return {
    id: typeof value.id === 'string' ? value.id : 'clip-legacy',
    kind: isClipKind(value.kind) ? value.kind : 'apple-chain',
    title: typeof value.title === 'string' ? value.title : 'Untitled Clip',
    caption: typeof value.caption === 'string' ? value.caption : '',
    roomId: typeof value.roomId === 'string' ? value.roomId : '0,0,0',
    hype: positiveInteger(value.hype),
    subscribers: positiveInteger(value.subscribers),
  };
}

function cloneHighlightReelState(state: HighlightReelState): HighlightReelState {
  return {
    channel: { ...state.channel, claimedRanks: [...state.channel.claimedRanks] },
    clips: state.clips.map((clip) => ({ ...clip })),
    counters: { ...state.counters },
    seenAppleTypes: [...state.seenAppleTypes],
  };
}

function isClipKind(value: unknown): value is HighlightClipKind {
  return (
    value === 'apple-chain' ||
    value === 'apple-stamp' ||
    value === 'room-tour' ||
    value === 'enemy-bite' ||
    value === 'treasure-pop'
  );
}

function formatAppleType(typeId: string): string {
  return typeId
    .split(/[-_.]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function positiveInteger(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((entry): entry is string => typeof entry === 'string'))].sort();
}

function numberList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(value.map((entry) => positiveInteger(entry)).filter((entry) => entry > 0)),
  ].sort((a, b) => a - b);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
