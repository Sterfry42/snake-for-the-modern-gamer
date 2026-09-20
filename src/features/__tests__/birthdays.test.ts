import { describe, expect, it } from 'vitest';
import {
  BIRTHDAYS,
  formatBirthdayCellNames,
  formatBirthdayMessage,
  formatBirthdayNames,
  formatDateLabel,
  getBirthdaysForDate,
} from '../birthdays.js';

describe('birthday registry', () => {
  it('registers the known birthdays', () => {
    const byName = new Map(BIRTHDAYS.map((entry) => [entry.name, entry]));
    expect(byName.get('Lindsey')).toEqual({ name: 'Lindsey', month: 8, day: 15 });
    expect(byName.get('Ryan')).toEqual({ name: 'Ryan', month: 4, day: 3 });
    expect(byName.get('Sterling')).toEqual({ name: 'Sterling', month: 12, day: 7 });
    expect(byName.get('Jacob')).toEqual({ name: 'Jacob', month: 4, day: 3 });
    expect(byName.get('Obama')).toEqual({ name: 'Obama', month: 8, day: 4 });
    expect(BIRTHDAYS).toHaveLength(5);
  });

  it('finds every birthday sharing the same day', () => {
    const aprilThird = getBirthdaysForDate(4, 3);
    expect(aprilThird.map((entry) => entry.name).sort()).toEqual(['Jacob', 'Ryan']);
  });

  it('returns an empty list when nobody has a birthday that day', () => {
    expect(getBirthdaysForDate(2, 29)).toEqual([]);
  });

  it('formats single birthdays by name', () => {
    expect(formatBirthdayMessage(8, 15)).toBe('Happy Birthday, Lindsey!');
    expect(formatBirthdayMessage(12, 7)).toBe('Happy Birthday, Sterling!');
  });

  it('formats shared birthday days with every name', () => {
    const message = formatBirthdayMessage(4, 3);
    expect(message).toContain('Ryan');
    expect(message).toContain('Jacob');
    expect(message).toBe('Happy Birthday, Ryan and Jacob!');
  });

  it('falls back to a generic message on a day without birthdays', () => {
    expect(formatBirthdayMessage(1, 1)).toBe(
      'No birthdays today, but the wise old snake still makes a wish.',
    );
  });

  it('formats name lists naturally', () => {
    const [first, second] = getBirthdaysForDate(4, 3);
    expect(formatBirthdayNames([first])).toBe(first.name);
    expect(formatBirthdayNames([first, second])).toBe(`${first.name} and ${second.name}`);
    expect(formatBirthdayNames([])).toBe('');
  });

  it('labels calendar dates with month names', () => {
    expect(formatDateLabel(8, 4)).toBe('August 4');
  });

  it('keeps cell names compact for tight calendar boxes', () => {
    expect(formatBirthdayCellNames(getBirthdaysForDate(4, 3))).toBe('Ryan & Jacob');
    expect(formatBirthdayCellNames(getBirthdaysForDate(8, 15))).toBe('Lindsey');

    const augustFourth = getBirthdaysForDate(8, 4);
    expect(formatBirthdayCellNames([...augustFourth, ...getBirthdaysForDate(4, 3)])).toBe(
      'Obama & Ryan +1',
    );
  });
});
