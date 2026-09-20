import type { ModernRunEvent } from './modernRun.js';

export type HighlightCaptureEvent =
  | { kind: 'apple'; appleTypeId?: string; streak: number; roomId: string; recordedAtMs: number }
  | { kind: 'room'; roomId: string; recordedAtMs: number }
  | { kind: 'enemy'; roomId: string; humanoid: boolean; recordedAtMs: number }
  | { kind: 'treasure'; roomId: string; recordedAtMs: number };

export interface HighlightClip {
  id: string;
  title: string;
  recordedAt: number;
  durationMs: number;
  tags: string[];
  views: number;
  likes: number;
  followersGained: number;
  scoreAwarded: number;
}

export interface HighlightChannelState {
  followers: number;
  lifetimeViews: number;
  lifetimeLikes: number;
  scoreEarned: number;
  // Legacy fields stay readable so old saves/tests normalize instead of exploding.
  subscribers: number;
  hype: number;
  bestHype: number;
  rank: number;
  claimedRanks: number[];
}

export interface HighlightRecordingSession {
  startedAtMs: number;
  events: HighlightCaptureEvent[];
  roomIds: string[];
}

export interface HighlightReelState {
  channel: HighlightChannelState;
  clips: HighlightClip[];
  recentTags: string[];
  recording?: HighlightRecordingSession;
}

export interface HighlightReelUpdate {
  state: HighlightReelState;
  scoreBonus: number;
  growthBonus: number;
  messages: string[];
}

export interface HighlightSubmissionPreview {
  clip: HighlightClip;
  completedChallenges: string[];
}

const MAX_CLIPS = 3;
const RECENT_TAG_LIMIT = 18;

export function createHighlightReelState(): HighlightReelState {
  return {
    channel: {
      followers: 12,
      lifetimeViews: 0,
      lifetimeLikes: 0,
      scoreEarned: 0,
      subscribers: 12,
      hype: 0,
      bestHype: 0,
      rank: 0,
      claimedRanks: [],
    },
    clips: [],
    recentTags: [],
  };
}

export function normalizeHighlightReelState(value: unknown): HighlightReelState {
  if (!isRecord(value)) return createHighlightReelState();
  const base = createHighlightReelState();
  const channel = isRecord(value.channel) ? value.channel : {};
  const followers = positiveInteger(
    channel.followers ?? channel.subscribers ?? base.channel.followers,
  );
  return {
    channel: {
      followers,
      lifetimeViews: positiveInteger(channel.lifetimeViews),
      lifetimeLikes: positiveInteger(channel.lifetimeLikes),
      scoreEarned: positiveInteger(channel.scoreEarned),
      subscribers: followers,
      hype: positiveInteger(channel.hype),
      bestHype: positiveInteger(channel.bestHype),
      rank: positiveInteger(channel.rank),
      claimedRanks: numberList(channel.claimedRanks),
    },
    clips: Array.isArray(value.clips)
      ? value.clips.filter(isRecord).map(normalizeClip).slice(-MAX_CLIPS)
      : [],
    recentTags: stringList(value.recentTags).slice(-RECENT_TAG_LIMIT),
    recording: normalizeRecording(value.recording),
  };
}

export function startHighlightRecording(
  currentState: HighlightReelState,
  startedAtMs: number,
): HighlightReelState {
  return {
    ...cloneHighlightReelState(currentState),
    recording: { startedAtMs, events: [], roomIds: [] },
  };
}

export function cancelHighlightRecording(currentState: HighlightReelState): HighlightReelState {
  const state = cloneHighlightReelState(currentState);
  state.recording = undefined;
  return state;
}

export function recordHighlightCaptureEvent(
  currentState: HighlightReelState,
  event: ModernRunEvent,
  recordedAtMs: number,
): HighlightReelState {
  const state = cloneHighlightReelState(currentState);
  if (!state.recording) return state;
  const captured = toCaptureEvent(event, recordedAtMs);
  state.recording.events.push(captured);
  state.recording.roomIds = [...new Set([...state.recording.roomIds, captured.roomId])];
  return state;
}

export function previewHighlightSubmission(
  currentState: HighlightReelState,
  recordedAt: number,
  durationMs: number,
): HighlightSubmissionPreview {
  const state = cloneHighlightReelState(currentState);
  const events = state.recording?.events ?? [];
  const tags = buildTags(events, durationMs);
  const views = calculateViews(state, events, tags, durationMs);
  const likeRate = Math.min(
    0.42,
    0.06 + tags.length * 0.018 + (tags.includes('boss-energy') ? 0.06 : 0),
  );
  const likes = Math.floor(views * likeRate);
  const followersGained = Math.floor(likes * 0.065 + Math.max(0, tags.length - 1));
  const scoreAwarded = Math.floor(views / 100);
  return {
    clip: {
      id: `clip-${recordedAt.toString(36)}`,
      title: titleForTags(tags, events),
      recordedAt,
      durationMs,
      tags,
      views,
      likes,
      followersGained,
      scoreAwarded,
    },
    completedChallenges: completedChallenges(tags, events, durationMs),
  };
}

