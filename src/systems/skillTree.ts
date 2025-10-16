import { applySkillEffect } from "./skillEffects.js";
import type {
  SkillEffect,
  SkillEffectSetFlag,
  SkillPerkDefinition,
  SkillPerkState,
  SkillPerkStatus,
  SkillTreeRuntime,
  SkillTreeStats,
  SkillEffectContext,
  SkillTreeSystemApi,
} from "./skillTypes.js";

export type {
  SkillPerkDefinition,
  SkillPerkState,
  SkillPerkStatus,
  SkillTreeRuntime,
  SkillTreeStats,
  SkillPerkContext,
} from "./skillTypes.js";

interface RankConfig {
  readonly description: string;
  readonly cost: number;
  readonly effects: readonly SkillEffect[];
}

interface BranchNodeConfig {
  readonly id: string;
  readonly title: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly ranks: readonly RankConfig[];
  readonly requires?: readonly string[];
}

interface BranchConfig {
  readonly id: string;
  readonly label: string;
  readonly nodes: readonly BranchNodeConfig[];
}

const BRANCH_HORIZONTAL_START = 0.08;
const BRANCH_HORIZONTAL_STEP = 0.12;
const BRANCH_VERTICAL_START = 0.16;
const BRANCH_VERTICAL_STEP = 0.11;

const MOMENTUM_BRANCH: BranchConfig = {
  id: "momentum",
  label: "Momentum",
  nodes: [
    {
      id: "swiftScales",
      title: "Swift Scales",
      shortLabel: "SPD",
      description: "Harness a momentum gauge that builds on straightaways.",
      ranks: [
        {
          description: "Unlock the momentum gauge and gain surges at 5 stacks.",
          cost: 12,
          effects: [
            {
              type: "setFlag",
              key: "momentum.config.swiftScales",
              value: {
                enabled: true,
                maxStacks: 5,
                baseGain: 1,
                decayDelay: 4,
                decayLoss: 1,
                turnRetention: 0.25,
                surgeThreshold: 5,
                surgeDuration: 3,
                surgeCooldown: 10,
                surgeConsume: 3,
                surgeInvulnerability: 2,
                phaseTicksOnSurge: 0,
                scorePerStack: 0,
                surgeScore: 0,
                trailTicks: 0,
                trailScorePerTick: 0,
              },
            },
          ],
        },
        {
          description: "Momentum stacks grow faster and linger longer.",
          cost: 28,
          effects: [
            {
              type: "setFlag",
              key: "momentum.config.swiftScales.rank2",
              value: {
                maxStacksBonus: 2,
                gainBonus: 1,
                decayDelayBonus: 2,
                turnRetentionBonus: 0.1,
                scorePerStackBonus: 0.1,
              },
            },
          ],
        },
        {
          description: "Surges trigger sooner and refresh more often.",
          cost: 52,
          effects: [
            {
              type: "setFlag",
              key: "momentum.config.swiftScales.rank3",
              value: {
                maxStacksBonus: 3,
                surgeThresholdBonus: -1,
                surgeDurationBonus: 1,
                surgeCooldownBonus: -2,
                scorePerStackBonus: 0.1,
              },
            },
          ],
        },
      ],
    },
    {
      id: "windShear",
      title: "Wind Shear",
      shortLabel: "WND",
      description: "Turns bleed less speed and surges toughen your hide.",
      ranks: [
        {
          description: "Lose fewer stacks on turns and gain +1 surge armor tick.",
          cost: 45,
          effects: [
            {
              type: "setFlag",
              key: "momentum.config.windShear",
              value: {
                turnRetentionBonus: 0.25,
                decayDelayBonus: 3,
                decayLossBonus: -0.5,
                surgeInvulnerabilityBonus: 1,
                scorePerStackBonus: 0.1,
              },
            },
          ],
        },
      ],
    },
    {
      id: "hyperReflex",
      title: "Hyper Reflex",
      shortLabel: "REF",
      description: "Reflex buffers hold speed through sharp pivots.",
      ranks: [
        {
          description: "Gain momentum faster and keep a buffer through one quick pivot.",
          cost: 58,
          effects: [
            {
              type: "setFlag",
              key: "momentum.config.hyperReflex",
              value: {
                gainBonus: 1,
                turnForgiveness: 2,
                phaseTicksOnSurgeBonus: 1,
              },
            },
          ],
        },
      ],
    },
    {
      id: "phaseStride",
      title: "Phase Stride",
      shortLabel: "PHSE",
      description: "Surges briefly let you drift through hazards.",
      ranks: [
        {
          description: "Surges grant +3 phasing ticks.",
          cost: 68,
          effects: [
            {
              type: "setFlag",
              key: "momentum.config.phaseStride",
              value: {
                phaseTicksOnSurgeBonus: 3,
                surgeInvulnerabilityBonus: 1,
              },
            },
          ],
        },
      ],
    },
    {
      id: "overclock",
      title: "Overclock",
      shortLabel: "CLK",
      description: "Ride longer surges at fiercer pace.",
      ranks: [
        {
          description: "+2 surge ticks, -3 surge cooldown, consume 1 fewer stack.",
          cost: 78,
          effects: [
            {
              type: "setFlag",
              key: "momentum.config.overclock",
              value: {
                surgeDurationBonus: 2,
                surgeCooldownBonus: -3,
                surgeConsumeBonus: -1,
                scorePerStackBonus: 0.15,
              },
            },
          ],
        },
      ],
    },
    {
      id: "rashMomentum",
      title: "Rash Momentum",
      shortLabel: "RASH",
      description: "Cashing surges rains extra score.",
      ranks: [
        {
          description: "Surges grant +4 score and stacks pay +0.2 each.",
          cost: 90,
          effects: [
            {
              type: "setFlag",
              key: "momentum.config.rashMomentum",
              value: {
                surgeScoreBonus: 4,
                scorePerStackBonus: 0.2,
              },
            },
          ],
        },
      ],
    },
    {
      id: "quantumTrail",
      title: "Quantum Trail",
      shortLabel: "QTR",
      description: "Drifting leaves energy trails that pulse score.",
      ranks: [
        {
          description: "Turns spawn 4-tick trails that drip +1 score per tick.",
          cost: 104,
          effects: [
            {
              type: "setFlag",
              key: "momentum.config.quantumTrail",
              value: {
                trailTicks: 4,
                trailScorePerTick: 1,
                scorePerStackBonus: 0.1,
              },
            },
          ],
        },
      ],
    },
    {
      id: "chronoSurge",
      title: "Chrono Surge",
      shortLabel: "CHR",
      description: "Tighten the surge cycle even further.",
      ranks: [
        {
          description: "Surges trigger sooner, last +1 tick, and grant +1 armor tick.",
          cost: 122,
          effects: [
            {
              type: "setFlag",
              key: "momentum.config.chronoSurge",
              value: {
                surgeThresholdBonus: -1,
                surgeDurationBonus: 1,
                surgeInvulnerabilityBonus: 1,
                phaseTicksOnSurgeBonus: 1,
              },
            },
          ],
        },
      ],
    },
  ],
};


