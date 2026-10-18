import type { FishingState, FishingSessionResult } from '../fishing/types.js';
import type { BaseballState, BaseballSessionResult } from '../baseball/types.js';

export type MinigameSnapshot =
  | { kind: 'fishing'; state: FishingState; result?: FishingSessionResult }
  | { kind: 'baseball'; state: BaseballState; result?: BaseballSessionResult };
