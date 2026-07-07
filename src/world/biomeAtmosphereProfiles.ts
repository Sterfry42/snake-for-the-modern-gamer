import type { BiomeId } from './biomes.js';
import type { BiomeAtmosphereProfile } from './atmosphereTypes.js';
import { RARE_TELEGRAPHED_LIGHTNING } from './atmosphereTypes.js';

export const BIOME_ATMOSPHERE_PROFILES: Record<BiomeId, BiomeAtmosphereProfile> = {
  'verdigris-basin': {
    biomeId: 'verdigris-basin',
    baseJuice: ['soft-mist'],
    preserveCoreNote: 'Baseline temperate wet grassland. Keep ordinary and readable.',
    dayPhaseResponses: { dawn: { localVisual: 'mist', juice: ['soft-mist'] } },
    weatherResponses: {
      rain: {
        localVisual: 'rain',
        juice: ['pond-ripples'],
        gameplay: { animalSpawnBiasAdd: { frog: 1 } },
      },
      fog: { localVisual: 'mist', juice: ['soft-mist'], gameplay: { visibilityScalar: 0.9 } },
      wind: { localVisual: 'leafFall', juice: ['leaf-fall'] },
    },
  },
  'ember-waste': {
    biomeId: 'ember-waste',
    baseJuice: ['heat-haze', 'ash-gusts'],
    preserveCoreNote: 'Hot dry desert. Rain becomes hiss and steam, never lush growth.',
    weatherResponses: {
      clear: { localVisual: 'heatHaze', juice: ['heat-haze'] },
      rain: { localVisual: 'steam', juice: ['steam-vents'], gameplay: { heatRateScalar: 0.75 } },
      storm: {
        localVisual: 'dryLightning',
        juice: ['ash-gusts'],
        gameplay: { lightningProfile: RARE_TELEGRAPHED_LIGHTNING },
      },
      fog: { localVisual: 'ashfall', juice: ['ash-gusts'], gameplay: { visibilityScalar: 0.85 } },
      heatwave: {
        localVisual: 'heatHaze',
        juice: ['heat-haze'],
        gameplay: { heatRateScalar: 1.25 },
      },
      coldfront: { localVisual: 'mist', gameplay: { heatRateScalar: 0.65 } },
      wind: {
        localVisual: 'dustStorm',
        juice: ['dust-gusts'],
        gameplay: { visibilityScalar: 0.85 },
      },
    },
  },
  'moonlit-parish': {
    biomeId: 'moonlit-parish',
    baseJuice: ['grave-bells', 'ghost-breath'],
    preserveCoreNote:
      'Haunted magical parish. Weather should feel like churchyard omen, not generic rain.',
    dayPhaseResponses: {
      night: { localVisual: 'fireflies', juice: ['grave-bells', 'ghost-breath'] },
    },
    weatherResponses: {
      rain: { localVisual: 'mist', juice: ['grave-bells'] },
      storm: {
        localVisual: 'thunder',
        juice: ['grave-bells'],
        gameplay: { enemySpawnChanceScalar: 1.05 },
      },
      fog: { localVisual: 'fog', juice: ['ghost-breath'], gameplay: { visibilityScalar: 0.78 } },
      coldfront: { localVisual: 'mist', juice: ['ghost-breath'] },
    },
  },
  'sable-depths': {
    biomeId: 'sable-depths',
    baseJuice: ['cave-echo', 'falling-dust'],
    defaultLocalVisual: 'mist',
    preserveCoreNote: 'Dark cold cave. Surface rain becomes drips and echoes.',
    weatherResponses: {
      rain: { localVisual: 'caveDrip', juice: ['cave-echo'], audio: ['cave-drip'] },
      storm: {
        localVisual: 'caveDrip',
        juice: ['falling-dust'],
        gameplay: { enemySpawnChanceScalar: 1.05 },
      },
      fog: { localVisual: 'mist', juice: ['soft-mist'], gameplay: { visibilityScalar: 0.8 } },
      coldfront: { localVisual: 'mist', gameplay: { coldRateScalar: 1.18 } },
      wind: {
        localVisual: 'boneDust',
        juice: ['falling-dust'],
        gameplay: { visibilityScalar: 0.9 },
      },
    },
  },
  'gloam-garden': {
    biomeId: 'gloam-garden',
    baseJuice: ['soft-mist', 'pond-ripples', 'fireflies'],
    preserveCoreNote: 'Wetland garden. Keep froggy, damp, and gentle.',
    weatherResponses: {
      rain: {
        localVisual: 'rain',
        juice: ['pond-ripples'],
        gameplay: { animalSpawnBiasAdd: { frog: 2, fish: 1 } },
      },
      storm: {
        localVisual: 'heavyRain',
        juice: ['pond-ripples'],
        gameplay: { animalSpawnChanceScalar: 1.1 },
      },
      fog: { localVisual: 'fog', juice: ['soft-mist'], gameplay: { visibilityScalar: 0.85 } },
      wind: { localVisual: 'leafFall', juice: ['leaf-fall'] },
    },
  },
  'elderwood-maze': {
    biomeId: 'elderwood-maze',
    baseJuice: ['leaf-drips', 'root-creak', 'fireflies'],
    preserveCoreNote: 'Dense magical forest. Weather should amplify canopy pressure.',
    weatherResponses: {
      rain: {
        localVisual: 'heavyRain',
        juice: ['canopy-drips'],
        gameplay: { animalSpawnBiasAdd: { frog: 1 } },
      },
      storm: {
        localVisual: 'thunder',
        juice: ['root-creak'],
        gameplay: { visibilityScalar: 0.85 },
      },
      fog: { localVisual: 'fog', juice: ['soft-mist'], gameplay: { visibilityScalar: 0.78 } },
      wind: { localVisual: 'leafFall', juice: ['leaf-fall', 'root-creak'] },
    },
  },
  'sunken-ocean': {
    biomeId: 'sunken-ocean',
    baseJuice: ['sea-spray', 'wave-chop'],
    defaultLocalVisual: 'seaSpray',
    preserveCoreNote: 'Open ocean. Weather is water movement and spray.',
    weatherResponses: {
      rain: {
        localVisual: 'seaSpray',
        juice: ['wave-chop'],
        gameplay: { animalSpawnBiasAdd: { fish: 2 } },
      },
      storm: {
        localVisual: 'monsoon',
        juice: ['wave-chop'],
        gameplay: { enemySpawnChanceScalar: 1.05, visibilityScalar: 0.82 },
      },
      fog: { localVisual: 'mist', juice: ['sea-spray'], gameplay: { visibilityScalar: 0.8 } },
      wind: { localVisual: 'seaSpray', juice: ['wave-chop'] },
    },
  },
  'mosaic-coast': {
    biomeId: 'mosaic-coast',
    baseJuice: ['sea-spray', 'heat-haze', 'lantern-reflections'],
    defaultLocalVisual: 'heatHaze',
    preserveCoreNote:
      'Sunny tiled coast. Shade routing is local room logic; weather should reinforce bright coastal pressure.',
    dayPhaseResponses: {
      night: {
        localVisual: 'fireflies',
        juice: ['lantern-reflections'],
        gameplay: { heatRateScalar: 0.5 },
      },
      dusk: {
        localVisual: 'seaSpray',
        juice: ['sea-spray', 'lantern-reflections'],
        gameplay: { heatRateScalar: 0.7 },
      },
    },
    weatherResponses: {
      clear: { localVisual: 'heatHaze', juice: ['heat-haze'] },
      rain: {
        localVisual: 'steam',
        juice: ['sea-spray', 'pond-ripples'],
        gameplay: { heatRateScalar: 0.65, animalSpawnBiasAdd: { frog: 1, fish: 1 } },
      },
      storm: {
        localVisual: 'monsoon',
        juice: ['wave-chop', 'lantern-reflections'],
        gameplay: { heatRateScalar: 0.55, visibilityScalar: 0.86 },
      },
      fog: {
        localVisual: 'mist',
        juice: ['soft-mist', 'sea-spray'],
        gameplay: { heatRateScalar: 0.7, visibilityScalar: 0.88 },
      },
      heatwave: {
        localVisual: 'heatHaze',
        juice: ['heat-haze'],
        gameplay: { heatRateScalar: 1.2 },
      },
      coldfront: {
        localVisual: 'seaSpray',
        juice: ['sea-spray'],
        gameplay: { heatRateScalar: 0.5 },
      },
      wind: { localVisual: 'seaSpray', juice: ['sea-spray'], gameplay: { heatRateScalar: 0.82 } },
    },
  },
  'home-hearth': {
    biomeId: 'home-hearth',
    baseJuice: ['lantern-reflections'],
    preserveCoreNote: 'Home remains safe and warm. Atmosphere is cozy only.',
    weatherResponses: {
      clear: { localVisual: 'clear' },
      rain: { localVisual: 'rain', juice: ['lantern-reflections'] },
      storm: { localVisual: 'rain', juice: ['lantern-reflections'] },
      fog: { localVisual: 'mist', juice: ['soft-mist'] },
      heatwave: { localVisual: 'clear' },
      coldfront: { localVisual: 'mist' },
      wind: { localVisual: 'leafFall' },
    },
  },
  'jade-peak-province': {
    biomeId: 'jade-peak-province',
    baseJuice: ['lantern-reflections', 'pond-ripples', 'petals'],
    preserveCoreNote: 'Serene mountain province. Rain is pond rings and lantern reflections.',
    dayPhaseResponses: { night: { localVisual: 'fireflies', juice: ['lantern-reflections'] } },
    weatherResponses: {
      rain: {
        localVisual: 'rain',
        juice: ['pond-ripples', 'lantern-reflections'],
        gameplay: { animalSpawnBiasAdd: { koi: 1, kappa: 1 } },
      },
      storm: {
        localVisual: 'thunder',
        juice: ['lantern-reflections'],
        gameplay: { visibilityScalar: 0.9 },
      },
      fog: { localVisual: 'mist', juice: ['soft-mist'], gameplay: { visibilityScalar: 0.88 } },
      coldfront: { localVisual: 'snow', juice: ['snow-caps'] },
      wind: { localVisual: 'petals', juice: ['petals'] },
    },
  },
  'liberty-badlands': {
    biomeId: 'liberty-badlands',
    baseJuice: ['dust-gusts', 'heat-haze'],
    preserveCoreNote: 'Sunburnt roadside badlands. Weather stays dusty and loud.',
    weatherResponses: {
      rain: {
        localVisual: 'steam',
        juice: ['dust-gusts'],
        gameplay: { heatRateScalar: 0.85, animalSpawnBiasAdd: { frog: 1 } },
      },
      storm: {
        localVisual: 'dryLightning',
        juice: ['dust-gusts'],
        gameplay: { lightningProfile: RARE_TELEGRAPHED_LIGHTNING },
      },
      fog: { localVisual: 'dustStorm', gameplay: { visibilityScalar: 0.85 } },
      heatwave: {
        localVisual: 'heatHaze',
        juice: ['heat-haze'],
        gameplay: { heatRateScalar: 1.15 },
      },
      wind: {
        localVisual: 'dustStorm',
        juice: ['dust-gusts'],
        gameplay: { visibilityScalar: 0.85 },
      },
    },
  },
  rainforest: {
    biomeId: 'rainforest',
    baseJuice: ['canopy-drips', 'leaf-drips'],
    defaultLocalVisual: 'rain',
    preserveCoreNote: 'Hot humid rainforest. Even clear weather is wet under canopy.',
    weatherResponses: {
      clear: { localVisual: 'rain', juice: ['canopy-drips'] },
      rain: {
        localVisual: 'heavyRain',
        juice: ['canopy-drips'],
        gameplay: { animalSpawnChanceScalar: 1.1, animalSpawnBiasAdd: { frog: 2, fish: 1 } },
      },
      storm: {
        localVisual: 'monsoon',
        juice: ['canopy-drips'],
        gameplay: { visibilityScalar: 0.82 },
      },
      fog: { localVisual: 'fog', juice: ['soft-mist'], gameplay: { visibilityScalar: 0.78 } },
      heatwave: { localVisual: 'steam', juice: ['steam-vents'] },
    },
  },
  'wintergreen-forest': {
    biomeId: 'wintergreen-forest',
    baseJuice: ['snow-caps', 'ice-shimmer'],
    preserveCoreNote: 'Cold evergreen forest. Wet weather trends snowy.',
    weatherResponses: {
      rain: { localVisual: 'snow', juice: ['snow-caps'], gameplay: { coldRateScalar: 1.1 } },
      storm: {
        localVisual: 'whiteout',
        juice: ['snow-caps'],
        gameplay: { coldRateScalar: 1.25, visibilityScalar: 0.75 },
      },
      fog: { localVisual: 'mist', gameplay: { visibilityScalar: 0.85 } },
      coldfront: { localVisual: 'snow', juice: ['snow-caps'], gameplay: { coldRateScalar: 1.25 } },
      wind: { localVisual: 'leafFall', juice: ['leaf-fall'] },
    },
  },
  'warm-coast': {
    biomeId: 'warm-coast',
    baseJuice: ['sea-spray', 'wave-chop'],
    preserveCoreNote: 'Balmy shore. Weather is surf and coastal spray.',
    weatherResponses: {
      rain: {
        localVisual: 'seaSpray',
        juice: ['wave-chop'],
        gameplay: { animalSpawnBiasAdd: { fish: 1, frog: 1 } },
      },
      storm: {
        localVisual: 'monsoon',
        juice: ['wave-chop'],
        gameplay: { visibilityScalar: 0.85, animalSpawnBiasAdd: { bird: -1 } },
      },
      fog: { localVisual: 'mist', gameplay: { visibilityScalar: 0.85 } },
      wind: { localVisual: 'seaSpray', juice: ['sea-spray'] },
    },
  },
  'frozen-sea': {
    biomeId: 'frozen-sea',
    baseJuice: ['snow-caps', 'ice-shimmer', 'aurora'],
    preserveCoreNote: 'Icebound ocean. Rain becomes snow; storm becomes whiteout.',
    weatherResponses: {
      clear: { localVisual: 'aurora', juice: ['aurora'] },
      rain: { localVisual: 'snow', juice: ['snow-caps'], gameplay: { coldRateScalar: 1.1 } },
      storm: {
        localVisual: 'whiteout',
        juice: ['snow-caps'],
        gameplay: { coldRateScalar: 1.25, visibilityScalar: 0.7 },
      },
      fog: { localVisual: 'mist', gameplay: { visibilityScalar: 0.8 } },
      coldfront: {
        localVisual: 'whiteout',
        gameplay: { coldRateScalar: 1.3, visibilityScalar: 0.72 },
      },
      wind: { localVisual: 'sleet', gameplay: { visibilityScalar: 0.82 } },
    },
  },
  'ember-caverns': {
    biomeId: 'ember-caverns',
    baseJuice: ['steam-vents', 'heat-haze', 'cave-echo'],
    preserveCoreNote: 'Molten cave. Rain becomes steam and vent pressure.',
    weatherResponses: {
      rain: { localVisual: 'steam', juice: ['steam-vents'], gameplay: { heatRateScalar: 0.85 } },
      storm: {
        localVisual: 'steam',
        juice: ['falling-dust'],
        gameplay: { enemySpawnChanceScalar: 1.05 },
      },
      fog: { localVisual: 'steam', gameplay: { visibilityScalar: 0.82 } },
      heatwave: {
        localVisual: 'heatHaze',
        juice: ['heat-haze'],
        gameplay: { heatRateScalar: 1.25 },
      },
      coldfront: { localVisual: 'caveDrip', gameplay: { heatRateScalar: 0.75 } },
    },
  },
  'fungal-grotto': {
    biomeId: 'fungal-grotto',
    baseJuice: ['spore-motes', 'bioluminescent-pulse', 'cave-echo'],
    defaultLocalVisual: 'sporeCloud',
    preserveCoreNote: 'Wet magical mushroom cave. Weather becomes spores and drips.',
    weatherResponses: {
      rain: {
        localVisual: 'caveDrip',
        juice: ['spore-motes'],
        gameplay: { animalSpawnBiasAdd: { frog: 1 } },
      },
      storm: {
        localVisual: 'sporeCloud',
        juice: ['bioluminescent-pulse'],
        gameplay: { visibilityScalar: 0.82 },
      },
      fog: { localVisual: 'sporeCloud', gameplay: { visibilityScalar: 0.75 } },
      wind: { localVisual: 'sporeCloud', juice: ['spore-motes'] },
    },
  },
  'root-buried-tunnels': {
    biomeId: 'root-buried-tunnels',
    baseJuice: ['root-creak', 'leaf-drips', 'cave-echo'],
    preserveCoreNote: 'Root-packed tunnels. Weather is felt as creaks, drips, and soil breath.',
    weatherResponses: {
      rain: {
        localVisual: 'caveDrip',
        juice: ['leaf-drips'],
        gameplay: { animalSpawnBiasAdd: { frog: 1 } },
      },
      storm: {
        localVisual: 'caveDrip',
        juice: ['root-creak'],
        gameplay: { visibilityScalar: 0.9 },
      },
      fog: { localVisual: 'mist', gameplay: { visibilityScalar: 0.84 } },
      wind: { localVisual: 'leafFall', juice: ['root-creak'] },
    },
  },
  'ash-steppe': {
    biomeId: 'ash-steppe',
    baseJuice: ['ash-gusts', 'dust-gusts'],
    preserveCoreNote: 'Dry ash plain. Weather moves ash, not greenery.',
    weatherResponses: {
      rain: { localVisual: 'ashfall', juice: ['ash-gusts'] },
      storm: { localVisual: 'dryLightning', juice: ['ash-gusts'] },
      fog: { localVisual: 'ashfall', gameplay: { visibilityScalar: 0.82 } },
      heatwave: { localVisual: 'heatHaze', gameplay: { heatRateScalar: 1.05 } },
      wind: {
        localVisual: 'dustStorm',
        juice: ['ash-gusts'],
        gameplay: { visibilityScalar: 0.82 },
      },
    },
  },
  'neon-underpass': {
    biomeId: 'neon-underpass',
    baseJuice: ['neon-reflections', 'sign-flicker'],
    preserveCoreNote: 'Civilized weird underpass. Rain is neon asphalt and vapor.',
    dayPhaseResponses: {
      night: { localVisual: 'neonRain', juice: ['neon-reflections', 'sign-flicker'] },
    },
    weatherResponses: {
      rain: {
        localVisual: 'neonRain',
        juice: ['neon-reflections'],
        gameplay: { animalSpawnBiasAdd: { raccoon: 1, possum: 1 } },
      },
      storm: {
        localVisual: 'thunder',
        juice: ['sign-flicker', 'neon-reflections'],
        gameplay: { enemyFireCooldownScalar: 0.95 },
      },
      fog: {
        localVisual: 'mist',
        juice: ['neon-reflections'],
        gameplay: { visibilityScalar: 0.8 },
      },
      heatwave: { localVisual: 'heatHaze' },
      coldfront: { localVisual: 'mist' },
      wind: { localVisual: 'dustStorm', gameplay: { visibilityScalar: 0.9 } },
    },
  },
  'glass-desert': {
    biomeId: 'glass-desert',
    baseJuice: ['glass-glare', 'prism-haze', 'heat-haze'],
    preserveCoreNote: 'Brutal bright glass desert. Storm means dry lightning, not rain.',
    weatherResponses: {
      clear: { localVisual: 'heatHaze', juice: ['glass-glare'] },
      rain: { localVisual: 'steam', juice: ['prism-haze'], gameplay: { heatRateScalar: 0.85 } },
      storm: {
        localVisual: 'dryLightning',
        juice: ['glass-glare'],
        gameplay: { lightningProfile: RARE_TELEGRAPHED_LIGHTNING },
      },
      fog: { localVisual: 'mist', juice: ['prism-haze'], gameplay: { visibilityScalar: 0.8 } },
      heatwave: {
        localVisual: 'heatHaze',
        juice: ['glass-glare'],
        gameplay: { heatRateScalar: 1.3 },
      },
      coldfront: { localVisual: 'mist', gameplay: { heatRateScalar: 0.7 } },
      wind: {
        localVisual: 'dustStorm',
        juice: ['dust-gusts'],
        gameplay: { visibilityScalar: 0.8 },
      },
    },
  },
  'titan-ribcage': {
    biomeId: 'titan-ribcage',
    baseJuice: ['bone-dust', 'bone-condensation', 'cave-echo'],
    preserveCoreNote: 'Dry skeletal cold cave. Rain becomes marrow condensation.',
    weatherResponses: {
      clear: { localVisual: 'boneDust', juice: ['bone-dust'] },
      rain: { localVisual: 'caveDrip', juice: ['bone-condensation'] },
      storm: {
        localVisual: 'boneDust',
        juice: ['cave-echo'],
        gameplay: { enemySpawnChanceScalar: 1.05 },
      },
      fog: { localVisual: 'mist', juice: ['bone-dust'], gameplay: { visibilityScalar: 0.8 } },
      heatwave: { localVisual: 'boneDust', gameplay: { coldRateScalar: 0.75 } },
      coldfront: { localVisual: 'mist', gameplay: { coldRateScalar: 1.2 } },
      wind: { localVisual: 'boneDust', gameplay: { visibilityScalar: 0.85 } },
    },
  },
  'radioactive-orchard': {
    biomeId: 'radioactive-orchard',
    baseJuice: ['geiger-sparkle', 'soft-mist'],
    defaultLocalVisual: 'fallout',
    preserveCoreNote:
      'Mutated glowing orchard. Weather reveals fallout identity without new survival systems.',
    weatherResponses: {
      clear: { localVisual: 'fallout', juice: ['geiger-sparkle'] },
      rain: {
        localVisual: 'fallout',
        juice: ['geiger-sparkle'],
        gameplay: { animalSpawnBiasAdd: { frog: 1, possum: 1 } },
      },
      storm: {
        localVisual: 'fallout',
        juice: ['geiger-sparkle'],
        gameplay: { enemySpawnChanceScalar: 1.05 },
      },
      fog: { localVisual: 'fallout', gameplay: { visibilityScalar: 0.75 } },
      heatwave: { localVisual: 'heatHaze', juice: ['geiger-sparkle'] },
      coldfront: { localVisual: 'mist', juice: ['geiger-sparkle'] },
      wind: {
        localVisual: 'leafFall',
        juice: ['leaf-fall', 'geiger-sparkle'],
        gameplay: { visibilityScalar: 0.85 },
      },
    },
  },
  'clockwork-quarry': {
    biomeId: 'clockwork-quarry',
    baseJuice: ['gear-drips', 'oil-sheen', 'steam-vents'],
    preserveCoreNote: 'Dry oiled mechanical quarry. Rain becomes industrial oil sheen.',
    weatherResponses: {
      rain: { localVisual: 'oilRain', juice: ['gear-drips', 'oil-sheen'] },
      storm: {
        localVisual: 'thunder',
        juice: ['sign-flicker', 'gear-drips'],
        gameplay: { enemyFireCooldownScalar: 0.9 },
      },
      fog: { localVisual: 'steam', juice: ['steam-vents'], gameplay: { visibilityScalar: 0.85 } },
      heatwave: { localVisual: 'heatHaze', juice: ['oil-sheen'] },
      coldfront: { localVisual: 'mist' },
      wind: { localVisual: 'dustStorm', juice: ['dust-gusts'] },
    },
  },
};