export function submitHighlightRecording(
  currentState: HighlightReelState,
  clip: HighlightClip,
  replaceClipId?: string,
): HighlightReelState {
  const state = cloneHighlightReelState(currentState);
  const clips =
    replaceClipId !== undefined
      ? state.clips.filter((existing) => existing.id !== replaceClipId)
      : state.clips;
  state.clips = [...clips, clip].slice(-MAX_CLIPS);
  state.recentTags = [...state.recentTags, ...clip.tags].slice(-RECENT_TAG_LIMIT);
  state.channel.followers += clip.followersGained;
  state.channel.subscribers = state.channel.followers;
  state.channel.lifetimeViews += clip.views;
  state.channel.lifetimeLikes += clip.likes;
  state.channel.scoreEarned += clip.scoreAwarded;
  state.recording = undefined;
  return state;
}

export function getHighlightReelSummary(state: HighlightReelState): string {
  const latest = state.clips[state.clips.length - 1];
  return `Followers ${state.channel.followers}; Lifetime views ${state.channel.lifetimeViews}; Clips ${state.clips.length}/${MAX_CLIPS}; Latest ${latest?.title ?? 'none'}`;
}

// Passive highlight publishing is intentionally disabled. The next version is GoPro-first:
// equip camera, announce the shot, record live gameplay, review footage, then choose to post.
export function processHighlightEvent(
  currentState: HighlightReelState,
  event: ModernRunEvent,
): HighlightReelUpdate {
  void event;
  return {
    state: cloneHighlightReelState(currentState),
    scoreBonus: 0,
    growthBonus: 0,
    messages: [],
  };
}

function toCaptureEvent(event: ModernRunEvent, recordedAtMs: number): HighlightCaptureEvent {
  if (event.kind === 'apple') return { ...event, recordedAtMs };
  if (event.kind === 'enemy') return { ...event, recordedAtMs };
  if (event.kind === 'treasure') return { ...event, recordedAtMs };
  return { ...event, recordedAtMs };
}

function buildTags(events: HighlightCaptureEvent[], durationMs: number): string[] {
  const tags: string[] = [];
  const enemies = events.filter((event) => event.kind === 'enemy');
  const apples = events.filter((event) => event.kind === 'apple');
  const humanoids = enemies.filter((event) => event.humanoid);
  if (events.some((event) => event.kind === 'treasure')) tags.push('treasure-pop');
  if (events.some((event) => event.kind === 'room')) tags.push('room-transition');
  if (apples.length > 0) tags.push('apple-eaten');
  if (apples.some((event) => event.appleTypeId && event.appleTypeId !== 'base'))
    tags.push('rare-apple');
  if (apples.some((event) => event.streak >= 5)) tags.push('apple-chain');
  if (enemies.length >= 3) tags.push('three-kill');
  if (humanoids.length > 0) tags.push('humanoid-eaten');
  if (humanoids.length >= 2) tags.push('street-food-double');
  if (events.length === 0) tags.push('empty-shot');
  if (durationMs < 1000) tags.push('low-effort');
  if (tags.length >= 4) tags.push('nobody-will-believe-this');
  return [...new Set(tags)];
}

function calculateViews(
  state: HighlightReelState,
  events: HighlightCaptureEvent[],
  tags: string[],
  durationMs: number,
): number {
  const appleCount = events.filter((event) => event.kind === 'apple').length;
  const enemyCount = events.filter((event) => event.kind === 'enemy').length;
  const humanoidCount = events.filter((event) => event.kind === 'enemy' && event.humanoid).length;
  const treasureCount = events.filter((event) => event.kind === 'treasure').length;
  const roomCount = events.filter((event) => event.kind === 'room').length;
  const rareAppleCount = events.filter(
    (event) => event.kind === 'apple' && event.appleTypeId && event.appleTypeId !== 'base',
  ).length;
  const contentReach =
    appleCount * 18 +
    enemyCount * 40 +
    humanoidCount * 80 +
    rareAppleCount * 125 +
    treasureCount * 90 +
    roomCount * 35 +
    (tags.includes('three-kill') ? 220 : 0) +
    (tags.includes('nobody-will-believe-this') ? 300 : 0);
  const audienceReach = Math.floor(state.channel.followers);
  const noveltyScalar = noveltyScalarFor(tags, state.recentTags);
  const durationScalar = durationMs < 1000 && contentReach < 300 ? 0.2 : 1;
  return Math.max(1, Math.floor((audienceReach + contentReach) * noveltyScalar * durationScalar));
}

