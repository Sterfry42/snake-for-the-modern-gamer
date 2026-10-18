export interface GameInteractionOption {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

/** A server-owned menu; clients send its revision and an offered option ID. */
export interface GameInteractionView {
  id: number;
  kind: 'actor' | 'dialogue' | 'shop' | 'quest';
  title: string;
  description: string;
  options: GameInteractionOption[];
  dating?: {
    profile: import('../relationships/relationshipTypes.js').RelationshipCandidateProfile;
    state?: import('../relationships/relationshipTypes.js').RelationshipState;
  };
}
