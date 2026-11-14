import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { i18n } from '../i18nManager.js';
import type { LanguageId } from '../types.js';

/**
 * The common catalog is the one i18n surface where the localized bundle can
 * legitimately lag behind the English source: `getCommon` must fall back to
 * English for missing keys the way `getFeatureString`, `getHumanString`,
 * `getBulletTrain`, and `getRollercoaster` already do. Without the fallback,
 * Spanish and French players see raw `common.*` keys in menus and banners.
 */
describe('i18n getCommon', () => {
  let previousLanguage: LanguageId;

  beforeEach(() => {
    previousLanguage = i18n.getCurrentLanguage();
  });

  afterEach(() => {
    i18n.setLanguage(previousLanguage);
  });

  it('returns the localized string when the current language has the key', () => {
    i18n.setLanguage('es');
    expect(i18n.getCommon('actorInteractions.talk')).toBe('Hablar');
  });

  it('falls back to English for keys missing from the Spanish catalog', () => {
    // These keys exist in en/common but were never added to es/common.
    i18n.setLanguage('es');
    expect(i18n.getCommon('archaeology.archaeologyTrilobite')).toBe('Trilobite Specimen');
    expect(i18n.getCommon('actorInteractions.tavernRest')).toBe('Sleep Until Dawn - {cost} score');
    expect(i18n.getCommon('bulletTrain.stationPauseMessage')).toBe(
      'The train is at the station. Choose your destination.',
    );
  });

  it('falls back to English for keys missing from the French catalog', () => {
    // The French common catalog lags the English one by several hundred keys.
    i18n.setLanguage('fr');
    expect(i18n.getCommon('archaeology.archaeologyFossilBoneFragment')).toBe('Bone Fragment');
  });

  it('returns the raw key when no language provides it', () => {
    i18n.setLanguage('en');
    expect(i18n.getCommon('common.definitelyNotARealKey')).toBe('common.definitelyNotARealKey');
  });

  it('keeps English as the default for missing keys', () => {
    i18n.setLanguage('en');
    expect(i18n.getCommon('archaeology.archaeologyTrilobite')).toBe('Trilobite Specimen');
  });
});
