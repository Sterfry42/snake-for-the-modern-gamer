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
      description: "Train every coil to glide with relentless tempo.",
      ranks: [
        {
          description: "-8% tick delay",
          cost: 12,
          effects: [{ type: "tickDelayScalar", factor: 0.92, sourceId: "momentum.swiftScales" }],
        },
        {
          description: "-16% total tick delay",
          cost: 28,
          effects: [{ type: "tickDelayScalar", factor: 0.84, sourceId: "momentum.swiftScales" }],
        },
        {
          description: "-24% total tick delay",
          cost: 52,
          effects: [{ type: "tickDelayScalar", factor: 0.76, sourceId: "momentum.swiftScales" }],
        },
      ],
    },
    {
      id: "windShear",
      title: "Wind Shear",
      shortLabel: "WND",
      description: "Cut through slipstreams and keep momentum on tap.",
      ranks: [
        {
          description: "-6% additional tick delay",
          cost: 45,
          effects: [{ type: "tickDelayScalar", factor: 0.9, sourceId: "momentum.windShear" }],
        },
      ],
    },
    {
      id: "hyperReflex",
      title: "Hyper Reflex",
      shortLabel: "REF",
      description: "Sharpen reflex loops to squeeze more speed from each turn.",
      ranks: [
        {
          description: "Sharpen reflex loops: -6% tick delay.",
          cost: 58,
          effects: [{ type: "tickDelayScalar", factor: 0.94, sourceId: "momentum.hyperReflex" }],
        },
      ],
    },
    {
      id: "phaseStride",
      title: "Phase Stride",
      shortLabel: "PHSE",
      description: "Bank a momentum surge that saves you once more.",
      ranks: [
        {
          description: "Gain +1 extra life.",
          cost: 68,
          effects: [{ type: "extraLifeCharge", count: 1 }],
        },
      ],
    },
    {
      id: "overclock",
      title: "Overclock",
      shortLabel: "CLK",
      description: "Push your tempo into unsafe overclocked territory.",
      ranks: [
        {
          description: "Drop tick delay by another 8%.",
          cost: 78,
          effects: [{ type: "tickDelayScalar", factor: 0.92, sourceId: "momentum.overclock" }],
        },
      ],
    },
    {
      id: "rashMomentum",
      title: "Rash Momentum",
      shortLabel: "RASH",
      description: "Ride reckless momentum for richer apple payouts.",
      ranks: [
        {
          description: "+4% score from apples (multiplicative bonus).",
          cost: 90,
          effects: [{ type: "scoreMultiplierBonus", bonus: 1.04 }],
        },
      ],
    },
    {
      id: "quantumTrail",
      title: "Quantum Trail",
      shortLabel: "QTR",
      description: "Leave ghost trails that keep the score climbing.",
      ranks: [
        {
          description: "+4% score from apples (multiplicative bonus).",
          cost: 104,
          effects: [{ type: "scoreMultiplierBonus", bonus: 1.04 }],
        },
      ],
    },
    {
      id: "chronoSurge",
      title: "Chrono Surge",
      shortLabel: "CHR",
      description: "Bend time further to quicken every heartbeat.",
      ranks: [
        {
          description: "Reduce tick delay by 10%.",
          cost: 122,
          effects: [{ type: "tickDelayScalar", factor: 0.9, sourceId: "momentum.chronoSurge" }],
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
      description: "Vital currents now refill your mana pool steadily.",
      ranks: [
        {
          description: "+15 max mana, +0.3 regen.",
          cost: 38,
          effects: [{ type: "manaUpgrade", maxBonus: 15, regenBonus: 0.3 }],
        },
      ],
    },
    {
      id: "hardenedScales",
      title: "Hardened Scales",
      shortLabel: "HARD",
      description: "Temper your scales into an extra life buffer.",
      ranks: [
        {
          description: "Gain +1 extra life.",
          cost: 52,
          effects: [{ type: "extraLifeCharge", count: 1 }],
        },
      ],
    },
    {
      id: "bloodBank",
      title: "Blood Bank",
      shortLabel: "BANK",
      description: "Convert stored vitality into a deeper mana reservoir.",
      ranks: [
        {
          description: "+25 max mana, +0.5 regen.",
          cost: 68,
          effects: [{ type: "manaUpgrade", maxBonus: 25, regenBonus: 0.5 }],
        },
      ],
    },
    {
      id: "shieldMatron",
      title: "Shield Matron",
      shortLabel: "SHLD",
      description: "Summon auxiliary ward serpents to take the hit.",
      ranks: [
        {
          description: "Gain +1 extra life",
          cost: 82,
          effects: [{ type: "extraLifeCharge", count: 1 }],
        },
      ],
    },
    {
      id: "wardedStride",
      title: "Warded Stride",
      shortLabel: "WARD",
      description: "Stride with wards that bank another safety charge.",
      ranks: [
        {
          description: "Gain +1 extra life.",
          cost: 96,
          effects: [{ type: "extraLifeCharge", count: 1 }],
        },
      ],
    },
    {
      id: "starlitBeacon",
      title: "Starlit Beacon",
      shortLabel: "BEAC",
      description: "Anchor celestial wards that feed your mana pool.",
      ranks: [
        {
          description: "+20 max mana, +0.5 regen",
          cost: 112,
          effects: [{ type: "manaUpgrade", maxBonus: 20, regenBonus: 0.5 }],
        },
      ],
    },
    {
      id: "phoenixFrame",
      title: "Phoenix Frame",
      shortLabel: "PHNX",
      description: "Fuse a phoenix frame to return from oblivion once more.",
      ranks: [
        {
          description: "Gain +1 extra life.",
          cost: 132,
          effects: [{ type: "extraLifeCharge", count: 1 }],
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
      description: "Milk bonus score from every apple chain.",
      ranks: [
        {
          description: "+25% score from apples",
          cost: 18,
          effects: [{ type: "scoreMultiplier", multiplier: 1.25 }],
        },
        {
          description: "+50% score from apples",
          cost: 40,
          effects: [{ type: "scoreMultiplier", multiplier: 1.5 }],
        },
      ],
    },
    {
      id: "doubleBite",
      title: "Double Bite",
      shortLabel: "DBTE",
      description: "Slip in a second strike before prey can react.",
      ranks: [
        {
          description: "Score multiplier set to 1.65",
          cost: 55,
          effects: [{ type: "scoreMultiplier", multiplier: 1.65 }],
        },
      ],
    },
    {
      id: "huntress",
      title: "Huntress",
      shortLabel: "HNTR",
      description: "Stretch apple chain windows to keep the feast alive.",
      ranks: [
        {
          description: "Score multiplier set to 1.75",
          cost: 66,
          effects: [{ type: "scoreMultiplier", multiplier: 1.75 }],
        },
      ],
    },
    {
      id: "ambushSense",
      title: "Ambush Sense",
      shortLabel: "AMB",
      description: "Anticipate prey to spike combo payouts.",
      ranks: [
        {
          description: "Set apple score multiplier to 1.9x.",
          cost: 78,
          effects: [{ type: "scoreMultiplier", multiplier: 1.9 }],
        },
      ],
    },
    {
      id: "devourer",
      title: "Devourer",
      shortLabel: "DEVR",
      description: "Rend foes and convert them into raw tempo.",
      ranks: [
        {
          description: "Score multiplier set to 1.85",
          cost: 92,
          effects: [{ type: "scoreMultiplier", multiplier: 1.85 }],
        },
      ],
    },
    {
      id: "bloodMoon",
      title: "Blood Moon",
      shortLabel: "BLOOD",
      description: "Hunt under a crimson moon for even richer trophies.",
      ranks: [
        {
          description: "Set apple score multiplier to 2.05x.",
          cost: 108,
          effects: [{ type: "scoreMultiplier", multiplier: 2.05 }],
        },
      ],
    },
    {
      id: "packInstinct",
      title: "Pack Instinct",
      shortLabel: "PACK",
      description: "Call spectral packmates to elevate every hunt.",
      ranks: [
        {
          description: "Set apple score multiplier to 2.2x.",
          cost: 126,
          effects: [{ type: "scoreMultiplier", multiplier: 2.2 }],
        },
      ],
    },
    {
      id: "apexPounce",
      title: "Apex Pounce",
      shortLabel: "APEX",
      description: "Finish hunts as the unquestioned apex predator.",
      ranks: [
        {
          description: "Set apple score multiplier to 2.35x.",
          cost: 148,
          effects: [{ type: "scoreMultiplier", multiplier: 2.35 }],
        },
      ],
    },
  ],
};

const TRAVERSAL_BRANCH: BranchConfig = {
  id: "traversal",
  label: "Traversal",
  nodes: [
    {
      id: "riftWalker",
      title: "Rift Walker",
      shortLabel: "RIFT",
      description: "Feel the seams between rooms to move quicker.",
      ranks: [
        {
          description: "Reduce tick delay by 4%.",
          cost: 32,
          effects: [{ type: "tickDelayScalar", factor: 0.96, sourceId: "traversal.riftWalker" }],
        },
      ],
    },
    {
      id: "portalSense",
      title: "Portal Sense",
      shortLabel: "SENSE",
      description: "Attune to portal currents to deepen your mana.",
      ranks: [
        {
          description: "+10 max mana, +0.2 regen.",
          cost: 44,
          effects: [{ type: "manaUpgrade", maxBonus: 10, regenBonus: 0.2 }],
        },
      ],
    },
    {
      id: "phaseSlip",
      title: "Phase Slip",
      shortLabel: "SLIP",
      description: "Hold phase energy as another life charge.",
      ranks: [
        {
          description: "Gain +1 extra life.",
          cost: 58,
          effects: [{ type: "extraLifeCharge", count: 1 }],
        },
      ],
    },
    {
      id: "echoStep",
      title: "Echo Step",
      shortLabel: "ECHO",
      description: "Echo steps through time to shave delay.",
      ranks: [
        {
          description: "Reduce tick delay by 6%.",
          cost: 72,
          effects: [{ type: "tickDelayScalar", factor: 0.94, sourceId: "traversal.echoStep" }],
        },
      ],
    },
    {
      id: "mirrorImage",
      title: "Mirror Image",
      shortLabel: "MIRR",
      description: "Mirrored images add instant length.",
      ranks: [
        {
          description: "Gain +2 segments instantly.",
          cost: 88,
          effects: [{ type: "instantGrow", segments: 2 }],
        },
      ],
    },
    {
      id: "ghostSkin",
      title: "Ghost Skin",
      shortLabel: "GHO",
      description: "A ghostly hide grants another safety charge.",
      ranks: [
        {
          description: "Gain +1 extra life.",
          cost: 104,
          effects: [{ type: "extraLifeCharge", count: 1 }],
        },
      ],
    },
    {
      id: "planarLattice",
      title: "Planar Lattice",
      shortLabel: "GRID",
      description: "Lay planar lattices to widen mana channels.",
      ranks: [
        {
          description: "+20 max mana, +0.4 regen.",
          cost: 126,
          effects: [{ type: "manaUpgrade", maxBonus: 20, regenBonus: 0.4 }],
        },
      ],
    },
    {
      id: "eventHorizon",
      title: "Event Horizon",
      shortLabel: "VOID",
      description: "Fold space around you to further hasten ticks.",
      ranks: [
        {
          description: "Reduce tick delay by 8%.",
          cost: 150,
          effects: [{ type: "tickDelayScalar", factor: 0.92, sourceId: "traversal.eventHorizon" }],
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

