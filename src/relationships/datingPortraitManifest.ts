import type { RelationshipCandidateProfile, RelationshipSpecies } from './relationshipTypes.js';

export interface DatingPortraitAsset {
  key: string;
  url: string;
  species: RelationshipSpecies;
  tags: readonly string[];
}

const PORTRAIT_ROOT = `${import.meta.env.BASE_URL}assets/dating/portraits`;

export const DATING_PORTRAIT_ASSETS: readonly DatingPortraitAsset[] = [
  {
    key: 'dating-portrait-human-femme',
    url: `${PORTRAIT_ROOT}/human-femme.svg`,
    species: 'human',
    tags: ['human', 'village', 'femme', 'soft'],
  },
  {
    key: 'dating-portrait-human-masc',
    url: `${PORTRAIT_ROOT}/human-masc.svg`,
    species: 'human',
    tags: ['human', 'village', 'masc', 'dramatic'],
  },
  {
    key: 'dating-portrait-human-rogue',
    url: `${PORTRAIT_ROOT}/human-rogue.svg`,
    species: 'human',
    tags: ['human', 'village', 'rogue', 'flirty'],
  },
  {
    key: 'dating-portrait-goblin',
    url: `${PORTRAIT_ROOT}/goblin.svg`,
    species: 'goblin',
    tags: ['goblin', 'camp', 'sharp'],
  },
  {
    key: 'dating-portrait-goblin-bravado',
    url: `${PORTRAIT_ROOT}/goblin-bravado.svg`,
    species: 'goblin',
    tags: ['goblin', 'camp', 'bravado', 'flirty'],
  },
  {
    key: 'dating-portrait-angel',
    url: `${PORTRAIT_ROOT}/angel.svg`,
    species: 'angel',
    tags: ['angel', 'death', 'luminous'],
  },
  {
    key: 'dating-portrait-angel-crimson',
    url: `${PORTRAIT_ROOT}/angel-crimson.svg`,
    species: 'angel',
    tags: ['angel', 'death', 'severe', 'flirty'],
  },
  {
    key: 'dating-portrait-goblin-angel',
    url: `${PORTRAIT_ROOT}/goblin-angel.svg`,
    species: 'goblin-angel',
    tags: ['goblin', 'angel', 'death', 'luminous'],
  },
];

export function getDatingPortraitAsset(profile: RelationshipCandidateProfile): DatingPortraitAsset | null {
  if (profile.species === 'goblin') {
    return pick(profile.id, ['dating-portrait-goblin', 'dating-portrait-goblin-bravado']);
  }
  if (profile.species === 'angel') {
    return pick(profile.id, ['dating-portrait-angel', 'dating-portrait-angel-crimson']);
  }
  if (profile.species === 'goblin-angel') return getAsset('dating-portrait-goblin-angel');
  return pick(profile.id, [
    'dating-portrait-human-femme',
    'dating-portrait-human-masc',
    'dating-portrait-human-rogue',
  ]);
}

function pick(id: string, keys: readonly string[]): DatingPortraitAsset | null {
  return getAsset(keys[hash(id) % keys.length] ?? keys[0] ?? '');
}

function getAsset(key: string): DatingPortraitAsset | null {
  return DATING_PORTRAIT_ASSETS.find((asset) => asset.key === key) ?? null;
}

function hash(value: string): number {
  let total = 0;
  for (let i = 0; i < value.length; i += 1) {
    total = (total * 31 + value.charCodeAt(i)) >>> 0;
  }
  return total;
}
