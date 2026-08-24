import type {
  Actor,
  ActorActivity,
  ActorGoal,
  ActorPlayerHostility,
  ActorPresence,
  ActorTargetThreat,
} from './actorTypes.js';

export type ActorTelemetryEventType =
  | 'actor.created'
  | 'actor.presence_changed'
  | 'actor.materialized'
  | 'actor.dematerialized'
  | 'actor.schedule_changed'
  | 'actor.goal_changed'
  | 'actor.goal_interrupted'
  | 'actor.goal_resumed'
  | 'actor.activity_changed'
  | 'actor.threat_changed'
  | 'actor.player_hostility_changed'
  | 'actor.combat_started'
  | 'actor.combat_ended'
  | 'actor.conversation_started'
  | 'actor.conversation_ended'
  | 'actor.rumor_shared'
  | 'actor.travel_leg_selected'
  | 'actor.travel_blocked'
  | 'actor.travel_retry_scheduled'
  | 'actor.path_blocked'
  | 'actor.transitioned'
  | 'actor.tick'
  | 'actor.tick_slow';

export interface ActorTelemetryEvent {
  type: ActorTelemetryEventType;
  actorId?: string;
  actorName?: string;
  roomId?: string;
  reason: string;
  data: Record<string, unknown>;
}

export type ActorTelemetrySink = (event: ActorTelemetryEvent) => void;

export function compactActorGoal(goal: ActorGoal | undefined): Record<string, unknown> | null {
  if (!goal) {
    return null;
  }
  return {
    kind: goal.kind,
    priority: goal.priority,
    roomId: goal.roomId,
    targetActorId: goal.targetActorId,
    targetPosition: goal.targetPosition,
    reason: goal.reason,
  };
}

export function compactActorActivity(
  activity: ActorActivity | undefined,
): Record<string, unknown> | null {
  if (!activity) {
    return null;
  }
  return {
    kind: activity.kind,
    source: activity.source,
    targetActorId: activity.targetActorId,
    label: activity.label,
  };
}

export function compactActorPresence(
  presence: ActorPresence | undefined,
): Record<string, unknown> | null {
  if (!presence) {
    return null;
  }
  return {
    roomId: presence.roomId,
    position: presence.position,
    materialized: presence.materialized,
    stationary: presence.stationary,
  };
}

export function compactActorThreat(
  threat: ActorTargetThreat | undefined,
): Record<string, unknown> | null {
  if (!threat) {
    return null;
  }
  return {
    targetActorId: threat.targetActorId,
    source: threat.source,
    reason: threat.reason,
    startedAtRoomNumber: threat.startedAtRoomNumber,
  };
}

export function compactPlayerHostility(
  hostility: ActorPlayerHostility | undefined,
): Record<string, unknown> | null {
  if (!hostility) {
    return null;
  }
  return {
    state: hostility.state,
    reason: hostility.reason,
    startedAtRoomNumber: hostility.startedAtRoomNumber,
  };
}

export function compactActorDebugSnapshot(actor: Actor): Record<string, unknown> {
  return {
    id: actor.id,
    name: actor.displayName,
    kind: actor.kind,
    role: actor.role,
    factionId: actor.factionId,
    room: actor.presence?.roomId ?? actor.currentRoomId,
    pos: actor.presence?.position,
    presence: compactActorPresence(actor.presence),
    goal: compactActorGoal(actor.goal),
    scheduleGoal: compactActorGoal(actor.scheduleGoal),
    activity: compactActorActivity(actor.activity),
    targetedThreat: compactActorThreat(actor.targetedThreat),
    hostilityToPlayer: compactPlayerHostility(actor.playerHostility),
    health: actor.health
      ? {
          current: actor.health.current,
          max: actor.health.max,
          state: actor.health.state,
        }
      : null,
    schedule: actor.schedule
      ? {
          policyId: actor.schedule.policyId,
          permanentDuty: actor.schedule.permanentDuty,
          fixedPostRoomId: actor.schedule.fixedPostRoomId,
          fixedPostPosition: actor.schedule.fixedPostPosition,
        }
      : null,
  };
}
