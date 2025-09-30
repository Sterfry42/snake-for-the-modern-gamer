import { Feature } from "../feature.js";
import type SnakeScene from "../../scenes/snakeScene.js";

class WrapWallFeature extends Feature {
  constructor() {
    super("wrapWall", "Wrap at edges");
  }

  override onRegister(scene: SnakeScene): void {
    scene.setTeleport(true);
  }
}

export default new WrapWallFeature();
