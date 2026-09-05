export interface NpcProfile {
  id: string;
  name: string;
  portraitId?: string;
}

export function buildHouseNpcProfile(name: string, portraitId?: string): NpcProfile {
  return {
    id: `npc-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    portraitId,
  };
}
