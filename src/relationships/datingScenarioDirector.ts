import type { SnakeGame } from '../game/snakeGame.js';
import { isTownCriminalRole, isTownShopRole } from '../world/townRoles.js';
import { type DatingSceneButton } from '../ui/datingScenePopup.js';
import type {
  DatingBranchChoice,
  RelationshipCandidateProfile,
  RelationshipChoice,
  RelationshipOutcomeTier,
  RelationshipPersonality,
  RelationshipTag,
} from './relationshipTypes.js';
import { createPersonalityDatingScenario } from './datingScenarioLibrary.js';
import { shuffleDatingBranchActions } from './datingActionOrder.js';

export type DatingSequencePage = {
  line: string;
  result?: string;
  lineIsNarration?: boolean;
  actions?: readonly DatingSceneButton[];
  juiceTier?: RelationshipOutcomeTier;
};

export type DatingBranchResult = {
  text: string;
  outcome?: RelationshipChoice;
  tags?: DatingBranchChoice['tags'];
  targetTier?: RelationshipOutcomeTier;
  label?: string;
  followUpPages?: DatingSequencePage[];
};

type DatingReactionReason =
  | 'pineapple'
  | 'dangerous-compliment'
  | 'sincere-compliment'
  | 'protective'
  | 'abandonment'
  | 'honesty'
  | 'clever'
  | 'comfort'
  | 'public-affection'
  | 'avoidance'
  | 'violence'
  | 'pragmatic'
  | 'dramatic'
  | 'love-in-eyes'
  | 'generic';

const DATING_PERSONALITY_TAG_WEIGHTS: Record<
  RelationshipPersonality,
  Partial<Record<RelationshipTag, number>>
> = {
  poetic: {
    dramatic: 3,
    honesty: 4,
    privateAffection: 3,
    commitment: 4,
    bravery: 2,
    food: -1,
    selfPreserving: -2,
    avoidance: -4,
    betrayal: -8,
    violence: -3,
  },
  deadpan: {
    honesty: 4,
    competence: 3,
    pragmatic: 4,
    clever: 2,
    restraint: 3,
    dramatic: -3,
    neediness: -2,
    publicAffection: -1,
    selfPreserving: 2,
  },
  hungry: {
    food: 6,
    comfort: 4,
    protective: 3,
    loyalty: 4,
    family: 4,
    dramatic: 1,
    neglect: -5,
    betrayal: -8,
    selfPreserving: -1,
  },
  regal: {
    bravery: 4,
    protective: 4,
    ritual: 5,
    commitment: 5,
    humility: 3,
    publicAffection: 2,
    clever: 1,
    avoidance: -4,
    betrayal: -10,
    secrecy: -6,
  },
  sharp: {
    clever: 5,
    pragmatic: 5,
    selfPreserving: 3,
    transaction: 4,
    contract: 5,
    competence: 4,
    ledger: 4,
    goblin: 3,
    dramatic: -1,
    neediness: -3,
    betrayal: -7,
  },
};

const DATING_REACTION_LINES: Record<
  RelationshipPersonality,
  Partial<Record<DatingReactionReason, Partial<Record<RelationshipOutcomeTier, readonly string[]>>>>
