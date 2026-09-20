import { CountingQuest } from './countingQuest.js';

export default new CountingQuest(
  'eat-5-apples',
  'Novice Eater',
  'Eat 5 apples',
  'applesEaten',
  5,
  (runtime) => runtime.addScore(10),
);