const FORTITUDE_BRANCH: BranchConfig = {
  id: "fortitude",
  label: "Fortitude",
  nodes: [
    {
      id: "secondWind",
      title: "Second Wind",
      shortLabel: "LIFE",
      description: "Bank resurrection charges for desperate moments.",
      ranks: [
        {
          description: "Gain +1 extra life",
          cost: 25,
          effects: [{ type: "extraLifeCharge", count: 1 }],
        },
        {
          description: "Gain a second extra life",
          cost: 60,
          effects: [{ type: "extraLifeCharge", count: 1 }],
        },
      ],
    },
    {
      id: "regenerator",
      title: "Regenerator",
      shortLabel: "REG",
      description: "Regenerate new scales over time while you slither.",
      ranks: [
        {
          description: "Grow +1 segment every 48 ticks.",
          cost: 38,
          effects: [
            {
              type: "setFlag",
              key: "fortitude.regenerator",
              value: { interval: 48, amount: 1 },
            },
          ],
        },
      ],
    },
    {
      id: "hardenedScales",
      title: "Hardened Scales",
      shortLabel: "HARD",
      description: "Deflect one self-collision with tempered scales.",
      ranks: [
        {
          description: "Gain 1 self-collision charge.",
          cost: 52,
          effects: [
            {
              type: "setFlag",
              key: "fortitude.hardened",
              value: { charges: 1 },
            },
          ],
        },
      ],
    },
    {
      id: "bloodBank",
      title: "Blood Bank",
      shortLabel: "BANK",
      description: "Store apple vitality and redeem it in bursts.",
      ranks: [
        {
          description: "Bank apple energy. Redeem 4 stacks for +5 score.",
          cost: 68,
          effects: [
            {
              type: "setFlag",
              key: "fortitude.bloodBank",
              value: { stored: 0, capacity: 4, reward: { score: 5, growth: 0 } },
            },
          ],
        },
      ],
    },
    {
      id: "shieldMatron",
      title: "Shield Matron",
      shortLabel: "SHLD",
      description: "Evade danger for a few beats after every feast.",
      ranks: [
        {
          description: "Gain 4 ticks of invulnerability after eating.",
          cost: 82,
          effects: [
            {
              type: "setFlag",
              key: "fortitude.invulnerability",
              value: { duration: 4 },
            },
          ],
        },
      ],
    },
    {
      id: "wardedStride",
      title: "Warded Stride",
      shortLabel: "WARD",
      description: "Extend the stride of your protective wards.",
      ranks: [
        {
          description: "+3 invulnerability ticks after each apple.",
          cost: 96,
          effects: [
            {
              type: "setFlag",
              key: "fortitude.invulnerabilityBonus",
              value: 3,
              resetValue: 0,
            },
          ],
        },
      ],
    },
    {
      id: "starlitBeacon",
      title: "Starlit Beacon",
      shortLabel: "BEAC",
      description: "Radiant wards accelerate your regeneration.",
      ranks: [
        {
          description: "Regenerate +2 segments every 24 ticks.",
          cost: 112,
          effects: [
            {
              type: "setFlag",
              key: "fortitude.regenerator",
              value: { interval: 24, amount: 2 },
            },
          ],
        },
      ],
    },
    {
      id: "phoenixFrame",
      title: "Phoenix Frame",
      shortLabel: "PHNX",
      description: "Rise from certain defeat in a blaze of light.",
      ranks: [
        {
          description: "Store 1 phoenix rebirth charge.",
          cost: 132,
          effects: [
            {
              type: "setFlag",
              key: "fortitude.phoenix",
              value: { charges: 1 },
            },
          ],
        },
      ],
    },
  ],
};

