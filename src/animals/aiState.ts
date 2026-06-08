export type AnimalState = 'IDLE' | 'WANDER' | 'FLEE' | 'CHASE' | 'GRAZE' | 'RETURN';

export interface AnimalAIAState {
  state: AnimalState;
  stateEnterTick: number;
  stateDuration: number;
  targetPosition?: { x: number; y: number };
}

const DEFAULT_AI_STATE: AnimalAIAState = {
  state: 'IDLE',
  stateEnterTick: 0,
  stateDuration: 0,
};

const STATE_DURATIONS: Record<AnimalState, number> = {
  IDLE: 3,
  WANDER: 8,
  FLEE: 5,
  CHASE: 6,
  GRAZE: 10,
  RETURN: 4,
};

export function getInitialState(): AnimalAIAState {
  return {
    ...DEFAULT_AI_STATE,
    state: 'WANDER',
    stateEnterTick: 0,
    stateDuration: STATE_DURATIONS.WANDER,
  };
}

export function tickState(
  current: AnimalAIAState,
  tick: number,
  proximityToThreat: number,
  proximityToFood: number,
): AnimalAIAState {
  const next: AnimalAIAState = { ...current };

  if (proximityToThreat > 0) {
    if (next.state !== 'FLEE') {
      next.state = 'FLEE';
      next.stateEnterTick = tick;
      next.stateDuration = STATE_DURATIONS.FLEE;
    }
    return next;
  }

  if (proximityToFood > 0 && (next.state === 'IDLE' || next.state === 'WANDER')) {
    next.state = 'GRAZE';
    next.stateEnterTick = tick;
    next.stateDuration = STATE_DURATIONS.GRAZE;
    return next;
  }

  if (tick - next.stateEnterTick >= next.stateDuration) {
    switch (next.state) {
      case 'IDLE':
        next.state = 'WANDER';
        next.stateEnterTick = tick;
        next.stateDuration = STATE_DURATIONS.WANDER;
        break;
      case 'WANDER':
        next.state = 'IDLE';
        next.stateEnterTick = tick;
        next.stateDuration = STATE_DURATIONS.IDLE;
        break;
      case 'GRAZE':
        next.state = 'IDLE';
        next.stateEnterTick = tick;
        next.stateDuration = STATE_DURATIONS.IDLE;
        break;
      case 'FLEE':
        next.state = 'IDLE';
        next.stateEnterTick = tick;
        next.stateDuration = STATE_DURATIONS.IDLE;
        break;
      case 'CHASE':
        next.state = 'RETURN';
        next.stateEnterTick = tick;
        next.stateDuration = STATE_DURATIONS.RETURN;
        break;
      case 'RETURN':
        next.state = 'WANDER';
        next.stateEnterTick = tick;
        next.stateDuration = STATE_DURATIONS.WANDER;
        break;
    }
  }

  return next;
}

export function isHostileState(state: AnimalState): boolean {
  return state === 'CHASE' || state === 'FLEE';
}

export function isPassiveState(state: AnimalState): boolean {
  return state === 'IDLE' || state === 'WANDER' || state === 'GRAZE';
}
