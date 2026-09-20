/**
 * Birthday Registry
 *
 * The single source of truth for in-game birthdays. The wise old snake
 * keeps its own ledger, but this is the one it actually signs.
 */

export interface Birthday {
  name: string;
  /** Calendar month, 1 (January) through 12 (December). */
  month: number;
  /** Day of the month, 1 through 31. */
  day: number;
}

/** Everyone whose birthday we celebrate. Multiple entries may share a day. */
export const BIRTHDAYS: readonly Birthday[] = [
  { name: 'Lindsey', month: 8, day: 15 },
  { name: 'Ryan', month: 4, day: 3 },
  { name: 'Sterling', month: 12, day: 7 },
  { name: 'Jacob', month: 4, day: 3 },
  { name: 'Obama', month: 8, day: 4 },
];

export const MONTH_NAMES: readonly string[] = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Every registered birthday that falls on the given month (1-12) and day.
 * Returns an empty list when nobody is having a birthday that day.
 */
export function getBirthdaysForDate(month: number, day: number): readonly Birthday[] {
  return BIRTHDAYS.filter((entry) => entry.month === month && entry.day === day);
}

/**
 * Turns a list of birthdays into a natural name list, so shared birthday
 * days read right: "Ryan", "Ryan and Jacob", "Lindsey, Obama and Sterling".
 */
export function formatBirthdayNames(birthdays: readonly Birthday[]): string {
  const names = birthdays.map((entry) => entry.name);
  if (names.length === 0) {
    return '';
  }
  if (names.length === 1) {
    return names[0];
  }
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** "April 3" style label for a calendar date. */
export function formatDateLabel(month: number, day: number): string {
  return `${MONTH_NAMES[month - 1]} ${day}`;
}

/**
 * Generic birthday message for a particular day, built from whoever's
 * birthday it is. Shared by the in-game banner and the pause menu calendar.
 */
export function formatBirthdayMessage(month: number, day: number): string {
  const birthdays = getBirthdaysForDate(month, day);
  if (birthdays.length === 0) {
    return 'No birthdays today, but the wise old snake still makes a wish.';
  }
  return `Happy Birthday, ${formatBirthdayNames(birthdays)}!`;
}

/**
 * Compact name list for tight calendar cells: "Ryan & Jacob",
 * "Ryan & Jacob +1".
 */
export function formatBirthdayCellNames(birthdays: readonly Birthday[]): string {
  const names = birthdays.map((entry) => entry.name);
  if (names.length <= 2) {
    return names.join(' & ');
  }
  return `${names.slice(0, 2).join(' & ')} +${names.length - 2}`;
}