function noveltyScalarFor(tags: string[], recentTags: string[]): number {
  if (tags.length === 0) return 1;
  const repeated = tags.filter((tag) => recentTags.includes(tag)).length;
  const comboBonus = tags.length >= 3 ? 0.2 : 0;
  return Math.max(0.35, 1 - repeated * 0.16 + comboBonus);
}

function titleForTags(tags: string[], events: HighlightCaptureEvent[]): string {
  if (tags.includes('three-kill') && tags.includes('room-transition')) return 'Drive-By Dining';
  if (tags.includes('three-kill')) return 'Three-Course Meal';
  if (tags.includes('rare-apple') && tags.includes('apple-chain'))
    return 'Wasabi Momentum Incident';
  if (tags.includes('humanoid-eaten')) return 'Street Food Review';
  if (tags.includes('treasure-pop')) return 'Loot With Lighting';
  if (tags.includes('room-transition')) return 'Found Footage';
  if (events.length > 0) return 'Six Seconds, One Bad Idea';
  return 'Static From The Maze';
}

function completedChallenges(
  tags: string[],
  events: HighlightCaptureEvent[],
  durationMs: number,
): string[] {
  const complete: string[] = [];
  if (tags.includes('humanoid-eaten') && tags.includes('room-transition'))
    complete.push('Drive-By Dining');
  if (tags.includes('three-kill')) complete.push('Three-Course Meal');
  if (tags.includes('room-transition')) complete.push('Found Footage');
  if (
    events.some(
      (event) =>
        event.kind === 'apple' && event.streak >= 5 && durationMs - event.recordedAtMs <= 1000,
    )
  ) {
    complete.push('Hard Cut');
  }
  return complete;
}

function normalizeClip(value: Record<string, unknown>): HighlightClip {
  return {
    id: typeof value.id === 'string' ? value.id : `clip-${Date.now().toString(36)}`,
    title: typeof value.title === 'string' ? value.title : 'Untitled Clip',
    recordedAt: positiveInteger(value.recordedAt),
    durationMs: positiveInteger(value.durationMs),
    tags: stringList(value.tags),
    views: positiveInteger(value.views),
    likes: positiveInteger(value.likes),
    followersGained: positiveInteger(value.followersGained),
    scoreAwarded: positiveInteger(value.scoreAwarded),
  };
}

function normalizeRecording(value: unknown): HighlightRecordingSession | undefined {
  if (!isRecord(value)) return undefined;
  return {
    startedAtMs: positiveInteger(value.startedAtMs),
    events: Array.isArray(value.events)
      ? value.events.filter(isRecord).map(normalizeCaptureEvent)
      : [],
    roomIds: stringList(value.roomIds),
  };
}

function normalizeCaptureEvent(value: Record<string, unknown>): HighlightCaptureEvent {
  const roomId = typeof value.roomId === 'string' ? value.roomId : '0,0,0';
  const recordedAtMs = positiveInteger(value.recordedAtMs);
  if (value.kind === 'apple') {
    return {
      kind: 'apple',
      appleTypeId: typeof value.appleTypeId === 'string' ? value.appleTypeId : undefined,
      streak: positiveInteger(value.streak),
      roomId,
      recordedAtMs,
    };
  }
  if (value.kind === 'enemy') {
    return { kind: 'enemy', humanoid: Boolean(value.humanoid), roomId, recordedAtMs };
  }
  if (value.kind === 'treasure') {
    return { kind: 'treasure', roomId, recordedAtMs };
  }
  return { kind: 'room', roomId, recordedAtMs };
}

function cloneHighlightReelState(state: HighlightReelState): HighlightReelState {
  return {
    channel: { ...state.channel, claimedRanks: [...state.channel.claimedRanks] },
    clips: state.clips.map((clip) => ({ ...clip, tags: [...clip.tags] })),
    recentTags: [...state.recentTags],
    recording: state.recording
      ? {
          startedAtMs: state.recording.startedAtMs,
          events: state.recording.events.map((event) => ({ ...event })),
          roomIds: [...state.recording.roomIds],
        }
      : undefined,
  };
}

function positiveInteger(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

function numberList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(value.map((entry) => positiveInteger(entry)).filter((entry) => entry > 0)),
  ].sort((a, b) => a - b);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((entry): entry is string => typeof entry === 'string'))];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
