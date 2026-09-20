import { describe, expect, it } from 'vitest';
import {
  getChoicePopupHeight,
  getChoicePopupWidth,
  normalizeChoiceOptions,
} from '../choicePopupModel.js';

describe('choice popup guards', () => {
  it('provides an inert placeholder for an empty option list', () => {
    expect(normalizeChoiceOptions([])).toEqual([
      {
        id: '__empty__',
        title: 'Nothing available',
        description: 'There are no choices here right now.',
        disabled: true,
      },
    ]);
  });

  it('normalizes malformed or blank option fields', () => {
    expect(normalizeChoiceOptions([{ id: '', title: '', description: undefined }])).toEqual([
      {
        id: 'choice-1',
        title: 'Option 1',
        description: 'No additional details.',
      },
    ]);
  });

  it('keeps popup dimensions inside small and large viewports', () => {
    expect(getChoicePopupWidth(320)).toBe(280);
    expect(getChoicePopupWidth(1920)).toBe(500);
    expect(getChoicePopupHeight(480, 900, 42)).toBe(432);
  });
});
