import type { RelationshipCandidateProfile, RelationshipSpecies } from './relationshipTypes.js';

export type DatingPortraitMood = 'happy' | 'neutral' | 'sad' | 'angry';

export interface DatingPortraitAsset {
  key: string;
  url: string;
  species: RelationshipSpecies;
  tags: readonly string[];
  family?: string;
  mood?: DatingPortraitMood;
}

const PORTRAIT_ROOT = `${import.meta.env.BASE_URL}assets/dating/portraits`;

export const DATING_PORTRAIT_ASSETS: readonly DatingPortraitAsset[] = [
  {
    key: 'dating-portrait-human-femme',
    url: `${PORTRAIT_ROOT}/human-femme.svg`,
    species: 'human',
    tags: ['human', 'village', 'femme', 'soft'],
    family: 'human-femme',
    mood: 'neutral',
  },
  {
    key: 'dating-portrait-human-masc',
    url: `${PORTRAIT_ROOT}/human-masc.svg`,
    species: 'human',
    tags: ['human', 'village', 'masc', 'dramatic'],
    family: 'human-masc',
    mood: 'neutral',
  },
  {
    key: 'dating-portrait-human-rogue',
    url: `${PORTRAIT_ROOT}/human-rogue.svg`,
    species: 'human',
    tags: ['human', 'village', 'rogue', 'flirty'],
    family: 'human-rogue',
    mood: 'neutral',
  },
  {
    key: 'dating-portrait-human-femme-confident-1',
    url: `${PORTRAIT_ROOT}/female_confident_1.svg`,
    species: 'human',
    tags: ['human', 'village', 'femme', 'confident'],
    family: 'human-femme-confident-1',
    mood: 'happy',
  },
  {
    key: 'dating-portrait-human-femme-confident-1-sad',
    url: `${PORTRAIT_ROOT}/female_confident_1_sad.svg`,
    species: 'human',
    tags: ['human', 'village', 'femme', 'confident', 'sad'],
    family: 'human-femme-confident-1',
    mood: 'sad',
  },
  {
    key: 'dating-portrait-human-femme-confident-1-angry',
    url: `${PORTRAIT_ROOT}/female_confident_1_angry.svg`,
    species: 'human',
    tags: ['human', 'village', 'femme', 'confident', 'angry'],
    family: 'human-femme-confident-1',
    mood: 'angry',
  },
  {
    key: 'dating-portrait-human-femme-confident-2',
    url: `${PORTRAIT_ROOT}/female_confident_2_longer_skirt.svg`,
    species: 'human',
    tags: ['human', 'village', 'femme', 'confident'],
    family: 'human-femme-confident-2',
    mood: 'happy',
  },
  {
    key: 'dating-portrait-human-femme-confident-2-sad',
    url: `${PORTRAIT_ROOT}/female_confident_2_sad.svg`,
    species: 'human',
    tags: ['human', 'village', 'femme', 'confident', 'sad'],
    family: 'human-femme-confident-2',
    mood: 'sad',
  },
  {
    key: 'dating-portrait-human-femme-confident-2-angry',
    url: `${PORTRAIT_ROOT}/female_confident_2_angry.svg`,
    species: 'human',
    tags: ['human', 'village', 'femme', 'confident', 'angry'],
    family: 'human-femme-confident-2',
    mood: 'angry',
  },
  {
    key: 'dating-portrait-human-masc-confident-1',
    url: `${PORTRAIT_ROOT}/male_confident_1.svg`,
    species: 'human',
    tags: ['human', 'village', 'masc', 'confident'],
    family: 'human-masc-confident-1',
    mood: 'happy',
  },
  {
    key: 'dating-portrait-human-masc-confident-1-sad',
    url: `${PORTRAIT_ROOT}/male_confident_1_sad.svg`,
    species: 'human',
    tags: ['human', 'village', 'masc', 'confident', 'sad'],
    family: 'human-masc-confident-1',
    mood: 'sad',
  },
  {
    key: 'dating-portrait-human-masc-confident-1-angry',
    url: `${PORTRAIT_ROOT}/male_confident_1_angry.svg`,
    species: 'human',
    tags: ['human', 'village', 'masc', 'confident', 'angry'],
    family: 'human-masc-confident-1',
    mood: 'angry',
  },
  {
    key: 'dating-portrait-human-masc-confident-2',
    url: `${PORTRAIT_ROOT}/male_confident_2.svg`,
    species: 'human',
    tags: ['human', 'village', 'masc', 'confident'],
    family: 'human-masc-confident-2',
    mood: 'happy',
  },
  {
    key: 'dating-portrait-goblin',
    url: `${PORTRAIT_ROOT}/goblin.svg`,
    species: 'goblin',
    tags: ['goblin', 'camp', 'sharp'],
    family: 'goblin',
    mood: 'neutral',
  },
  {
    key: 'dating-portrait-goblin-bravado',
    url: `${PORTRAIT_ROOT}/goblin-bravado.svg`,
    species: 'goblin',
    tags: ['goblin', 'camp', 'bravado', 'flirty'],
    family: 'goblin-bravado',
    mood: 'happy',
  },
  {
    key: 'dating-portrait-goblin-confident-1',
    url: `${PORTRAIT_ROOT}/goblin_confident_1.svg`,
    species: 'goblin',
    tags: ['goblin', 'camp', 'confident'],
    family: 'goblin-confident-1',
    mood: 'happy',
  },
  {
    key: 'dating-portrait-goblin-confident-2',
    url: `${PORTRAIT_ROOT}/goblin_confident_2.svg`,
    species: 'goblin',
    tags: ['goblin', 'camp', 'confident'],
    family: 'goblin-confident-2',
    mood: 'happy',
  },
  {
    key: 'dating-portrait-goblin-sexy-goblin',
    url: `${PORTRAIT_ROOT}/goblin_sexy_goblin.svg`,
    species: 'goblin',
    tags: ['goblin', 'camp', 'confident', 'sexy'],
    family: 'goblin-sexy-goblin',
    mood: 'neutral',
  },
  {
    key: 'dating-portrait-angel',
    url: `${PORTRAIT_ROOT}/angel.svg`,
    species: 'angel',
    tags: ['angel', 'death', 'luminous'],
    family: 'angel',
    mood: 'neutral',
  },
  {
    key: 'dating-portrait-angel-crimson',
    url: `${PORTRAIT_ROOT}/angel-crimson.svg`,
    species: 'angel',
    tags: ['angel', 'death', 'severe', 'flirty'],
    family: 'angel-crimson',
    mood: 'angry',
  },
  {
    key: 'dating-portrait-goblin-angel',
    url: `${PORTRAIT_ROOT}/goblin-angel.svg`,
    species: 'goblin-angel',
    tags: ['goblin', 'angel', 'death', 'luminous'],
    family: 'goblin-angel',
    mood: 'neutral',
  },
  ...createMoodVariantAssets([
    ['human-femme', 'human-femme', 'human', ['happy', 'sad', 'angry']],
    ['human-masc', 'human-masc', 'human', ['happy', 'sad', 'angry']],
    ['human-rogue', 'human-rogue', 'human', ['happy', 'sad', 'angry']],
    ['male_confident_2', 'human-masc-confident-2', 'human', ['sad', 'angry']],
    ['goblin', 'goblin', 'goblin', ['happy', 'sad', 'angry']],
    ['goblin-bravado', 'goblin-bravado', 'goblin', ['sad', 'angry']],
    ['goblin_confident_1', 'goblin-confident-1', 'goblin', ['sad', 'angry']],
    ['goblin_confident_2', 'goblin-confident-2', 'goblin', ['sad', 'angry']],
    ['angel', 'angel', 'angel', ['happy', 'sad', 'angry']],
    ['angel-crimson', 'angel-crimson', 'angel', ['happy', 'sad']],
    ['goblin-angel', 'goblin-angel', 'goblin-angel', ['happy', 'sad', 'angry']],
  ]),
];