const ARCANA_BRANCH: BranchConfig = {
  id: "arcana",
  label: "Arcana",
  nodes: [
    {
      id: "manaBloom",
      title: "Mana Bloom",
      shortLabel: "MANA",
      description: "Awaken latent arcana and unlock a mana pool.",
      ranks: [
        {
          description: "Unlock mana pool (60 max, +1.2 regen)",
          cost: 22,
          effects: [{ type: "manaEnable", max: 60, regen: 1.2 }],
        },
      ],
    },
    {
      id: "manaWeave",
      title: "Mana Weave",
      shortLabel: "WEAV",
      description: "Thread mana conduits through every scale.",
      ranks: [
        {
          description: "+30 max mana, +0.6 regen",
          cost: 32,
          effects: [{ type: "manaUpgrade", maxBonus: 30, regenBonus: 0.6 }],
        },
      ],
    },
    {
      id: "sparkReservoir",
      title: "Spark Reservoir",
      shortLabel: "SPRK",
      description: "Bottle volatile arcana for burst casting.",
      ranks: [
        {
          description: "+40 max mana, +0.8 regen",
          cost: 44,
          effects: [{ type: "manaUpgrade", maxBonus: 40, regenBonus: 0.8 }],
        },
      ],
    },
    {
      id: "fluxCondenser",
      title: "Flux Condenser",
      shortLabel: "FLUX",
      description: "Stabilise mana surges for safer channeling.",
      ranks: [
        {
          description: "+50 max mana, +1.0 regen",
          cost: 58,
          effects: [{ type: "manaUpgrade", maxBonus: 50, regenBonus: 1.0 }],
        },
      ],
    },
    {
      id: "arcanePulse",
      title: "Arcane Pulse",
      shortLabel: "PULS",
      description: "Channel mana into a serpentine pulse that feeds you.",
      ranks: [
        {
          description: "Unlock Arcane Pulse (press Q, costs 20 mana)",
          cost: 66,
          effects: [{ type: "unlockArcanePulse" }],
        },
      ],
    },
    {
      id: "spellforge",
      title: "Spellforge",
      shortLabel: "FORG",
      description: "Reforge spell slots into a broader mana conduit.",
      ranks: [
        {
          description: "+30 max mana, +0.6 regen.",
          cost: 76,
          effects: [{ type: "manaUpgrade", maxBonus: 30, regenBonus: 0.6 }],
        },
      ],
    },
    {
      id: "astralNova",
      title: "Astral Nova",
      shortLabel: "NOVA",
      description: "Prime an astral nova that amplifies every cast.",
      ranks: [
        {
          description: "+6% score from apples (multiplicative bonus).",
          cost: 90,
          effects: [{ type: "scoreMultiplierBonus", bonus: 1.06 }],
        },
      ],
    },
    {
      id: "starlightVeil",
      title: "Starlight Veil",
      shortLabel: "VEIL",
      description: "Spend mana to negate death with a radiant shield.",
      requires: ["astralNova", "secondWind"],
      ranks: [
        {
          description: "Unlock veil (auto-spend 30 mana to negate death)",
          cost: 108,
          effects: [
            { type: "manaUpgrade", maxBonus: 15, regenBonus: 0.4 },
            { type: "unlockArcaneVeil" },
          ],
        },
      ],
    },
  ],
};

