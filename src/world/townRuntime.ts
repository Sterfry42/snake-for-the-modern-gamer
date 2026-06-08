import type { TownRumor, WantedLevel } from './town.js';

export interface TownRuntimeState {
  townId: string;
  wantedLevel: WantedLevel;
  suspicion: number;
  reputation: number;
  discoveredGuild: boolean;
  openedGates: string[];
  completedGuildJobs: string[];
  failedGuildJobs: string[];
  activeGuildJobId?: string;
  rumors: TownRumor[];
  noticesSeen: string[];
  stolenItemIds: string[];
  residents: Record<string, TownResidentRuntimeState>;
}

export interface TownResidentRuntimeState {
  hostile?: boolean;
  dead?: boolean;
  hidden?: boolean;
  relationshipId?: string;
}