function createMoodVariantAssets(
  definitions: ReadonlyArray<
    readonly [
      filenameBase: string,
      family: string,
      species: RelationshipSpecies,
      moods: readonly DatingPortraitMood[],
    ]
  >,
): DatingPortraitAsset[] {
  return definitions.flatMap(([filenameBase, family, species, moods]) =>
    moods.map((mood) => ({
      key: `dating-portrait-${family}-${mood}`,
      url: `${PORTRAIT_ROOT}/${filenameBase}_${mood}.svg`,
      species,
      family,
      mood,
      tags: [species, family, mood],
    })),
  );
}

export function getDatingPortraitAsset(
  profile: RelationshipCandidateProfile,
  mood: DatingPortraitMood = 'neutral',
): DatingPortraitAsset | null {
  const base = getBaseDatingPortraitAsset(profile);
  if (!base) return null;
  return getMoodVariant(base, mood) ?? base;
}

function getBaseDatingPortraitAsset(profile: RelationshipCandidateProfile): DatingPortraitAsset | null {
  if (profile.species === 'goblin') {
    return pick(profile.id, portraitKeysForGoblin(profile.portraitId));
  }
  if (profile.species === 'angel') {
    return pick(profile.id, ['dating-portrait-angel', 'dating-portrait-angel-crimson']);
  }
  if (profile.species === 'goblin-angel') return getAsset('dating-portrait-goblin-angel');
  return pick(profile.id, portraitKeysForHuman(profile.portraitId));
}