const HARVEST_BRANCH: BranchConfig = {
  id: "harvest",
  label: "Harvest",
  nodes: [
    {
      id: "tailForge",
      title: "Tail Forge",
      shortLabel: "TAIL",
      description: "Anneal extra tail length for sweeping control.",
      ranks: [
        { description: "+2 segments instantly", cost: 10, effects: [{ type: "instantGrow", segments: 2 }] },
        { description: "+3 more segments", cost: 24, effects: [{ type: "instantGrow", segments: 3 }] },
        { description: "+4 more segments", cost: 50, effects: [{ type: "instantGrow", segments: 4 }] },
      ],
    },
    {
      id: "verdantGrowth",
      title: "Verdant Growth",
      shortLabel: "GROW",
      description: "Spur luxuriant growth after every meal.",
      ranks: [
        {
          description: "Gain +3 segments on purchase",
          cost: 34,
          effects: [{ type: "instantGrow", segments: 3 }],
        },
      ],
    },
    {
      id: "gourmand",
      title: "Gourmand",
      shortLabel: "GOUR",
      description: "Indulgent feasts immediately thicken your coils.",
      ranks: [
        {
          description: "Gain +2 segments instantly.",
          cost: 46,
          effects: [{ type: "instantGrow", segments: 2 }],
        },
      ],
    },
    {
      id: "nectarSurge",
      title: "Nectar Surge",
      shortLabel: "NECT",
      description: "Sweeten nectar so each apple pays out more.",
      ranks: [
        {
          description: "+5% score from apples (multiplicative bonus).",
          cost: 58,
          effects: [{ type: "scoreMultiplierBonus", bonus: 1.05 }],
        },
      ],
    },
    {
      id: "honeycomb",
      title: "Honeycomb",
      shortLabel: "HONE",
      description: "Honeycomb plating adds immediate bulk to your tail.",
      ranks: [
        {
          description: "Gain +3 segments instantly.",
          cost: 72,
          effects: [{ type: "instantGrow", segments: 3 }],
        },
      ],
    },
    {
      id: "orchardMastery",
      title: "Orchard Mastery",
      shortLabel: "ORCH",
      description: "Curate orchards that enrich every harvest.",
      ranks: [
        {
          description: "+5% score from apples (multiplicative bonus).",
          cost: 90,
          effects: [{ type: "scoreMultiplierBonus", bonus: 1.05 }],
        },
      ],
    },
    {
      id: "seasonalBloom",
      title: "Seasonal Bloom",
      shortLabel: "SEAS",
      description: "Bloom ahead of the season for extra growth.",
      ranks: [
        {
          description: "Gain +3 segments instantly.",
          cost: 108,
          effects: [{ type: "instantGrow", segments: 3 }],
        },
      ],
    },
    {
      id: "rootedColossus",
      title: "Rooted Colossus",
      shortLabel: "ROOT",
      description: "Root yourself as a towering colossus of scales.",
      ranks: [
        {
          description: "Gain +5 segments instantly.",
          cost: 132,
          effects: [{ type: "instantGrow", segments: 5 }],
        },
      ],
    },
  ],
};
const PREDATION_BRANCH: BranchConfig = {
  id: "predation",
  label: "Predation",
  nodes: [
    {
      id: "scoreFlow",
      title: "Score Flow",
      shortLabel: "SCOR",
      description: "Kick off the hunt – chain feasts to build Hunt Momentum.",
      ranks: [
        {
          description: "Unlock Hunt Momentum (combo window 28 ticks, +15% score per stack, max 4 stacks).",
          cost: 18,
          effects: [
            {
              type: "setFlag",
              key: "predation.config.scoreFlow",
              value: {
                enabled: true,
                window: 28,
                decayHold: 6,
                decayStep: 1,
                maxStacks: 4,
                stackGain: 1,
                scorePerStack: 0.15,
              },
            },
          ],
        },
        {
          description: "+1 max stack and Hunt Momentum now grants +5% extra score per stack.",
          cost: 40,
          effects: [
            {
              type: "setFlag",
              key: "predation.config.scoreFlow.rank2",
              value: {
                maxStacksBonus: 1,
                scorePerStackBonus: 0.05,
              },
            },
          ],
        },
      ],
    },
    {
      id: "doubleBite",
      title: "Double Bite",
      shortLabel: "DBTE",
      description: "Quick kills bank Rend charges for bonus growth.",
      ranks: [
        {
          description: "Rapid apples (<8 ticks) grant +1 stack and charge Rend.",
          cost: 55,
          effects: [
            {
              type: "setFlag",
              key: "predation.config.doubleBite",
              value: {
                quickEatWindow: 8,
                bonusStacksOnQuickEat: 1,
                maxStacksBonus: 1,
                scorePerStackBonus: 0.05,
                rend: {
                  enabled: true,
                  gainThreshold: 2,
                  maxCharges: 1,
                  growthPerCharge: 1,
                },
              },
            },
          ],
        },
      ],
    },
    {
      id: "huntress",
      title: "Huntress",
      shortLabel: "HNTR",
      description: "Stretch the hunt window and mark fresh prey with scent.",
      ranks: [
        {
          description: "+6 combo window ticks, +6 decay grace, +5% score per stack, scent lasts 10 ticks.",
          cost: 66,
          effects: [
            {
              type: "setFlag",
              key: "predation.config.huntress",
              value: {
                windowBonus: 6,
                decayHoldBonus: 6,
                scorePerStackBonus: 0.05,
                scentDuration: 10,
              },
            },
          ],
        },
      ],
    },
    {
      id: "ambushSense",
      title: "Ambush Sense",
      shortLabel: "AMB",
      description: "Stacks fuel Feral Frenzy for explosive payouts.",
      ranks: [
        {
          description: "Frenzy triggers at 5 stacks for 6 ticks (+4 score each tick).",
          cost: 78,
          effects: [
            {
              type: "setFlag",
              key: "predation.config.ambushSense",
              value: {
                quickEatWindowBonus: 4,
                frenzy: {
                  threshold: 5,
                  duration: 6,
                  scoreBonus: 4,
                },
              },
            },
          ],
        },
      ],
    },
    {
      id: "devourer",
      title: "Devourer",
      shortLabel: "DEVR",
      description: "Rend spikes now rip extra score from prey.",
      ranks: [
        {
          description: "Rend holds +1 charge and yields +2 score when spent.",
          cost: 92,
          effects: [
            {
              type: "setFlag",
              key: "predation.config.devourer",
              value: {
                rend: {
                  maxChargesBonus: 1,
                  scorePerCharge: 2,
                },
                frenzy: {
                  scoreBonus: 3,
                },
              },
            },
          ],
        },
      ],
    },
    {
      id: "bloodMoon",
      title: "Blood Moon",
      shortLabel: "BLOOD",
      description: "Hunt under crimson light; momentum carries longer.",
      ranks: [
        {
          description: "+2 max stacks, +4 window ticks, +6 decay grace, Frenzy lasts +4 ticks and triggers at one fewer stack.",
          cost: 108,
          effects: [
            {
              type: "setFlag",
              key: "predation.config.bloodMoon",
              value: {
                maxStacksBonus: 2,
                windowBonus: 4,
                decayHoldBonus: 6,
                scorePerStackBonus: 0.05,
                frenzy: {
                  durationBonus: 4,
                  thresholdBonus: -1,
                },
              },
            },
          ],
        },
      ],
    },
    {
      id: "packInstinct",
      title: "Pack Instinct",
      shortLabel: "PACK",
      description: "Spectral packmates keep the hunt rolling between rooms.",
      ranks: [
        {
          description: "Gain +1 stack when entering a room and decay drops more slowly; Frenzy lasts +4 ticks.",
          cost: 126,
          effects: [
            {
              type: "setFlag",
              key: "predation.config.packInstinct",
              value: {
                stackGainOnRoomEnter: 1,
                decayStepBonus: -1,
                frenzy: {
                  durationBonus: 4,
                },
              },
            },
          ],
        },
      ],
    },
    {
      id: "apexPounce",
      title: "Apex Pounce",
      shortLabel: "APEX",
      description: "Cash in Frenzy for an apex finisher when the hunt peaks.",
      ranks: [
        {
          description: "Finisher unlock: spend 6 stacks during Frenzy for +10 score, +2 growth (18 tick cooldown).",
          cost: 148,
          effects: [
            {
              type: "setFlag",
              key: "predation.config.apexPounce",
              value: {
                apex: {
                  requiredStacks: 6,
                  score: 10,
                  growth: 2,
                  cooldown: 18,
                },
                frenzy: {
                  durationBonus: 6,
                  scoreBonus: 5,
                },
              },
            },
          ],
        },
      ],
    },
  ],
};const TRAVERSAL_BRANCH: BranchConfig = {
  id: "traversal",
  label: "Traversal",
  nodes: [
    {
      id: "riftWalker",
      title: "Rift Walker",
      shortLabel: "RIFT",
      description: "Open corridors each time you breach a new room.",
      ranks: [
        {
          description: "Clears a 3-tile lane and grants +1 score on room entry.",
          cost: 32,
          effects: [
            {
              type: "setFlag",
              key: "traversal.config.riftWalker",
              value: {
                enabled: true,
                corridorWidth: 3,
                phaseTicksOnEnter: 0,
                growthOnEnter: 0,
                scoreOnEnter: 1,
                ghostShieldCharges: 0,
                extendForwardRooms: 0,
                echoTicks: 0,
                echoScore: 0,
                pullAppleIntoCorridor: false,
              },
            },
          ],
        },
      ],
    },
    {
      id: "portalSense",
      title: "Portal Sense",
      shortLabel: "SENSE",
      description: "Widen lanes and tug apples toward them.",
      ranks: [
        {
          description: "+1 lane width, +1 score on entry, apples prefer the lane.",
          cost: 44,
          effects: [
            {
              type: "setFlag",
              key: "traversal.config.portalSense",
              value: {
                corridorWidthBonus: 1,
                scoreOnEnterBonus: 1,
                pullAppleIntoCorridor: true,
              },
            },
          ],
        },
      ],
    },
    {
      id: "phaseSlip",
      title: "Phase Slip",
      shortLabel: "SLIP",
      description: "Room transitions briefly let you phase through hazards.",
      ranks: [
        {
          description: "Gain +4 phase ticks on room entry.",
          cost: 58,
          effects: [
            {
              type: "setFlag",
              key: "traversal.config.phaseSlip",
              value: {
                phaseTicksOnEnterBonus: 4,
              },
            },
          ],
        },
      ],
    },
    {
      id: "echoStep",
      title: "Echo Step",
      shortLabel: "ECHO",
      description: "Echoes trail behind, dripping score after a jump.",
      ranks: [
        {
          description: "+2 phase ticks and 4-tick echoes worth +1 score each.",
          cost: 72,
          effects: [
            {
              type: "setFlag",
              key: "traversal.config.echoStep",
              value: {
                phaseTicksOnEnterBonus: 2,
                echoTicks: 4,
                echoScore: 1,
              },
            },
          ],
        },
      ],
    },
    {
      id: "mirrorImage",
      title: "Mirror Image",
      shortLabel: "MIRR",
      description: "Room entries leave mirrored coils behind.",
      ranks: [
        {
          description: "Grow +1 segment whenever you enter a new room.",
          cost: 88,
          effects: [
            {
              type: "setFlag",
              key: "traversal.config.mirrorImage",
              value: {
                growthOnEnterBonus: 1,
              },
            },
          ],
        },
      ],
    },
    {
      id: "ghostSkin",
      title: "Ghost Skin",
      shortLabel: "GHO",
      description: "Carry a spectral shield that soaks one wall crash per room.",
      ranks: [
        {
          description: "+1 ghost shield charge on entry.",
          cost: 104,
          effects: [
            {
              type: "setFlag",
              key: "traversal.config.ghostSkin",
              value: {
                ghostShieldChargesBonus: 1,
              },
            },
          ],
        },
      ],
    },
    {
      id: "planarLattice",
      title: "Planar Lattice",
      shortLabel: "GRID",
      description: "Projected lanes stretch into the next room.",
      ranks: [
        {
          description: "+1 lane width and extend lanes one room ahead.",
          cost: 126,
          effects: [
            {
              type: "setFlag",
              key: "traversal.config.planarLattice",
              value: {
                corridorWidthBonus: 1,
                extendForwardRoomsBonus: 1,
              },
            },
          ],
        },
      ],
    },
    {
      id: "eventHorizon",
      title: "Event Horizon",
      shortLabel: "VOID",
      description: "Crossing rooms pulls the arena inward.",
      ranks: [
        {
          description: "+2 lane width, +2 score on entry, apples collapse into the lane.",
          cost: 150,
          effects: [
            {
              type: "setFlag",
              key: "traversal.config.eventHorizon",
              value: {
                corridorWidthBonus: 2,
                scoreOnEnterBonus: 2,
                pullAppleIntoCorridor: true,
              },
            },
          ],
        },
      ],
    },
  ],
};

