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
    super('archaeology.fossil-hunter', 'Fossil Hunter', 'Excavate 5 fossil fragments');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'archaeology:fragmentFound') >= 5;
  }

  protected override baselineKeys(): readonly string[] {
    return ['archaeology:fragmentFound'];
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
    super('archaeology.assembly-line', 'Assembly Line', 'Assemble 3 complete fossils');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'archaeology:fossilAssembled') >= 3;
  }

  protected override baselineKeys(): readonly string[] {
    return ['archaeology:fossilAssembled'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(200);
    runtime.addItem('amulet-phoenix', 1);
  }
}

/**
 * Museum Curator Quest
 *
 * Build your museum to a certain size.
 */
class MuseumCuratorQuest extends Quest {
  constructor() {
    super('archaeology.museum-curator', 'Museum Curator', 'Complete 5 fossil sets');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'archaeology:museumExhibitUnlocked') >= 5;
  }

  protected override baselineKeys(): readonly string[] {
    return ['archaeology:museumExhibitUnlocked'];
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
    return this.progressSinceAccept(runtime, 'archaeology:depthReached') >= 20;
  }

  protected override baselineKeys(): readonly string[] {
    return ['archaeology:depthReached'];
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
    return this.progressSinceAccept(runtime, 'archaeology:chainReached') >= 10;
  }

  protected override baselineKeys(): readonly string[] {
    return ['archaeology:chainReached'];
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
    super('archaeology.legendary-explorer', 'Legendary Explorer', 'Recover a legendary artifact');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'archaeology:legendaryArtifact') >= 1;
  }

  protected override baselineKeys(): readonly string[] {
    return ['archaeology:legendaryArtifact'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(1000);
    runtime.addItem('amulet-scavenger', 1);
  }
}

/**
 * Museum Master Quest
 *
 * Complete all fossil sets.
 */
class MuseumMasterQuest extends Quest {
  constructor() {
    super('archaeology.museum-master', 'Museum Master', 'Complete all fossil sets');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'archaeology:museumComplete') >= 1;
  }

  protected override baselineKeys(): readonly string[] {
    return ['archaeology:museumComplete'];
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
