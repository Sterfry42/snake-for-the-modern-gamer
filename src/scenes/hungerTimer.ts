import { registerFeature } from "../systems/features";

registerFeature({
    id: "hunger-timer",
    label: "Hunger Timer",
    onRegister: (s) => { s.flags['timeSinceEat'] = 0; },
    onTick: (s) => {
        s.flags['timeSinceEat'] = ((s.flags['timeSinceEat'] || 0) as number) + 1; // increments every 100ms
    },
    onAppleEaten: (s) => {
        s.flags['timeSinceEat'] = 0;
    },
});