const GEOMETRY_BRANCH: BranchConfig = {
  id: "geometry",
  label: "Geometry",
  nodes: [
    {
      id: "wallWhisper",
      title: "Wall Whisper",
      shortLabel: "WALL",
      description: "Tune your senses to the stone around you.",
      ranks: [
        {
          description: "Highlight walls within 2 tiles of your head.",
          cost: 32,
          effects: [
            { type: "setFlag", key: "geometry.wallSenseRadius", value: 2, resetValue: 0 },
          ],
        },
      ],
    },
    {
      id: "masonry",
      title: "Masonry",
      shortLabel: "MSON",
      description: "Reinforce the passages you leave behind.",
      ranks: [
        {
          description: "Drop a masonry wall on tiles your tail vacates.",
          cost: 48,
          effects: [
            { type: "setFlag", key: "geometry.masonryEnabled", value: true, resetValue: false },
          ],
        },
      ],
    },
    {
      id: "acidicFangs",
      title: "Acidic Fangs",
      shortLabel: "FANG",
      description: "Melt tunnels straight through bedrock.",
      ranks: [
        {
          description: "Bite through walls without dying.",
          cost: 64,
          effects: [
            { type: "setFlag", key: "geometry.canEatWalls", value: true, resetValue: false },
          ],
        },
      ],
    },
    {
      id: "seismicPulse",
      title: "Seismic Pulse",
      shortLabel: "SEIS",
      description: "Apples detonate tremors that crumble barriers.",
      ranks: [
        {
          description: "Each apple clears nearby walls in a radius of 2.",
          cost: 82,
          effects: [
            { type: "setFlag", key: "geometry.seismicPulseRadius", value: 2, resetValue: 0 },
          ],
        },
      ],
    },
    {
      id: "faultLine",
      title: "Fault Line",
      shortLabel: "FLT",
      description: "Crack the arena along the row you slither through.",
      ranks: [
        {
          description: "Constantly carve a clear horizontal corridor at your row.",
          cost: 100,
          effects: [
            { type: "setFlag", key: "geometry.faultLineEnabled", value: true, resetValue: false },
          ],
        },
      ],
    },
    {
      id: "collapseControl",
      title: "Collapse Control",
      shortLabel: "CLPS",
      description: "Command walls to crash inward after a meal.",
      ranks: [
        {
          description: "After eating an apple, walls rise around your head.",
          cost: 120,
          effects: [
            { type: "setFlag", key: "geometry.collapseControlEnabled", value: true, resetValue: false },
          ],
        },
      ],
    },
    {
      id: "terraShield",
      title: "Terra Shield",
      shortLabel: "SHLD",
      description: "Raise earthen bulwarks that absorb a crash.",
      ranks: [
        {
          description: "Gain 2 shield charges that auto-chew a wall and recharge after meals.",
          cost: 140,
          effects: [
            {
              type: "setFlag",
              key: "geometry.terraShield",
              value: { charges: 2, max: 2, recharge: 1 },
              resetValue: undefined,
            },
          ],
        },
      ],
    },
    {
      id: "worldEater",
      title: "World Eater",
      shortLabel: "EATR",
      description: "Consume the world itself for power.",
      ranks: [
        {
          description: "Walls grant +3 score and +1 growth when devoured.",
          cost: 164,
          effects: [
            {
              type: "setFlag",
              key: "geometry.worldEaterReward",
              value: { score: 3, growth: 1 },
              resetValue: undefined,
            },
          ],
        },
      ],
    },
  ],
};

