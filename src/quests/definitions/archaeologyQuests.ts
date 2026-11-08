import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

/**
 * First Dig Quest
 *
 * Introduction to archaeology: visit your first dig site.
 */
class FirstDigQuest extends Quest {
  constructor() {
    super('archaeology.first-dig', 'First Dig', 'Visit a moleman dig site');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'archaeology:enteredDigSite') >= 1;
  }

  protected override baselineKeys(): readonly string[] {
    return ['archaeology:enteredDigSite'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(50);
    runtime.addItem('rope', 3);
  }
}

/**
 * Fossil Hunter Quest
 *
 * Excavate your first fossil fragment.
 */
class FossilHunterQuest extends Quest {
  constructor() {
    super('archaeology.fossil-hunter', 'Fossil Hunter', 'Complete 5 excavation matches');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'archaeology:matchesMade') >= 5;
  }

  protected override baselineKeys(): readonly string[] {
    return ['archaeology:matchesMade'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(100);
    runtime.addItem('helm-seer', 1);
  }
}

/**
 * Assembly Line Quest
 *
 * Complete your first fossil assembly.
 */
class AssemblyLineQuest extends Quest {
  constructor() {
    super('archaeology.assembly-line', 'Assembly Line', 'Finish 3 excavations');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'archaeology:excavationsCompleted') >= 3;
  }

  protected override baselineKeys(): readonly string[] {
    return ['archaeology:excavationsCompleted'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(200);
    runtime.addItem('amulet-phoenix', 1);
  }
}

/**
 * Museum Curator Quest
 *
 * Recover real artifacts from excavations.
 */
class MuseumCuratorQuest extends Quest {
  constructor() {
    super('archaeology.museum-curator', 'Museum Curator', 'Recover 2 archaeology artifacts');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'archaeology:artifactsRecovered') >= 2;
  }

  protected override baselineKeys(): readonly string[] {
    return ['archaeology:artifactsRecovered'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(500);
    runtime.addItem('belt-regenerator', 1);
  }
}

/**
 * Deep Diver Quest
 *
 * Reach deep excavation levels.
 */
class DeepDiverQuest extends Quest {
  constructor() {
    super('archaeology.deep-diver', 'Deep Diver', 'Reach depth 20 in archaeology');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return (runtime.getFlag<number>('archaeology:maxDepth') ?? 0) >= 20;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(300);
    runtime.addItem('gloves-mason', 1);
  }
}

/**
 * Chain Reaction Quest
 *
 * Achieve high chain combos in archaeology.
 */
class ChainReactionQuest extends Quest {
  constructor() {
    super('archaeology.chain-reaction', 'Chain Reaction', 'Achieve a chain of 10');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return (runtime.getFlag<number>('archaeology:bestChain') ?? 0) >= 10;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(250);
    runtime.addItem('cloak-veil', 1);
  }
}

/**
 * Legendary Explorer Quest
 *
 * Find a legendary artifact.
 */
class LegendaryExplorerQuest extends Quest {
  constructor() {
    super(
      'archaeology.legendary-explorer',
      'Legendary Explorer',
      'Recover an archaeology artifact',
    );
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'archaeology:artifactsRecovered') >= 1;
  }

  protected override baselineKeys(): readonly string[] {
    return ['archaeology:artifactsRecovered'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(1000);
    runtime.addItem('amulet-scavenger', 1);
  }
}

/**
 * Museum Master Quest
 *
 * Master excavation and discovery.
 */
class MuseumMasterQuest extends Quest {
  constructor() {
    super(
      'archaeology.museum-master',
      'Museum Master',
      'Complete 10 excavations and recover 5 artifacts',
    );
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return (
      this.progressSinceAccept(runtime, 'archaeology:excavationsCompleted') >= 10 &&
      this.progressSinceAccept(runtime, 'archaeology:artifactsRecovered') >= 5
    );
  }

  protected override baselineKeys(): readonly string[] {
    return ['archaeology:excavationsCompleted', 'archaeology:artifactsRecovered'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(5000);
    runtime.addItem('amulet-phoenix', 1);
    runtime.addItem('belt-regenerator', 1);
  }
}

export {
  FirstDigQuest,
  FossilHunterQuest,
  AssemblyLineQuest,
  MuseumCuratorQuest,
  DeepDiverQuest,
  ChainReactionQuest,
  LegendaryExplorerQuest,
  MuseumMasterQuest,
};

// Register all archaeology challenges through the built-in quest loader.
export default [
  new FirstDigQuest(),
  new FossilHunterQuest(),
  new AssemblyLineQuest(),
  new MuseumCuratorQuest(),
  new DeepDiverQuest(),
  new ChainReactionQuest(),
  new LegendaryExplorerQuest(),
  new MuseumMasterQuest(),
];
