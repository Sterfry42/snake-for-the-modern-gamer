import Phaser from "phaser";
import { registerNpc } from "../../npcs.js";

registerNpc({
    id: "nice-dennis",
    position: new Phaser.Math.Vector2(10, 5),
    dialogue: [
        "Hello there, traveler!",
        "Be careful... I've heard unsettling rumors about someone who looks like me.",
        "They call him... Freak Dennis. He's not as friendly as I am."
    ]
});