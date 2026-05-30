// Companion dialogue — selects voice lines for companions based on mood and bond level.

const DIALOGUE_POOL: Record<string, Record<string, string[]>> = {
  'ember-wisp': {
    happy: ['Fire burns warm!', 'I love the attention!', 'You feel so cozy.'],
    neutral: ['*flickers quietly*', 'Where are we going?', 'Is it hot here?'],
    sad: ['I\'m fading...', 'I feel cold...', 'Will you feed me?'],
    excited: ['Let\'s go, let\'s go!', 'I see something!', 'Onward!'],
    protective: ['Stay back!', 'I\'ll protect you!', 'Danger nearby!'],
  },
  'dust-bunny': {
    happy: ['Bouncy!', 'Happy bunny!', 'More snacks!'],
    neutral: ['*bounces slowly*', 'Where to?', 'Dusty today...'],
    sad: ['Not enough dust...', 'I feel flat...', 'Feed me?'],
    excited: ['Wheee!', 'Look at me go!', 'Bounce bounce!'],
    protective: ['Stay behind me!', 'I\'ll hide us!', 'Dust cloud ready!'],
  },
  'stoneback-turtle': {
    happy: ['Stone stands firm.', 'I feel strong.', 'My shell is ready.'],
    neutral: ['...'],
    sad: ['My shell feels heavy...', 'I cannot hold much longer...'],
    excited: ['For the pack!', 'I will not falter!'],
    protective: ['Behind my shell!', 'I shield you!', 'No harm will come!'],
  },
  'bramble-boar': {
    happy: ['Thorns gleam!', 'Ready to charge!', 'The pack is strong.'],
    neutral: ['*sniffs the air*', 'I smell something...'],
    sad: ['My thorns are dull...', 'I feel weak...'],
    excited: ['Charge!', 'For the pack!', 'Let\'s go!'],
    protective: ['Stand back!', 'I\'ll charge them!', 'Thorns up!'],
  },
  'rust-moth': {
    happy: ['I sense walls!', 'The dust tells me much!', 'Pretty patterns!'],
    neutral: ['*drifts gently*', 'I sense movement...'],
    sad: ['The dust is unclear...', 'I cannot see...'],
    excited: ['I found something!', 'Look this way!', 'Follow me!'],
    protective: ['Danger ahead!', 'I sense trouble!', 'Walls closing in!'],
  },
  'dusk-mole': {
    happy: ['The ground sings!', 'I smell food!', 'Good vibrations.'],
    neutral: ['*twitches nose*', 'I hear something...'],
    sad: ['The ground is silent...', 'I cannot sense anything...'],
    excited: ['I found a tunnel!', 'This way!', 'Hazard marked!'],
    protective: ['Hazard detected!', 'Danger below!', 'Stay back!'],
  },
  'copper-rat': {
    happy: ['Found something!', 'Snack time!', 'Look at all this stuff!'],
    neutral: ['*sniffs around*', 'Wonder what I can find...'],
    sad: ['No snacks today...', 'I\'m so hungry...'],
    excited: ['Scavenging time!', 'I smell food!', 'Let\'s explore!'],
    protective: ['Behind me!', 'I\'ll distract them!', 'Quick, hide!'],
  },
  'goldfinch': {
    happy: ['*sweet melody*', 'The apples are near!', 'Music fills the air!'],
    neutral: ['*soft trilling*', 'I hear a melody...'],
    sad: ['My song fades...', 'No music today...'],
    excited: ['I hear it!', 'Follow the song!', 'This way!'],
    protective: ['Danger ahead!', 'I\'ll sing a warning!', 'Stay alert!'],
  },
  'thorn-viper': {
    happy: ['The venom stings!', 'Battle calls!', 'My fangs are sharp.'],
    neutral: ['*hisses softly*', 'I smell blood...'],
    sad: ['My venom dulls...', 'I cannot fight...'],
    excited: ['Venom ready!', 'Strike!', 'Let\'s hunt!'],
    protective: ['I\'ll bite!', 'Venom bite!', 'Stay back, beast!'],
  },
  'jade-panther': {
    happy: ['*low purr*', 'I feel powerful.', 'The hunt is on.'],
    neutral: ['*paces quietly*', 'I sense movement...'],
    sad: ['My jade fur dims...', 'I feel weak...'],
    excited: ['*roars*', 'Let\'s pounce!', 'Chase them!'],
    protective: ['I\'ll strike!', 'Jade strike!', 'Stand back!'],
  },
  'wild-boar': {
    happy: ['*snorts happily*', 'Charge!', 'The boar runs fast!'],
    neutral: ['*oinks softly*', 'Where to, rider?'],
    sad: ['I cannot run...', 'My hooves are slow...'],
    excited: ['Trample time!', 'Charge forward!', 'Full speed!'],
    protective: ['Stand back!', 'I\'ll trample them!', 'Charging!'],
  },
  'river-koi': {
    happy: ['*splashes joyfully*', 'The water sings!', 'I love swimming!'],
    neutral: ['*gently ripples*', 'The currents shift...'],
    sad: ['The water is still...', 'I cannot swim...'],
    excited: ['Current boost!', 'Ride the wave!', 'Follow the current!'],
    protective: ['Water shield!', 'I\'ll protect you!', 'Stay behind me!'],
  },
};

