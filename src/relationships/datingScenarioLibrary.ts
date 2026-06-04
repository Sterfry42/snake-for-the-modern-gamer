import type {
  DatingBranchChoice,
  RelationshipCandidateProfile,
  RelationshipChoice,
  RelationshipOutcomeTier,
  RelationshipPersonality,
  RelationshipTag,
} from './relationshipTypes.js';
import type { ActorRole } from '../actors/actorTypes.js';
import { shuffleDatingBranchActions } from './datingActionOrder.js';

export type DatingScenarioKind = Extract<RelationshipChoice, 'talk' | 'flirt' | 'date'>;

export interface DatingScenarioPage {
  line: string;
  result?: string;
  lineIsNarration?: boolean;
  actions?: ReadonlyArray<{
    id: `branch-${string}` | 'leave';
    label: string;
    tone?: 'romance' | 'danger' | 'quiet';
  }>;
  juiceTier?: RelationshipOutcomeTier;
}

export interface DatingScenarioBranchResult {
  text: string;
  outcome?: RelationshipChoice;
  tags?: DatingBranchChoice['tags'];
  targetTier?: RelationshipOutcomeTier;
  label?: string;
  followUpPages?: DatingScenarioPage[];
}

export interface DatingScenarioEvent {
  scenarioId: string;
  pages: DatingScenarioPage[];
  branchResults: Record<string, DatingScenarioBranchResult>;
}

export interface DatingScenarioContext {
  actorRole?: ActorRole;
  contextTags?: readonly string[];
}

interface BranchBlueprint {
  id: `branch-${string}`;
  label: string;
  tags: RelationshipTag[];
  tier: RelationshipOutcomeTier;
  tierByPersonality?: Partial<Record<RelationshipPersonality, RelationshipOutcomeTier>>;
  response: Record<RelationshipPersonality, readonly string[]>;
  outcome?: RelationshipChoice;
  tone?: 'romance' | 'danger' | 'quiet';
}

interface ScenarioBlueprint {
  id: string;
  kind: DatingScenarioKind;
  intent?: readonly string[];
  romanceReason?: string;
  roles?: readonly ActorRole[];
  roleMatchMode?: 'weighted' | 'required';
  contextTags?: readonly string[];
  preferredPersonalities?: RelationshipPersonality[];
  setup: string;
  npcPrompt: Record<RelationshipPersonality, readonly string[]>;
  question: string;
  branches: readonly BranchBlueprint[];
  after: Record<RelationshipPersonality, readonly string[]>;
}

const PERSONALITY_STAGE_DIRECTIONS: Record<RelationshipPersonality, string> = {
  poetic: 'They turn the moment over like a wet letter, searching for the sentence that survived.',
  deadpan: 'Their face barely moves, which somehow makes the silence louder.',
  hungry: 'They watch your answer like it might be edible, warm, or both.',
  regal: 'They straighten as if the room has accidentally become a court.',
  sharp: 'Their attention clicks into place, bright as a knife hidden inside a contract.',
};

const PERSONALITY_BRANCH_TAG_WEIGHTS: Record<
  RelationshipPersonality,
  Partial<Record<RelationshipTag, number>>
> = {
  poetic: {
    dramatic: 4,
    honesty: 4,
    privateAffection: 4,
    commitment: 3,
    bravery: 2,
    mercy: 3,
    comfort: 2,
    clever: 1,
    food: -1,
    pragmatic: -1,
    selfPreserving: -2,
    publicAffection: -1,
    avoidance: -5,
    neediness: -3,
    betrayal: -9,
    violence: -3,
    neglect: -6,
  },
  deadpan: {
    honesty: 4,
    competence: 4,
    pragmatic: 5,
    clever: 3,
    restraint: 4,
    selfPreserving: 2,
    protective: 1,
    comfort: 1,
    transaction: 2,
    ledger: 2,
    dramatic: -4,
    neediness: -3,
    publicAffection: -2,
    betrayal: -8,
    avoidance: -2,
    violence: -2,
    neglect: -6,
  },
  hungry: {
    food: 6,
    comfort: 5,
    protective: 3,
    loyalty: 4,
    family: 5,
    mercy: 3,
    commitment: 2,
    privateAffection: 2,
    neediness: 1,
    dramatic: 1,
    selfPreserving: -1,
    publicAffection: -1,
    neglect: -7,
    betrayal: -9,
    avoidance: -4,
    violence: -2,
  },
  regal: {
    bravery: 5,
    protective: 3,
    ritual: 5,
    commitment: 5,
    humility: 4,
    honesty: 3,
    publicAffection: 2,
    privateAffection: 2,
    clever: 1,
    violence: -2,
    neediness: -5,
    avoidance: -5,
    betrayal: -10,
    secrecy: -6,
    neglect: -8,
    selfPreserving: -2,
  },
  sharp: {
    clever: 5,
    pragmatic: 5,
    selfPreserving: 4,
    transaction: 5,
    contract: 5,
    competence: 4,
    ledger: 5,
    goblin: 3,
    honesty: 2,
    protective: 2,
    restraint: 2,
    publicAffection: -2,
    neediness: -5,
    dramatic: -1,
    betrayal: -8,
    neglect: -5,
    avoidance: -2,
    violence: -1,
  },
};

