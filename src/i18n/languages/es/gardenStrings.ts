/**
 * Garden Translations (ES)
 *
 * The wise old snake's garden translations (Spanish):
 * - 'garden.title' = 'Jardín de la Serpiente'
 * - 'garden.subtitle' = 'Culta tus propias manzanas'
 * - 'garden.water' = 'Regar'
 * - 'garden.harvest' = 'Cosechar'
 * - 'garden.plant' = 'Plantar'
 * - 'garden.clear' = 'Limpiar'
 * - 'garden.expand' = 'Expandir'
 * - 'garden.weather' = 'Clima'
 * - 'garden.season' = 'Estación'
 * - 'garden.pests' = 'Plagas'
 * - 'garden.companions' = 'Plantación Compañera'
 * - 'garden.tips' = 'Consejos del Jardín'
 * - 'garden.shop' = 'Tienda del Jardín'
 * - 'garden.npc' = 'Abuela Martha'
 * - 'garden.unlock' = 'Desbloquear Jardín'
 * - 'garden.requirements' = 'Requisitos'
 * - 'garden.plots' = 'Parcelas del Jardín'
 * - 'garden.waterLevel' = 'Nivel de Agua'
 * - 'garden.growthProgress' = 'Progreso de Crecimiento'
 * - 'garden.ripe' = 'Maduro'
 * - 'garden.withered' = 'Marchito'
 * - 'garden.seed' = 'Semilla'
 * - 'garden.sprout' = 'Brote'
 * - 'garden.budding' = 'Brotando'
 * - 'garden.flowering' = 'Floración'
 */