> = {
  poetic: {
    pineapple: {
      loved: [
        'Pineapple. A sunlit crime. How adventurous, snake. Such a spirit makes one like me swoon against my better omens.',
      ],
      liked: [
        'Pineapple? Strange little sunrise. I respect a sweetness willing to be argued over.',
      ],
      neutral: ['Pineapple. A bright answer, but brightness alone is not intimacy.'],
      disliked: [
        'Pineapple? You brought a carnival to a confession and expected me to call it depth.',
      ],
      hated: ['Pineapple? No. Some fruits belong in poems, not on the altar of dinner.'],
    },
    'dangerous-compliment': {
      loved: ['{choice}. There it is: flirtation with a storm pulse. I should run. I will not.'],
      liked: ['{choice}. Reckless, theatrical, and irritatingly alive. I can forgive alive.'],
      neutral: ['{choice}. A dramatic answer. I need to know whether the drama has roots.'],
      disliked: ['{choice}. You reached for danger before tenderness had a chair.'],
      hated: ['{choice}. That was not romance. That was a blade asking to be called moonlight.'],
    },
    'sincere-compliment': {
      loved: ['{choice}. Softly aimed, deeply unfair. You found the door without rattling it.'],
      liked: ['{choice}. Sincere enough to bruise me gently. I may allow it.'],
      neutral: ['{choice}. Kind, but still waiting for the secret underneath.'],
      disliked: ['{choice}. Too polished. I do not trust tenderness with no fingerprints.'],
      hated: ['{choice}. You used sweetness like stage makeup. I hate the smell of it.'],
    },
    protective: {
      loved: [
        'You stood beside me, not in front of me. That distinction matters more than the wound.',
      ],
      liked: ['Protection, then room to breathe. Good. I dislike cages, even golden ones.'],
      neutral: ['You meant protection. I am still deciding whether you meant trust.'],
      disliked: ['You protected the idea of me and forgot the person holding it.'],
      hated: ['Do not make me small and call it safety. I have survived worse than your concern.'],
    },
    abandonment: {
      loved: ['Leaving can be mercy, but only when you leave a lamp. This almost did.'],
      liked: ['You retreated without making the wound bigger. Not brave, but not cruel.'],
      neutral: ['You left space. I cannot tell yet whether it was respect or fear.'],
      disliked: ['You vanished when the moment asked for a spine. I heard the door close.'],
      hated: ['You abandoned me and expected the silence to explain you kindly. It will not.'],
    },
    honesty: {
      loved: ['Truth, naked and shivering. I love that you did not dress it in excuses.'],
      liked: ['Honesty with a pulse. Good. I prefer wounds that introduce themselves.'],
      neutral: ['Truth offered, but not yet trusted. Continue breathing near it.'],
      disliked: ['You named truth after it was already cornered. That is not courage yet.'],
      hated: ['You used honesty as a mop after spilling betrayal. No.'],
    },
    clever: {
      loved: ['Clever, but not hollow. A rare spell. I hate how much I like it.'],
      liked: ['A bright answer. It cut without making me bleed. That is skill.'],
      neutral: ['Clever enough to notice. Not tender enough to keep.'],
      disliked: ['You hid behind wit and called the hiding a flourish.'],
      hated: ['A joke with no mercy is just a small cruelty wearing bells.'],
    },
    comfort: {
      loved: ['Comfort without conquest. Oh. That is more dangerous than thunder.'],
      liked: ['Warm answer. Simple, but simple can be a hand held correctly.'],
      neutral: ['Comfortable, yes. I am waiting to see if it can become brave.'],
      disliked: ['You offered comfort like a blanket thrown over a locked door.'],
      hated: ['Do not soothe what you refuse to understand. That is only quieter neglect.'],
    },
    'public-affection': {
      loved: ['You let the room see us without feeding us to it. Beautifully done.'],
      liked: ['Public, bold, almost foolish. I may treasure the foolish part.'],
      neutral: ['The room saw something. I am undecided about what it was allowed to own.'],
      disliked: ['You turned tenderness into theater before asking if I wanted an audience.'],
      hated: ['You sold the private moment for applause. I heard every coin drop.'],
    },
    avoidance: {
      loved: ['Restraint can be love when it leaves a candle burning. This nearly did.'],
      liked: ['You stepped back before stepping wrong. I can respect a held tongue.'],
      neutral: ['You avoided the edge. Wise, maybe. Empty, maybe.'],
      disliked: ['You dodged the question and left me holding its teeth.'],
      hated: ['Cowardice in a velvet coat is still cowardice, snake.'],
    },
    violence: {
      loved: ['You used force like a locked door key, not a hymn. I can live with that.'],
      liked: ['Danger controlled is different from danger worshipped. You nearly understood.'],
      neutral: ['Violence answers quickly. I prefer knowing who taught it to speak.'],
      disliked: ['You reached for force before listening for the smaller door.'],
      hated: ['You brought thunder to a room that needed hands. I hate that noise.'],
    },
    pragmatic: {
      loved: ['Practical, but somehow tender at the hinge. I did not expect that.'],
      liked: ['A useful answer with a living center. Good.'],
      neutral: ['Practical. The heart survived, but did not sing.'],
      disliked: ['You made the moment useful and forgot to make it kind.'],
      hated: ['You reduced feeling to inventory. Do not shelve me, snake.'],
    },
    dramatic: {
      loved: ['Drama with truth underneath. Ah. My favorite kind of weather.'],
      liked: ['Excessive, but the excess knew my name.'],
      neutral: ['Large answer. I am checking whether anything lives inside it.'],
      disliked: ['You made a bonfire of a candle and called the smoke intimacy.'],
      hated: ['You performed at me. Never mistake my heart for a stage.'],
    },
    'love-in-eyes': {
      loved: [
        "Love in my woman's eyes. Oh. That is the kind of warmth that makes a heart reckless.",
        'You looked at me and I forgot how to be careful. That is what love does.',
        "Love in my woman's eyes. Dangerous. Beautiful. I hate how much I want it.",
      ],
      liked: [
        "Love in my woman's eyes. Sweet enough to be dangerous. I am looking.",
        'You showed me love and I did not look away. That counts for something.',
      ],
      neutral: [
        "Love in my woman's eyes. I see it. I am not ready to name it yet.",
        'The look is there. Whether it is love or just hope, I cannot tell.',
      ],
      disliked: [
        "Love in my woman's eyes. Too bright. I need to know what it is asking of me.",
        'You offered love and I am not sure I can afford it.',
      ],
      hated: [
        "Love in my woman's eyes. You cannot buy devotion with a glance. I will not be charmed.",
        'That look is a contract I did not sign. Put it away.',
      ],
    },
    generic: {
      loved: ['That answer knew me better than it should. I am furious and pleased.'],
      liked: ['I liked that. Do not become smug; it would ruin the evidence.'],
      neutral: ['Interesting. Not enough to move me, but enough to make me look twice.'],
      disliked: ['No. That missed the part of me it needed to find.'],
      hated: ['Absolutely not. That answer stepped on something living.'],
    },
  },
  deadpan: {
    pineapple: {
      loved: ['Pineapple. Statistically divisive. Emotionally bold. Annoyingly effective.'],
      liked: ['Pineapple. Chaotic, but clearly intentional. I respect intentional chaos.'],
      neutral: ['Pineapple. Data point received. Romance remains inconclusive.'],
      disliked: ['Pineapple. Loud fruit. Poor evidence.'],
      hated: ['Pineapple. No. The topping has failed the audit.'],
    },
    'dangerous-compliment': {
      loved: ['{choice}. Dangerous phrasing, clean delivery. I am affected. Do not log that.'],
      liked: ['{choice}. Risky, but not incompetent. Mild approval.'],
      neutral: ['{choice}. Dramatic input received. Awaiting proof of substance.'],
      disliked: ['{choice}. Too much theater. Insufficient maintenance value.'],
      hated: ['{choice}. Threat display mistaken for intimacy. Rejected.'],
    },
    'sincere-compliment': {
      loved: ['{choice}. Direct hit. Minimal waste. Unfortunately charming.'],
      liked: ['{choice}. Clear, gentle, difficult to object to. I will try anyway.'],
      neutral: ['{choice}. Acceptable wording. Limited emotional movement.'],
      disliked: ['{choice}. Generic enough to be preprinted.'],
      hated: ['{choice}. False warmth detected. Shutting window.'],
    },
    protective: {
      loved: ['You helped without taking over. Correct. Extremely inconvenient for my composure.'],
      liked: ['Useful protection. Low ego leakage. Good.'],
      neutral: ['Protective. Possibly kind. Possibly control with better lighting.'],
      disliked: ['You overrode me and named it help. Incorrect.'],
      hated: ['Do not protect me from my own agency. That is not safety.'],
    },
    abandonment: {
      loved: ['Strategic retreat with communication. Rare. Acceptable.'],
      liked: ['You withdrew without making me manage your panic. Good enough.'],
      neutral: ['Exit noted. Motive unclear.'],
      disliked: ['You left. The timing was poor. The record is worse.'],
      hated: ['Abandonment confirmed. Trust reduction severe.'],
    },
    honesty: {
      loved: ['Honest, specific, no ornamental fog. Excellent.'],
      liked: ['Truth with limited drama. I approve quietly.'],
      neutral: ['Honesty received. Impact moderate.'],
      disliked: ['Partial truth presented as full payment. Declined.'],
      hated: ['Truth used as a loophole. I dislike loopholes with teeth.'],
    },
    clever: {
      loved: ['Clever and applicable. Dangerous combination. I liked it.'],
      liked: ['Good angle. Better than expected.'],
      neutral: ['Clever. Not decisive.'],
      disliked: ['Wit deployed to avoid sincerity. Weak.'],
      hated: ['You made a joke where a person should have stood. No.'],
    },
    comfort: {
      loved: ['Comfort supplied without noise. Very good.'],
      liked: ['Warmth, measured correctly. Approved.'],
      neutral: ['Comfort present. Depth pending.'],
      disliked: ['Comfort used as a patch over a structural fault.'],
      hated: ['You tried to soothe me into silence. Failed.'],
    },
    'public-affection': {
      loved: ['Public clarity without public mess. Impressive.'],
      liked: ['Slightly theatrical. Still acceptable.'],
      neutral: ['Audience interaction noted. No verdict.'],
      disliked: ['You made me part of a demonstration. Poor choice.'],
      hated: ['Public display converted private trust into spectacle. Rejected.'],
    },
    avoidance: {
      loved: ['Restraint applied at the correct point. Good.'],
      liked: ['You did not force the issue. I appreciate efficient silence.'],
      neutral: ['Avoidance may be wisdom. May be fear. Insufficient data.'],
      disliked: ['You dodged. I noticed.'],
      hated: ['Cowardice filed under romance hazard.'],
    },
    violence: {
      loved: ['Force used precisely. Disturbing, but useful.'],
      liked: ['Controlled danger. Better than noisy heroics.'],
      neutral: ['Violence remains an expensive answer.'],
      disliked: ['Escalation was unnecessary.'],
      hated: ['You reached for violence because thought was slower. Unacceptable.'],
    },
    pragmatic: {
      loved: ['Practical and attentive. Excellent rare pairing.'],
      liked: ['Useful answer. I like useful answers when they remember people exist.'],
      neutral: ['Practical. Emotionally neutral.'],
      disliked: ['Efficient, cold, and not in the enjoyable way.'],
      hated: ['You treated the moment as paperwork with skin. No.'],
    },
    dramatic: {
      loved: ['Drama somehow justified itself. Irritating. Effective.'],
      liked: ['Excessive, but with structure. I can tolerate structured excess.'],
      neutral: ['Large gesture. Medium result.'],
      disliked: ['Too theatrical. I came here with limited patience.'],
      hated: ['Performance failure. Emotional damages pending.'],
    },
    'love-in-eyes': {
      loved: [
        "Love in my woman's eyes. Fine. I am affected. Do not make me say it again.",
        'You looked at me like I was worth looking at. I will not pretend that does not land.',
      ],
      liked: [
        "Love in my woman's eyes. Acceptable. I am choosing to let it in.",
        'That look. I will not deny it moved me.',
      ],
      neutral: [
        "Love in my woman's eyes. Noted. Verdict pending.",
        'The look is there. I am checking whether it has substance.',
      ],
      disliked: [
        "Love in my woman's eyes. I need more than optics. Show me the record.",
        'You are looking at me like a promise. I check promises.',
      ],
      hated: [
        "Love in my woman's eyes. Sentiment with no documentation. Rejected.",
        'Do not confuse a glance with a contract. I am not signing anything.',
      ],
    },
    generic: {
      loved: ['Correct answer. I will not be normal about that.'],
      liked: ['I liked it. There. Document that and move on.'],
      neutral: ['Adequate. Continue at reduced confidence.'],
      disliked: ['Incorrect enough to matter.'],
      hated: ['No. Comprehensive no.'],
    },
  },
  hungry: {
    pineapple: {
      loved: [
        'Pineapple? Sweet, bright, trouble at the edges. Yes. I want the slice and the argument.',
      ],
      liked: ['Pineapple. Weird snack, brave snack. I am listening.'],
      neutral: ['Pineapple. I will eat it. That is not the same as devotion.'],
      disliked: ['Pineapple? On purpose? The mouth is confused and the heart is cautious.'],
      hated: ['Ewww. Pineapple? Yuck. Romance should not taste like a dare from a fruit cart.'],
    },
    'dangerous-compliment': {
      loved: ['{choice}. Oh, that has bite. I like when sweet things remember teeth.'],
      liked: ['{choice}. Spicy. Risky. I might ask for seconds.'],
      neutral: ['{choice}. Strong flavor. I need a better reason to swallow it.'],
      disliked: ['{choice}. Too sharp. You forgot the warm part.'],
      hated: ['{choice}. That tasted like a threat wearing sugar. No.'],
    },
    'sincere-compliment': {
      loved: ['{choice}. Warm enough to eat slowly. That is dangerous for me.'],
      liked: ['{choice}. Sweet. Not cheap sweet, either.'],
      neutral: ['{choice}. Nice. Needs salt, or courage.'],
      disliked: ['{choice}. Soft, but stale.'],
      hated: ['{choice}. You plated flattery and forgot the meal.'],
    },
    protective: {
      loved: ['You kept me safe and still let me stand. That is the good kind of full.'],
      liked: ['Protection with room in it. I like that.'],
      neutral: ['You helped. I am checking whether you helped me or your idea of me.'],
      disliked: ['You fussed over me like I was soup about to boil over.'],
      hated: ['Do not make a meal of my weakness. I will bite.'],
    },
    abandonment: {
      loved: [
        'You left only after making sure I had warmth. I can forgive distance with bread in it.',
      ],
      liked: ['You backed off without starving the room. Fine.'],
      neutral: ['You left space. Space is not dinner, but it is not poison.'],
      disliked: ['You left me hungry for an answer. I hate that particular hunger.'],
      hated: ['You ran, snake. I was still at the table. I will remember the empty chair.'],
    },
    honesty: {
      loved: ['Truth with marrow in it. Yes. Give me that over pretty air.'],
      liked: ['Honest enough to chew on. I liked it.'],
      neutral: ['Truth, but lean. Needs more heart fat.'],
      disliked: ['You shaved the truth thin and called it a meal.'],
      hated: ['You served truth cold after hiding the fire. No.'],
    },
    clever: {
      loved: ['Clever and deliciously strange. I want another bite of your mind.'],
      liked: ['Funny. Sharp. Snackable. Good.'],
      neutral: ['Clever, yes. I am still hungry.'],
      disliked: ['Wit is not food when someone needs comfort.'],
      hated: ['You fed me a joke while the room was bleeding. Absolutely not.'],
    },
    comfort: {
      loved: ['There. Warm. Real. I could live in an answer like that.'],
      liked: ['Comfortable in the good way. Like bread that forgives you.'],
      neutral: ['Warm enough. Not memorable enough.'],
      disliked: ['Comfort with no attention is just a blanket over crumbs.'],
      hated: ['Do not pat the wound and call it care.'],
    },
    'public-affection': {
      loved: ['You made us visible and still kept us warm. Yes.'],
      liked: ['A little public sweetness. Fine. I will pretend not to want more.'],
      neutral: ['The room saw us. I am deciding whether it got fed too much.'],
      disliked: ['You gave the crowd the first bite. I dislike sharing that way.'],
      hated: ['You made us a snack for strangers. No. Mine is mine.'],
    },
    avoidance: {
      loved: ['You waited instead of grabbing. Patience can be very tasty.'],
      liked: ['You held back. Good. Not every hunger needs teeth.'],
      neutral: ['Avoided, maybe wisely. Still, I am hungry for the real answer.'],
      disliked: ['You dodged the plate and left me with scraps.'],
      hated: ['You ran from the feeling and left me to clean the table.'],
    },
    violence: {
      loved: ['You used teeth only when teeth were needed. Good restraint. Good bite.'],
      liked: ['Sharp move. I liked it because it ended quickly.'],
      neutral: ['Violence is filling, but not nourishing.'],
      disliked: ['You bit before smelling the room. Bad habit.'],
      hated: ['You made the night taste like blood and called it romance. No.'],
    },
    pragmatic: {
      loved: ['Useful, warm, and timed right. That is basically a love language with pockets.'],
      liked: ['Practical care. My favorite kind when it remembers dinner.'],
      neutral: ['Useful. I am not swooning, but I am not hungry either.'],
      disliked: ['You solved the errand and ignored the ache.'],
      hated: ['You treated care like a chore list. I hate cold kitchens.'],
    },
    dramatic: {
      loved: ['Big, strange, and sweet at the center. Yes, yes, terrible, yes.'],
      liked: ['Dramatic enough to taste. I liked the seasoning.'],
      neutral: ['Large flavor. Still missing the meal.'],
      disliked: ['Too much garnish. Not enough heart.'],
      hated: ['You set the table on fire and asked if I liked the candles.'],
    },
    'love-in-eyes': {
      loved: [
        "Love in my woman's eyes. Oh. That is the kind of warmth that makes a heart reckless.",
        'You looked at me and I forgot how to be careful. That is what love does.',
        "Love in my woman's eyes. Dangerous. Beautiful. I hate how much I want it.",
      ],
      liked: [
        "Love in my woman's eyes. Sweet enough to be dangerous. I am looking.",
        'You showed me love and I did not look away. That counts for something.',
      ],
      neutral: [
        "Love in my woman's eyes. I see it. I am not ready to name it yet.",
        'The look is there. Whether it is love or just hope, I cannot tell.',
      ],
      disliked: [
        "Love in my woman's eyes. Too bright. I need to know what it is asking of me.",
        'You offered love and I am not sure I can afford it.',
      ],
      hated: [
        "Love in my woman's eyes. You cannot buy devotion with a glance. I will not be charmed.",
        'That look is a contract I did not sign. Put it away.',
      ],
    },
    generic: {
      loved: ['Oh. That fed something I did not admit was hungry.'],
      liked: ['I liked that. It had warmth in the bones.'],
      neutral: ['Fine. Edible. Not feast-worthy.'],
      disliked: ['That tasted wrong. Try listening before seasoning.'],
      hated: ['No. I am too angry to be hungry, and that is serious.'],
    },
  },
  regal: {
    pineapple: {
      loved: [
        'Pineapple. A controversial banner carried without apology. I respect such ceremonial nerve.',
      ],
      liked: ['Pineapple. Bold, public, slightly lawless. Acceptable.'],
      neutral: ['Pineapple. The court notes your confidence and reserves judgment.'],
      disliked: ['Pineapple. You mistake provocation for taste.'],
      hated: ['Pineapple? In this court? Absolutely not. Remove the fruit from my sight.'],
    },
    'dangerous-compliment': {
      loved: ['{choice}. You bowed to the danger without begging it to spare you. Good.'],
      liked: ['{choice}. A daring tribute. Excessive, but not cowardly.'],
      neutral: ['{choice}. Grand. I am waiting for honor beneath it.'],
      disliked: ['{choice}. Swagger is not courage, snake.'],
      hated: ['{choice}. You offered insult in ceremonial clothes. Rejected.'],
    },
    'sincere-compliment': {
      loved: ['{choice}. Respectful, brave, and free of ownership. I value that.'],
      liked: ['{choice}. A clean compliment. You may keep your head.'],
      neutral: ['{choice}. Polite. Not yet powerful.'],
      disliked: ['{choice}. Flattery kneels poorly when it does not mean it.'],
      hated: ['{choice}. Empty praise is a court offense.'],
    },
    protective: {
      loved: ['You defended my dignity without stealing my sword. That is rare honor.'],
      liked: ['Protection with respect. Good.'],
      neutral: ['You guarded the room. I am deciding whether you trusted me in it.'],
      disliked: ['You shielded me as if I were porcelain. I am not.'],
      hated: ['You made me smaller to make yourself heroic. Never again.'],
    },
    abandonment: {
      loved: ['You withdrew with respect and returned with purpose. Acceptable restraint.'],
      liked: ['A retreat can preserve honor when it does not abandon duty.'],
      neutral: ['You stepped back. The court awaits motive.'],
      disliked: ['You left your place when courage was summoned.'],
      hated: ['You abandoned the field and expected the banner to forgive you.'],
    },
    honesty: {
      loved: ['Truth given upright. I honor that more than victory.'],
      liked: ['Honesty suits you better than decoration.'],
      neutral: ['Truth spoken. Worth noted.'],
      disliked: ['You arrived at honesty after the road was blocked. Late tribute.'],
      hated: ['A partial truth is a servant of betrayal.'],
    },
    clever: {
      loved: ['Wit with discipline. A fine blade, properly carried.'],
      liked: ['Clever, and not vulgar. Good.'],
      neutral: ['Clever enough for court, not enough for confidence.'],
      disliked: ['You hid behind cleverness when respect was required.'],
      hated: ['A cheap jest at a sacred door. No.'],
    },
    comfort: {
      loved: ['You offered gentleness without pity. That is worthy.'],
      liked: ['Comfort with manners. I approve.'],
      neutral: ['Kind, but not yet steadfast.'],
      disliked: ['You mistook softness for surrender.'],
      hated: ['Do not soothe me as though I have already fallen.'],
    },
    'public-affection': {
      loved: ['You stood with me publicly and did not make me a trophy. Good.'],
      liked: ['A bold display. Imperfect, but brave.'],
      neutral: ['The public saw something. I will decide whether it was ours to show.'],
      disliked: ['You invited witnesses before earning permission.'],
      hated: ['You paraded intimacy as conquest. I will not be displayed.'],
    },
    avoidance: {
      loved: ['Restraint, when chosen with honor, can be beautiful.'],
      liked: ['You held back rather than presume. Good.'],
      neutral: ['Caution has uses. It also has excuses.'],
      disliked: ['You avoided the brave answer.'],
      hated: ['Cowardice dressed as courtesy is still cowardice.'],
    },
    violence: {
      loved: ['Force restrained until duty required it. Honorable.'],
      liked: ['A hard answer, but not a wild one.'],
      neutral: ['Violence may serve. It must never rule.'],
      disliked: ['You reached for force before authority was yours.'],
      hated: ['Power without discipline is merely noise with a crown.'],
    },
    pragmatic: {
      loved: ['Practical devotion. That is how kingdoms survive winter.'],
      liked: ['Useful and respectful. A good answer.'],
      neutral: ['Practical. The court remains unmoved but not displeased.'],
      disliked: ['You made duty cold when it could have been kind.'],
      hated: ['You reduced a living vow to an errand. Unworthy.'],
    },
    dramatic: {
      loved: ['Grand, but anchored. I love a gesture that can stand trial.'],
      liked: ['The gesture was large. Fortunately, so was the courage.'],
      neutral: ['Ceremony without proof is only costume.'],
      disliked: ['You performed bravery instead of practicing it.'],
      hated: ['You made spectacle where honor was required.'],
    },
    'love-in-eyes': {
      loved: [
        "Love in my woman's eyes. A look that carries its own weight. I honor that.",
        'You offered devotion without demand. That is a rare kind of nobility.',
        "Love in my woman's eyes. I see the truth of it. I will not look away.",
      ],
      liked: [
        "Love in my woman's eyes. Respectful. I grant it favor.",
        'You looked at me with something worth honoring. I acknowledge that.',
      ],
      neutral: [
        "Love in my woman's eyes. The court observes. Judgment reserved.",
        'The look is present. Whether it is devotion or habit, I cannot yet tell.',
      ],
      disliked: [
        "Love in my woman's eyes. A glance is not a vow. Prove it.",
        'You offered love without proving you can carry it. Suspicious.',
      ],
      hated: [
        "Love in my woman's eyes. You cannot command loyalty with a look. I will not be moved.",
        'That gaze is a claim I did not consent to. Remove it.',
      ],
    },
    generic: {
      loved: ['You answered with dignity and nerve. I am moved.'],
      liked: ['Respectable. I grant the answer favor.'],
      neutral: ['Permitted. Not praised.'],
      disliked: ['You missed the honorable road.'],
      hated: ['You insulted me and expected ceremony. You are a fool, snake.'],
    },
  },
  sharp: {
    pineapple: {
      loved: [
        'Pineapple. High-risk signal. Polarizing. Memorable. I respect a choice that knows it will be cross-examined.',
      ],
      liked: ['Pineapple. Bad for consensus, good for leverage. Interesting.'],
      neutral: ['Pineapple. Volatile asset. Holding judgment.'],
      disliked: ['Pineapple. You chose controversy without a plan. Inefficient.'],
      hated: ['Pineapple. Expensive chaos with juice on it. No.'],
    },
    'dangerous-compliment': {
      loved: ['{choice}. Ah. A compliment with a concealed edge and a declared target. Excellent.'],
      liked: ['{choice}. Risky, useful, hard to ignore. I like hard to ignore.'],
      neutral: ['{choice}. Sharp packaging. Contents pending.'],
      disliked: ['{choice}. You waved a blade and forgot the contract.'],
      hated: ['{choice}. Threatening me is not flirting unless I profit. I did not.'],
    },
    'sincere-compliment': {
      loved: ['{choice}. Sincerity with precision. Dangerous. Valuable.'],
      liked: ['{choice}. Clean hit. I will allow the advantage.'],
      neutral: ['{choice}. Pleasant. Low leverage.'],
      disliked: ['{choice}. Too soft, too vague, too easy to counterfeit.'],
      hated: ['{choice}. Cheap sweetness. Bad currency.'],
    },
    protective: {
      loved: ['You covered my back without taking my knife. That is partnership.'],
      liked: ['Good cover. No ownership stink. I like that.'],
      neutral: ['Protection offered. Terms still unclear.'],
      disliked: ['You protected your ego and put my name on the invoice.'],
      hated: ['Do not buy my safety and call the receipt romance.'],
    },
    abandonment: {
      loved: ['You left only after making the exit useful. Efficient mercy.'],
      liked: ['Retreat with a plan. Acceptable.'],
      neutral: ['You exited. I am pricing the reason.'],
      disliked: ['You left me with the risk and kept the excuse. Bad deal.'],
      hated: ['You abandoned the table mid-contract. I collect on that.'],
    },
    honesty: {
      loved: ['Truth before pressure. Excellent negotiating position.'],
      liked: ['Honesty saves time. I like time.'],
      neutral: ['Truth noted. Value undetermined.'],
      disliked: ['Late truth. Discounted heavily.'],
      hated: ['Truth used as liability shielding. Insulting.'],
    },
    clever: {
      loved: ['Clever, clean, and profitable to remember. I am impressed.'],
      liked: ['Good angle. I dislike that I did not see it first.'],
      neutral: ['Clever. Not decisive.'],
      disliked: ['Wit without accountability is cheap camouflage.'],
      hated: ['A joke that costs me trust is a bad investment.'],
    },
    comfort: {
      loved: ['Comfort with structure. Rare. Worth keeping.'],
      liked: ['Useful warmth. I can work with that.'],
      neutral: ['Comfort offered. Terms pending.'],
      disliked: ['You tried to soften the problem without solving it.'],
      hated: ['Do not use comfort as a gag order.'],
    },
    'public-affection': {
      loved: ['Public signal, private respect. Strong move.'],
      liked: ['You spent reputation without wasting mine. Acceptable.'],
      neutral: ['Public move. Risk unclear.'],
      disliked: ['You made me visible without calculating who was watching.'],
      hated: ['You turned me into proof for strangers. Terrible trade.'],
    },
    avoidance: {
      loved: ['You declined the trap instead of pretending it was a door. Smart.'],
      liked: ['Restraint with a reason. Good.'],
      neutral: ['Avoidance can be strategy. It can also be fear.'],
      disliked: ['You dodged and left no plan behind.'],
      hated: ['Cowardice has terrible margins.'],
    },
    violence: {
      loved: ['Force, timed correctly, is a tool. You used the handle, not the edge.'],
      liked: ['Controlled escalation. Risky, useful.'],
      neutral: ['Violence is costly. Show me the return.'],
      disliked: ['You escalated before checking the ledger.'],
      hated: ['You made an enemy for free. I hate bad business.'],
    },
    pragmatic: {
      loved: ['Practical, precise, and still personal. Excellent.'],
      liked: ['Useful answer. I like useful when it remembers I am not merchandise.'],
      neutral: ['Practical. Balance holds.'],
      disliked: ['Efficient, but emotionally underfunded.'],
      hated: ['You itemized me. Never itemize me.'],
    },
    dramatic: {
      loved: ['Drama with leverage. Finally, spectacle that earns rent.'],
      liked: ['Flashy, but it moved the board. I can respect that.'],
      neutral: ['Big signal. Limited proof.'],
      disliked: ['Too much smoke. Not enough transaction.'],
      hated: ['You performed value instead of having it.'],
    },
    'love-in-eyes': {
      loved: [
        "Love in my woman's eyes. Ah. Direct, unguarded, and worth more than leverage. I am impressed.",
        'You looked at me without a plan. That is the most honest transaction I know.',
        "Love in my woman's eyes. High risk, infinite return. I am all in.",
      ],
      liked: [
        "Love in my woman's eyes. Acceptable terms. I am choosing to accept.",
        'You showed me something valuable. I will not pretend I did not see it.',
      ],
      neutral: [
        "Love in my woman's eyes. Signal received. Auditing for authenticity.",
        'The look is there. I am checking whether it has substance behind the optics.',
      ],
      disliked: [
        "Love in my woman's eyes. A glance is not a guarantee. Show me the track record.",
        'You are looking at me like a good investment. I check investments.',
      ],
      hated: [
        "Love in my woman's eyes. Sentiment without documentation. Rejected.",
        'Do not confuse a look with a binding offer. I am not signing anything.',
      ],
    },
    generic: {
      loved: ['That answer cost me composure. Irritating. Valuable.'],
      liked: ['Useful answer. I like useful answers.'],
      neutral: ['Fine. It balances. Balance is not profit.'],
      disliked: ['Careless. I dislike careless.'],
      hated: ['Absolutely not. Breach of contract and taste.'],
    },
  },
};
export class DatingScenarioDirector {
  private readonly recentAuthoredDatingScenarioIds = new Map<string, string[]>();
  constructor(private readonly snakeGame: SnakeGame) {}
  private random(): number {
    return this.snakeGame.rng();
  }
  private getFlag<T>(key: string): T | undefined {
    return this.snakeGame.getFlag<T>(key);
  }
  createDatingSequenceEvent(
    profile: RelationshipCandidateProfile,
    kind: Extract<RelationshipChoice, 'talk' | 'flirt' | 'date'>,
  ): { pages: DatingSequencePage[]; branchResults: Record<string, DatingBranchResult> } {
    const personality = this.personalityForDatingProfile(profile);
    const recentKey = `${this.snakeGame.getLocalPlayerId()}:${profile.id}:${kind}`;
    const recentScenarioIds = this.recentAuthoredDatingScenarioIds.get(recentKey) ?? [];
    const actorRole = profile.actorId ? this.snakeGame.getActorRole(profile.actorId) : undefined;
    const scenarioContext = {
      ...(actorRole ? { actorRole } : {}),
      contextTags: this.currentDatingContextTags(profile, actorRole),
    };
    let authored = createPersonalityDatingScenario(
      profile,
      kind,
      personality,
      () => this.random(),
      scenarioContext,
    );
    for (
      let attempt = 0;
      attempt < 4 && recentScenarioIds.includes(authored.scenarioId);
      attempt += 1
    ) {
      authored = createPersonalityDatingScenario(
        profile,
        kind,
        personality,
        () => this.random(),
        scenarioContext,
      );
    }
    if (this.random() < 0.35) {
      this.rememberAuthoredDatingScenario(recentKey, authored.scenarioId);
      return this.balanceDatingBranchResults(profile, {
        pages: authored.pages,
        branchResults: authored.branchResults,
      });
    }

    const voice = (line: string): DatingSequencePage => ({
      line,
      result: `${profile.displayName}'s expression changes before their voice does.`,
    });
    const speciesLine = (human: string, goblin: string, angel: string): string => {
      if (profile.species === 'goblin' || profile.species === 'goblin-angel') return goblin;
      if (profile.species === 'angel') return angel;
      return human;
    };
    const templates: Array<{
      pages: DatingSequencePage[];
      branchResults: Record<string, DatingBranchResult>;
    }> = [];
    if (kind === 'talk') {
      templates.push({
        pages: [
          {
            line: `You and ${profile.displayName} step aside where the room noise thins.`,
            lineIsNarration: true,
          },
          voice(
            this.pickRelationshipLine(profile, [
              'I was going to make a joke, but then you arrived looking like the punchline had unionized.',
              'Tell me something true and small. Large truths always arrive overdressed.',
              'If this is small talk, why does it keep looking at me like a duel?',
            ]),
          ),
          {
            line: `${profile.displayName} makes a joke that is either flirtation, accusation, or advanced local weather.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-joke', label: 'Joke Back' },
              { id: 'branch-honest', label: 'Answer Honestly' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice(
            this.pickRelationshipLine(profile, [
              'Not terrible. I reserve the right to become fond of this version of you.',
              'Careful. Competence is dangerously close to charm.',
            ]),
          ),
        ],
        branchResults: {
          'branch-joke': {
            text: `Liked: ${profile.displayName} laughs despite themselves. The joke clearly landed.`,
          },
          'branch-honest': {
            text: `Liked: ${profile.displayName} goes quiet because the honest answer mattered.`,
          },
        },
      });
      templates.push({
        pages: [
          {
            line: `${profile.displayName} points at a cracked map and asks where you would go if no one needed anything from you.`,
            lineIsNarration: true,
          },
          voice(
            speciesLine(
              'Choose carefully. I judge imaginary vacations with real severity.',
              'Say treasure cave and I may respect you. Say tax office and I may propose immediately.',
              'Do not say heaven. I have seen the management.',
            ),
          ),
          {
            line: `The map waits like a tiny, rude oracle.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-sea', label: 'Sea' },
              { id: 'branch-mountain', label: 'Mountain' },
              { id: 'branch-home', label: 'Home' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('Interesting. I can work with that answer. I may also weaponize it.'),
        ],
        branchResults: {
          'branch-sea': {
            text: `Liked: ${profile.displayName} likes the sea answer and softens at the image.`,
          },
          'branch-mountain': {
            text: `Neutral: ${profile.displayName} respects the mountain answer, but it does not quite reach them.`,
          },
          'branch-home': {
            text: `Loved: ${profile.displayName} liked "home" more than they expected.`,
          },
        },
      });
      templates.push({
        pages: [
          {
            line: `${profile.displayName} tells you a joke so dry it may technically be kindling.`,
            lineIsNarration: true,
          },
          voice('Laugh if you understand it. Laugh harder if you do not.'),
          {
            line: `The joke hangs there with ceremonial arrogance.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-laugh', label: 'Laugh' },
              { id: 'branch-groan', label: 'Groan' },
              { id: 'branch-counterjoke', label: 'Counter' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('Fine. That reaction was acceptable enough to survive the record.'),
        ],
        branchResults: {
          'branch-laugh': { text: `Liked: ${profile.displayName} looks pleased that you laughed.` },
          'branch-groan': {
            text: `Neutral: ${profile.displayName} accepts the groan, but wanted a laugh.`,
          },
          'branch-counterjoke': {
            text: `Loved: ${profile.displayName} loves that you answered with a joke of your own.`,
          },
        },
      });
      templates.push({
        pages: [
          {
            line: `${profile.displayName} asks what rumor about you is closest to true.`,
            lineIsNarration: true,
          },
          voice(
            speciesLine(
              'Careful. I prefer truth wearing a dramatic hat.',
              'If it involves theft, say it proudly. If it involves taxes, lie.',
              'The universe keeps records. I prefer hearing the annotated version.',
            ),
          ),
          {
            line: `Three rumors volunteer themselves with terrible posture.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-rumor-hero', label: 'Secret Hero' },
              { id: 'branch-rumor-thief', label: 'Thief' },
              { id: 'branch-rumor-coward', label: 'Coward', tone: 'danger' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('Good. A person without rumors is either boring or dangerously efficient.'),
        ],
        branchResults: {
          'branch-rumor-hero': {
            text: `Liked: ${profile.displayName} likes the heroic answer, even if they call it suspicious.`,
          },
          'branch-rumor-thief': {
            text: `Liked: ${profile.displayName} finds the thief answer entertaining.`,
          },
          'branch-rumor-coward': {
            text: `Disliked: ${profile.displayName} appreciates the honesty, but cowardice clearly bothers them.`,
            outcome: 'mean',
          },
        },
      });
    } else if (kind === 'flirt') {
      templates.push({
        pages: [
          {
            line: `You lean into the ridiculous tension like someone opening a cursed love letter.`,
            lineIsNarration: true,
          },
          voice(
            this.pickRelationshipLine(profile, [
              'That line was indecently confident for someone shaped like consequences.',
              'Say that again slower. I want to decide whether to reward you or ruin you socially.',
              'You are flirting like a person trying to negotiate with lightning. Continue.',
            ]),
          ),
          {
            line: `${profile.displayName} asks, with suspicious gravity: "What is your kind of pizza?"`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-pineapple', label: 'Pineapple' },
              { id: 'branch-pepperoni', label: 'Pepperoni' },
              { id: 'branch-mushroom', label: 'Mushroom' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice(
            this.pickRelationshipLine(profile, [
              'I hate that I asked. I hate more that your answer helps.',
              'Fine. The flirtation survives cross-examination. Barely.',
            ]),
          ),
        ],
        branchResults: {
          'branch-pineapple': { text: `Liked: "pineapple? Bold. I like bold."` },
          'branch-pepperoni': { text: `Neutral: "pepperoni? Direct. I can respect direct."` },
          'branch-mushroom': {
            text: `Liked: "mushroom? Mysterious. I like that more than I should."`,
          },
        },
      });
      templates.push({
        pages: [
          {
            line: `${profile.displayName} asks what kind of villain you would be in a melodrama.`,
            lineIsNarration: true,
          },
          voice('Do not disappoint me with a humble answer.'),
          {
            line: `The question has no innocent exits.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-rival', label: 'Elegant Rival' },
              { id: 'branch-mastermind', label: 'Mastermind' },
              { id: 'branch-betrayer', label: 'Betrayer', tone: 'danger' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('That answer is either attractive or a warning label. Fortunately, I read both.'),
        ],
        branchResults: {
          'branch-rival': {
            text: `Loved: ${profile.displayName} clearly approves of the elegant rival answer.`,
          },
          'branch-mastermind': {
            text: `Liked: ${profile.displayName} likes the ambition, even while judging your imaginary lair.`,
          },
          'branch-betrayer': {
            text: `Disliked: ${profile.displayName} does not like betrayal jokes. Resentment takes notes.`,
            outcome: 'mean',
          },
        },
      });
      templates.push({
        pages: [
          {
            line: `${profile.displayName} dares you to compliment them without using a single normal word.`,
            lineIsNarration: true,
          },
          voice(
            speciesLine(
              'Go on. Fail creatively.',
              'If you compare me to money, it had better be rare money.',
              'Do not say radiant. I have union restrictions on that word.',
            ),
          ),
          {
            line: `You have one theatrical compliment and absolutely no dignity.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-mooncrime', label: 'Moon Crime' },
              { id: 'branch-knifepoem', label: 'Knife Poem' },
              { id: 'branch-sincere', label: 'Sincere' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('Infuriating. That was better than it deserved to be.'),
        ],
        branchResults: {
          'branch-mooncrime': {
            text: `Liked: ${profile.displayName} likes the phrase "moon crime" enough to repeat it.`,
          },
          'branch-knifepoem': {
            text: `Loved: ${profile.displayName} is delighted by the dangerous compliment.`,
          },
          'branch-sincere': {
            text: `Loved: the sincere compliment lands hard. They liked that a lot.`,
          },
        },
      });
      templates.push({
        pages: [
          {
            line: `${profile.displayName} asks where your eyes are supposed to be during a flirtation this dramatic.`,
            lineIsNarration: true,
          },
          voice(
            'Answer wrong and I will become insufferable. Answer right and I may become worse.',
          ),
          {
            line: `The bottom third of reality becomes a court of romantic law.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-eyes', label: 'Their Eyes' },
              { id: 'branch-smile', label: 'Their Smile' },
              { id: 'branch-floor', label: 'The Floor' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('I will be unbearable about this later. You have been warned.'),
        ],
        branchResults: {
          'branch-eyes': {
            text: `Loved: ${profile.displayName} likes the eye contact and does not look away first.`,
          },
          'branch-smile': {
            text: `Liked: ${profile.displayName} liked being told their smile matters.`,
          },
          'branch-floor': {
            text: `Disliked: ${profile.displayName} thinks looking away was cowardly, but not unforgivable.`,
          },
        },
      });
    } else {
      templates.push({
        pages: [
          {
            line: `You and ${profile.displayName} go to a tavern. ${profile.displayName} kicks back a drink like it personally offended them.`,
            lineIsNarration: true,
          },
          voice(
            this.pickRelationshipLine(profile, [
              'This place is awful. Good. Perfect dates should have one obvious enemy.',
              'If you planned this, I am impressed. If you improvised it, I am concerned and impressed.',
              'Do not look so relieved. The date has only survived the opening argument.',
            ]),
          ),
          {
            line: `A bear crashes through the side wall. The tavern immediately develops opinions about exits.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-stand-with-them', label: 'Stand With Them' },
              { id: 'branch-shield-them', label: 'Shield Them' },
              { id: 'branch-run', label: 'Run Off', tone: 'danger' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice(
            this.pickRelationshipLine(profile, [
              'I cannot believe the bear was not the strangest part of tonight.',
              'You are either heroic or wildly committed to the bit. I am not immune to either.',
            ]),
          ),
        ],
        branchResults: {
          'branch-stand-with-them': {
            text: `${profile.displayName} says, "Beside me, not over me. That is the difference."`,
            tags: ['protective', 'bravery', 'commitment'],
          },
          'branch-shield-them': {
            text: `${profile.displayName} says, "You made me smaller to make your courage prettier."`,
            tags: ['protective', 'neediness', 'publicAffection'],
            outcome: 'mean',
          },
          'branch-run': {
            text: `${profile.displayName} says, "You ran, snake. I was still at the table."`,
            tags: ['avoidance', 'betrayal', 'selfPreserving'],
            outcome: 'mean',
          },
        },
      });
      templates.push({
        pages: [
          {
            line: `You and ${profile.displayName} find a night market where every stall sells something probably cursed.`,
            lineIsNarration: true,
          },
          voice('Romance is mostly choosing which obvious trap to enter together.'),
          {
            line: `A vendor offers a black rose, a brass knife, and a pastry shaped like a legal document.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-rose', label: 'Rose' },
              { id: 'branch-knife', label: 'Knife' },
              { id: 'branch-pastry', label: 'Pastry' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('A suspicious choice. Naturally, I respect it.'),
        ],
        branchResults: {
          'branch-rose': {
            text: `Liked: ${profile.displayName} liked the rose, even while pretending it was too obvious.`,
          },
          'branch-knife': {
            text: `Loved: ${profile.displayName} loved the knife choice. That says something about them.`,
          },
          'branch-pastry': {
            text: `Liked: ${profile.displayName} liked the absurd pastry more than expected.`,
          },
        },
      });
      templates.push({
        pages: [
          {
            line: `Rain traps you and ${profile.displayName} under a collapsing awning. It is extremely dramatic for weather.`,
            lineIsNarration: true,
          },
          voice('If the sky is trying to set a mood, it is overqualified.'),
          {
            line: `${profile.displayName} is close enough to hear your heroic lack of plan.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-sharecloak', label: 'Share Cloak' },
              { id: 'branch-dance', label: 'Dance' },
              { id: 'branch-complainrain', label: 'Complain', tone: 'danger' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('Fine. The rain may continue. Briefly.'),
        ],
        branchResults: {
          'branch-sharecloak': {
            text: `Loved: ${profile.displayName} liked sharing the cloak and moved closer on purpose.`,
          },
          'branch-dance': {
            text: `Liked: ${profile.displayName} calls you absurd, but they liked the dance.`,
          },
          'branch-complainrain': {
            text: `Disliked: ${profile.displayName} did not like you ruining the mood by complaining.`,
            outcome: 'mean',
          },
        },
      });
      templates.push({
        pages: [
          {
            line: `The date reaches a quiet bridge. Below it, something large moves through the dark water.`,
            lineIsNarration: true,
          },
          voice('This is either romantic or a monster introduction. Possibly both.'),
          {
            line: `A glowing bottle floats near the bank with a note inside.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-readnote', label: 'Read Note' },
              { id: 'branch-skipnote', label: 'Ignore It' },
              { id: 'branch-throwstone', label: 'Throw Stone', tone: 'danger' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('I will remember this as atmospheric. Do not make me revise it.'),
        ],
        branchResults: {
          'branch-readnote': {
            text: `Loved: the note says, "Kiss the fool or flee the bridge." ${profile.displayName} liked that you read it.`,
          },
          'branch-skipnote': {
            text: `Neutral: ${profile.displayName} respects ignoring the bottle, but wanted curiosity.`,
          },
          'branch-throwstone': {
            text: `Disliked: ${profile.displayName} did not like your survival instincts here.`,
            outcome: 'mean',
          },
        },
      });
      templates.push({
        pages: [
          {
            line: `A street musician recognizes ${profile.displayName} and starts playing something violently sentimental.`,
            lineIsNarration: true,
          },
          voice('If you laugh, I will deny everything. If you dance, I may deny less.'),
          {
            line: `The song waits, shameless and overproduced.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-slowdance', label: 'Slow Dance' },
              { id: 'branch-tipband', label: 'Tip Band' },
              { id: 'branch-mockmusic', label: 'Mock Song', tone: 'danger' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('No one will speak of this accurately, which is probably mercy.'),
        ],
        branchResults: {
          'branch-slowdance': {
            text: `Loved: ${profile.displayName} loved the slow dance and is trying to hide it.`,
          },
          'branch-tipband': {
            text: `Liked: ${profile.displayName} liked that you tipped the band.`,
          },
          'branch-mockmusic': {
            text: `Hated: ${profile.displayName} hated that you mocked something sentimental.`,
            outcome: 'mean',
          },
        },
      });
      templates.push({
        pages: [
          {
            line: `The date is interrupted by a child asking if you two are married, doomed, or both.`,
            lineIsNarration: true,
          },
          voice('Children should not be allowed to perceive subtext.'),
          {
            line: `The child waits with the brutal patience of prophecy.`,
            lineIsNarration: true,
            actions: [
              { id: 'branch-married', label: 'Basically' },
              { id: 'branch-doomed', label: 'Probably' },
              { id: 'branch-none', label: 'No Comment' },
              { id: 'leave', label: 'Back', tone: 'quiet' },
            ],
          },
          voice('I am choosing not to analyze how quickly you answered.'),
        ],
        branchResults: {
          'branch-married': {
            text: `Loved: ${profile.displayName} is flustered because the answer pleased them.`,
          },
          'branch-doomed': {
            text: `Liked: ${profile.displayName} liked the dramatic answer more than the sensible one.`,
          },
          'branch-none': {
            text: `Neutral: ${profile.displayName} respects the evasion, but wanted a braver answer.`,
          },
        },
      });
    }
    return this.balanceDatingBranchResults(
      profile,
      templates[Math.floor(this.random() * templates.length)] ?? templates[0]!,
    );
  }

  private currentDatingContextTags(
    profile: RelationshipCandidateProfile,
    actorRole: ReturnType<SnakeGame['getActorRole']>,
  ): readonly string[] {
    const tags: string[] = [];
    const state = this.snakeGame.getRelationshipState(profile);
    const town = this.snakeGame.getCurrentTown();
    if (state?.stage === 'married') tags.push('married');
    if (Number(state?.resentment ?? 0) > 20) tags.push('hurt');
    if (Number(state?.jealousy ?? 0) > 20) tags.push('jealous');
    if (profile.factionId) tags.push(`faction:${profile.factionId}`);
    if (town) tags.push('town');
    if ((town?.wantedLevel ?? 0) > 0) tags.push('crime');
    if ((town?.wantedLevel ?? 0) >= 3 || (town?.suspicion ?? 0) >= 65) tags.push('curfew');
    if (actorRole && (isTownShopRole(actorRole) || actorRole === 'goblinMerchant')) {
      tags.push('market', 'food-shortage');
    }
    if (actorRole === 'potionMaker') tags.push('healing');
    if (actorRole === 'butcher') tags.push('food');
    if (actorRole === 'cardDealer') tags.push('cards', 'rumor');
    if (actorRole === 'bartender' || actorRole === 'cook') tags.push('rumor');
    if (actorRole && isTownCriminalRole(actorRole)) {
      tags.push('guild', 'crime');
    }
    if (actorRole === 'questGiver') tags.push('quest');
    if (this.getFlag<boolean>('ui.healthRevealed')) tags.push('danger');
    return Array.from(new Set(tags));
  }

  private rememberAuthoredDatingScenario(key: string, scenarioId: string): void {
    const previous = this.recentAuthoredDatingScenarioIds.get(key) ?? [];
    this.recentAuthoredDatingScenarioIds.set(key, [scenarioId, ...previous].slice(0, 3));
  }

  private balanceDatingBranchResults(
    profile: RelationshipCandidateProfile,
    event: {
      pages: DatingSequencePage[];
      branchResults: Record<string, DatingBranchResult>;
    },
  ): { pages: DatingSequencePage[]; branchResults: Record<string, DatingBranchResult> } {
    const pages = event.pages.map((page) => ({
      ...page,
      actions: page.actions ? [...page.actions] : undefined,
    }));
    const branchPage = pages.find((page) =>
      (page.actions ?? []).some((action) => action.id.startsWith('branch-')),
    );
    if (branchPage) {
      const actions = [...(branchPage.actions ?? [])];
      const branchCount = actions.filter((action) => action.id.startsWith('branch-')).length;
      if (branchCount < 3) {
        const leave = actions.find((action) => action.id === 'leave');
        const withoutLeave = actions.filter((action) => action.id !== 'leave');
        branchPage.actions = [
          ...withoutLeave,
          { id: 'branch-observe', label: 'Read the Room' },
          ...(leave ? [leave] : []),
        ];
      }
    }
    const branchIds = pages
      .flatMap((page) => page.actions ?? [])
      .map((action) => action.id)
      .filter((id) => id.startsWith('branch-'));
    if (branchIds.length < 3) {
      this.shuffleDatingBranchPageActions(pages);
      return { ...event, pages };
    }
    const branchResults = { ...event.branchResults };
    const allBranchesAuthored = branchIds.every((id) => {
      const branch = branchResults[id];
      return Boolean(branch?.targetTier && branch?.followUpPages?.length);
    });
    if (allBranchesAuthored) {
      this.shuffleDatingBranchPageActions(pages);
      return { ...event, pages, branchResults };
    }
    const scored = branchIds.map((id) => {
      const existing = branchResults[id] ?? { text: id.replace(/^branch-/, '') };
      const tags = existing.tags ?? this.inferRelationshipTags(id);
      const score = this.scoreDatingTagsForProfile(profile, tags);
      return { id, score, tags, existing };
    });
    const ranked = [...scored].sort((a, b) => b.score - a.score);
    const high = ranked[0];
    const low = ranked[ranked.length - 1];
    const middle = ranked[Math.floor(ranked.length / 2)];
    for (const entry of scored) {
      const current = branchResults[entry.id] ?? entry.existing;
      branchResults[entry.id] = {
        ...current,
        tags: entry.tags,
        targetTier:
          entry.id === high?.id
            ? entry.score >= 9
              ? 'loved'
              : 'liked'
            : entry.id === low?.id
              ? entry.score <= -9
                ? 'hated'
                : 'disliked'
              : entry.id === middle?.id
                ? 'neutral'
                : this.tierForDatingScore(entry.score),
        outcome:
          entry.id === low?.id || entry.score <= -4 ? (current.outcome ?? 'mean') : current.outcome,
      };
    }
    const tierFor = (id: string): 'positive' | 'neutral' | 'negative' => {
      if (!branchResults[id]) return 'neutral';
      const targetTier = branchResults[id]?.targetTier;
      if (targetTier === 'loved' || targetTier === 'liked') return 'positive';
      if (targetTier === 'neutral') return 'neutral';
      if (targetTier === 'disliked' || targetTier === 'hated') return 'negative';
      const text = branchResults[id]?.text.toLowerCase() ?? '';
      if (/hated|disliked/.test(text)) return 'negative';
      if (/neutral/.test(text)) return 'neutral';
      return 'positive';
    };
    const hasPositive = branchIds.some((id) => tierFor(id) === 'positive');
    const hasNeutral = branchIds.some((id) => tierFor(id) === 'neutral');
    const hasNegative = branchIds.some((id) => tierFor(id) === 'negative');
    const setTier = (id: string, tier: 'loved' | 'neutral' | 'disliked'): void => {
      const current = branchResults[id] ?? { text: id.replace(/^branch-/, '') };
      const stripped = current.text.replace(/^(Loved|Liked|Neutral|Disliked|Hated):\s*/i, '');
      branchResults[id] = {
        ...current,
        text: `${tier === 'loved' ? 'Loved' : tier === 'neutral' ? 'Neutral' : 'Disliked'}: ${stripped}`,
        targetTier: tier,
        tags:
          tier === 'loved'
            ? [
                'honesty',
                'pragmatic',
                'clever',
                'food',
                'comfort',
                'bravery',
                'commitment',
                'privateAffection',
                'dramatic',
              ]
            : tier === 'neutral'
              ? []
              : ['betrayal', 'avoidance', 'neediness'],
        outcome: tier === 'disliked' ? 'mean' : current.outcome,
      };
    };
    if (!hasPositive) {
      setTier(branchIds[0]!, 'loved');
    }
    if (!hasNeutral) {
      setTier(branchIds[Math.min(1, branchIds.length - 1)]!, 'neutral');
    }
    if (!hasNegative) {
      setTier(branchIds[branchIds.length - 1]!, 'disliked');
    }
    for (const id of branchIds) {
      const existing = branchResults[id];
      if (!existing) {
        branchResults[id] = {
          text: this.createLegacyDatingBranchReaction(profile, id, {
            text: id.replace(/^branch-/, ''),
            targetTier: 'neutral',
            tags: [],
          }),
          targetTier: 'neutral',
          tags: [],
        };
      } else if (!existing.targetTier) {
        branchResults[id] = {
          ...existing,
          targetTier: this.tierForDatingScore(
            this.scoreDatingTagsForProfile(
              profile,
              existing.tags ?? this.inferRelationshipTags(id),
            ),
          ),
        };
      }
    }
    for (const id of branchIds) {
      const branch = branchResults[id];
      if (!branch) continue;
      const reaction = this.createLegacyDatingBranchReaction(profile, id, branch);
      branchResults[id] = {
        ...branch,
        text: reaction,
        followUpPages: [
          {
            line: this.createDatingReactionBeat(profile, branch),
            lineIsNarration: true,
          },
          {
            line: this.extractNpcLineFromReaction(reaction) ?? reaction,
            juiceTier: branch.targetTier,
          },
        ],
      };
    }
    this.shuffleDatingBranchPageActions(pages);
    return { ...event, pages, branchResults };
  }

  private shuffleDatingBranchPageActions(pages: DatingSequencePage[]): void {
    for (const page of pages) {
      if (!page.actions?.some((action) => action.id.startsWith('branch-'))) continue;
      page.actions = shuffleDatingBranchActions(page.actions, () => this.random());
    }
  }

  private createDatingReactionBeat(
    profile: RelationshipCandidateProfile,
    branch: DatingBranchResult,
  ): string {
    const personality = this.personalityForDatingProfile(profile);
    const tier = branch.targetTier ?? 'neutral';
    const positive = tier === 'loved' || tier === 'liked';
    const negative = tier === 'disliked' || tier === 'hated';
    const beats: Record<RelationshipPersonality, string[]> = {
      poetic: positive
        ? [
            'Their expression softens like a candle remembering it is fire.',
            'They look away first, which is how a poem admits defeat.',
          ]
        : negative
          ? [
              'Their smile goes thin, all moonlight and warning.',
              'They hold the answer like a cracked cup.',
            ]
          : [
              'They turn the answer over and find no immediate wound.',
              'Their eyes narrow with careful, inconvenient interest.',
            ],
      deadpan: positive
        ? ['They blink once, which is practically applause.', 'Their mouth almost moves. Almost.']
        : negative
          ? [
              'Their face becomes professionally unimpressed.',
              'They file the answer somewhere cold.',
            ]
          : [
              'They process the answer without visible casualties.',
              'Their silence becomes procedural.',
            ],
      hungry: positive
        ? [
            'They brighten like someone just opened a warm kitchen door.',
            'Their attention leans closer, greedy and pleased.',
          ]
        : negative
          ? [
              'Their appetite leaves the room before their smile does.',
              'They look at the answer like burnt bread.',
            ]
          : [
              'They sniff out the meaning before deciding whether to bite.',
              'They wait for seasoning.',
            ],
      regal: positive
        ? [
            'They lift their chin as if granting mercy to their own delight.',
            'The room accidentally becomes a court in your favor.',
          ]
        : negative
          ? [
              'They straighten, and the air remembers protocol.',
              'Their approval withdraws with royal efficiency.',
            ]
          : [
              'They consider the answer from a very high balcony of the heart.',
              'They allow the moment to remain in session.',
            ],
      sharp: positive
        ? [
            'Their attention snaps into place, bright and dangerous.',
            'They look pleased in the costly way of someone losing an argument.',
          ]
        : negative
          ? [
              'Their eyes sharpen as if the answer signed a bad contract.',
              'They do the math on your mistake and do not like the total.',
            ]
          : [
              'They weigh the answer like coin with a suspicious edge.',
              'They let the silence audit you.',
            ],
    };
    const pool = beats[personality];
    return pool[Math.floor(this.random() * pool.length)] ?? pool[0]!;
  }

  private createLegacyDatingBranchReaction(
    profile: RelationshipCandidateProfile,
    actionId: string,
    branch: DatingBranchResult,
  ): string {
    const personality = this.personalityForDatingProfile(profile);
    const tier = branch.targetTier ?? 'neutral';
    const tags = new Set(branch.tags ?? this.inferRelationshipTags(actionId));
    const label = this.humanizeDatingActionLabel(branch.label ?? actionId.replace(/^branch-/, ''));
    const reason = this.primaryDatingReactionReason(actionId, tags);
    const line = this.pickDatingReactionLine(personality, tier, reason, label);
    return `${profile.displayName} says, "${line}"`;
  }

  private humanizeDatingActionLabel(label: string): string {
    return label
      .replace(/^branch-/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private extractNpcLineFromReaction(reaction: string): string | null {
    const match = reaction.match(/says,\s*"([^"]+)"/);
    return match?.[1] ?? null;
  }

  private primaryDatingReactionReason(
    actionId: string,
    tags: ReadonlySet<RelationshipTag>,
  ): DatingReactionReason {
    if (/pineapple/i.test(actionId)) return 'pineapple';
    if (/knife|blade|mooncrime|moon-crime|rival|mastermind/i.test(actionId))
      return 'dangerous-compliment';
    if (/sincere|home|eyes|smile|slowdance|sharecloak/i.test(actionId)) return 'sincere-compliment';
    if (/protect|shield|stand|medicine|vigil/i.test(actionId) || tags.has('protective'))
      return 'protective';
    if (/run|leave|abandon|resent/i.test(actionId) || tags.has('betrayal')) return 'abandonment';
    if (tags.has('honesty') || /honest|truth|own|serious/i.test(actionId)) return 'honesty';
    if (tags.has('clever') || /joke|counter|mushroom|rumor|read/i.test(actionId)) return 'clever';
    if (tags.has('comfort') || tags.has('food') || /pepperoni|pastry|tip|cloak/i.test(actionId))
      return 'comfort';
    if (tags.has('publicAffection') || /dance|married|perform|crown/i.test(actionId))
      return 'public-affection';
    if (tags.has('avoidance') || /ignore|skip|floor|none|forfeit/i.test(actionId))
      return 'avoidance';
    if (tags.has('violence') || /threat|stone|knife|monster/i.test(actionId)) return 'violence';
    if (tags.has('pragmatic') || tags.has('transaction') || /coin|bribe|tax|useful/i.test(actionId))
      return 'pragmatic';
    if (tags.has('dramatic') || /doomed|villain|rose|mask/i.test(actionId)) return 'dramatic';
    return 'generic';
  }

  private pickDatingReactionLine(
    personality: RelationshipPersonality,
    tier: RelationshipOutcomeTier,
    reason: DatingReactionReason,
    label: string,
  ): string {
    const lines = DATING_REACTION_LINES[personality]?.[reason]?.[tier];
    if (lines?.length) return this.fillDatingReactionTemplate(lines, label);
    const fallback = DATING_REACTION_LINES[personality]?.generic?.[tier];
    if (fallback?.length) return this.fillDatingReactionTemplate(fallback, label);
    return `${label}. I am deciding what that reveals about you.`;
  }

  private fillDatingReactionTemplate(lines: readonly string[], label: string): string {
    const template = lines[Math.floor(this.random() * lines.length)] ?? lines[0]!;
    return template.replace(/\{choice\}/g, label);
  }

  private scoreDatingTagsForProfile(
    profile: RelationshipCandidateProfile,
    tags: readonly RelationshipTag[],
  ): number {
    const personality = this.personalityForDatingProfile(profile);
    const weights = DATING_PERSONALITY_TAG_WEIGHTS[personality];
    return tags.reduce((total, tag) => total + (weights[tag] ?? 0), 0);
  }

  private tierForDatingScore(score: number): RelationshipOutcomeTier {
    if (score >= 10) return 'loved';
    if (score >= 4) return 'liked';
    if (score <= -10) return 'hated';
    if (score <= -4) return 'disliked';
    return 'neutral';
  }

  private personalityForDatingProfile(
    profile: RelationshipCandidateProfile,
  ): RelationshipPersonality {
    if (profile.personality) return profile.personality;
    if (profile.species === 'goblin' || profile.species === 'goblin-angel') return 'sharp';
    if (profile.species === 'angel') return 'regal';
    const options: RelationshipPersonality[] = ['poetic', 'deadpan', 'hungry', 'regal', 'sharp'];
    let total = 0;
    for (let i = 0; i < profile.id.length; i += 1) {
      total = (total * 31 + profile.id.charCodeAt(i)) >>> 0;
    }
    return options[total % options.length] ?? 'poetic';
  }

  private pickRelationshipLine(
    profile: RelationshipCandidateProfile,
    lines: readonly string[],
  ): string {
    if (profile.species === 'goblin' || profile.species === 'goblin-angel') {
      return lines[Math.floor(this.random() * lines.length)] ?? lines[0]!;
    }
    if (profile.species === 'angel') {
      return (
        lines[Math.floor(this.random() * lines.length)]?.replace('date', 'judgment') ?? lines[0]!
      );
    }
    return lines[Math.floor(this.random() * lines.length)] ?? lines[0]!;
  }

  private inferRelationshipTags(actionId: string): RelationshipTag[] {
    const tags: RelationshipTag[] = [];
    if (/brave|courage|fearless/i.test(actionId)) tags.push('bravery');
    if (/reckless|crazy|wild/i.test(actionId)) tags.push('recklessness');
    if (/safe|protect|shield|defend/i.test(actionId)) tags.push('protective');
    if (/selfless|sacrifice|give.*away/i.test(actionId)) tags.push('selfless');
    if (/pragmatic|practical|realistic/i.test(actionId)) tags.push('pragmatic');
    if (/truth|honest|confess|admit/i.test(actionId)) tags.push('honesty');
    if (/avoid|evade|dodge|retreat|run/i.test(actionId)) tags.push('avoidance');
    if (/loyal|faithful|stand.*by/i.test(actionId)) tags.push('loyalty');
    if (/betray|double.*cross|stab.*back/i.test(actionId)) tags.push('betrayal');
    if (/skill|craft|tactic|strategy|expert/i.test(actionId)) tags.push('competence');
    if (/cling|needy|depend|attach/i.test(actionId)) tags.push('neediness');
    if (/restrain|hold.*back|temperate/i.test(actionId)) tags.push('restraint');
    if (/fight|attack|strike|punch|kick/i.test(actionId)) tags.push('violence');
    if (/spare|mercy|forgive|pity/i.test(actionId)) tags.push('mercy');
    if (/ambitious|climb|rise|power|control/i.test(actionId)) tags.push('ambition');
    if (/humble|honor|respect|bow/i.test(actionId)) tags.push('humility');
    if (/trade|deal|bargain|exchange|payment/i.test(actionId)) tags.push('transaction');
    if (/ritual|ceremony|sacred|pray|offer/i.test(actionId)) tags.push('ritual');
    if (/defy|dare|challenge|risk.*death/i.test(actionId)) tags.push('deathDefiance');
    if (/accept.*death|embrace.*end|peaceful.*end/i.test(actionId)) tags.push('deathAcceptance');
    if (/kiss|hug.*public|display.*love/i.test(actionId)) tags.push('publicAffection');
    if (/whisper|private|secret.*love|intimate/i.test(actionId)) tags.push('privateAffection');
    if (/gift.*giving|present|surprise.*gift/i.test(actionId)) tags.push('giftGiving');
    if (/gift.*spam|overwhelming.*gift/i.test(actionId)) tags.push('giftSpamming');
    if (/neglect|ignore|abandon|forget/i.test(actionId)) tags.push('neglect');
    if (/rival|compete|jealous|envy/i.test(actionId)) tags.push('rivalAttention');
    if (/secret|hidden|conceal|spy/i.test(actionId)) tags.push('secrecy');
    if (/commit|vow|promise|oath|marry/i.test(actionId)) tags.push('commitment');
    if (/haste|rush|hurry|quick.*tie/i.test(actionId)) tags.push('premature');
    if (/drama|theatrical|grand.*gesture|scene/i.test(actionId)) tags.push('dramatic');
    if (/clever|smart|witty|trick|scheme/i.test(actionId)) tags.push('clever');
    if (/food|meal|cook|eat|dinner|lunch|breakfast/i.test(actionId)) tags.push('food');
    if (/comfort|soothe|calm|reassure/i.test(actionId)) tags.push('comfort');
    if (/danger|risk|threat|hazard|peril/i.test(actionId)) tags.push('danger');
    if (/contract|pact|agreement|deal/i.test(actionId)) tags.push('contract');
    if (/ledger|score|balance|reckoning/i.test(actionId)) tags.push('ledger');
    return tags;
  }

  normalizeDatingBranchChoice(actionId: string, result?: DatingBranchResult): DatingBranchChoice {
    const label = result?.label ?? actionId.replace(/^branch-/, '').replace(/-/g, ' ');
    return {
      id: actionId,
      label,
      line: result?.text ?? label,
      tags: result?.tags ?? this.inferRelationshipTags(actionId),
      targetTier: result?.targetTier,
      outcomeLines:
        result?.targetTier && result.text
          ? {
              [result.targetTier]: result.text,
            }
          : undefined,
    };
  }
}
