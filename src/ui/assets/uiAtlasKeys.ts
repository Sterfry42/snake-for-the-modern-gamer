export const uiFrameKeys = {
  outer: 'ui.frame.outer',
  panel: 'ui.frame.panel',
  card: 'ui.frame.card',
  button: 'ui.frame.button',
  buttonDisabled: 'ui.frame.button.disabled',
  selection: 'ui.frame.selection',
  scrollRail: 'ui.frame.scroll.rail',
  scrollThumb: 'ui.frame.scroll.thumb',
} as const;

export const uiIconKeys = {
  check: 'ui.icon.check',
  lock: 'ui.icon.lock',
  arrowUp: 'ui.icon.arrow.up',
  arrowDown: 'ui.icon.arrow.down',
  sparkle: 'ui.icon.sparkle',
} as const;

export const uiFxKeys = {
  glowDot: 'ui.fx.glow.dot',
  cornerGlint: 'ui.fx.corner.glint',
} as const;

export const uiTabIconKeys = {
  growth: 'ui.icon.tab.growth',
  gear: 'ui.icon.tab.gear',
  world: 'ui.icon.tab.world',
  system: 'ui.icon.tab.system',
  skills: 'ui.icon.tab.skills',
  special: 'ui.icon.tab.special',
  spells: 'ui.icon.tab.spells',
  inventory: 'ui.icon.tab.inventory',
  equipment: 'ui.icon.tab.equipment',
  items: 'ui.icon.tab.items',
  customize: 'ui.icon.tab.customize',
  cards: 'ui.icon.tab.cards',
  artifacts: 'ui.icon.tab.artifacts',
  map: 'ui.icon.tab.map',
  dating: 'ui.icon.tab.dating',
  quests: 'ui.icon.tab.quests',
  factions: 'ui.icon.tab.factions',
  graph: 'ui.icon.tab.graph',
  cheats: 'ui.icon.tab.cheats',
  info: 'ui.icon.tab.info',
  people: 'ui.icon.tab.people',
  companions: 'ui.icon.tab.companions',
  destiny: 'ui.icon.tab.destiny',
} as const;

export const uiAtlasKeys = {
  frames: uiFrameKeys,
  icons: uiIconKeys,
  tabIcons: uiTabIconKeys,
  fx: uiFxKeys,
} as const;

export type UiFrameKey = (typeof uiFrameKeys)[keyof typeof uiFrameKeys];
export type UiIconKey = (typeof uiIconKeys)[keyof typeof uiIconKeys];
export type UiFxKey = (typeof uiFxKeys)[keyof typeof uiFxKeys];
export type UiTabIconKey = (typeof uiTabIconKeys)[keyof typeof uiTabIconKeys];
