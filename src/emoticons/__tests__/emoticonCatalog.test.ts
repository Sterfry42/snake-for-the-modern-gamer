import { describe, expect, it } from 'vitest';

import {
  ALL_EMOTICON_IDS,
  EMOTICON_DEFINITIONS,
  canPurchaseEmoticon,
  getEmoticonDefinition,
  isEmoticonOwned,
} from '../emoticonCatalog.js';

describe('emoticon catalog completeness', () => {
  describe('ALL_EMOTICON_IDS', () => {
    it('every ID in ALL_EMOTICON_IDS has a matching definition', () => {
      const definitionIds = new Set(EMOTICON_DEFINITIONS.map((def) => def.id));
      for (const id of ALL_EMOTICON_IDS) {
        expect(definitionIds.has(id)).toBe(true);
      }
    });

    it('every definition has an ID present in ALL_EMOTICON_IDS', () => {
      const allIds = new Set(ALL_EMOTICON_IDS);
      for (const def of EMOTICON_DEFINITIONS) {
        expect(allIds.has(def.id as (typeof ALL_EMOTICON_IDS)[number])).toBe(true);
      }
    });

    it('ALL_EMOTICON_IDS and EMOTICON_DEFINITIONS have the same count', () => {
      expect(ALL_EMOTICON_IDS.length).toBe(EMOTICON_DEFINITIONS.length);
    });
  });

  describe('getEmoticonDefinition', () => {
    it('returns the correct definition for a known ID', () => {
      const happy = getEmoticonDefinition('happy');
      expect(happy).toBeDefined();
      expect(happy?.id).toBe('happy');
      expect(happy?.symbol).toBe(':)');
    });
  });

  describe('isEmoticonOwned', () => {
    it('returns true when the emoticon is in the owned list', () => {
      expect(isEmoticonOwned(['happy', 'sad'], 'happy')).toBe(true);
    });

    it('returns false when the emoticon is not in the owned list', () => {
      expect(isEmoticonOwned(['happy', 'sad'], 'angry')).toBe(false);
    });
  });

  describe('canPurchaseEmoticon', () => {
    it('returns true when the emoticon is not owned', () => {
      const happy = EMOTICON_DEFINITIONS.find((d) => d.id === 'happy')!;
      expect(canPurchaseEmoticon([], happy)).toBe(true);
    });

    it('returns false when the emoticon is already owned', () => {
      const happy = EMOTICON_DEFINITIONS.find((d) => d.id === 'happy')!;
      expect(canPurchaseEmoticon(['happy'], happy)).toBe(false);
    });
  });

  describe('all definitions', () => {
    it('every definition has a non-empty symbol', () => {
      for (const def of EMOTICON_DEFINITIONS) {
        expect(def.symbol.length).toBeGreaterThan(0);
      }
    });

    it('every definition has a positive price', () => {
      for (const def of EMOTICON_DEFINITIONS) {
        expect(def.price).toBeGreaterThan(0);
      }
    });

    it('every definition has a non-empty description', () => {
      for (const def of EMOTICON_DEFINITIONS) {
        expect(def.description.length).toBeGreaterThan(0);
      }
    });
  });
});
