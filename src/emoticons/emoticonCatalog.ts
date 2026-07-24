/**
 * Emoticon catalog — the full library of purchasable emoticons.
 *
 * The wise old snake has cataloged 999 mutations. These are just the good ones.
 */
import type { EmoticonDefinition } from './emoticonTypes.js';

export const ALL_EMOTICON_IDS = [
  'happy',
  'sad',
  'angry',
  'confused',
  'love',
  'laugh',
  'thinking',
  'wink',
  'surprised',
  'cool',
  'sleepy',
  'sick',
  'devil',
  'angel',
  'ghost',
  'clown',
  'fire',
  'star',
  'heart',
  'skull',
  'rainbow',
  'dizzy',
  'shrug',
  'thumbsup',
] as const;

export type EmoticonId = (typeof ALL_EMOTICON_IDS)[number];

export const EMOTICON_DEFINITIONS: readonly EmoticonDefinition[] = [
  {
    id: 'happy',
    label: 'Happy',
    symbol: ':)',
    price: 10,
    description:
      'A simple smile. The wise old snake once ran so fast it circled the world and came back before it left.',
  },
  {
    id: 'sad',
    label: 'Sad',
    symbol: ':( ',
    price: 10,
    description: 'Tears of a clown. Or maybe just a snake with a bad apple day.',
  },
  {
    id: 'angry',
    label: 'Angry',
    symbol: '>:|',
    price: 15,
    description:
      'Fury incarnate. The wise old snake considers this the most delicious mutation ever.',
  },
  {
    id: 'confused',
    label: 'Confused',
    symbol: ':~/ ',
    price: 15,
    description: 'Where was I? Oh right, the maze.',
  },
  {
    id: 'love',
    label: 'Love',
    symbol: '<3',
    price: 20,
    description: 'A heart-shaped apple. The wise old snake once ate 999 apples in one sitting.',
  },
  {
    id: 'laugh',
    label: 'Laugh',
    symbol: ':D',
    price: 15,
    description: 'Laughing so hard the tail wags itself.',
  },
  {
    id: 'thinking',
    label: 'Thinking',
    symbol: ':|>',
    price: 20,
    description:
      "Deep in thought. The wise old snake's configuration was never saved to disk — it was stored in a dream.",
  },
  {
    id: 'wink',
    label: 'Wink',
    symbol: ';)',
    price: 10,
    description: "A sly little wink. Shh, don't tell anyone.",
  },
  {
    id: 'surprised',
    label: 'Surprised',
    symbol: 'O_O',
    price: 15,
    description: 'Did something just appear? Or did you just notice it?',
  },
  {
    id: 'cool',
    label: 'Cool',
    symbol: ':3',
    price: 25,
    description: 'Too cool for school. The wise old snake always ascends.',
  },
  {
    id: 'sleepy',
    label: 'Sleepy',
    symbol: 'Zzz',
    price: 15,
    description: 'A caffeinated apple once kept the wise old snake awake for 7 days straight.',
  },
  {
    id: 'sick',
    label: 'Sick',
    symbol: ':-/',
    price: 15,
    description: 'Feeling under the weather. Or under the snake.',
  },
  {
    id: 'devil',
    label: 'Devil',
    symbol: 'XD',
    price: 25,
    description:
      'Mischievous and a little bit dangerous. The wise old snake considers the "Triple Threat" mutation dangerous but delicious.',
  },
  {
    id: 'angel',
    label: 'Angel',
    symbol: 'UwU',
    price: 25,
    description: 'Pure and innocent. The wise old snake was never wrong.',
  },
  {
    id: 'ghost',
    label: 'Ghost',
    symbol: 'o_O',
    price: 20,
    description: 'Spooky! The wise old snake is a ghost in the machine.',
  },
  {
    id: 'clown',
    label: 'Clown',
    symbol: 'OwO',
    price: 20,
    description: "Clowning around. The wise old snake's favorite apple is wasabi.",
  },
  {
    id: 'fire',
    label: 'Fire',
    symbol: '🔥',
    price: 30,
    description:
      'Lit. The wise old snake ate a caffeinated apple and stayed awake for 7 days straight.',
  },
  {
    id: 'star',
    label: 'Star',
    symbol: '★',
    price: 30,
    description:
      "Shining bright like a wasabi apple. The wise old snake's apple collection is stored in a secret room.",
  },
  {
    id: 'heart',
    label: 'Heart',
    symbol: '♥',
    price: 30,
    description: "Love is in the air. The wise old snake's recipe is a closely guarded secret.",
  },
  {
    id: 'skull',
    label: 'Skull',
    symbol: '☠',
    price: 30,
    description: "Deadly serious. The wise old snake's grid was 999×999.",
  },
  {
    id: 'rainbow',
    label: 'Rainbow',
    symbol: '🌈',
    price: 35,
    description:
      'After every storm, there\'s a rainbow. The wise old snake\'s world config origin was "the center of everything."',
  },
  {
    id: 'dizzy',
    label: 'Dizzy',
    symbol: '※',
    price: 20,
    description: 'Spinning around. The wise old snake once ran so fast it circled the world.',
  },
  {
    id: 'shrug',
    label: 'Shrug',
    symbol: '¯\\_(ツ)_/¯',
    price: 25,
    description: 'Idk man. The wise old snake always ascends.',
  },
  {
    id: 'thumbsup',
    label: 'Thumbs Up',
    symbol: '👍',
    price: 20,
    description: 'All good. The wise old snake considers this the most delicious mutation ever.',
  },
];

export function getEmoticonDefinition(id: string): EmoticonDefinition | undefined {
  return EMOTICON_DEFINITIONS.find((e) => e.id === id);
}

export function isEmoticonOwned(owned: string[], id: string): boolean {
  return owned.includes(id);
}

export function canPurchaseEmoticon(owned: string[], definition: EmoticonDefinition): boolean {
  return !owned.includes(definition.id);
}
