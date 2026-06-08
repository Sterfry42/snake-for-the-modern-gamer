import type { NpcTranslations } from '../../types.js';
export const NPC_ENCOUNTERS_EN: NpcTranslations = {
  'shrine-maiden-miko': {
    pages: [
      'A young woman in white and crimson robes stands before a torii gate half-swallowed by bamboo, her expression as calm as the mountain mist curling around her ankles.',
      '"The kami watch over those who approach with respect. Will you leave an offering at the shrine?"',
      '"Even the smallest gift carries the weight of intention. Bring apples -- the shrine has grown hungry."',
    ],
    repeatPages: [
      'Miko bows gracefully. The paper lanterns flicker in a wind that does not touch her.',
    ],
    acceptLabel: 'Leave offering',
    rejectLabel: 'Bow and depart',
    rewardScore: 15,
  },
  'yokai-chef': {
    pages: [
      'Behind a modest wooden stand, a chef with ink-dark hair stirs a steaming pot with fierce concentration. A faint smoke scent lingers -- or perhaps imagination.',
      '"Welcome, welcome! The best broth in all the provinces. Or the dimension. However many there are." *burps smoke*',
      '"Try the special. It does not eat you back. Usually."',
    ],
    repeatPages: [
      'The chef slides a steaming bowl across the counter without looking up, as if the broth has opinions about being served.',
      '"More broth? Or are you still building up the courage to ask how much it costs in souls?"',
    ],
    acceptLabel: 'Order ramen',
    rejectLabel: 'Just looking',
    rewardScore: 12,
  },
  'kappa-duel': {
    pages: [
      'A small reptilian creature with a dish of water balanced perfectly on its head stands before a koi pond, arms crossed and scowl firmly in place.',
      '"Hmph. You want to pass? Fine. Duel me -- or bring me something I truly want. Cucumber. Not that I care. It is just... refreshing."',
    ],
    repeatPages: [
      'The kappa tips its water dish with a clawed finger, watching the ripple with thinly veiled disappointment.',
      '"You left, didn\'t you. Typical surface-dweller. No commitment to anything."',
    ],
    acceptLabel: 'Duel',
    rejectLabel: 'Bring cucumber',
    questId: 'kappas-challenge',
  },
  'tanuki-shenanigans': {
    pages: [
      'A plump raccoon dog wearing a tiny straw hat materializes from behind a bamboo stalk, grinning with the kind of confidence only a creature known for illusions possesses.',
      '"Oho! Fortune favors the curious! Help me with a little task, and the heavens shall reward you! Or I will. Whichever comes first."',
      '"The bamboo grove hides something precious. Find it. I shall take credit either way."',
    ],
    repeatPages: [
      'Tanuki tips its tiny hat and winks so hard both eyes seem to leave their sockets temporarily.',
      '"Have you found it yet? No? Well, keep looking. Your confusion is excellent comedy."',
    ],
    acceptLabel: 'Accept trickery',
    rejectLabel: 'Hesitate',
    questId: 'tanukis-shenanigans',
  },
  'ronin-wanderer': {
    pages: [
      'A wandering samurai stands motionless at a mountain pass, sword sheathed but presence sharp as a drawn blade.',
      '"I do not seek glory. I seek clarity. Prove your worth, and I shall share what I have learned."',
      '"Draw steel. Let the mountain decide who speaks first -- the victor or the wind."',
    ],
    repeatPages: [
      "The ronin's hand rests on his hilt. The bamboo bends around him as if apologizing to the mountain.",
      '"Still breathing. Still trying. How tedious. How admirable."',
    ],
    acceptLabel: 'Draw steel',
    rejectLabel: 'Pass quietly',
    rewardScore: 20,
  },
  'tengu-encounter': {
    pages: [
      'A towering bird-like spirit perches on a cliff edge, wings folded, eyes piercing. The air grows still around it.',
      '"Mortals who bring offerings to the mountain are granted favors. Bring me a cherry blossom branch, and I shall let you soar."',
    ],
    repeatPages: [
      'The tengu tilts its head and studies you the way a storm studies a field -- with patient malice.',
      '"The mountain remembers. So do I. You will not be the last to stand here and falter."',
    ],
    acceptLabel: 'Offer branch',
    rejectLabel: 'Leave respectfully',
    rewardScore: 25,
  },
  'freak-joey': {
    pages: [
      'He steps out of the lower dark wearing a grin too eager to belong to a living thing. The rooms around him go quiet in the way old chapels do when someone enters carrying murder like a sacrament.',
      '"They call me Freak Joey. Not because I was born wrong. Because I kept agreeing to become more wrong each time the tunnels asked."',
      '"Take the duel. Let the stone hear whether your courage is a living principle or just a noise your body makes before it is opened."',
    ],
    acceptLabel: 'Duel',
    rejectLabel: 'Refuse',
  },
  'lindsey-wanderer': {
    pages: [
      'Lindsey waits in the mouth of a ruined threshold with the composure of someone who has already outlived the panic that would ruin lesser creatures.',
      '"These upper rooms used to answer to surveyors, lamp-bearers, and clerks with steady hands. Now they answer mostly to hunger and accidents."',
      '"Go and name six chambers with your passing. If the dark means to keep swallowing memory, the least we can do is make it choke on record-keeping."',
    ],
    acceptLabel: 'Take quest',
    rejectLabel: 'Dismiss',
    questId: 'explore-6-rooms',
  },
  'ryan-wanderer': {
    pages: [
      'Ryan has the look of a pilgrim who made peace with failure early and has been faithfully honoring that peace ever since.',
      '"I once thought these tunnels were a proving ground. Then I watched three braver snakes get reduced to history and loose scales before I finished that thought."',
      '"If gunfire starts, do not defend your pride. Pride is plentiful down here. Blood is not. Leave first. Reflect later, if the world is unusually merciful."',
    ],
    acceptLabel: 'Listen',
    rejectLabel: 'Move on',
    rewardScore: 4,
  },
  'aurex-wanderer': {
    pages: [
      'Aurex stands where a blade of pale light has managed, against all sense, to survive this far beneath the earth. It makes his stillness look ceremonial.',
      '"The upper passages remember order the way a corpse remembers heat. Not usefully. Only enough to be tragic."',
      '"Carry the old fast for me. Twenty seconds beside an empty mouth is not holiness, but it is long enough for the soul to reveal whether it still commands the body at all."',
    ],
    repeatPages: [
      'Aurex turns his head by a degree so slight it feels less like attention than judgment finally deciding to acknowledge a nuisance.',
      '"I asked for discipline, not another little speech from appetite wearing your face. Finish the rite, or spare me the rehearsal of your reasons."',
    ],
    acceptLabel: 'Take quest',
    rejectLabel: 'Scoff',
    questId: 'survive-20s-no-eat',
  },
  'belisar-wanderer': {
    pages: [
      'Belisar rises from the western dark so quietly that for a moment it seems the room itself has chosen to stand up and address you.',
      '"No prayer. No bargain. I have listened to both from the mouths of dying things, and neither improved the ending."',
      '"Fight me. If your nerve is true, let it ring. If it is false, let the stone hear that as well. These halls deserve honest music for once."',
    ],
    repeatPages: [
      'Belisar regards you with the reserved contempt of an executioner forced to reschedule on account of weather.',
      '"Good. I despise unfinished measures. A refused duel rots in the memory like a body left in shallow earth."',
    ],
    acceptLabel: 'Fight',
    rejectLabel: 'Decline',
    rewardScore: 10,
  },
  'cyrene-wanderer': {
    pages: [
      'Cyrene draws a circle in the dust and the dust hesitates, as if uncertain whether it still belongs more to gravity or to whatever old vow animates her hand.',
      '"Every chamber in this place teaches the same lesson in a different dialect: remain moving, remain doubtful, and never mistake survival for pardon."',
      '"Your gift is speed. Guard it carefully. Velocity becomes stupidity the moment it starts believing itself chosen."',
    ],
    repeatPages: [
      'Cyrene recognizes you with a look too measured to count as warmth and too gentle to be called indifference.',
      '"Still alive. That means you are either learning, or the grave has misplaced your name for another day. I advise you not to grow arrogant about either possibility."',
    ],
    acceptLabel: 'Listen',
    rejectLabel: 'Leave',
    rewardScore: 5,
  },
  'sterling-fisher': {
    pages: [
      'A weathered figure sits cross-legged beside a collapsible fishing pole, watching the water with the patient stillness of someone who has been told the ocean listens.',
      '"The deep water does not forgive speed. It eats fast things first. You want fish? You learn to wait."',
      '"I have a task for you. Five fish in the sunken ocean. Not for me — for the ones back home who have not tasted clean meat in too long."',
    ],
    repeatPages: [
      'Sterling adjusts his line without looking up. The water ripples with something that almost looks like patience.',
      '"Still hunting? Good. The water remembers who comes back. It respects that more than most things down there."',
    ],
    acceptLabel: 'Accept the hunt',
    rejectLabel: 'Not my kind of water',
    questId: 'fisherman',
  },
} as const;
