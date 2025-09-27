// AI Generated, replace

import type SnakeScene from "../scenes/SnakeScene";
import Phaser from "phaser";

export type Feature = {
  id: string;
  label: string;
  onRegister?(s: SnakeScene): void;
  onTick?(s: SnakeScene): void;
  onRender?(s: SnakeScene, g: Phaser.GameObjects.Graphics): void;
  onAppleEaten?(s: SnakeScene): void;
  onGameOver?(s: SnakeScene): void;
};

const features: Feature[] = [];
export function registerFeature(f: Feature){ features.push(f); }
export function callFeatureHooks<K extends keyof Feature>(hook: K, ...args: any[]){
  for(const f of features){ (f[hook] as any)?.(...args); }
}

// Built-ins for demo
import "../features/coreScore";
import "../features/wrapWall";
import "../features/bonusApple";
export function registerBuiltInFeatures(_s: SnakeScene){ /* side effects already registered */ }
