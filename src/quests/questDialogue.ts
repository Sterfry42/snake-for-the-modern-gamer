import type { Quest } from './quest.js';
import { i18n } from '../i18n/i18nManager.js';

export interface QuestDialogue {
  title: string;
  pages: string[];
}

const CUSTOM_DIALOGUES: Record<string, QuestDialogue> = {
  'explore-6-rooms': {
    title: 'The First Survey',
    pages: [
      'I buried my clutch-brother in the sixth chamber east of here. The walls closed over him by morning, as if the stone were ashamed to have witnessed it.',
      'Since then I have learned this place feeds on the uncounted. Rooms unvisited become rumor, and rumor becomes grave-dust. We survive by naming what would rather stay unnamed.',
      'Go and mark six rooms with your passing. Bring me proof that the dark can still be measured, even if the map is written in fear.',
    ],
  },
  'explore-10-rooms': {
    title: 'The Deeper Ledger',
    pages: [
      'The old mapkeepers swore the tenth room was where the buried city began speaking back. None of them returned with their eyes untroubled.',
      'These halls are older than our hunger. They were cut for something broad in the shoulder and patient in cruelty, and sometimes the stone still remembers those footsteps.',
      'Visit ten rooms. Let the maze know your name before it decides you are just another bone hidden under the mortar.',
    ],
  },
  'eat-5-apples': {
    title: 'Orchard of the Dead',
    pages: [
      'Do not trust the sweetness of the fruit. The orchard that fed these tunnels once stood above us, until the ground opened and took trees, handlers, and children alike.',
      'Now the apples return one by one through cracks in the earth, as if the pit below is trying to apologize with offerings it stole too late.',
      'Eat five of them. Learn whether mercy can still grow from a place that only remembers falling.',
    ],
  },
  'eat-12-apples': {
    title: 'Hunger Without Bottom',
    pages: [
      'My teacher said grief and appetite are kin. Feed either one, and it only learns a larger shape in which to wait for you.',
      'The tunnels know this. They fatten the desperate and count how long it takes before the mouth outruns the mind.',
      'Eat twelve apples and listen closely to yourself while you do it. We should know whether your hunger still belongs to you.',
    ],
  },
  'buy-2-upgrades': {
    title: 'Make a Hearth',
    pages: [
      'There was a time when snakes here kept proper houses. Lamps were lit. Bedrolls were shared. Names were spoken above whispers and not over graves.',
      'Then the long winter under stone came, and we sold our comfort piece by piece for one more week of breathing. We live inside the skeleton of that bargain.',
      'Buy two upgrades for the house. I would like to remember what defiance looks like when it takes the form of a chair, a lamp, a place that intends to last.',
    ],
  },
  'buy-4-upgrades': {
    title: 'Against the Ruin',
    pages: [
      'When my mate died, I took apart our room board by board and burned it for warmth. I told myself the ash would honor them better than an empty bed ever could.',
      'I have regretted that practical little cruelty every day since. Ruin is easy. Making shelter after ruin is the holier work.',
      'Buy four upgrades. If we cannot save the old home, then let us at least teach the new one how to endure.',
    ],
  },
  'loot-and-power': {
    title: 'Relics and Sparks',
    pages: [
      'Treasure in these depths is never innocent. Every bright thing was once cherished by someone who misjudged how near death already was.',
      'Powerups are worse. They are the last cough of old mechanisms buried under the rooms, the remnants of some age that tried to trap lightning in ritual shapes.',
      'Bring back one treasure and one powerup. I want to know whether the dead are leaving us gifts, or bait.',
    ],
  },
  'powerup-fiend': {
    title: 'Borrowed Fire',
    pages: [
      'I watched a pilgrim once who could make himself thin as smoke and cruel as a god for three heartbeats at a time. On the fourth heartbeat he forgot his own face.',
      'That is the danger of powers found under stone. They solve the immediate problem with such elegance that you begin to hunger for their judgment instead of your own.',
      'Collect two powerups. Let me see whether you can carry borrowed fire without mistaking it for a soul.',
    ],
  },
  'reach-length-10': {
    title: 'The Tenth Coil',
    pages: [
      "A serpent's length is memory made visible. Every meal, every mistake, every narrow escape gets written into the body whether we deserve the inscription or not.",
      'My broodmother used to say ten segments was the first true threshold. Below that you are surviving. Beyond it, the maze begins considering you a participant.',
      'Grow to length ten. I would know whether the tunnels have started writing your history in a hand they reserve for the dangerous.',
    ],
  },
  'reach-length-15': {
    title: 'The Long Mourning',
    pages: [
      'There were elders once so long they cast their own weather in the lantern light. When they moved, you could hear the younger snakes fall quiet from rooms away.',
      'Most of them are gone now. The maze took some. Despair took more. Length alone did not save them, but it did mean the world had to exert itself properly when it wished them dead.',
      'Grow to length fifteen. Become difficult to erase.',
    ],
  },
  'room-dasher': {
    title: 'Run Before the Door Forgets',
    pages: [
      'You have noticed it, I think. Some rooms do not stay the same shape once they have had time to think about you.',
      'The old masons built with clever malice. They taught thresholds to close, corners to sharpen, and distance itself to become less charitable after the first step.',
      'Cross a room in under one and a half seconds. Outrun the part of the architecture that still believes prey should be polite enough to hesitate.',
    ],
  },
  'room-sprint': {
    title: 'A Lesson in Flight',
    pages: [
      'My son died because he stopped to admire a mural. By the time he understood the mural was still wet, the room had already decided where to bite him.',
      'Speed is not bravado down here. It is reverence paid to traps older than your grandparents and twice as patient.',
      'Cross a room in under one point eight seconds. Treat every open space as if it has been waiting for your pause.',
    ],
  },
  'score-50': {
    title: 'Count What Remains',
    pages: [
      'I keep score because names fade. Numbers are uglier, but they cling to the world with a stubbornness grief can still use.',
      'Fifty was the last tally scratched into the refuge ledger before the ink ran with blood and lamp oil. No one ever finished that page.',
      'Reach a score of fifty. Let us see a count carried farther than the one the dead were permitted.',
    ],
  },
  'speed-snacker': {
    title: 'A Mouth Like Panic',
    pages: [
      'In famine years the hatchlings learned to swallow before chewing. Some survived because of it. Some forgot there was any difference between feeding and fleeing.',
      'The tunnels reward frenzy more often than wisdom, and that is why so many bones down here were found with full bellies and empty futures.',
      'Eat three apples in quick succession. I want to see whether you can touch panic without marrying it.',
    ],
  },
  'survive-20s-no-eat': {
    title: 'Fasting for the Named Dead',
    pages: [
      'We used to fast for the lost, once each season, to remember that need does not entitle us to every answer it suggests.',
      'The rite ended when scarcity became too constant to ritualize. There is no ceremony in hunger that never leaves. There is only endurance and the stories we tell to make it bearable.',
      'Survive twenty seconds without eating. Carry the old rite for one brief moment and prove your will can still sit beside an empty mouth.',
    ],
  },
  'treasure-hunter': {
    title: 'The Gilded Remains',
    pages: [
      'The treasure chests here were lowered down after the collapse by families who believed valuables might ransom the dead back from the dark.',
      'The rope always came up lighter than it went down. Sometimes empty. Sometimes wet. Never once carrying who they had asked for.',
      'Recover two treasures. We owe the buried at least the courtesy of admitting their offerings were never answered.',
    ],
  },
  'shrine-maidens-request': {
    title: 'Offerings at the Torii Gate',
    pages: [
      'The shrine sits at a place where the stone forgets how to be heavy. Lantern light clings to the eaves like a second kind of moss.',
      'The shrine maiden does not ask for gold. She asks for apples -- fruit that fell from trees that no longer remember their own soil.',
      'Bring ten. Each one is a small prayer wrapped in red skin. Let the mountain learn that something still remembers it exists.',
    ],
  },
  'tanukis-shenanigans': {
    title: 'The Bamboo Lie',
    pages: [
      'The tanuki is a creature who once told a lie so beautiful the other yokai made it mayor. It has never forgiven them for laughing.',
      'It hides in the bamboo grove not because it is afraid but because the bamboo has agreed, on very specific days, to pretend the tanuki does not exist.',
      'Find what it is guarding. Or what it is pretending to guard. The difference is mostly a matter of which story you prefer.',
    ],
  },
  'kappas-challenge': {
    title: 'Water on the Head',
    pages: [
      "The kappa's dish holds a lake no one can see. It is the size of a saucer and as deep as the first time someone realized water could spill and never come back.",
      'It does not want a fight. It wants a cucumber -- not for eating, but for the way a cucumber sounds when a kappa rolls it across stone in the dark.',
      'Prove yourself worthy. By fighting or by bringing the vegetable. The kappa respects resolve more than victory.',
    ],
  },
  fisherman: {
    title: 'Deep Waters',
    pages: [
      'The sunken ocean has its own currents, its own patience. The fish down there do not care about your length or your speed — only whether you are persistent enough to outwait the deep.',
      'Five fish. Not for glory. For the ones back home who have not tasted clean meat in too long. They count on you.',
      'Hunt five fish in the sunken ocean. Come back when your hands are clean and your belly remembers what food tastes like.',
    ],
  },
  'seven-dragon-temples': {
    title: 'Seven Shrines, Seven Silences',
    pages: [
      'The old mapmakers called them the Seven Dragon Temples. Not because dragons lived there, but because seven is the number of breaths a temple takes before it decides to forget a place exists.',
      'Each shrine is hidden inside a room that refuses to be mapped -- a chamber the corridors reroute around the way a throat reroutes around a swallowed bone.',
      'Find all seven. Let the mountain remember what it was built to hold.',
    ],
  },
  'ramen-recipe-hunt': {
    title: 'The Broth That Remembers',
    pages: [
      "The ramen master's broth has no business being this good in a place where water tastes like old decisions and the walls occasionally weep.",
      'Three rare ingredients -- not because three is a magic number, but because the broth refuses to work with fewer. This is not negotiation. It is a boundary.',
      'Collect them from different parts of the biome. Each ingredient remembers a different season. The broth needs all of them to dream properly.',
    ],
  },
};

