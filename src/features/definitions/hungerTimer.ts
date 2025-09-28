import { Feature } from "../feature.js";
import type SnakeScene from "../../scenes/snakeScene.js";

class HungerTimerFeature extends Feature {
  constructor() {
    super("hungerTimer", "Hunger Timer");
  }

  override onRegister(scene: SnakeScene): void {
    scene.setFlag("timeSinceEat", 0);
  }

  override onTick(scene: SnakeScene): void {
    const current = scene.getFlag<number>("timeSinceEat") ?? 0;
    scene.setFlag("timeSinceEat", current + 1);
  }

  override onAppleEaten(scene: SnakeScene): void {
    scene.setFlag("timeSinceEat", 0);
  }
}

export default new HungerTimerFeature();