const ROMANCE_SCENARIOS: readonly ScenarioBlueprint[] = [
  {
    id: 'flirt-pizza-confession',
    kind: 'flirt',
    setup:
      'A late snack stall has one candle, three plates, and a vendor who clearly expects romance to become a public hazard.',
    npcPrompt: {
      poetic: [
        'Choose carefully. A topping is never only a topping. It is a tiny flag planted in the disputed country of desire.',
        'If you say something boring, I will mourn the part of you that could have been moonlit.',
      ],
      deadpan: [
        'This is a compatibility audit disguised as dinner. I apologize for neither half.',
        'Answer plainly. I am measuring risk, taste, and your capacity for needless chaos.',
      ],
      hungry: [
        'Finally, a serious romantic question. Toppings reveal the soul and sometimes rescue the evening.',
        'If you choose badly, I may still eat it. That is not forgiveness. That is discipline.',
      ],
      regal: [
        'A table can be a throne if the company behaves with sufficient conviction.',
        'Name your topping. I will know whether you understand ceremony, appetite, or merely noise.',
      ],
      sharp: [
        'Pizza is a contract with cheese. Do not sign carelessly.',
        'Your topping preference will be entered into evidence. I advise precision.',
      ],
    },
    question:
      'They lean closer over the candle. "What topping do you choose when no one is pretending to be sensible?"',
    branches: [
      {
        id: 'branch-pineapple',
        label: 'Pineapple',
        tags: ['food', 'clever', 'dramatic'],
        tier: 'loved',
        tierByPersonality: {
          poetic: 'liked',
          deadpan: 'neutral',
          hungry: 'loved',
          regal: 'disliked',
          sharp: 'liked',
        },
        response: {
          poetic: [
            'Pineapple. Sweetness with teeth. A little sun smuggled into a guilty place.',
            'I like it because it refuses to apologize for being bright where salt expected obedience.',
          ],
          deadpan: [
            'Pineapple. Controversial, structurally juicy, and loud about itself.',
            'I am not moved. I am, however, forced to update the file on you.',
          ],
          hungry: [
            'Pineapple. Yes. Sweet, warm, dangerous to cowards.',
            'You understand that dinner should occasionally start an argument and then win it.',
          ],
          regal: [
            'Pineapple. A tropical banner raised over a battlefield no one asked to visit.',
            'Bold, yes. Also disorderly. I do not permit every scandal merely because it stands tall.',
          ],
          sharp: [
            'Pineapple. High-risk sweetness. Excellent leverage against boring people.',
            'I like choices that make enemies reveal themselves before dessert.',
          ],
        },
      },
      {
        id: 'branch-pepperoni',
        label: 'Pepperoni',
        tags: ['food', 'pragmatic', 'comfort'],
        tier: 'liked',
        tierByPersonality: {
          poetic: 'neutral',
          deadpan: 'liked',
          hungry: 'liked',
          regal: 'neutral',
          sharp: 'liked',
        },
        response: {
          poetic: [
            'Pepperoni. A red little certainty. Not daring, but honest enough to warm the plate.',
            'I can respect a comfort that does not pretend to be prophecy.',
          ],
          deadpan: [
            'Pepperoni. Standard answer. Strong fundamentals. Low embarrassment risk.',
            'I like reliability more than I advertise.',
          ],
          hungry: [
            'Pepperoni. Good. Salty. Direct. Not every meal needs a thesis.',
            'I could share that without suspecting you of sabotaging dinner.',
          ],
          regal: [
            'Pepperoni. Traditional, perhaps overly safe, but not without dignity.',
            'A court survives on dependable staples as much as grand declarations.',
          ],
          sharp: [
            'Pepperoni. Predictable, but profitable. There is value in a choice that knows its market.',
            'I would not brag about it. I would eat it.',
          ],
        },
      },
      {
        id: 'branch-mushroom',
        label: 'Mushroom',
        tags: ['food', 'comfort', 'secrecy'],
        tier: 'disliked',
        tierByPersonality: {
          poetic: 'neutral',
          deadpan: 'disliked',
          hungry: 'neutral',
          regal: 'disliked',
          sharp: 'loved',
        },
        response: {
          poetic: [
            'Mushroom. Earthy, secretive, a little grave-adjacent.',
            'I do not hate it. I only worry you flirt like someone who stores feelings underground.',
          ],
          deadpan: [
            'Mushroom. Acceptable fungus. Unclear romantic signal.',
            'I asked for preference and received damp ambiguity.',
          ],
          hungry: [
            'Mushroom. Fine in stew. Suspicious on a romantic plate.',
            'You can do better than choosing the topping that tastes like a cellar practicing manners.',
          ],
          regal: [
            'Mushroom. Humble to the point of disappearing.',
            'I prefer a suitor who can be gentle without becoming subterranean.',
          ],
          sharp: [
            'Mushroom. Quiet, cheap, and very good at hiding among stronger ingredients.',
            'I dislike how much that sounds like a strategy.',
          ],
        },
      },
    ],
    after: {
      poetic: [
        'They glance at the candle. "Absurd. I am learning your soul through dinner. Somehow the method works."',
      ],
      deadpan: ['They nod once. "The courtship data set expands. Alarmingly useful."'],
      hungry: ['They steals a bite. "If romance fails, at least dinner provided testimony."'],
      regal: ['They fold their napkin like a treaty. "The evening survives preliminary judgment."'],
      sharp: [
        'They smiles thinly. "Good. Now I know what kind of chaos you order under pressure."',
      ],
    },
  },
  {
    id: 'talk-faction-aftershock',
    kind: 'talk',
    setup:
      'The street outside is still arguing about a faction fight. Someone has washed the stones, but not well.',
    npcPrompt: {
      poetic: [
        'Do you hear that? The town is quiet in the wrong key.',
        'When violence ends, the walls keep humming the name of whoever started it.',
      ],
      deadpan: [
        'There was a fight. People are pretending it was smaller than it was.',
        'I dislike public denial. It makes cleanup inefficient.',
      ],
      hungry: [
        'No one eats properly after bloodshed. Soup curdles. Bread gets judgmental.',
        'Tell me what part of this disaster you think belongs to you.',
      ],
      regal: [
        'A faction wound is a public wound. It does not vanish because private affection asks politely.',
        'Speak clearly. I will not have tenderness used as a curtain.',
      ],
      sharp: [
        'People are pricing silence by the minute. Impressive market instability.',
        'Before you smile at me, account for the damage.',
      ],
    },
    question:
      'They stop walking. "When your actions hurt a faction I know, what do you expect me to do with my affection?"',
    branches: [
      {
        id: 'branch-own-harm',
        label: 'Own the Harm',
        tags: ['honesty', 'humility', 'commitment'],
        tier: 'loved',
        response: {
          poetic: [
            'Good. Do not polish it. Let the ugly fact keep its weather.',
            'I can love someone who kneels beside the damage and names it without perfume.',
          ],
          deadpan: [
            'Correct. Responsibility detected. Rare sample.',
            'I can work with guilt that does not outsource itself.',
          ],
          hungry: [
            'Yes. Own it. Bad stew does not improve because the cook whistles.',
            'I like that you did not make me swallow the excuse first.',
          ],
          regal: [
            'That is the first answer worthy of standing in this street.',
            'A vow without accountability is costume jewelry.',
          ],
          sharp: [
            'Good. Liability acknowledged.',
            'Now we can discuss repair instead of wasting time repossessing your denial.',
          ],
        },
      },
      {
        id: 'branch-deflect-faction',
        label: 'Blame the Faction',
        tags: ['avoidance', 'betrayal', 'secrecy'],
        tier: 'hated',
        outcome: 'mean',
        tone: 'danger',
        response: {
          poetic: [
            'No. You do not get to turn their dead into scenery for your innocence.',
            'If you need me blind to love you, then you do not want love. You want shelter.',
          ],
          deadpan: [
            'Bad answer. Cowardly structure. Predictable load-bearing failure.',
            'Do not bring me excuses and call them context.',
          ],
          hungry: [
            'That excuse tastes rotten.',
            'I will not eat blame you scraped off your own plate and served as justice.',
          ],
          regal: [
            'You disgrace the moment by asking me to applaud evasion.',
            'Affection does not outrank the blood on public stone.',
          ],
          sharp: ['Ah. Transfer of liability attempted.', 'Denied. With fees.'],
        },
      },
      {
        id: 'branch-promise-repair',
        label: 'Promise Repair',
        tags: ['commitment', 'protective', 'pragmatic'],
        tier: 'liked',
        response: {
          poetic: [
            'Repair is not a word. It is a road that cuts the feet.',
            'Still. I heard the promise put weight on itself. That matters.',
          ],
          deadpan: [
            'Action plan pending. Sentiment provisionally accepted.',
            'Bring evidence next time. I like evidence more than posture.',
          ],
          hungry: [
            'Fix it, then. Feed the people your chaos starved.',
            'I like promises better when they come with bread and a schedule.',
          ],
          regal: [
            'A promise of repair is not absolution. It is an opening stance.',
            'Make it real and I may call it honorable.',
          ],
          sharp: [
            'Repair terms accepted for review.',
            'Miss the deadline and I become less romantic and more accurate.',
          ],
        },
      },
    ],
    after: {
      poetic: ['They exhale slowly. "There. Now affection has a place to stand without lying."'],
      deadpan: ['They fold their arms. "Conversation complete. Consequences remain open."'],
      hungry: [
        'They look toward the market. "Good. Now feed someone who had to hear your name today."',
      ],
      regal: [
        'They incline their head. "This is not forgiveness. It is the gate forgiveness may enter through."',
      ],
      sharp: ['They tap two fingers together. "Better. Not clean. Better."'],
    },
  },
  {
    id: 'date-bear-pride',
    kind: 'date',
    setup:
      'Your date reaches a tavern where the stew is hot, the door is weak, and a bear has opinions about architecture.',
    npcPrompt: {
      poetic: [
        'This place smells like pepper, rain, and a tragic third thing I refuse to identify.',
        'If destiny interrupts dinner, I am charging it for the table.',
      ],
      deadpan: [
        'The stew is adequate. The door is not. The evening has structural concerns.',
        'Do not look pleased. I have not yet ruled out disaster.',
      ],
      hungry: [
        'Finally. Stew. If romance intends to compete with stew, romance should work harder.',
        'I am happy, which means something loud will happen in three seconds.',
      ],
      regal: [
        'A humble room can be dignified when the company understands posture.',
        'The stew is beneath ceremony. Fortunately, hunger is above pride.',
      ],
      sharp: [
        'Bad hinges, decent stew, two exits, one bartender lying about the bill.',
        'Romance is mostly risk assessment with better lighting.',
      ],
    },
    question:
      'The wall explodes inward. A bear lands in the tavern and roars. Your date does not look helpless; they look offended.',
    branches: [
      {
        id: 'branch-stand-with-them',
        label: 'Stand With Them',
        tags: ['protective', 'bravery', 'commitment'],
        tier: 'loved',
        tierByPersonality: {
          poetic: 'loved',
          deadpan: 'liked',
          hungry: 'loved',
          regal: 'loved',
          sharp: 'liked',
        },
        response: {
          poetic: [
            'There. Beside me, not in front of me. You understood the difference.',
            'I do not need a cage shaped like devotion. I wanted a witness with teeth.',
          ],
          deadpan: [
            'Good positioning. Respectful. Combat-adjacent romance improves by ninety percent.',
            'You did not assume incompetence. I noticed.',
          ],
          hungry: [
            'Yes. You guarded the stew and my dignity. That is basically courtship.',
            'We fight together, then eat quickly before courage cools.',
          ],
          regal: [
            'You stood beside me. Not above me. Not before me.',
            'That is how one protects a sovereign heart without insulting it.',
          ],
          sharp: [
            'Correct. Partnership, not ownership.',
            'You protected the flank and avoided the expensive mistake of treating me like cargo.',
          ],
        },
      },
      {
        id: 'branch-protect',
        label: 'Shield Them',
        tags: ['protective', 'neediness', 'publicAffection'],
        tier: 'disliked',
        tierByPersonality: {
          poetic: 'disliked',
          deadpan: 'neutral',
          hungry: 'liked',
          regal: 'disliked',
          sharp: 'disliked',
        },
        response: {
          poetic: [
            'Hmph. You made me smaller to make your courage prettier.',
            'Do not build a wall around me and call the bricks romance.',
          ],
          deadpan: [
            'Unrequested shielding. Tactical value mixed. Emotional cost unclear.',
            'I can fight a bear. I am still deciding whether you helped or obstructed.',
          ],
          hungry: [
            'You put yourself between me and teeth. I am annoyed. I am also warm about it.',
            'Next time protect my dinner and trust my bite. This time, I noticed the care.',
          ],
          regal: [
            'You presumed frailty. That is not gallantry; it is decorative insult.',
            'Stand with me, snake. Do not stand where my agency was breathing.',
          ],
          sharp: [
            'Ah. Hero pose. Expensive, obstructive, flattering in the least useful way.',
            'Try partnership next time. It has better margins.',
          ],
        },
      },
      {
        id: 'branch-run',
        label: 'Run Off',
        tags: ['avoidance', 'betrayal', 'selfPreserving'],
        tier: 'hated',
        tierByPersonality: {
          poetic: 'hated',
          deadpan: 'disliked',
          hungry: 'hated',
          regal: 'hated',
          sharp: 'disliked',
        },
        outcome: 'mean',
        tone: 'danger',
        response: {
          poetic: [
            'You left me in the mouth of the story.',
            'The bear was honest. It roared before it wounded me.',
          ],
          deadpan: ['You ran. Data received.', 'I survived the bear. Your reputation did not.'],
          hungry: [
            'You abandoned me and the stew. One of those is unforgivable. The other is you.',
            'Do not come back hungry for tenderness.',
          ],
          regal: [
            'Cowardice is not merely flight. It is leaving another to pay for your speed.',
            'You are dismissed from my favor until the word honor stops avoiding you.',
          ],
          sharp: [
            'Breach of contract. Witnessed by bear, bartender, and every table with ears.',
            'I hope running was profitable. It was not romantic.',
          ],
        },
      },
    ],
    after: {
      poetic: [
        'They wipes bear dust from their sleeve. "I hate that this is now one of our memories."',
      ],
      deadpan: [
        'They checks the broken wall. "The date has moved from poor venue choice to evidence."',
      ],
      hungry: ['They points at the table. "If the stew is cold, I am billing the bear."'],
      regal: [
        'They steps over splinters. "Continue the date. Dignity survives worse rooms than this."',
      ],
      sharp: [
        'They eyes the bartender. "The bear damaged the wall. We are not paying for ambience."',
      ],
    },
  },
  {
    id: 'date-abandoned-shrine',
    kind: 'date',
    setup:
      'A rain path leads you to an abandoned shrine where votive candles still burn for people no one admits missing.',
    npcPrompt: {
      poetic: [
        'Do not speak too loudly. Some places remember better in whispers.',
        'I brought you here because beauty with a wound tells the truth faster.',
      ],
      deadpan: [
        'This shrine is abandoned except for the candles, which is statistically unsettling.',
        'I am not scared. I am respectfully unconvinced by architecture that glows unattended.',
      ],
      hungry: [
        'There is no food here. That means the date is depending entirely on atmosphere. Risky.',
        'Still... the candles are warm. Warm counts.',
      ],
      regal: [
        'A ruined altar is still an altar. Behave accordingly.',
        'We may be ridiculous, but we need not be careless.',
      ],
      sharp: [
        'Unattended flame, old offerings, no visible caretaker. Either sacred or a trap with excellent branding.',
        'I like it. Do not make me regret that in front of ghosts.',
      ],
    },
    question:
      'Three offerings sit before the altar: a clean coin, a wilted flower, and a folded apology note addressed to no one.',
    branches: [
      {
        id: 'branch-clean-coin',
        label: 'Clean Coin',
        tags: ['transaction', 'pragmatic', 'ritual'],
        tier: 'liked',
        response: {
          poetic: [
            'A coin. Practical grief. The kind that admits the world still charges admission.',
            'I like it, though part of me wanted a softer wound.',
          ],
          deadpan: [
            'Coin selected. Clean, symbolic, financially legible.',
            'A reasonable offering. I am almost moved. Terrible development.',
          ],
          hungry: [
            'A coin cannot be eaten, but it can become food later. Sensible.',
            'I like practical romance. It has pockets.',
          ],
          regal: [
            'A coin acknowledges duty. Not grand, but properly weighted.',
            'Respectable. Ceremony does not always require flowers.',
          ],
          sharp: [
            'A coin. Transfer complete. The altar receives liquidity.',
            'I like that you understand symbolic payment. It prevents worse invoices.',
          ],
        },
      },
      {
        id: 'branch-wilted-flower',
        label: 'Wilted Flower',
        tags: ['privateAffection', 'dramatic', 'comfort'],
        tier: 'loved',
        response: {
          poetic: [
            'The dying flower. Of course.',
            'The thing still trying to be beautiful after its best hour. I am not immune to that.',
          ],
          deadpan: [
            'Wilted flower. Emotionally obvious. Annoyingly effective.',
            'I wanted to mock it. The flower has defeated me.',
          ],
          hungry: [
            'It is sad and useless and somehow sweet.',
            'Fine. I love the doomed little flower. Do not tell anyone I said that.',
          ],
          regal: [
            'A fading flower given with care outranks a fresh one given for display.',
            'Tenderness without spectacle. Good.',
          ],
          sharp: [
            'Wilted flower. Low market value. High emotional leverage.',
            'I respect an offering that knows exactly where to press.',
          ],
        },
      },
      {
        id: 'branch-read-apology',
        label: 'Read Note',
        tags: ['secrecy', 'betrayal', 'clever'],
        tier: 'hated',
        outcome: 'mean',
        tone: 'danger',
        response: {
          poetic: [
            'No. Some apologies are graves with paper doors.',
            'You do not enter every sorrow just because curiosity learned hands.',
          ],
          deadpan: [
            'Private note. You read it. Boundary failure confirmed.',
            "I dislike being shown how you treat other people's sealed pain.",
          ],
          hungry: ['That was not yours to open.', 'You made the air taste mean.'],
          regal: [
            'A sealed apology is not public entertainment.',
            'You have mistaken access for permission. Correct yourself.',
          ],
          sharp: [
            'Unauthorized document access. Interesting, ugly, informative.',
            'I will remember that you call invasion curiosity when the handwriting tempts you.',
          ],
        },
      },
    ],
    after: {
      poetic: ['They bows their head. "The shrine will remember us incorrectly. Most places do."'],
      deadpan: [
        'They studies the candles. "Nothing exploded. Intimacy remains statistically possible."',
      ],
      hungry: [
        'They tucks their hands close to the candle warmth. "Next sacred place needs snacks."',
      ],
      regal: ['They turns from the altar. "The date may continue. Quietly."'],
      sharp: [
        'They look back once. "That place knows more than it should. I approve reluctantly."',
      ],
    },
  },
  {
    id: 'flirt-compliment-trial',
    kind: 'flirt',
    setup:
      'A cracked mirror in a shop window catches both of you and immediately begins acting like a witness.',
    npcPrompt: {
      poetic: ['Compliment me, snake, but do not bring me a dead sentence dressed as a flower.'],
      deadpan: ['Compliment audit. Three seconds. Try not to injure language.'],
      hungry: ['Say something sweet enough to be useful and strange enough to be yours.'],
      regal: ['Address me as though the room deserves to overhear and fear your taste.'],
      sharp: ['Compliments are leverage with perfume on them. Show me your hand.'],
    },
    question: 'Which part of them do you praise?',
    branches: [
      {
        id: 'branch-praise-scars',
        label: 'Scars',
        tags: ['honesty', 'danger', 'privateAffection'],
        tier: 'loved',
        response: {
          poetic: ['My scars? Hah. You flirt with the weather that already struck me.'],
          deadpan: ['Scars. Specific. Evidence-based. Annoyingly effective.'],
          hungry: ['You noticed the hard parts and did not chew on them. Good.'],
          regal: ['A compliment to survival is braver than a compliment to symmetry.'],
          sharp: ['You saw the history and did not ask to own it. Good instincts.'],
        },
      },
      {
        id: 'branch-praise-smile',
        label: 'Smile',
        tags: ['comfort', 'publicAffection', 'food'],
        tier: 'liked',
        response: {
          poetic: ['My smile? Soft answer. Dangerous if sincere. I may permit it.'],
          deadpan: ['Smile. Conventional. Still not incorrect. Proceed carefully.'],
          hungry: ['Yes, yes, the smile. It has teeth. Respect the teeth.'],
          regal: ['A courtly answer. Familiar, but nicely polished.'],
          sharp: ['Safe target. Pleasant hit. I expected sharper, but I am not offended.'],
        },
      },
      {
        id: 'branch-praise-usefulness',
        label: 'Usefulness',
        tags: ['transaction', 'pragmatic', 'avoidance'],
        tier: 'disliked',
        outcome: 'mean',
        tone: 'danger',
        response: {
          poetic: ['Useful? Romance limps when you put it in work boots too early.'],
          deadpan: ['Usefulness is not a compliment. It is an invoice with eyelashes.'],
          hungry: ['I am not a tool rack with a pulse, snake. Try again later.'],
          regal: ['You praise utility as if I am furniture with excellent posture. No.'],
          sharp: ['Useful. There it is. The dullest blade in the drawer.'],
        },
      },
    ],
    after: {
      poetic: ['The mirror keeps the answer and smirks in silver.'],
      deadpan: ['The mirror records no objections, which is legally suspicious.'],
      hungry: ['The shop window fogs from somebody pretending not to breathe hard.'],
      regal: ['The reflection bows with entirely unearned authority.'],
      sharp: ['The reflected version of them looks like it knows what you meant.'],
    },
  },
  {
    id: 'talk-boundary-test',
    kind: 'talk',
    setup:
      'A festival crowd presses too close, and someone mistakes your closeness for permission to comment.',
    npcPrompt: {
      poetic: ['Crowds turn love into theater and then complain about the ending.'],
      deadpan: ['External commentary detected. Response requested.'],
      hungry: ['Too many strangers near the soft parts. I may bite a metaphor.'],
      regal: ['The public has mistaken itself for a council. Correct it.'],
      sharp: ['A crowd is just a blade with many handles. What do you grab?'],
    },
    question: 'How do you answer the crowd?',
    branches: [
      {
        id: 'branch-set-boundary',
        label: 'Set Boundary',
        tags: ['protective', 'restraint', 'loyalty'],
        tier: 'loved',
        response: {
          poetic: ['You made a wall without making a cage. That is harder than heroics.'],
          deadpan: ['Boundary established. Minimal spectacle. Strong result.'],
          hungry: ['You kept the strangers out and left me room to breathe. Good.'],
          regal: ['A clean border. No begging, no boasting. Well done.'],
          sharp: ['You defended the line without grabbing my leash. I noticed.'],
        },
      },
      {
        id: 'branch-perform-romance',
        label: 'Perform',
        tags: ['publicAffection', 'dramatic', 'recklessness'],
        tier: 'liked',
        response: {
          poetic: ['A public flourish. Ridiculous. Bright. I may forgive the sparkle.'],
          deadpan: ['Performance excessive. Charm present. Complaint pending.'],
          hungry: ['You fed the crowd drama and kept a bite for me. Acceptable.'],
          regal: ['The spectacle was unnecessary, which is not the same as unwelcome.'],
          sharp: ['Loud move. Some cover, some risk. I am amused despite myself.'],
        },
      },
      {
        id: 'branch-ignore-discomfort',
        label: 'Ignore Them',
        tags: ['avoidance', 'neglect', 'selfPreserving'],
        tier: 'hated',
        outcome: 'mean',
        tone: 'danger',
        response: {
          poetic: ['You let the crowd put hands on the moment. I dislike the fingerprints.'],
          deadpan: ['Discomfort ignored. Trust reduction obvious.'],
          hungry: ['You heard the room chewing on us and offered no spoon, no knife, nothing.'],
          regal: ['Silence can be a betrayal when the court is staring.'],
          sharp: ['You chose convenience over cover. I will remember the math.'],
        },
      },
    ],
    after: {
      poetic: ['The crowd drifts away, deprived of its favorite wound.'],
      deadpan: ['Public interest drops to survivable levels.'],
      hungry: ['The air becomes edible again. Barely.'],
      regal: ['The room remembers who was permitted to speak.'],
      sharp: ['The crowd loses interest when it stops drawing blood.'],
    },
  },
  {
    id: 'date-sickroom-vigil',
    kind: 'date',
    setup:
      'A planned date detours into a sickroom where an old neighbor needs medicine, quiet, and no heroic speeches.',
    npcPrompt: {
      poetic: ['Romance has been interrupted by mortality with a cough. What do you do?'],
      deadpan: ['Date objective changed. Care task active.'],
      hungry: ['This is not glamorous. That is how you know it might matter.'],
      regal: ['A household in need outranks entertainment. Prove you know that.'],
      sharp: ['Care is where charming people often reveal the bill.'],
    },
    question: 'How do you spend the hour?',
    branches: [
      {
        id: 'branch-sit-vigil',
        label: 'Sit Quietly',
        tags: ['mercy', 'restraint', 'commitment'],
        tier: 'loved',
        response: {
          poetic: ['You sat still where usefulness had no applause. That was beautiful.'],
          deadpan: ['Quiet care performed well. No wasted drama. Strong result.'],
          hungry: ['You made patience warm. I did not expect that from you.'],
          regal: ['Service without spectacle is difficult. You managed it.'],
          sharp: ['No speech, no claim, no audience. Just care. I respect that.'],
        },
      },
      {
        id: 'branch-fetch-medicine',
        label: 'Fetch Medicine',
        tags: ['competence', 'pragmatic', 'protective'],
        tier: 'liked',
        response: {
          poetic: ['Swift hands, useful heart. Not poetry, maybe, but close enough tonight.'],
          deadpan: ['Medicine acquired. Competence remains attractive.'],
          hungry: ['You brought what was needed before anyone had to beg. Good.'],
          regal: ['A practical service, cleanly done. The household notices. So do I.'],
          sharp: ['Fast, useful, no fuss. That kind of competence is dangerous.'],
        },
      },
      {
        id: 'branch-resent-detour',
        label: 'Resent Detour',
        tags: ['neglect', 'selfPreserving', 'avoidance'],
        tier: 'hated',
        outcome: 'mean',
        tone: 'danger',
        response: {
          poetic: ['You looked at need and mourned only your interrupted evening. Ugly.'],
          deadpan: ['Care failure. Romantic value decreased.'],
          hungry: ['You made sickness compete with your appetite. I hate that.'],
          regal: ['A person who resents duty should not ask for devotion.'],
          sharp: ['When the room needed care, you counted inconvenience. Useful data.'],
        },
      },
    ],
    after: {
      poetic: ['The sickroom exhales, and the date becomes something older than flirting.'],
      deadpan: ['The original itinerary is dead. The evening is not.'],
      hungry: ['The medicine smells bitter. The silence smells honest.'],
      regal: ['The hour leaves with the dignity of a closed door.'],
      sharp: ['The detour has sharper records than the planned date would have.'],
    },
  },
  {
    id: 'talk-first-revelation',
    kind: 'talk',
    setup:
      'The room goes quiet in the unnatural way rooms do when someone nearly says the true thing.',
    npcPrompt: {
      poetic: ['There is a story I usually keep under the floorboards. Do not pry. Invite.'],
      deadpan: ['Personal disclosure may occur. Mishandling will be remembered.'],
      hungry: ['Some memories are leftovers. Still warm. Still dangerous.'],
      regal: ['A private history approaches the throne. Treat it with ceremony or leave it alone.'],
      sharp: ['I am considering showing you a weak point. Do not make it cheap.'],
    },
    question: 'How do you meet the almost-confession?',
    branches: [
      {
        id: 'branch-invite-truth',
        label: 'Invite Truth',
        tags: ['honesty', 'restraint', 'privateAffection'],
        tier: 'loved',
        response: {
          poetic: [
            'You did not drag the story into daylight. You opened a window and waited.',
            'Fine. I had someone once who taught me goodbye before they taught me love.',
          ],
          deadpan: [
            'Good. No interrogation posture. That helps.',
            'I left home because staying would have made me smaller. I still measure doors.',
          ],
          hungry: [
            'You waited. Waiting is a kind of feeding when it has warmth in it.',
            'I learned hunger from people who called crumbs a lesson. I am still angry.',
          ],
          regal: [
            'You offered respect before curiosity. That is the correct order.',
            'I was once sworn to people who loved obedience more than me. I survived them.',
          ],
          sharp: [
            'You invited without bidding. Good distinction.',
            'I learned early that affection can hide clauses. I read everything now.',
          ],
        },
      },
      {
        id: 'branch-make-joke',
        label: 'Make Joke',
        tags: ['clever', 'avoidance', 'dramatic'],
        tier: 'neutral',
        tierByPersonality: {
          poetic: 'disliked',
          deadpan: 'liked',
          hungry: 'neutral',
          regal: 'disliked',
          sharp: 'liked',
        },
        response: {
          poetic: ['You made a joke at the door of a grave. I know why. I dislike it anyway.'],
          deadpan: ['Joke detected. Avoidance detected. Also, timing was not incompetent.'],
          hungry: ['A joke. Crunchy shell. I am still waiting for the filling.'],
          regal: ['Levity has a place. This was not its appointed chair.'],
          sharp: ['A joke to test the lock. Fine. I know that tool. Do not overuse it.'],
        },
      },
      {
        id: 'branch-demand-story',
        label: 'Demand Story',
        tags: ['neediness', 'publicAffection', 'betrayal'],
        tier: 'hated',
        outcome: 'mean',
        tone: 'danger',
        response: {
          poetic: ['You yanked the floorboards up and called the splinters intimacy. No.'],
          deadpan: ['Demand denied. Trust loss immediate.'],
          hungry: ['Do not grab at old hunger with both hands. I will bite.'],
          regal: ['Private history is not tribute owed to your impatience.'],
          sharp: ['You treated my weak point like a purchase order. Bad move.'],
        },
      },
    ],
    after: {
      poetic: ['The almost-confession either blooms or retreats under the floor.'],
      deadpan: ['The disclosure window closes with updated permissions.'],
      hungry: ['The air tastes like old bread and possible trust.'],
      regal: ['The private court adjourns without witnesses.'],
      sharp: ['A hidden clause has either been shared or buried deeper.'],
    },
  },
  {
    id: 'date-ruined-feast',
    kind: 'date',
    setup:
      'A carefully planned dinner collapses: cold soup, wrong table, and a musician playing the breakup song by mistake.',
    npcPrompt: {
      poetic: ['The night has fallen down the stairs. How do you court me among the pieces?'],
      deadpan: ['Date failure cascade active. Your salvage attempt begins now.'],
      hungry: ['The soup is cold. The evening is not dead unless you make it boring.'],
      regal: ['The feast is ruined. Dignity is still available, if you know where to stand.'],
      sharp: ['Bad venue, bad music, bad soup. Excellent test conditions.'],
    },
    question: 'How do you save the date?',
    branches: [
      {
        id: 'branch-laugh-and-share',
        label: 'Laugh and Share',
        tags: ['comfort', 'humility', 'privateAffection'],
        tier: 'loved',
        response: {
          poetic: ['You laughed with the ruin, not at me. That is the secret door.'],
          deadpan: ['Shared disaster reframed successfully. I am impressed against policy.'],
          hungry: ['Cold soup becomes funny soup when someone warm is holding the spoon.'],
          regal: ['Grace under absurdity. A useful royal talent.'],
          sharp: ['You converted loss into intimacy. Very efficient. Very dangerous.'],
        },
      },
      {
        id: 'branch-demand-refund',
        label: 'Demand Refund',
        tags: ['transaction', 'pragmatic', 'ledger'],
        tier: 'neutral',
        tierByPersonality: {
          poetic: 'disliked',
          deadpan: 'liked',
          hungry: 'neutral',
          regal: 'neutral',
          sharp: 'loved',
        },
        response: {
          poetic: ['The moon is in the soup and you are counting coins. Tragic.'],
          deadpan: ['Refund pursuit reasonable. Romance impact unexpectedly stable.'],
          hungry: ['Get the coin back, sure, but do not make me eat the argument.'],
          regal: ['A refund is fair. It is not, by itself, romance.'],
          sharp: ['Yes. Recover value, preserve leverage, then salvage the night. Good.'],
        },
      },
      {
        id: 'branch-blame-them',
        label: 'Blame Them',
        tags: ['betrayal', 'avoidance', 'neediness'],
        tier: 'hated',
        outcome: 'mean',
        tone: 'danger',
        response: {
          poetic: ['You handed me the broken evening as if I ordered the storm. Ugly.'],
          deadpan: ['Blame assignment inaccurate and unattractive.'],
          hungry: ['You made me swallow the bad night for you. I hate that taste.'],
          regal: ['A companion does not throw failure like table scraps.'],
          sharp: ['You passed the cost to me because you panicked. I noticed.'],
        },
      },
    ],
    after: {
      poetic: ['The breakup song changes key and pretends it never accused anyone.'],
      deadpan: ['Dinner remains failed. The date does not necessarily share its fate.'],
      hungry: ['The soup is still cold. The room is warmer or worse.'],
      regal: ['The table is cleared with more drama than it earned.'],
      sharp: ['The receipt becomes evidence. So does your face.'],
    },
  },
  {
    id: 'talk-guard-law-mercy',
    kind: 'talk',
    intent: ['values test', 'law versus mercy', 'public duty versus affection'],
    romanceReason:
      'A guard uses a legal dilemma to test whether private affection can survive public duty.',
    roles: ['guard', 'gateGuard'],
    roleMatchMode: 'required',
    contextTags: ['crime', 'faction'],
    setup: 'Their post overlooks the town road. The wanted notices flutter like nervous witnesses.',
    npcPrompt: {
      poetic: [
        'Law is a lantern until someone uses it to burn a house down. Tell me what you see.',
      ],
      deadpan: [
        'Professional question. The law failed someone today. Diagnose without grandstanding.',
      ],
      hungry: ['The town is hungry for blame. Hungry towns bite the nearest hand.'],
      regal: ['A guard serves order. A lover must decide whether order deserves the whole heart.'],
      sharp: ['Law is a contract enforced by boots. I am asking whether you read the small print.'],
    },
    question: 'A guard asks what should happen to a thief who stole grain for children.',
    branches: [
      {
        id: 'branch-praise-law',
        label: 'Praise Law',
        tags: ['ritual', 'contract', 'publicAffection'],
        tier: 'neutral',
        response: {
          poetic: ['Law without mercy is just a cage that learned grammar.'],
          deadpan: ['Law praise logged. Useful, incomplete, low compassion.'],
          hungry: ['Law does not fill a bowl. It only labels the empty one.'],
          regal: ['Order matters. So does knowing when order has become vanity.'],
          sharp: [
            'Law is leverage. Praising leverage without asking who holds it is amateur work.',
          ],
        },
      },
      {
        id: 'branch-show-mercy',
        label: 'Show Mercy',
        tags: ['mercy', 'humility', 'protective'],
        tier: 'liked',
        response: {
          poetic: ['Mercy. Good. Not softness. A blade turned sideways.'],
          deadpan: [
            'Mercy recommendation accepted. It may even reduce future theft. Imagine that.',
          ],
          hungry: ['Feed the children first. Then lecture the thief where nobody is starving.'],
          regal: ['Mercy is order remembering it has a soul.'],
          sharp: ['Mercy can be profitable when punishment would create three new thieves. Fine.'],
        },
      },
      {
        id: 'branch-threaten-thief',
        label: 'Threaten Thief',
        tags: ['violence', 'recklessness', 'publicAffection'],
        tier: 'disliked',
        outcome: 'mean',
        tone: 'danger',
        response: {
          poetic: ['You fed a hungry story more teeth. I dislike that instinct.'],
          deadpan: ['Threat-first policy. Efficient at creating worse problems.'],
          hungry: ['Threats do not cook grain. They just make fear chew faster.'],
          regal: ['Punishment without judgment is not justice. It is appetite in uniform.'],
          sharp: ['Free violence. No leverage. Bad investment.'],
        },
      },
    ],
    after: {
      poetic: ['The noticeboard keeps fluttering, unconvinced by everyone.'],
      deadpan: ['The guard resumes watching the road with updated suspicion.'],
      hungry: ['Somewhere nearby, bread smells like politics.'],
      regal: ['The post feels less like a job and more like a vow under audit.'],
      sharp: ['The road remains open. The question does not.'],
    },
  },
  {
    id: 'flirt-shopkeeper-scarcity',
    kind: 'flirt',
    intent: ['low-stakes values test', 'commerce under pressure', 'care versus profit'],
    romanceReason: 'Scarcity lets a merchant reveal whether affection changes how they price care.',
    roles: [
      'shopkeeper',
      'potionMaker',
      'butcher',
      'bartender',
      'goblinMerchant',
      'blackMarketMerchant',
    ],
    roleMatchMode: 'required',
    contextTags: ['food-shortage', 'market'],
    setup:
      'They close the shop ledger with one finger still holding the page, as if affection might try to steal inventory.',
    npcPrompt: {
      poetic: ['Scarcity makes poets of cowards and accountants of lovers. Which are you today?'],
      deadpan: ['Romantic compatibility question: a shipment is late and customers are panicking.'],
      hungry: ['The shelves are thin. The town is pretending not to lick its teeth.'],
      regal: ['A merchant under shortage holds a small kingdom together with string and prices.'],
      sharp: ['Shortage is when affection learns whether it has a price ceiling. Speak carefully.'],
    },
    question: 'They ask what you would do with the last warm loaf in town.',
    branches: [
      {
        id: 'branch-sell-fair',
        label: 'Sell Fair',
        tags: ['pragmatic', 'ledger', 'mercy'],
        tier: 'liked',
        response: {
          poetic: ['Fair price. Not glamorous, but neither is winter. I respect it.'],
          deadpan: ['Correct. Fair pricing prevents riots and boring speeches.'],
          hungry: ['Fair price means more people eat. I like math when it has bread in it.'],
          regal: ['A fair market is a quiet form of mercy.'],
          sharp: ['Fair price protects reputation and repeat customers. Good margin long-term.'],
        },
      },
      {
        id: 'branch-give-hungry',
        label: 'Give Hungry',
        tags: ['mercy', 'selfless', 'food'],
        tier: 'loved',
        response: {
          poetic: [
            'You give it where hunger is loudest. Dangerous kindness. Beautiful, if costly.',
          ],
          deadpan: [
            'Charity noted. Financially poor. Socially powerful. Emotionally inconvenient.',
          ],
          hungry: ['Yes. Feed the empty mouth first. Romance can wait its turn and still be warm.'],
          regal: ['A ruler is judged by who eats when the table is small.'],
          sharp: ['Gift the loaf, buy loyalty, reduce panic. Surprisingly efficient tenderness.'],
        },
      },
      {
        id: 'branch-auction-loaf',
        label: 'Auction It',
        tags: ['transaction', 'ambition', 'betrayal'],
        tier: 'disliked',
        outcome: 'mean',
        response: {
          poetic: ['You turned hunger into theater and sold tickets. No.'],
          deadpan: ['Maximum profit. Maximum resentment. Poor civic hygiene.'],
          hungry: ['You made starving people bid against each other. I hate that taste.'],
          regal: ['Profit without duty is a crown made of teeth.'],
          sharp: ['Short-term gain. Long-term knives. Amateur greed.'],
        },
      },
    ],
    after: {
      poetic: ['The ledger shuts, but the page keeps its finger on you.'],
      deadpan: ['The shop remains open. The moral inventory is less stable.'],
      hungry: ['The idea of bread has become unreasonably intimate.'],
      regal: ['Their counter looks briefly like a judgment bench.'],
      sharp: ['Somewhere in the ledger, your answer becomes a risk category.'],
    },
  },
  {
    id: 'flirt-equipment-merchant-protection',
    kind: 'flirt',
    intent: ['role-flavor flirt', 'violence versus protection', 'status test'],
    romanceReason:
      'An equipment merchant uses gear talk to ask whether the player values safety, spectacle, or leverage.',
    roles: ['equipmentMerchant'],
    roleMatchMode: 'required',
    contextTags: ['market', 'danger'],
    preferredPersonalities: ['deadpan', 'sharp', 'regal'],
    setup:
      'The equipment rack gleams behind them, each blade polished enough to make danger look employed.',
    npcPrompt: {
      poetic: [
        'Steel is a promise with an edge. Tell me whether promises should shine before they cut.',
        'Every buckle here has heard someone swear they only wanted protection.',
      ],
      deadpan: [
        'Romantic inventory check: armor protects people and occasionally their worst decisions.',
        'I need to know whether you buy safety, status, or an excuse to stand closer to trouble.',
      ],
      hungry: [
        'A good shield is like a good meal. You notice it most when someone tries to take it away.',
        'Weapons are expensive hunger with handles. Convince me yours has manners.',
      ],
      regal: [
        'Arms reveal station, restraint, and whether the wearer mistakes shine for honor.',
        'A proper tool serves the hand. A vain hand serves the tool. Which are you?',
      ],
      sharp: [
        'Protection is a sales category. Violence is a customer habit. Pick which one you are.',
        'Every weapon claims self-defense until the receipt dries.',
      ],
    },
    question: 'They ask what a lover should carry into a dangerous road.',
    branches: [
      {
        id: 'branch-buy-protection',
        label: 'Buy Protection',
        tags: ['protective', 'pragmatic', 'transaction'],
        tier: 'liked',
        response: {
          poetic: ['Protection first. Good. Love should arrive with a roof and a warning bell.'],
          deadpan: ['Practical answer. Low poetry. High survival rate. I approve.'],
          hungry: ['Yes. Bring a shield, then dinner. I respect proper ordering.'],
          regal: ['Preparedness honors the beloved by refusing theatrical helplessness.'],
          sharp: ['Good purchase logic. Romance is cheaper when nobody bleeds unnecessarily.'],
        },
      },
      {
        id: 'branch-praise-steel',
        label: 'Praise Steel',
        tags: ['danger', 'publicAffection', 'ritual'],
        tier: 'neutral',
        response: {
          poetic: ['You heard the shine but not the wound. Still, shine has its uses.'],
          deadpan: ['Aesthetic confidence noted. Please do not romance the inventory.'],
          hungry: ['Steel is not dinner. It can guard dinner. Partial credit.'],
          regal: ['Ceremony has value when it remembers the person under the mail.'],
          sharp: ['You like symbols. Fine. Symbols still need maintenance and consequences.'],
        },
      },
      {
        id: 'branch-mock-armor',
        label: 'Mock Armor',
        tags: ['recklessness', 'clever', 'betrayal'],
        tier: 'disliked',
        outcome: 'mean',
        response: {
          poetic: [
            'Mock the shell if you must. Some hearts survive because something took the dent.',
          ],
          deadpan: ['Armor mockery logged. Future funeral expenses projected upward.'],
          hungry: ['No. Soup spills less when the bowl exists. Basic doctrine.'],
          regal: ['Disrespecting protection is not courage. It is vanity without witnesses yet.'],
          sharp: ['Cheap joke. Expensive lesson. I sell the lesson too.'],
        },
      },
    ],
    after: {
      poetic: ['A breastplate catches the candlelight like a moon trying to be useful.'],
      deadpan: ['They rehang a helmet with unnecessary precision.'],
      hungry: ['The rack smells faintly of oil, road dust, and missed lunches.'],
      regal: ['The shop feels briefly like an armory for vows.'],
      sharp: ['Their eyes move from the weapons to you, calculating repair costs.'],
    },
  },
  {
    id: 'talk-potion-maker-triage',
    kind: 'talk',
    intent: ['care versus profit', 'political fear', 'healing ethics'],
    romanceReason:
      'A potion maker tests whether the player treats care as mercy, commerce, or political risk.',
    roles: ['potionMaker'],
    roleMatchMode: 'required',
    contextTags: ['healing', 'wanted', 'market'],
    preferredPersonalities: ['deadpan', 'sharp', 'poetic'],
    setup:
      'Bottles crowd the workbench. One is labeled medicine, one is labeled probably medicine, and one has no label on purpose.',
    npcPrompt: {
      poetic: [
        'Every cure asks what the wound has earned. I hate that question. Answer it anyway.',
        'A body can be mended. A town keeps deciding which bodies count.',
      ],
      deadpan: [
        'Triage problem. The patient caused the riot and is currently leaking on my floor.',
        'Medical ethics have arrived without an appointment. Terrible habit.',
      ],
      hungry: [
        'Medicine is just food with a deadline and worse flavor. Who gets the dose?',
        'Someone is hurt, someone is guilty, and the bottle is not big enough to care.',
      ],
      regal: [
        'A healer holds a court where pain speaks before rank. In theory.',
        'Mercy administered badly becomes favoritism with clean hands.',
      ],
      sharp: [
        'A cure is leverage when demand exceeds supply. Tell me what kind of monster notices.',
        'The bottle is small. The politics are not. Choose.',
      ],
    },
    question: 'They ask whether to treat a hated patient first.',
    branches: [
      {
        id: 'branch-protect-patient',
        label: 'Protect Patient',
        tags: ['mercy', 'protective', 'bravery'],
        tier: 'liked',
        response: {
          poetic: ['Good. A pulse is not a referendum. Let the living answer later.'],
          deadpan: ['Correct. Triage before punishment. Annoyingly humane.'],
          hungry: ['Patch them first. Scold them after broth. This is civilization.'],
          regal: ['Mercy before judgment. Not weakness. Procedure with a soul.'],
          sharp: ['Useful. Keeps options alive, including accountability. Efficient mercy.'],
        },
      },
      {
        id: 'branch-question-cure',
        label: 'Question Cure',
        tags: ['clever', 'selfPreserving', 'pragmatic'],
        tier: 'neutral',
        response: {
          poetic: ['Doubt can be a lantern or a locked door. Yours still has oil.'],
          deadpan: ['Verification request accepted. Suspicion is not always cruelty.'],
          hungry: ['Sniff the bottle. Ask questions. Do not drink mystery on an empty stomach.'],
          regal: ['Prudence is honorable when it does not become abandonment.'],
          sharp: ['Good. Trust is better with a receipt and a second sample.'],
        },
      },
      {
        id: 'branch-blame-king',
        label: 'Blame King',
        tags: ['publicAffection', 'danger', 'recklessness'],
        tier: 'disliked',
        outcome: 'mean',
        response: {
          poetic: [
            'Perhaps true. Also loud. Loud gets patients killed before truth gets boots on.',
          ],
          deadpan: ['Political diagnosis noted. Patient still bleeding. Prioritize better.'],
          hungry: ['Kings cause plenty. They are rarely useful bandages.'],
          regal: ['Blame may be deserved. Timing is still a discipline.'],
          sharp: ['Correct target, terrible moment. You made accuracy look unserious.'],
        },
      },
    ],
    after: {
      poetic: ['The unlabeled bottle glows like a secret deciding whether to help.'],
      deadpan: ['They move the fragile bottles farther from your tail. Sensible.'],
      hungry: ['The room smells bitter enough to count as medicine.'],
      regal: ['Their workbench becomes a small court of glass and consequence.'],
      sharp: ['They cork the bottle like punctuation.'],
    },
  },
  {
    id: 'flirt-butcher-length-offer',
    kind: 'flirt',
    intent: ['dark comedy flirt', 'body economy', 'practical intimacy'],
    romanceReason:
      'A butcher turns snake length and appetite into a blunt test of comfort with bodily reality.',
    roles: ['butcher'],
    roleMatchMode: 'required',
    contextTags: ['food', 'market'],
    preferredPersonalities: ['hungry', 'deadpan', 'sharp'],
    setup:
      'The butcher sharpens a knife slowly, not threateningly, which somehow makes it more sincere.',
    npcPrompt: {
      poetic: [
        'Bodies are honest ledgers. Hunger signs them in red. Tell me how romantic that is allowed to be.',
        'Do not flinch at the knife unless you mean it poetically.',
      ],
      deadpan: [
        'Flirtation has reached the practical anatomy portion. I apologize to nobody.',
        'Question. If affection costs length, are you generous or just poorly measured?',
      ],
      hungry: [
        'Finally, romance with marrow in it. Speak before I get sentimental and season something.',
        'Length is not love. It can buy dinner, which has historically helped love.',
      ],
      regal: [
        'A blade may be vulgar and still honest. Courtly lies rarely cut so cleanly.',
        'Appetite without manners is beastly. Appetite with manners is dinner.',
      ],
      sharp: [
        'You are long, valuable, and pretending that is not a market condition.',
        'The knife is honest. People get stranger around honest tools.',
      ],
    },
    question: 'They ask what you would offer when hunger reaches the door.',
    branches: [
      {
        id: 'branch-offer-length',
        label: 'Offer Length',
        tags: ['food', 'selfless', 'transaction'],
        tier: 'liked',
        response: {
          poetic: ['Generous. Horrifying. Tender in a way nobody should embroider.'],
          deadpan: ['Offer recorded. Disturbing, useful, oddly intimate.'],
          hungry: ['That is either love or lunch accounting. I respect both.'],
          regal: ['Sacrifice with consent has dignity, even when the metaphor is chewy.'],
          sharp: ['Clean offer. Clear terms. Slightly alarming margins.'],
        },
      },
      {
        id: 'branch-praise-knife',
        label: 'Praise Knife',
        tags: ['ritual', 'danger', 'publicAffection'],
        tier: 'neutral',
        response: {
          poetic: ['The knife accepts compliments poorly. I accept them slightly better.'],
          deadpan: ['Tool praise noted. Try not to court the cutlery instead of me.'],
          hungry: ['Sharp tools make cleaner meals. This is not nothing.'],
          regal: ['Respect for craft is welcome. Worship of edge is tedious.'],
          sharp: ['You admire function. Good. Do not confuse it with permission.'],
        },
      },
      {
        id: 'branch-flinch',
        label: 'Flinch',
        tags: ['avoidance', 'selfPreserving', 'comfort'],
        tier: 'neutral',
        response: {
          poetic: ['Fear has manners today. I can work with manners.'],
          deadpan: ['Flinch detected. Sensible nervous system. No penalty.'],
          hungry: ['Good. If you did not flinch, I would worry about the soup of your soul.'],
          regal: ['Caution is not cowardice when the blade is real.'],
          sharp: ['Honest reaction. Better than bravado with bad balance.'],
        },
      },
    ],
    after: {
      poetic: ['The whetstone sings a small, ugly love song.'],
      deadpan: ['They set the knife down exactly where both of you can see it.'],
      hungry: ['Somewhere nearby, stew becomes more philosophical than requested.'],
      regal: ['The block between you looks like an altar that learned trade.'],
      sharp: ['Their smile is narrow, practical, and not unkind.'],
    },
  },
  {
    id: 'flirt-card-dealer-tells',
    kind: 'flirt',
    intent: ['risk flirt', 'honesty versus play', 'secrets and tells'],
    romanceReason:
      'A card dealer frames intimacy as a wager where honesty, cheating, and restraint reveal trust.',
    roles: ['cardDealer'],
    roleMatchMode: 'required',
    contextTags: ['cards', 'rumor'],
    preferredPersonalities: ['sharp', 'deadpan', 'poetic'],
    setup:
      'The card dealer shuffles without looking down. Every card sounds like a tiny door locking.',
    npcPrompt: {
      poetic: [
        'Chance is a candle in a crooked room. Tell me whether love should count cards.',
        'The deck lies beautifully. People lie worse. Which should I forgive?',
      ],
      deadpan: [
        'Compatibility exercise. I know your tell. You may attempt to make that romantic.',
        'We are pretending this is a game because honesty needs furniture.',
      ],
      hungry: [
        'Cards are snacks for risk. I prefer mine salted and not hidden in sleeves.',
        'You can bluff hunger. You cannot bluff dessert. Usually.',
      ],
      regal: [
        'A wager can be vulgar, ceremonial, or both. Conduct yourself accordingly.',
        'The table recognizes nerve faster than rank. I enjoy that about it.',
      ],
      sharp: [
        'I know when you are bluffing. The interesting question is whether you know when I let you.',
        'Romance is a table with stakes. Do not sit down and call it weather.',
      ],
    },
    question: 'They ask whether honesty ruins the game.',
    branches: [
      {
        id: 'branch-play-honest',
        label: 'Play Honest',
        tags: ['honesty', 'restraint', 'privateAffection'],
        tier: 'liked',
        response: {
          poetic: ['Honesty does not ruin the game. It makes the silence dangerous. Good.'],
          deadpan: ['Honest play. Lower profit. Higher long-term survivability. Interesting.'],
          hungry: ['Good. I like knowing what is in the pot before I eat it.'],
          regal: ['Honor at a table is not innocence. It is chosen constraint.'],
          sharp: ['Honesty as strategy. Risky. Attractive when done on purpose.'],
        },
      },
      {
        id: 'branch-call-bluff',
        label: 'Call Bluff',
        tags: ['clever', 'bravery', 'publicAffection'],
        tier: 'neutral',
        response: {
          poetic: ['You named the mask without demanding the face. Acceptable nerve.'],
          deadpan: ['Bluff called. Evidence pending. Confidence mildly entertaining.'],
          hungry: ['You bit the lie before it bit you. Fine table manners.'],
          regal: ['A challenge can be graceful when it bows before drawing blood.'],
          sharp: ['Good eye. Now prove you can survive being right.'],
        },
      },
      {
        id: 'branch-cheat-back',
        label: 'Cheat Back',
        tags: ['betrayal', 'clever', 'recklessness'],
        tier: 'disliked',
        outcome: 'mean',
        response: {
          poetic: ['A mirror trick. Pretty, petty, and less brave than you hoped.'],
          deadpan: ['Counter-cheat selected. Trust value depreciating.'],
          hungry: ['No. If everyone poisons the pot, nobody eats.'],
          regal: ['Retaliatory dishonor remains dishonor, however symmetrical.'],
          sharp: ['Cute. Obvious. I taught that move to someone worse.'],
        },
      },
    ],
    after: {
      poetic: ['The deck settles like it has learned a secret about both of you.'],
      deadpan: ['They square the cards. The cards look more organized than the feeling.'],
      hungry: ['The table smells like wax, risk, and someone skipping dinner.'],
      regal: ['For a moment, the table becomes court, altar, and trap.'],
      sharp: ['They leave one card face down between you. Invitation or warning.'],
    },
  },
  {
    id: 'talk-bartender-rumor-truth',
    kind: 'talk',
    intent: ['truth versus secrecy', 'rumor ethics', 'emotional labor'],
    romanceReason: 'A bartender tests whether intimacy means protecting secrets or serving truth.',
    roles: ['bartender', 'cardDealer', 'cook'],
    roleMatchMode: 'required',
    contextTags: ['rumor', 'crime'],
    setup: 'The tavern is busy enough that every table can pretend it is not listening.',
    npcPrompt: {
      poetic: ['Rumor is just truth wearing perfume and a knife. Which bottle do you open?'],
      deadpan: ['A customer lied loudly. The room enjoyed it. Response?'],
      hungry: ['People gossip better when fed. That does not make them kinder.'],
      regal: ['A tavern is a court where the witnesses are drunk and the judge wants stew.'],
      sharp: ['Rumor is currency. Spend it, save it, or counterfeit it.'],
    },
    question: 'They ask whether to bury an ugly truth or serve it with the ale.',
    branches: [
      {
        id: 'branch-serve-truth',
        label: 'Serve Truth',
        tags: ['honesty', 'publicAffection', 'bravery'],
        tier: 'liked',
        response: {
          poetic: ['Truth on the table. Messy, shining, impossible to unspill.'],
          deadpan: ['Public truth. High splash radius. Sometimes necessary.'],
          hungry: ['Serve it hot or it curdles. I like that instinct.'],
          regal: ['Truth publicly served can restore order, if the hand is steady.'],
          sharp: ['Disclosure creates enemies and useful clarity. Acceptable risk.'],
        },
      },
      {
        id: 'branch-protect-secret',
        label: 'Protect Secret',
        tags: ['secrecy', 'protective', 'restraint'],
        tier: 'neutral',
        response: {
          poetic: ['A secret protected can be mercy or rot. I need to know which.'],
          deadpan: ['Confidentiality preserved. Motive still under review.'],
          hungry: ['Some secrets need a lid. Some need a spoon and witnesses.'],
          regal: ['Discretion is honorable only when it does not shelter cruelty.'],
          sharp: ['Protected secret. Valuable asset. Dangerous liability.'],
        },
      },
      {
        id: 'branch-twist-rumor',
        label: 'Twist Rumor',
        tags: ['clever', 'secrecy', 'betrayal'],
        tier: 'disliked',
        outcome: 'mean',
        response: {
          poetic: ['You taught the lie to dance. I dislike how pretty it looked.'],
          deadpan: ['Manipulated rumor. Clever. Untrustworthy.'],
          hungry: ['You seasoned a lie and fed it to the room. Bad kitchen.'],
          regal: ['A twisted rumor is poison with manners.'],
          sharp: ['Useful lie. Expensive if traced. I am listening for your price.'],
        },
      },
    ],
    after: {
      poetic: ['The tavern exhales like it has been spared or sentenced.'],
      deadpan: ['Two tables immediately pretend they heard nothing.'],
      hungry: ['The stew tastes more political than before.'],
      regal: ['Every mug in the room becomes a listening post.'],
      sharp: ['The rumor market adjusts before anyone admits there is a market.'],
    },
  },
  {
    id: 'flirt-thief-stolen-first',
    kind: 'flirt',
    intent: ['trust test', 'law versus theft', 'heat versus profit'],
    romanceReason: 'A thief asks whether the player understands betrayal, power, and shared risk.',
    roles: ['thief', 'thiefContact', 'guildContact', 'blackMarketMerchant'],
    roleMatchMode: 'required',
    contextTags: ['guild', 'crime'],
    setup:
      'They roll a coin over their knuckles and watch whether your eyes follow the shine or the hand.',
    npcPrompt: {
      poetic: ['The law calls it theft when the wrong hands learn hunger. Convince me otherwise.'],
      deadpan: ['Flirtation prompt: who stole first, the thief or the crown?'],
      hungry: ['Some theft is hunger. Some theft is boredom with sharper shoes.'],
      regal: ['A thief asks whether law is justice or merely possession with banners.'],
      sharp: ['Every theft has a first thief. Usually they own a desk.'],
    },
    question: 'They ask who deserves punishment when a thief steals from a corrupt tax office.',
    branches: [
      {
        id: 'branch-blame-king',
        label: 'Blame King',
        tags: ['clever', 'ambition', 'publicAffection'],
        tier: 'liked',
        response: {
          poetic: ['You aim upward. Dangerous. Romantic, in the way lightning is romantic.'],
          deadpan: ['King blamed. Plausible. Treason-adjacent.'],
          hungry: ['If the crown ate first, I care less who stole crumbs.'],
          regal: ['A ruler may deserve blame. Say it with evidence, not appetite.'],
          sharp: ['Good. Always audit the largest pocket first.'],
        },
      },
      {
        id: 'branch-protect-poor',
        label: 'Protect Poor',
        tags: ['mercy', 'loyalty', 'selfless'],
        tier: 'loved',
        response: {
          poetic: ['You protect the hands with nothing in them. That is a dangerous tenderness.'],
          deadpan: ['Protecting the poor is morally efficient and legally inconvenient. Good.'],
          hungry: ['Yes. Empty stomachs are not moral failures. They are alarms.'],
          regal: ['Nobility without protection is costume. You remembered protection.'],
          sharp: ['Good alliance choice. The poor remember favors with frightening accuracy.'],
        },
      },
      {
        id: 'branch-praise-prison',
        label: 'Praise Prison',
        tags: ['ritual', 'violence', 'betrayal'],
        tier: 'hated',
        outcome: 'mean',
        tone: 'danger',
        response: {
          poetic: ['You praised the cage before asking who built hunger. Ugly.'],
          deadpan: ['Prison enthusiasm noted. Trust reduced.'],
          hungry: ['You cannot jail an empty belly into becoming full.'],
          regal: ['Justice that begins and ends with chains is not justice.'],
          sharp: ['Prison is expensive theater unless it solves motive. Bad answer.'],
        },
      },
    ],
    after: {
      poetic: ['The coin vanishes. The question does not.'],
      deadpan: ['They still have the coin. You are almost certain.'],
      hungry: ['The room smells like metal and somebody skipping dinner.'],
      regal: ['The stolen coin becomes a tiny crown in their palm.'],
      sharp: ['They know exactly what you watched. That was the test.'],
    },
  },
  {
    id: 'date-questgiver-duty',
    kind: 'date',
    intent: ['commitment test', 'duty versus intimacy', 'unfinished work'],
    romanceReason: 'A quest giver tests whether the player values them beyond the task board.',
    roles: ['questGiver'],
    roleMatchMode: 'required',
    contextTags: ['quest'],
    setup:
      'The date begins beside a quest board because duty has terrible timing and excellent posture.',
    npcPrompt: {
      poetic: [
        'Work follows me like a ghost with a clipboard. Tell me whether love must outrun it.',
      ],
      deadpan: ['Date compromised by unfinished work. Prioritization test begins.'],
      hungry: ['A quest before dinner is a crime unless someone is bleeding. Is someone bleeding?'],
      regal: [
        'Duty interrupts pleasure. This is not an accident; it is character revealing itself.',
      ],
      sharp: [
        'A quest board on a date is either disrespect or useful disclosure. Choose the interpretation.',
      ],
    },
    question: 'They ask what you do when romance and urgent work collide.',
    branches: [
      {
        id: 'branch-help-first',
        label: 'Help First',
        tags: ['commitment', 'protective', 'selfless'],
        tier: 'liked',
        response: {
          poetic: ['You put the wound before the wine. I resent how much I admire that.'],
          deadpan: ['Help first. Correct if urgent. Emotionally salvageable.'],
          hungry: ['Fine. Save the person, then feed me twice.'],
          regal: ['Duty before indulgence. Good. But do not use duty to avoid intimacy.'],
          sharp: ['You chose urgent work. Sensible. Now prove I was not merely postponed.'],
        },
      },
      {
        id: 'branch-date-first',
        label: 'Date First',
        tags: ['privateAffection', 'avoidance', 'neediness'],
        tier: 'neutral',
        response: {
          poetic: ['Choosing me feels sweet until the unattended wound starts speaking.'],
          deadpan: ['Date first. Romantic. Potentially negligent. Mixed score.'],
          hungry: ['I like being chosen. I do not like hearing trouble starve outside.'],
          regal: ['Affection that ignores duty curdles into selfishness. Carefully.'],
          sharp: ['You chose me. Flattering. Liability pending.'],
        },
      },
      {
        id: 'branch-share-burden',
        label: 'Share Burden',
        tags: ['loyalty', 'competence', 'commitment'],
        tier: 'loved',
        response: {
          poetic: ['Together, then. Romance with sleeves rolled up. Beautiful and inconvenient.'],
          deadpan: ['Shared workload. Best option. Disturbingly attractive.'],
          hungry: ['Yes. We solve it together and call the meal after a victory.'],
          regal: [
            'Partnership is not escape from duty. It is duty with another hand on the banner.',
          ],
          sharp: ['Shared burden. Efficient, intimate, hard to exploit. Excellent.'],
        },
      },
    ],
    after: {
      poetic: ['The quest board creaks like it thinks it is part of the relationship.'],
      deadpan: ['The date has acquired objectives. Romance survives worse.'],
      hungry: ['Dinner is now a reward, a threat, or both.'],
      regal: ['Duty and affection stand beside each other, both waiting to be chosen correctly.'],
      sharp: ['The board records nothing. They record everything.'],
    },
  },
  {
    id: 'talk-resident-curfew',
    kind: 'talk',
    intent: ['civic fear', 'ordinary survival', 'control versus protection'],
    romanceReason:
      'A resident brings up curfew because romance in town still happens under public fear.',
    roles: ['resident'],
    contextTags: ['curfew', 'town'],
    setup: 'A curfew bell rings early. Windows close one by one, each with a different opinion.',
    npcPrompt: {
      poetic: ['The town is tucking fear into bed and calling it safety. Do you believe it?'],
      deadpan: ['Curfew active. Evaluate civic fear versus actual protection.'],
      hungry: ['Curfew means cold dinners and quiet streets. Sometimes quiet is hungry too.'],
      regal: ['A town may command doors closed. It cannot command hearts calm.'],
      sharp: ['Curfew moves risk off the street and into houses. Convenient for officials.'],
    },
    question: 'They ask whether the curfew protects people or controls them.',
    branches: [
      {
        id: 'branch-support-curfew',
        label: 'Support Curfew',
        tags: ['protective', 'ritual', 'pragmatic'],
        tier: 'neutral',
        response: {
          poetic: ['Protection can be real. It can also learn to enjoy the lock.'],
          deadpan: [
            'Curfew support is defensible under actual threat. Keep watching the enforcers.',
          ],
          hungry: ['If it gets people home alive, fine. If it keeps bread from moving, less fine.'],
          regal: ['Order may protect. It must answer to the people it confines.'],
          sharp: ['Curfew is a tool. Tools reveal owners.'],
        },
      },
      {
        id: 'branch-mock-curfew',
        label: 'Mock Curfew',
        tags: ['clever', 'recklessness', 'publicAffection'],
        tier: 'disliked',
        response: {
          poetic: ['A joke can loosen fear. It can also spit on it. Yours did both.'],
          deadpan: ['Mockery provides morale and no shelter. Limited utility.'],
          hungry: ['Funny, sure. Still cold outside. Still people scared.'],
          regal: ['Fear deserves more than a clever bootprint.'],
          sharp: ['Mockery is cheap cover. I prefer plans.'],
        },
      },
      {
        id: 'branch-walk-them-home',
        label: 'Walk Home',
        tags: ['protective', 'privateAffection', 'bravery'],
        tier: 'loved',
        response: {
          poetic: ['You answer the bell with a walk beside me. Small vow, long shadow.'],
          deadpan: ['Escort offered. Practical, respectful, quietly effective.'],
          hungry: ['Walk me home and I may forgive the bell for ruining the evening.'],
          regal: ['You do not argue safety; you practice it. Good.'],
          sharp: ['Low speech, high utility. I like that shape of care.'],
        },
      },
    ],
    after: {
      poetic: ['The bell fades, but every door keeps listening.'],
      deadpan: ['The town becomes quieter and not automatically safer.'],
      hungry: ['Somewhere, soup is being eaten in a hurry.'],
      regal: ['The street bows to the bell without liking it.'],
      sharp: ['The curfew creates shadows with better paperwork.'],
    },
  },
  {
    id: 'talk-child-future',
    kind: 'talk',
    setup:
      'A child nearby asks whether snakes get married, have babies, divorce, or simply become longer from drama.',
    npcPrompt: {
      poetic: [
        'Children are terrifying because they ask questions before shame can get dressed.',
        'Do not answer quickly. Quick answers to future questions grow claws.',
      ],
      deadpan: [
        'A child has identified the unresolved relationship architecture.',
        'We can ignore them, but they will remain accurate.',
      ],
      hungry: [
        'That child has snack crumbs and prophetic violence.',
        'Answer carefully. I refuse to be bullied by someone sticky unless they are correct.',
      ],
      regal: [
        'The small citizen has raised a constitutional matter.',
        'We shall respond with dignity, despite the jam on their sleeve.',
      ],
      sharp: [
        'Children are just auditors who have not learned invoice formatting.',
        'They found the soft liability. Impressive.',
      ],
    },
    question:
      'The child points at you both. "So are you two serious, doomed, or just being weird in public?"',
    branches: [
      {
        id: 'branch-serious',
        label: 'Serious',
        tags: ['commitment', 'publicAffection', 'honesty'],
        tier: 'loved',
        response: {
          poetic: [
            'Serious. You said it like a match struck in a chapel.',
            'I am frightened. I am pleased. These are not enemies today.',
          ],
          deadpan: [
            'Public seriousness declared. Unexpectedly acceptable.',
            'I will be embarrassed later. Current status: not fleeing.',
          ],
          hungry: [
            'Serious means shared meals and not disappearing when the bread burns.',
            'I liked hearing it out loud. There. Are you happy?',
          ],
          regal: [
            'You named us serious before witness, however sticky.',
            'That courage pleases me.',
          ],
          sharp: [
            'Public disclosure. Risky. Clean. Hard to exploit against you because you named it first.',
            'I like that more than I planned.',
          ],
        },
      },
      {
        id: 'branch-doomed',
        label: 'Doomed',
        tags: ['dramatic', 'clever', 'avoidance'],
        tier: 'liked',
        response: {
          poetic: [
            'Doomed. Romantic answer, cowardly hinge.',
            'I like the drama. I dislike that it lets you dodge the living part.',
          ],
          deadpan: [
            'Doomed. Funny. Also a convenient legal shelter.',
            'I permit the joke while noting the evasion.',
          ],
          hungry: [
            'Doomed is funny until dinner gets cold.',
            'I liked the joke. Feed the future something sturdier next time.',
          ],
          regal: [
            'Doom is not a banner I prefer, but you carried it with style.',
            'Style is not enough. It is, however, not nothing.',
          ],
          sharp: [
            'Doomed. Excellent branding. Poor risk management.',
            'I like the wit. I am watching the escape hatch.',
          ],
        },
      },
      {
        id: 'branch-just-weird',
        label: 'Just Weird',
        tags: ['avoidance', 'publicAffection', 'humility'],
        tier: 'disliked',
        response: {
          poetic: [
            'Just weird. You made us smaller for an audience with crumbs.',
            'I dislike when tenderness flinches and calls it comedy.',
          ],
          deadpan: [
            'Minimization detected.',
            'You may call yourself weird. Do not use it as a tarp for us.',
          ],
          hungry: [
            'Just weird? Rude. I am at least complicated with good cheekbones.',
            'Do not make affection sound like leftovers.',
          ],
          regal: [
            'You reduced us to a shrug. I dislike public shrinking.',
            'If you cannot name a thing, do not parade it.',
          ],
          sharp: [
            'Just weird. Cheap answer. Low courage. Bad cover.',
            'I expected better camouflage from someone with scales.',
          ],
        },
      },
    ],
    after: {
      poetic: ['The child wanders off. They mutter, "Tiny oracle. Horrible timing."'],
      deadpan: ['They watch the child leave. "We have been reviewed by jam. Useful."'],
      hungry: ['They exhale. "I need a pastry after being perceived that accurately."'],
      regal: ['They smooth their sleeve. "That child may one day govern badly."'],
      sharp: ['They narrow their eyes. "We should hire that child or avoid them forever."'],
    },
  },
];

