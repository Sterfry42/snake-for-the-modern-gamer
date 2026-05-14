import { registerFeature } from '../systems/features';

registerFeature({
  id: 'hunger-timer',
  label: 'Hunger Timer',
  onRegister: (s) => {
    s.flags['timeSinceEat'] = 0;
  },
  onActionStep: (s) => {
    s.flags['timeSinceEat'] = ((s.flags['timeSinceEat'] || 0) as number) + 1;
  },
  onTick: () => {},
  onRender: (s) => {
    // Render logic if needed
  },
  onAppleEaten: (s) => {
    s.flags['timeSinceEat'] = 0;
  },
  onGameOver: (s) => {
    // Cleanup logic if needed
  },
});
