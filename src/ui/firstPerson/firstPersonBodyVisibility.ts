import type { FirstPersonBillboard } from './firstPersonTypes.js';

export const FIRST_PERSON_HIDDEN_SELF_BODY_SEGMENTS = 4;

export function shouldHideFirstPersonSelfBodyBillboard(billboard: FirstPersonBillboard): boolean {
  return (
    billboard.kind === 'snake-body' &&
    typeof billboard.segmentIndex === 'number' &&
    billboard.segmentIndex <= FIRST_PERSON_HIDDEN_SELF_BODY_SEGMENTS
  );
}