export function createPersonalityDatingScenario(
  profile: RelationshipCandidateProfile,
  kind: DatingScenarioKind,
  personality: RelationshipPersonality,
  rng: () => number,
  context: DatingScenarioContext = {},
): DatingScenarioEvent {
  const candidates = ROMANCE_SCENARIOS.filter((scenario) => scenario.kind === kind);
  const weightedCandidates = candidates.flatMap((scenario) => {
    const weight = scenarioWeight(scenario, personality, context);
    return Array.from({ length: weight }, () => scenario);
  });
  const fallbackCandidates = candidates.filter(
    (scenario) => scenarioWeight(scenario, personality, context) > 0,
  );
  const scenario =
    weightedCandidates[Math.floor(rng() * weightedCandidates.length)] ??
    fallbackCandidates[0] ??
    ROMANCE_SCENARIOS[0]!;
  return materializeScenario(profile, personality, scenario, rng);
}

function scenarioWeight(
  scenario: ScenarioBlueprint,
  personality: RelationshipPersonality,
  context: DatingScenarioContext,
): number {
  let weight = 1;
  if (
    scenario.roleMatchMode === 'required' &&
    scenario.roles?.length &&
    (!context.actorRole || !scenario.roles.includes(context.actorRole))
  ) {
    return 0;
  }
  if (scenario.preferredPersonalities?.includes(personality)) weight += 1;
  if (context.actorRole && scenario.roles?.includes(context.actorRole)) weight += 4;
  const contextMatches =
    scenario.contextTags?.filter((tag) => context.contextTags?.includes(tag)).length ?? 0;
  weight += contextMatches * 2;
  if (
    scenario.roles?.length &&
    (!context.actorRole || !scenario.roles.includes(context.actorRole))
  ) {
    weight = Math.max(1, weight - 1);
  }
  return Math.max(1, weight);
}

