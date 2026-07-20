/**
 * Garden Translations (EN)
 *
 * The wise old snake's garden translations:
 * - 'garden.title' = 'Snake Garden'
 * - 'garden.subtitle' = 'Grow your own apples'
 * - 'garden.water' = 'Water'
 * - 'garden.harvest' = 'Harvest'
 * - 'garden.plant' = 'Plant'
 * - 'garden.clear' = 'Clear'
 * - 'garden.expand' = 'Expand'
 * - 'garden.weather' = 'Weather'
 * - 'garden.season' = 'Season'
 * - 'garden.pests' = 'Pests'
 * - 'garden.companions' = 'Companion Planting'
 * - 'garden.tips' = 'Garden Tips'
 * - 'garden.shop' = 'Garden Shop'
 * - 'garden.npc' = 'Old Martha'
 * - 'garden.unlock' = 'Unlock Garden'
 * - 'garden.requirements' = 'Requirements'
 * - 'garden.plots' = 'Garden Plots'
 * - 'garden.waterLevel' = 'Water Level'
 * - 'garden.growthProgress' = 'Growth Progress'
 * - 'garden.ripe' = 'Ripe'
 * - 'garden.withered' = 'Withered'
 * - 'garden.seed' = 'Seed'
 * - 'garden.sprout' = 'Sprout'
 * - 'garden.budding' = 'Budding'
 * - 'garden.flowering' = 'Flowering'
 * - 'garden.aphid' = 'Aphid'
 * - 'garden.caterpillar' = 'Caterpillar'
 * - 'garden.snail' = 'Snail'
 * - 'garden.mole' = 'Mole'
 * - 'garden.locust' = 'Locust'
 * - 'garden.defeat' = 'Defeat'
 * - 'garden.attack' = 'Attack'
 * - 'garden.water不足' = 'Not enough water'
 * - 'garden.plotFull' = 'Plot already has a plant'
 * - 'garden.notRipe' = 'Plant is not ripe yet'
 * - 'garden.harvested' = 'Harvested!'
 * - 'garden.planted' = 'Planted!'
 * - 'garden.companionBonus' = 'Companion Bonus!'
 * - 'garden.hybridApple' = 'Hybrid Apple!'
 * - 'garden.pestSpawned' = 'Pest detected!'
 * - 'garden.pestDefeated' = 'Pest defeated!'
 * - 'garden.plotUnlocked' = 'Plot unlocked!'
 * - 'garden.weatherChange' = 'Weather changed!'
 * - 'garden.seasonChange' = 'Season changed!'
 */
