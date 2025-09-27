import Phaser from "phaser";
import { registerNpc } from "../../npcs.js";

registerNpc({
    id: "wise-old-snake",
    position: new Phaser.Math.Vector2(25, 5),
    dialogue: [
        "Hssss... Greetings, young one.",
        "To grow long, one must eat many apples.",
        "But to grow wise, one must learn to survive even when hungry.",
        "Go now... and sssseek your destiny."
    ]
});