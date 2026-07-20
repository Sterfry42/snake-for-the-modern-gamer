import { CountingQuest } from './countingQuest.js';

export default new CountingQuest(
  'eat-12-apples',
  'Hungry',
  'Eat 12 apples',
  'applesEaten',
  12,
  (runtime) => runtime.addScore(25),
);