function getMoodVariant(base: DatingPortraitAsset, mood: DatingPortraitMood): DatingPortraitAsset | null {
  if (mood === 'neutral') return base;
  if (!base.family) return null;
  return (
    DATING_PORTRAIT_ASSETS.find((asset) => asset.family === base.family && asset.mood === mood) ??
    DATING_PORTRAIT_ASSETS.find((asset) => asset.family === base.family && asset.mood === 'happy') ??
    null
  );
}

function portraitKeysForHuman(portraitId?: string): readonly string[] {
  if (portraitId === 'sage-1') {
    return [
      'dating-portrait-human-femme',
      'dating-portrait-human-femme-confident-1',
      'dating-portrait-human-femme-confident-2',
    ];
  }
  if (portraitId === 'sage-2') {
    return [
      'dating-portrait-human-masc',
      'dating-portrait-human-masc-confident-1',
      'dating-portrait-human-masc-confident-2',
    ];
  }
  if (portraitId === 'sage-3') {
    return [
      'dating-portrait-human-rogue',
      'dating-portrait-human-femme-confident-2',
      'dating-portrait-human-masc-confident-2',
    ];
  }
  return [
    'dating-portrait-human-femme',
    'dating-portrait-human-masc',
    'dating-portrait-human-rogue',
    'dating-portrait-human-femme-confident-1',
    'dating-portrait-human-femme-confident-2',
    'dating-portrait-human-masc-confident-1',
    'dating-portrait-human-masc-confident-2',
  ];
}

function portraitKeysForGoblin(portraitId?: string): readonly string[] {
  if (portraitId === 'goblin-sexy-goblin' || portraitId === 'goblin_sexy_goblin') {
    return ['dating-portrait-goblin-sexy-goblin'];
  }
  if (portraitId === 'goblin-happy') {
    return [
      'dating-portrait-goblin-bravado',
      'dating-portrait-goblin-confident-1',
      'dating-portrait-goblin-confident-2',
      'dating-portrait-goblin-sexy-goblin',
    ];
  }
  return [
    'dating-portrait-goblin',
    'dating-portrait-goblin-bravado',
    'dating-portrait-goblin-confident-1',
    'dating-portrait-goblin-confident-2',
    'dating-portrait-goblin-sexy-goblin',
  ];
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
