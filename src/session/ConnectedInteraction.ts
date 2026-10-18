export interface ConnectedInteractionOption {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

/** A server-owned menu; clients send its revision and an offered option ID. */
export interface ConnectedInteractionView {
  id: number;
  kind: 'actor' | 'dialogue' | 'shop' | 'quest';
  title: string;
  description: string;
  options: ConnectedInteractionOption[];
}