export const GARDEN_STRINGS_EN: {
  garden: Record<string, string>;
  seedNames: Record<string, string>;
  pestNames: Record<string, string>;
  plantStages: Record<string, string>;
  gardenEvents: Record<string, string>;
} = {
  // === GARDEN UI ===
  garden: {
    title: 'Snake Garden',
    subtitle: 'Grow your own apples',
    water: 'Water',
    harvest: 'Harvest',
    plant: 'Plant',
    clear: 'Clear',
    expand: 'Expand',
    weather: 'Weather',
    season: 'Season',
    pests: 'Pests',
    companions: 'Companion Planting',
    tips: 'Garden Tips',
    shop: 'Garden Shop',
    npc: 'Old Martha',
    unlock: 'Unlock Garden',
    requirements: 'Requirements',
    plots: 'Garden Plots',
    waterLevel: 'Water Level',
    growthProgress: 'Growth Progress',
    ripe: 'Ripe',
    withered: 'Withered',
    emptyPlot: 'Empty Plot',
    pestInfestation: 'Pest Infestation',
    companionActive: 'Companion Bonus Active',
    notRipe: 'Not ripe yet...',
    needsWater: 'Needs water!',
    healthy: 'Healthy',
    damaged: 'Damaged',
    planting: 'Planting...',
    watering: 'Watering...',
    harvesting: 'Harvesting...',
    clearing: 'Clearing...',
    expanding: 'Expanding...',
    noPlots: 'No garden plots available.',
    noSeeds: 'No seeds in inventory.',
    noWater: 'Not enough water.',
    plotFull: 'Plot already has a plant.',
    gardenLocked: 'Garden is locked.',
    gardenUnlocked: 'Garden unlocked!',
    maxPlots: 'Maximum plots reached.',
    minLength: 'Minimum length: {length}',
    minScore: 'Minimum score: {score}',
    questRequired: 'Quest required: {quest}',
    itemRequired: 'Item required: {item}',
    plotGrid: 'Plot Grid',
    growthChart: 'Growth Chart',
    pestControl: 'Pest Control',
    weatherForecast: 'Weather Forecast',
    companionGuide: 'Companion Guide',
    harvestAll: 'Harvest All',
    waterAll: 'Water All',
    clearAll: 'Clear All',
    sellGardenApples: 'Sell Garden Apples',
    gardenInventory: 'Garden Inventory',
    gardenEvents: 'Garden Events',
    gardenLog: 'Garden Log',
    gardenSettings: 'Garden Settings',
    gardenHelp: 'Garden Help',
    oldMarthaGreeting:
      "Welcome to your garden, little snake! I'm Old Martha, your ghostly guide to apple farming.",
    oldMarthaTip:
      "Remember: water your plants every day, or they'll wither faster than a forgotten promise.",
    oldMarthaCompanion:
      'Lavender and love apples grow twice as well together. Companion planting is the secret!',
    oldMarthaPest:
      'Watch out for aphids — they multiply fast. Squash them before they take over your garden.',
    oldMarthaRare: "Rare seeds cost more, but they'll pay for themselves. What do you say?",
    oldMarthaSeason:
      'The garden changes with the seasons. Spring is best for most seeds, but wasabi loves winter.',
    oldMarthaFlowers:
      'When you see flowers, that means your plants are almost ready. Patience, young snake.',
    oldMarthaWisdom:
      "I've tended this garden for 999 years. The wisest thing I've learned? Everything takes time.",
    oldMarthaFarewell: "Take care of those plants, dear. They're counting on you.",
    oldMarthaShop: "I've got some rare seeds in storage. Want to take a look?",
  },

  // === SEED NAMES ===
  seedNames: {
    'seed-normal': 'Standard Apple Seed',
    'seed-gold': 'Golden Apple Seed',
    'seed-treat': 'Treat Apple Seed',
    'seed-lavender': 'Lavender Apple Seed',
    'seed-love': 'Love Apple Seed',
    'seed-caffeinated': 'Caffeinated Apple Seed',
    'seed-wasabi': 'Wasabi Apple Seed',
    'seed-mochi': 'Mochi Apple Seed',
    'seed-yuzu': 'Yuzu Apple Seed',
    'seed-frost': 'Frost Apple Seed',
    'seed-winterberry': 'Winterberry Apple Seed',
    'seed-skittish': 'Skittish Apple Seed',
    'seed-cold-beer': 'Cold Beer Apple Seed',
    'seed-mocha': 'Mocha Apple Seed',
  },

  // === PEST NAMES ===
  pestNames: {
    aphid: 'Aphid',
    caterpillar: 'Caterpillar',
    snail: 'Snail',
    mole: 'Mole',
    locust: 'Locust',
  },

  // === PLANT STAGES ===
  plantStages: {
    seed: 'Seed',
    sprout: 'Sprout',
    budding: 'Budding',
    flowering: 'Flowering',
    ripe: 'Ripe',
  },

  // === GARDEN EVENTS ===
  gardenEvents: {
    plantGrowing: 'Plant growing...',
    plantRipe: 'Plant is ripe and ready to harvest!',
    plantWithered: 'Plant has withered!',
    pestSpawned: 'Pest infestation detected!',
    pestDefeated: 'Pest defeated!',
    plotUnlocked: 'New plot unlocked!',
    waterDepleted: 'Water supply running low!',
    companionBonusApplied: 'Companion planting bonus active!',
    hybridAppleProduced: 'Hybrid apple produced!',
    seasonChange: 'Season has changed!',
    weatherChange: 'Weather has changed!',
  },
};
