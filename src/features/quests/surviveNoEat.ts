import { registerQuest } from "../../../quests.js";

// 1 tick = 100ms, so 200 ticks = 20 seconds
const SURVIVAL_TIME_TICKS = 200;

registerQuest({
    id: "survive-20s-no-eat",
    label: "Fasting",
    description: "Survive for 20s without eating",
    isCompleted: (s) => (s.flags['timeSinceEat'] || 0) as number >= SURVIVAL_TIME_TICKS,
    onReward: (s) => s.addScore(20),
});