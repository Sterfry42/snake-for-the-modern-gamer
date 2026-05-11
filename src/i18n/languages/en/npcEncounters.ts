import type { NpcTranslations } from "../../types.js";
export const NPC_ENCOUNTERS_EN: NpcTranslations = {
  "freak-joey": {
    pages: [
      "He steps out of the lower dark wearing a grin too eager to belong to a living thing. The rooms around him go quiet in the way old chapels do when someone enters carrying murder like a sacrament.",
      "\"They call me Freak Joey. Not because I was born wrong. Because I kept agreeing to become more wrong each time the tunnels asked.\"",
      "\"Take the duel. Let the stone hear whether your courage is a living principle or just a noise your body makes before it is opened.\"",
    ],
    acceptLabel: "Duel",
    rejectLabel: "Refuse",
  },
  "lindsey-wanderer": {
    pages: [
      "Lindsey waits in the mouth of a ruined threshold with the composure of someone who has already outlived the panic that would ruin lesser creatures.",
      "\"These upper rooms used to answer to surveyors, lamp-bearers, and clerks with steady hands. Now they answer mostly to hunger and accidents.\"",
      "\"Go and name six chambers with your passing. If the dark means to keep swallowing memory, the least we can do is make it choke on record-keeping.\"",
    ],
    acceptLabel: "Take quest",
    rejectLabel: "Dismiss",
    questId: "explore-6-rooms",
  },
  "ryan-wanderer": {
    pages: [
      "Ryan has the look of a pilgrim who made peace with failure early and has been faithfully honoring that peace ever since.",
      "\"I once thought these tunnels were a proving ground. Then I watched three braver snakes get reduced to history and loose scales before I finished that thought.\"",
      "\"If gunfire starts, do not defend your pride. Pride is plentiful down here. Blood is not. Leave first. Reflect later, if the world is unusually merciful.\"",
    ],
    acceptLabel: "Listen",
    rejectLabel: "Move on",
    rewardScore: 4,
  },
  "aurex-wanderer": {
    pages: [
      "Aurex stands where a blade of pale light has managed, against all sense, to survive this far beneath the earth. It makes his stillness look ceremonial.",
      "\"The upper passages remember order the way a corpse remembers heat. Not usefully. Only enough to be tragic.\"",
      "\"Carry the old fast for me. Twenty seconds beside an empty mouth is not holiness, but it is long enough for the soul to reveal whether it still commands the body at all.\"",
    ],
    repeatPages: [
      "Aurex turns his head by a degree so slight it feels less like attention than judgment finally deciding to acknowledge a nuisance.",
      "\"I asked for discipline, not another little speech from appetite wearing your face. Finish the rite, or spare me the rehearsal of your reasons.\"",
    ],
    acceptLabel: "Take quest",
    rejectLabel: "Scoff",
    questId: "survive-20s-no-eat",
  },
  "belisar-wanderer": {
    pages: [
      "Belisar rises from the western dark so quietly that for a moment it seems the room itself has chosen to stand up and address you.",
      "\"No prayer. No bargain. I have listened to both from the mouths of dying things, and neither improved the ending.\"",
      "\"Fight me. If your nerve is true, let it ring. If it is false, let the stone hear that as well. These halls deserve honest music for once.\"",
    ],
    repeatPages: [
      "Belisar regards you with the reserved contempt of an executioner forced to reschedule on account of weather.",
      "\"Good. I despise unfinished measures. A refused duel rots in the memory like a body left in shallow earth.\"",
    ],
    acceptLabel: "Fight",
    rejectLabel: "Decline",
    rewardScore: 10,
  },
  "cyrene-wanderer": {
    pages: [
      "Cyrene draws a circle in the dust and the dust hesitates, as if uncertain whether it still belongs more to gravity or to whatever old vow animates her hand.",
      "\"Every chamber in this place teaches the same lesson in a different dialect: remain moving, remain doubtful, and never mistake survival for pardon.\"",
      "\"Your gift is speed. Guard it carefully. Velocity becomes stupidity the moment it starts believing itself chosen.\"",
    ],
    repeatPages: [
      "Cyrene recognizes you with a look too measured to count as warmth and too gentle to be called indifference.",
      "\"Still alive. That means you are either learning, or the grave has misplaced your name for another day. I advise you not to grow arrogant about either possibility.\"",
    ],
    acceptLabel: "Listen",
    rejectLabel: "Leave",
    rewardScore: 5,
  },
} as const;