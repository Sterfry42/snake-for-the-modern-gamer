import { registerQuest } from "../../quests.js";

registerQuest({
    id: "eat-5-apples",
    label: "Novice Eater",
    description: "Eat 5 apples",
    isCompleted: (s) => s.flags["applesEaten"] >= 5,
    onReward: (s) => s.addScore(10),
});