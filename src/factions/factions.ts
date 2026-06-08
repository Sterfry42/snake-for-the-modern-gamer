export type FactionId = 'hearthbound-remnant' | 'goblin-camps';

export type FactionStanding = 'friendly' | 'neutral' | 'wary' | 'angry' | 'violent';

export interface FactionAlignmentState {
  value: number;
  standing: FactionStanding;
}

export interface FactionCardView {
  id: FactionId;
  name: string;
  subtitle: string;
  standing: FactionStanding;
  alignment: number;
  description: string;
  effects: string[];
  discovered: boolean;
}

export const DEFAULT_FACTION_ALIGNMENT: Record<FactionId, number> = {
  'hearthbound-remnant': 35,
  'goblin-camps': 0,
};

export function standingForAlignment(value: number): FactionStanding {
  if (value >= 50) return 'friendly';
  if (value >= 0) return 'neutral';
  if (value >= -24) return 'wary';
  if (value >= -59) return 'angry';
  return 'violent';
}

export function normalizeAlignment(value: number): FactionAlignmentState {
  const clamped = Math.max(-100, Math.min(100, Math.round(value)));
  return {
    value: clamped,
    standing: standingForAlignment(clamped),
  };
}

export function getFactionName(id: FactionId): string {
  switch (id) {
    case 'hearthbound-remnant':
      return 'The Hearthbound Remnant';
    case 'goblin-camps':
      return 'Goblin Camps';
  }
}

export function getFactionSubtitle(id: FactionId): string {
  switch (id) {
    case 'hearthbound-remnant':
      return 'Lantern villages, market stalls, and old houses that still remember law.';
    case 'goblin-camps':
      return 'Contract sellers, campfire accountants, and ward-makers with sharp little pens.';
  }
}

export function getFactionDescription(id: FactionId, standing: FactionStanding): string {
  switch (id) {
    case 'hearthbound-remnant':
      return standing === 'friendly'
        ? 'The villages are naturally warm to you. Their people are tired, practical, and stubbornly decent.'
        : 'The village folk are watching your choices, but they still prefer a living traveler to another story about bones.';
    case 'goblin-camps':
      return standing === 'violent'
        ? 'The camps have stopped doing business and started doing violence.'
        : standing === 'angry'
          ? 'The goblins know your face and dislike its current attachment to your body.'
          : standing === 'wary'
            ? 'The goblins still sell, but every price has teeth.'
            : 'The goblins will sell you ugly miracles until you give them a reason to stop.';
  }
}

export function getFactionEffects(id: FactionId, standing: FactionStanding): string[] {
  switch (id) {
    case 'hearthbound-remnant':
      return [
        'Village shops are available.',
        'Quest givers begin friendly.',
        'Local insults and gunfire can still sour individual rooms.',
      ];
    case 'goblin-camps':
      if (standing === 'violent') {
        return ['Goblin camps attack on sight.', 'Ward scrolls are unavailable.'];
      }
      if (standing === 'angry') {
        return ['Goblin shopkeeps refuse service.', 'Camp guards are close to violence.'];
      }
      if (standing === 'wary') {
        return [
          'Ward scrolls are available at higher prices.',
          'Camp dialogue is less charitable.',
        ];
      }
      return ['Ward scrolls are available.', 'Buying contracts improves relations slightly.'];
  }
}
