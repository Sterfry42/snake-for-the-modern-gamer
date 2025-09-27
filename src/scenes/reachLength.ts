import { registerQuest } from "../../quests.js";

registerQuest({
    id: "reach-length-10",
    label: "Getting Longer",
    description: "Grow to a length of 10",
    isCompleted: (s) => s.snake.length >= 10,
    onReward: (s) => s.addScore(15),
});