function materializeScenario(
  profile: RelationshipCandidateProfile,
  personality: RelationshipPersonality,
  scenario: ScenarioBlueprint,
  rng: () => number,
): DatingScenarioEvent {
  const actions = shuffleDatingBranchActions(
    scenario.branches.map((branch) => ({
      id: branch.id,
      label: branch.label,
      tone: branch.tone,
    })),
    rng,
  );
  const pages: DatingScenarioPage[] = [
    { line: scenario.setup, lineIsNarration: true },
    { line: pickPersonalityLine(scenario.npcPrompt, personality, rng) },
    {
      line: scenario.question,
      lineIsNarration: true,
      actions: [...actions, { id: 'leave', label: 'Back', tone: 'quiet' }],
    },
    { line: pickPersonalityLine(scenario.after, personality, rng) },
  ];
  const branchResults: Record<string, DatingScenarioBranchResult> = {};
  for (const branch of scenario.branches) {
    const responseLines = branch.response[personality] ?? branch.response.poetic;
    const memoryLine = responseLines[responseLines.length - 1] ?? responseLines[0] ?? branch.label;
    const tier =
      branch.tierByPersonality?.[personality] ?? tierForBranchPersonality(branch, personality);
    branchResults[branch.id] = {
      label: branch.label,
      text: `${profile.displayName} says, "${memoryLine}"`,
      tags: branch.tags,
      targetTier: tier,
      outcome: branch.outcome,
      followUpPages: [
        {
          line: PERSONALITY_STAGE_DIRECTIONS[personality],
          lineIsNarration: true,
        },
        ...responseLines.map((line, index) => ({
          line,
          juiceTier: index === 0 ? tier : undefined,
        })),
      ],
    };
  }
  return { scenarioId: scenario.id, pages, branchResults };
}

function pickPersonalityLine(
  lines: Record<RelationshipPersonality, readonly string[]>,
  personality: RelationshipPersonality,
  rng: () => number,
): string {
  const pool = lines[personality] ?? lines.poetic;
  return pool[Math.floor(rng() * pool.length)] ?? '';
}

function tierForBranchPersonality(
  branch: BranchBlueprint,
  personality: RelationshipPersonality,
): RelationshipOutcomeTier {
  const weights = PERSONALITY_BRANCH_TAG_WEIGHTS[personality] ?? {};
  const score =
    branch.tags.reduce((total, tag) => total + (weights[tag] ?? 0), 0) + baseTierBias(branch.tier);
  if (score >= 9) return 'loved';
  if (score >= 3) return 'liked';
  if (score <= -9) return 'hated';
  if (score <= -3) return 'disliked';
  return 'neutral';
}

function baseTierBias(tier: RelationshipOutcomeTier): number {
  switch (tier) {
    case 'loved':
      return 2;
    case 'liked':
      return 1;
    case 'disliked':
      return -1;
    case 'hated':
      return -2;
    default:
      return 0;
  }
}