const ENTROPY_BRANCH: BranchConfig = {
  id: "entropy",
  label: "Entropy",
  nodes: [
    {
      id: "timeDilation",
      title: "Time Dilation",
      shortLabel: "TIME",
      description: "Slow time just enough to tighten your rhythm.",
      ranks: [
        {
          description: "Reduce tick delay by 5%.",
          cost: 32,
          effects: [{ type: "tickDelayScalar", factor: 0.95, sourceId: "entropy.timeDilation" }],
        },
      ],
    },
    {
      id: "slowField",
      title: "Slow Field",
      shortLabel: "SLOW",
      description: "Project slow fields that quicken your perception.",
      ranks: [
        {
          description: "Reduce tick delay by 8%.",
          cost: 46,
          effects: [{ type: "tickDelayScalar", factor: 0.92, sourceId: "entropy.slowField" }],
        },
      ],
    },
    {
      id: "reverberate",
      title: "Reverberate",
      shortLabel: "REV",
      description: "Reverberating timelines boost apple yield.",
      ranks: [
        {
          description: "+4% score from apples (multiplicative bonus).",
          cost: 60,
          effects: [{ type: "scoreMultiplierBonus", bonus: 1.04 }],
        },
      ],
    },
    {
      id: "rewind",
      title: "Rewind",
      shortLabel: "REWD",
      description: "Cache a rewind charge for another attempt.",
      ranks: [
        {
          description: "Gain +1 extra life.",
          cost: 76,
          effects: [{ type: "extraLifeCharge", count: 1 }],
        },
      ],
    },
    {
      id: "singularity",
      title: "Singularity",
      shortLabel: "SING",
      description: "Compress apples into denser score packets.",
      ranks: [
        {
          description: "+5% score from apples (multiplicative bonus).",
          cost: 94,
          effects: [{ type: "scoreMultiplierBonus", bonus: 1.05 }],
        },
      ],
    },
    {
      id: "entropyBank",
      title: "Entropy Bank",
      shortLabel: "BANK",
      description: "Bank entropy as usable mana reserves.",
      ranks: [
        {
          description: "+20 max mana, +0.5 regen.",
          cost: 114,
          effects: [{ type: "manaUpgrade", maxBonus: 20, regenBonus: 0.5 }],
        },
      ],
    },
    {
      id: "causalLoop",
      title: "Causal Loop",
      shortLabel: "LOOP",
      description: "Close causal loops for steadier score gain.",
      ranks: [
        {
          description: "+4% score from apples (multiplicative bonus).",
          cost: 136,
          effects: [{ type: "scoreMultiplierBonus", bonus: 1.04 }],
        },
      ],
    },
    {
      id: "fatedStrike",
      title: "Fated Strike",
      shortLabel: "FATE",
      description: "Line up a fated strike worth even more points.",
      ranks: [
        {
          description: "+6% score from apples (multiplicative bonus).",
          cost: 160,
          effects: [{ type: "scoreMultiplierBonus", bonus: 1.06 }],
        },
      ],
    },
  ],
};

const BRANCHES: readonly BranchConfig[] = [
  MOMENTUM_BRANCH,
  FORTITUDE_BRANCH,
  ARCANA_BRANCH,
  HARVEST_BRANCH,
  PREDATION_BRANCH,
  TRAVERSAL_BRANCH,
  GEOMETRY_BRANCH,
  ENTROPY_BRANCH,
];

function buildPerkDefinitions(): SkillPerkDefinition[] {
  const definitions: SkillPerkDefinition[] = [];

  for (let branchIndex = 0; branchIndex < BRANCHES.length; branchIndex += 1) {
    const branch = BRANCHES[branchIndex];
    const x = BRANCH_HORIZONTAL_START + branchIndex * BRANCH_HORIZONTAL_STEP;

    for (let nodeIndex = 0; nodeIndex < branch.nodes.length; nodeIndex += 1) {
      const node = branch.nodes[nodeIndex];
      const requires = node.requires ?? (nodeIndex > 0 ? [branch.nodes[nodeIndex - 1].id] : undefined);
      const rankDescriptions = node.ranks.map((rank) => rank.description);
      const costByRank = node.ranks.map((rank) => rank.cost);
      const effectsByRank = node.ranks.map((rank) => rank.effects);

      if (rankDescriptions.length !== costByRank.length || costByRank.length !== effectsByRank.length) {
        throw new Error(`Rank data mismatch for perk '${node.id}'.`);
      }

      const positionY = BRANCH_VERTICAL_START + nodeIndex * BRANCH_VERTICAL_STEP;

      definitions.push({
        id: node.id,
        title: node.title,
        shortLabel: node.shortLabel,
        description: node.description,
        branch: branch.label,
        rankDescriptions,
        costByRank,
        position: { x, y: positionY },
        requires,
        effectsByRank,
      });
    }
  }

  return definitions;
}