export function getQuestDialogue(quest: Quest): QuestDialogue {
  const translation = i18n.getQuestDialogue(quest.id);

  if (translation) {
    return translation;
  }

  return (
    CUSTOM_DIALOGUES[quest.id] ?? {
      title: i18n.getQuestString(quest.id)?.label ?? quest.label,
      pages: buildFallbackQuestPages(quest),
    }
  );
}

function buildFallbackQuestPages(quest: Quest): string[] {
  const description = i18n.getQuestString(quest.id)?.description ?? quest.description;
  const voice = questVoiceFor(quest.id);
  return [voice.opening(description), voice.stakes, voice.ask];
}

function questVoiceFor(id: string): {
  opening(description: string): string;
  stakes: string;
  ask: string;
} {
  if (/hunt|bear|rabbit|wolf|hide|herd/i.test(id)) {
    return {
      opening: (description) =>
        `"Tracks crossed the road this morning, and none of them looked polite. ${description}. Do not make that face; brave faces get bitten first."`,
      stakes:
        '"If the beasts keep learning our paths, the village becomes a pantry with lanterns. I refuse to be shelved."',
      ask: '"Go handle it. Come back with proof, and if the proof is ugly, good. Ugly proof lies less."',
    };
  }
  if (/apple|honey|food|snack|ramen/i.test(id)) {
    return {
      opening: (description) =>
        `"I need food moved before hunger starts making speeches. ${description}. Simple? No. Nothing edible stays simple down here."`,
      stakes:
        '"People get poetic about starvation after they have eaten. The rest of us count portions and pretend counting is hope."',
      ask: '"Bring what I asked for. I will thank you properly, which means quickly, before pride ruins the useful part."',
    };
  }
  if (/room|explore|treasure|loot|power|length|score/i.test(id)) {
    return {
      opening: (description) =>
        `"The maze has been acting smug. ${description}. I want you to bruise its confidence."`,
      stakes:
        '"Every room you survive becomes a witness. Every witness makes the dark less comfortable with its own story."',
      ask: '"Go on, then. Make progress loud enough that even the walls have to admit it happened."',
    };
  }
  if (/goblin|ledger|tax|debt|purchase/i.test(id)) {
    return {
      opening: (description) =>
        `"A ledger has developed an appetite, and unfortunately it has learned your shape. ${description}."`,
      stakes:
        '"Debt is just a ghost that discovered arithmetic. Ignore it too long and it starts wearing official shoes."',
      ask: '"Settle the matter before someone stamps your name so hard it becomes a sentence."',
    };
  }
  return {
    opening: (description) =>
      `"Listen. I would not ask if the task were only a task. ${description}. Around here, errands grow teeth when ignored."`,
    stakes:
      '"I have outlived too many companions to mistake small work for harmless work. Every request leans against some older sorrow."',
    ask: '"Take the burden if you mean to. Refuse if you must. But do not insult either choice by pretending it weighs nothing."',
  };
}