export const GARDEN_STRINGS_ES: {
  garden: Record<string, string>;
  seedNames: Record<string, string>;
  pestNames: Record<string, string>;
  plantStages: Record<string, string>;
  gardenEvents: Record<string, string>;
} = {
  // === GARDEN UI ===
  garden: {
    title: 'Jardín de la Serpiente',
    subtitle: 'Culta tus propias manzanas',
    water: 'Regar',
    harvest: 'Cosechar',
    plant: 'Plantar',
    clear: 'Limpiar',
    expand: 'Expandir',
    weather: 'Clima',
    season: 'Estación',
    pests: 'Plagas',
    companions: 'Plantación Compañera',
    tips: 'Consejos del Jardín',
    shop: 'Tienda del Jardín',
    npc: 'Abuela Martha',
    unlock: 'Desbloquear Jardín',
    requirements: 'Requisitos',
    plots: 'Parcelas del Jardín',
    waterLevel: 'Nivel de Agua',
    growthProgress: 'Progreso de Crecimiento',
    ripe: 'Maduro',
    withered: 'Marchito',
    emptyPlot: 'Parcela Vacía',
    pestInfestation: 'Infestación de Plagas',
    companionActive: 'Bono de Compañero Activo',
    notRipe: 'Aún no está maduro...',
    needsWater: '¡Necesita agua!',
    healthy: 'Saludable',
    damaged: 'Dañado',
    planting: 'Plantando...',
    watering: 'Regando...',
    harvesting: 'Cosechando...',
    clearing: 'Limpiando...',
    expanding: 'Expandiendo...',
    noPlots: 'No hay parcelas disponibles.',
    noSeeds: 'No hay semillas en el inventario.',
    noWater: 'No hay suficiente agua.',
    plotFull: 'La parcela ya tiene una planta.',
    gardenLocked: 'El jardín está bloqueado.',
    gardenUnlocked: '¡Jardín desbloqueado!',
    maxPlots: 'Máximo de parcelas alcanzado.',
    minLength: 'Longitud mínima: {length}',
    minScore: 'Puntuación mínima: {score}',
    questRequired: 'Misión requerida: {quest}',
    itemRequired: 'Objeto requerido: {item}',
    plotGrid: 'Cuadrícula de Parcelas',
    growthChart: 'Gráfico de Crecimiento',
    pestControl: 'Control de Plagas',
    weatherForecast: 'Pronóstico del Tiempo',
    companionGuide: 'Guía de Compañeros',
    harvestAll: 'Cosechar Todo',
    waterAll: 'Regar Todo',
    clearAll: 'Limpiar Todo',
    sellGardenApples: 'Vender Manzanas del Jardín',
    gardenInventory: 'Inventario del Jardín',
    gardenEvents: 'Eventos del Jardín',
    gardenLog: 'Registro del Jardín',
    gardenSettings: 'Configuración del Jardín',
    gardenHelp: 'Ayuda del Jardín',
    oldMarthaGreeting: '¡Bienvenido a tu jardín, pequeña serpiente! Soy la Abuela Martha, tu guía fantasmal para la agricultura de manzanas.',
    oldMarthaTip: 'Recuerda: riega tus plantas cada día, o se marchitarán más rápido que una promesa olvidada.',
    oldMarthaCompanion: 'Las manzanas de lavanda y amor crecen el doble de bien juntas. ¡La plantación compañera es el secreto!',
    oldMarthaPest: '¡Cuidado con los pulgones! Se multiplican rápido. Aplástalos antes de que dominen tu jardín.',
    oldMarthaRare: 'Las semillas raras cuestan más, pero se pagan solas. ¿Qué dices?',
    oldMarthaSeason: 'El jardín cambia con las estaciones. La primavera es mejor para la mayoría de las semillas, pero la wasabi ama el invierno.',
    oldMarthaFlowers: 'Cuando veas flores, significa que tus plantas están casi listas. Paciencia, joven serpiente.',
    oldMarthaWisdom: 'He cuidado este jardín durante 999 años. Lo más sabio que he aprendido? Todo toma tiempo.',
    oldMarthaFarewell: 'Cuida esas plantas, querido. Están contando contigo.',
    oldMarthaShop: 'Tengo algunas semillas raras en almacenamiento. ¿Quieres echar un vistazo?',
  },

  // === SEED NAMES ===
  seedNames: {
    'seed-normal': 'Semilla de Manzana Estándar',
    'seed-gold': 'Semilla de Manzana Dorada',
    'seed-treat': 'Semilla de Manzana Dulce',
    'seed-lavender': 'Semilla de Manzana de Lavanda',
    'seed-love': 'Semilla de Manzana de Amor',
    'seed-caffeinated': 'Semilla de Manzana Cafeinada',
    'seed-wasabi': 'Semilla de Manzana Wasabi',
    'seed-mochi': 'Semilla de Manzana Mochi',
    'seed-yuzu': 'Semilla de Manzana Yuzu',
    'seed-frost': 'Semilla de Manzana Helada',
    'seed-winterberry': 'Semilla de Arándano Invernal',
    'seed-skittish': 'Semilla de Manzana Nerviosa',
    'seed-cold-beer': 'Semilla de Manzana Cerveza Fría',
    'seed-mocha': 'Semilla de Manzana Mocha',
  },

  // === PEST NAMES ===
  pestNames: {
    aphid: 'Pulgón',
    caterpillar: 'Oruga',
    snail: 'Caracol',
    mole: 'Topo',
    locust: 'Langosta',
  },

  // === PLANT STAGES ===
  plantStages: {
    seed: 'Semilla',
    sprout: 'Brote',
    budding: 'Brotando',
    flowering: 'Floración',
    ripe: 'Maduro',
  },

  // === GARDEN EVENTS ===
  gardenEvents: {
    plantGrowing: 'Planta creciendo...',
    plantRipe: '¡La planta está madura y lista para cosechar!',
    plantWithered: '¡La planta se ha marchitado!',
    pestSpawned: '¡Infestación de plagas detectada!',
    pestDefeated: '¡Plaga derrotada!',
    plotUnlocked: '¡Nueva parcela desbloqueada!',
    waterDepleted: '¡El suministro de agua se está agotando!',
    companionBonusApplied: '¡Bono de plantación compañera activo!',
    hybridAppleProduced: '¡Manzana híbrida producida!',
    seasonChange: '¡La estación ha cambiado!',
    weatherChange: '¡El clima ha cambiado!',
  },
};