const PERK_DEFINITIONS: readonly SkillPerkDefinition[] = buildPerkDefinitions();

const MOMENTUM_PERKS = [
  "swiftScales",
  "windShear",
  "hyperReflex",
  "phaseStride",
  "overclock",
  "rashMomentum",
  "quantumTrail",
  "chronoSurge",
] as const;

const HARVEST_PERKS = [
  "tailForge",
  "verdantGrowth",
  "gourmand",
  "nectarSurge",
  "honeycomb",
  "orchardMastery",
  "seasonalBloom",
  "rootedColossus",
] as const;
export class SkillTreeSystem implements SkillTreeSystemApi {
  private readonly perkLookup = new Map<string, SkillPerkDefinition>();
  private readonly perkRanks = new Map<string, number>();
  private readonly tickDelaySources = new Map<string, number>();
  private readonly flagEffects = new Map<string, SkillEffectSetFlag>();

  private extraLifeCharges = 0;
  private scoreMultiplier = 1;
  private scoreMultiplierBase = 1;
  private scoreMultiplierBonus = 1;

  private manaEnabled = false;
  private manaMax = 0;
  private manaCurrent = 0;
  private manaRegen = 0;
  private arcanePulseUnlocked = false;
  private arcaneVeilUnlocked = false;

  private readonly arcanePulseCost = 20;
  private readonly arcaneVeilCost = 30;

  constructor(
    private readonly runtime: SkillTreeRuntime,
    private readonly baseTickDelay: number,
  ) {
    for (const definition of PERK_DEFINITIONS) {
      this.perkLookup.set(definition.id, definition);
    }
  }

  getBaseTickDelay(): number {
    return this.baseTickDelay;
  }

  getPerks(): SkillPerkDefinition[] {
    return [...PERK_DEFINITIONS];
  }

  getDefinition(perkId: string): SkillPerkDefinition | undefined {
    return this.perkLookup.get(perkId);
  }

  getArcanePulseCost(): number {
    return this.arcanePulseCost;
  }

  getArcaneVeilCost(): number {
    return this.arcaneVeilCost;
  }

  getRank(perkId: string): number {
    return this.perkRanks.get(perkId) ?? 0;
  }

  hasPerk(perkId: string): boolean {
    return this.getRank(perkId) > 0;
  }

  getPurchaseState(perkId: string): SkillPerkState {
    const definition = this.perkLookup.get(perkId);
    if (!definition) {
      throw new Error(`Unknown perk: ${perkId}`);
    }

    const rank = this.getRank(perkId);
    const maxRank = definition.costByRank.length;

    if (rank >= maxRank) {
      return { definition, rank, status: "maxed" };

    }

    const missing = (definition.requires ?? []).filter((reqId) => this.getRank(reqId) <= 0);
    if (missing.length > 0) {
      return { definition, rank, status: "locked", missing };
    }

    const cost = definition.costByRank[rank];
    if (this.runtime.getScore() < cost) {
      return { definition, rank, status: "unaffordable", cost };
    }

    return { definition, rank, status: "available", cost };
  }

  canPurchase(perkId: string): boolean {
    try {
      return this.getPurchaseState(perkId).status === "available";
    } catch {
      return false;
    }
  }

  purchase(perkId: string): { rank: number; cost: number } | null {
    const state = this.getPurchaseState(perkId);
    if (state.status !== "available" || state.cost === undefined) {
      return null;
    }

    this.runtime.addScore(-state.cost);

    const newRank = state.rank + 1;
    this.perkRanks.set(perkId, newRank);

    const definition = state.definition;
    const rankEffects = definition.effectsByRank[newRank - 1] ?? [];
    const effectContext: SkillEffectContext = { runtime: this.runtime, system: this };

    for (const effect of rankEffects) {
      applySkillEffect(effect, effectContext);
    }

    return { rank: newRank, cost: state.cost };
  }

  addExtraLives(count: number): void {
    this.extraLifeCharges += count;
  }

  consumeExtraLife(): boolean {
    if (this.extraLifeCharges > 0) {
      this.extraLifeCharges -= 1;
      this.runtime.notifyExtraLifeConsumed();
      return true;
    }

    if (this.arcaneVeilUnlocked && this.trySpendMana(this.arcaneVeilCost)) {
      this.runtime.onArcaneVeilTriggered();
      return true;
    }

    return false;
  }

  applyFlagEffect(effect: SkillEffectSetFlag): void {
    const stored = this.cloneFlagEffect(effect);
    this.flagEffects.set(effect.key, stored);
    this.runtime.setFlag(effect.key, this.cloneEffectValue(effect.value));
  }

  setScoreMultiplier(multiplier: number): void {
    if (!Number.isFinite(multiplier)) {
      return;
    }
    this.scoreMultiplierBase = Math.max(1, multiplier);
    this.updateScoreMultiplier();
  }

  addScoreMultiplierBonus(bonus: number): void {
    if (!Number.isFinite(bonus) || bonus <= 0) {
      return;
    }
    this.scoreMultiplierBonus *= Math.max(1, bonus);
    this.updateScoreMultiplier();
  }

  private updateScoreMultiplier(): void {
    this.scoreMultiplier = Math.max(1, this.scoreMultiplierBase * this.scoreMultiplierBonus);
    this.runtime.notifyScoreMultiplierChanged(this.scoreMultiplier);
  }

