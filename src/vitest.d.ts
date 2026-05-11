/// <reference types="vitest/globals" />
declare global {
  namespace Jest {
    interface Matchers<R> {
      toBe(expected: R): void;
      toEqual(expected: R): void;
      toBeDefined(): void;
      toBeNull(): void;
      toBeUndefined(): void;
      toBeTruthy(): void;
      toBeFalsy(): void;
    }
  }
}