import type { FirstPersonBillboard } from './firstPersonTypes.js';

// The head never enters the first-person billboard list. Hide only the two immediate
// trailing segments that can overlap the camera while it moves between Snake steps.
export const FIRST_PERSON_HIDDEN_SELF_BODY_SEGMENTS = 2;

export function shouldHideFirstPersonSelfBodyBillboard(billboard: FirstPersonBillboard): boolean {
  return (
    billboard.kind === 'snake-body' &&
    typeof billboard.segmentIndex === 'number' &&
    billboard.segmentIndex <= FIRST_PERSON_HIDDEN_SELF_BODY_SEGMENTS
  );
}