  private cloneFlagEffect(effect: SkillEffectSetFlag): SkillEffectSetFlag {
    return {
      ...effect,
      value: this.cloneEffectValue(effect.value),
      resetValue: this.cloneEffectValue(effect.resetValue),
    };
  }

  private cloneEffectValue<T>(value: T): T {
    if (value === undefined || value === null) {
      return value;
    }
    if (typeof value === "object") {
      try {
        return JSON.parse(JSON.stringify(value)) as T;
      } catch {
        return value;
      }
    }
    return value;
  }

  modifyScoreGain(amount: number): number {
    if (amount <= 0) {
      return amount;
    }
    return Math.max(1, Math.ceil(amount * this.scoreMultiplier));
  }

  enableMana({ max, regen }: { max: number; regen: number }): void {
    const wasEnabled = this.manaEnabled;
    this.manaEnabled = true;
    this.manaMax = Math.max(this.manaMax, max);
    this.manaRegen = Math.max(this.manaRegen, regen);
    this.manaCurrent = this.manaMax;
    this.runtime.notifyManaChanged(this.manaCurrent, this.manaMax, this.manaRegen);
    if (!wasEnabled) {
      this.runtime.notifyManaUnlocked();
    }
  }

  upgradeMana({ maxBonus, regenBonus }: { maxBonus: number; regenBonus: number }): void {
    if (!this.manaEnabled) {
      return;
    }
    this.manaMax += maxBonus;
    this.manaRegen += regenBonus;
    this.manaCurrent = Math.min(this.manaMax, this.manaCurrent + maxBonus);
    this.runtime.notifyManaChanged(this.manaCurrent, this.manaMax, this.manaRegen);
  }

  unlockArcanePulse(): void {
    this.arcanePulseUnlocked = true;
    if (!this.manaEnabled) {
      this.enableMana({ max: 50, regen: 1 });
    }
    this.runtime.notifyArcanePulseUnlocked();
  }

  unlockArcaneVeil(): void {
    this.arcaneVeilUnlocked = true;
    this.runtime.notifyArcaneVeilUnlocked();
  }

  applyTickDelayScalar(factor: number, sourceId = `scalar:${this.tickDelaySources.size}`): void {
    if (!Number.isFinite(factor) || factor <= 0) {
      return;
    }
    const clamped = Math.max(0.2, Math.min(factor, 3));
    this.tickDelaySources.set(sourceId, clamped);
    this.recalculateTickDelay();
  }

  tryCastArcanePulse(): boolean {
    if (!this.arcanePulseUnlocked) {
      return false;
    }
    if (!this.trySpendMana(this.arcanePulseCost)) {
      return false;
    }
    this.runtime.onArcanePulseCast();
    return true;
  }

  tick(): void {
    if (!this.manaEnabled || this.manaRegen <= 0) {
      return;
    }
    const before = this.manaCurrent;
    this.manaCurrent = Math.min(this.manaMax, this.manaCurrent + this.manaRegen);
    if (Math.abs(this.manaCurrent - before) >= 0.01) {
      this.runtime.notifyManaChanged(this.manaCurrent, this.manaMax, this.manaRegen);
    }
  }

  getStats(): SkillTreeStats {
    return {
      extraLives: this.extraLifeCharges,
      scoreMultiplier: this.scoreMultiplier,
      speedRank: this.countRanks(MOMENTUM_PERKS),
      growthRank: this.countRanks(HARVEST_PERKS),
      mana: this.manaCurrent,
      manaMax: this.manaMax,
      manaRegen: this.manaRegen,
      arcanePulseUnlocked: this.arcanePulseUnlocked,
      arcaneVeilUnlocked: this.arcaneVeilUnlocked,
    };
  }

  getManaState(): { mana: number; max: number; regen: number; enabled: boolean } {
    return {
      mana: this.manaCurrent,
      max: this.manaMax,
      regen: this.manaRegen,
      enabled: this.manaEnabled,
    };
  }

  reset(): void {
    for (const effect of this.flagEffects.values()) {
      if (Object.prototype.hasOwnProperty.call(effect, 'resetValue')) {
        this.runtime.setFlag(effect.key, this.cloneEffectValue(effect.resetValue));
      } else {
        this.runtime.setFlag(effect.key, undefined);
      }
    }
    this.flagEffects.clear();
    this.perkRanks.clear();
    this.tickDelaySources.clear();
    this.extraLifeCharges = 0;
    this.scoreMultiplierBase = 1;
    this.scoreMultiplierBonus = 1;
    this.scoreMultiplier = 1;

    this.manaEnabled = false;
    this.manaMax = 0;
    this.manaCurrent = 0;
    this.manaRegen = 0;
    this.arcanePulseUnlocked = false;
    this.arcaneVeilUnlocked = false;

    this.runtime.setTickDelay(this.baseTickDelay);
    this.runtime.notifyExtraLifeReset();
    this.updateScoreMultiplier();
    this.runtime.notifyManaChanged(0, 0, 0);
  }

  isPerkAvailable(perkId: string): boolean {
    try {
      return this.getPurchaseState(perkId).status !== "locked";
    } catch {
      return false;
    }
  }

  private recalculateTickDelay(): void {
    const combined = Array.from(this.tickDelaySources.values()).reduce((acc, value) => acc * value, 1);
    const newDelay = Math.max(30, Math.round(this.baseTickDelay * combined));
    this.runtime.setTickDelay(newDelay);
  }

  private countRanks(ids: readonly string[]): number {
    let total = 0;
    for (const id of ids) {
      total += this.getRank(id);
    }
    return total;
  }

  private trySpendMana(amount: number): boolean {
    if (!this.manaEnabled || this.manaCurrent < amount) {
      return false;
    }
    this.manaCurrent -= amount;
    this.runtime.notifyManaChanged(this.manaCurrent, this.manaMax, this.manaRegen);
    return true;
  }
}




