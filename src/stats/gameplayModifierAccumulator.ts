import type { EquipmentModifiers } from '../inventory/item.js';

export interface RuntimeModifierTotals {
  tickDelayScalar: number;
  radiationTimerScalar: number;
  wallSenseBonus: number;
  seismicPulseBonus: number;
  invulnerabilityBonus: number;
  heatResistance: number;
  coldResistance: number;
  appleScorePenalty: number;
  hazardMapSense: number;
  phoenixCharges: number;
  itemPhoenixCharges: number;
  lightRadiusTiles: number;
  masonryEnabled: boolean;
  gunEnabled: boolean;
  wallSmiteEnabled: boolean;
  swimmingEnabled: boolean;
  regenerator: { interval: number; amount: number } | null;
  refundEveryRooms?: { interval: number; score: number };
}

export interface RuntimeModifierSourceOptions {
  countPhoenixAsItem?: boolean;
}

export function createRuntimeModifierTotals(): RuntimeModifierTotals {
  return {
    tickDelayScalar: 1,
    radiationTimerScalar: 1,
    wallSenseBonus: 0,
    seismicPulseBonus: 0,
    invulnerabilityBonus: 0,
    phoenixCharges: 0,
    itemPhoenixCharges: 0,
    heatResistance: 0,
    coldResistance: 0,
    appleScorePenalty: 0,
    hazardMapSense: 0,
    lightRadiusTiles: 0,
    regenerator: null,
    masonryEnabled: false,
    gunEnabled: false,
    wallSmiteEnabled: false,
    swimmingEnabled: false,
  };
}

export function applyRuntimeModifierSource(
  totals: RuntimeModifierTotals,
  modifiers: EquipmentModifiers | undefined,
  options: RuntimeModifierSourceOptions = {},
): RuntimeModifierTotals {
  if (!modifiers) {
    return totals;
  }

  multiply(totals, 'tickDelayScalar', modifiers.tickDelayScalar);
  multiply(totals, 'radiationTimerScalar', modifiers.radiationTimerScalar);
  add(totals, 'wallSenseBonus', modifiers.wallSenseBonus);
  add(totals, 'seismicPulseBonus', modifiers.seismicPulseBonus);
  add(totals, 'invulnerabilityBonus', modifiers.invulnerabilityBonus);
  add(totals, 'heatResistance', modifiers.heatResistance);
  add(totals, 'coldResistance', modifiers.coldResistance);
  add(totals, 'appleScorePenalty', modifiers.appleScorePenalty);
  add(totals, 'hazardMapSense', modifiers.hazardMapSense);
  max(totals, 'lightRadiusTiles', modifiers.lightRadiusTiles);

  totals.masonryEnabled ||= Boolean(modifiers.masonryEnabled);
  totals.gunEnabled ||= Boolean(modifiers.gunEnabled);
  totals.wallSmiteEnabled ||= Boolean(modifiers.wallSmiteEnabled);
  totals.swimmingEnabled ||= Boolean(modifiers.swimmingEnabled);
  totals.refundEveryRooms = modifiers.refundEveryRooms ?? totals.refundEveryRooms;

  addRegenerator(totals, modifiers.regenerator);
  if (modifiers.spiritualLength) addRegenerator(totals, { interval: 30, amount: 1 });
  addPhoenixCharges(totals, modifiers.phoenixCharges, Boolean(options.countPhoenixAsItem));

  return totals;
}

function add(
  totals: RuntimeModifierTotals,
  key:
    | 'wallSenseBonus'
    | 'seismicPulseBonus'
    | 'invulnerabilityBonus'
    | 'heatResistance'
    | 'coldResistance'
    | 'appleScorePenalty'
    | 'hazardMapSense',
  value?: number,
): void {
  if (typeof value === 'number') totals[key] += value;
}

function multiply(
  totals: RuntimeModifierTotals,
  key: 'tickDelayScalar' | 'radiationTimerScalar',
  value?: number,
): void {
  if (typeof value === 'number') totals[key] *= value;
}

function max(totals: RuntimeModifierTotals, key: 'lightRadiusTiles', value?: number): void {
  if (typeof value === 'number') totals[key] = Math.max(totals[key], value);
}

function addRegenerator(
  totals: RuntimeModifierTotals,
  value?: { interval: number; amount: number } | null,
): void {
  if (!value) return;
  if (!totals.regenerator) {
    totals.regenerator = { ...value };
    return;
  }
  totals.regenerator.interval = Math.min(totals.regenerator.interval, value.interval);
  totals.regenerator.amount += value.amount;
}

function addPhoenixCharges(
  totals: RuntimeModifierTotals,
  charges: number | undefined,
  countAsItem: boolean,
): void {
  if (typeof charges !== 'number') return;
  totals.phoenixCharges += charges;
  if (countAsItem) totals.itemPhoenixCharges += charges;
}