/** Default dialogue lines used as fallback for creatures without entries. */
const DEFAULT_DIALOGUE: Record<string, string[]> = {
  happy: ['I feel great!', 'Everything is wonderful!', 'Let\'s go!'],
  neutral: ['...'],
  sad: ['I feel down...', 'Will things get better?'],
  excited: ['Let\'s do this!', 'I\'m ready!', 'Go go go!'],
  protective: ['Stay behind me!', 'I\'ll protect you!'],
};

/**
 * Select a voice line for a companion based on mood and bond level.
 * Higher bond levels favor more expressive dialogue from the companion.
 *
 * @param companionId - The companion's definition ID.
 * @param mood - The companion's current mood.
 * @param bondLevel - The companion's current bond level (1-5).
 * @param i18nKey - The i18n key for the dialogue context (e.g., 'companion.feed').
 * @returns A randomly selected dialogue string.
 */
export function selectCompanionDialogue(
  companionId: string,
  mood: string,
  bondLevel: number,
  i18nKey: string,
): string {
  const pool = DIALOGUE_POOL[companionId];
  if (!pool) {
    return DEFAULT_DIALOGUE[mood]?.[Math.floor(Math.random() * DEFAULT_DIALOGUE[mood].length)]
      ?? '...';
  }

  const moodPool = pool[mood];
  if (!moodPool || moodPool.length === 0) {
    return DEFAULT_DIALOGUE[mood]?.[Math.floor(Math.random() * DEFAULT_DIALOGUE[mood].length)]
      ?? '...';
  }

  // Higher bond levels increase the chance of picking more expressive dialogue.
  // We weight toward the last entries (most expressive) based on bond level.
  const weight = Math.min(bondLevel, 5);
  const index = Math.floor(Math.random() * (5 - weight)) + weight - 1;
  const safeIndex = Math.max(0, Math.min(index, moodPool.length - 1));

  return moodPool[safeIndex];
}

/**
 * Get all available dialogue moods for a companion.
 *
 * @param companionId - The companion's definition ID.
 * @returns Array of mood keys available for this companion.
 */
export function getCompanionMoods(companionId: string): string[] {
  const pool = DIALOGUE_POOL[companionId];
  if (!pool) {
    return Object.keys(DEFAULT_DIALOGUE);
  }
  return Object.keys(pool);
}

/**
 * All companion dialogue pools, keyed by companionId then mood.
 */
export const COMPANION_DIALOGUE: Record<string, Record<string, string[]>> = DIALOGUE_POOL;
