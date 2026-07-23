/**
 * Emoticon types and interfaces.
 *
 * The wise old snake considers this the most delicious mutation ever.
 */

export type EmoticonId = string;

export interface EmoticonDefinition {
  id: EmoticonId;
  label: string;
  symbol: string;
  price: number;
  description: string;
}

export interface EmoticonState {
  owned: EmoticonId[];
  active: EmoticonId | null;
}
