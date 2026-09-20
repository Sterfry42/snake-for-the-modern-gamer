import { Feature } from '../feature.js';
import type SnakeScene from '../../scenes/snakeScene.js';
import { ChoicePopup, type ChoiceOption } from '../../ui/choicePopup.js';
import { i18n } from '../../i18n/i18nManager.js';
import {
  BACKGROUNDS,
  CLASSES,
  FAITHS,
  getCharacterCreationCardDescription,
  type CharacterCreationOption,
} from '../characterCreationDefinitions.js';

class ReligionChoiceFeature extends Feature {
  private popup?: ChoicePopup;
  private flowActive = false;

  constructor() {
    super('religionChoice', i18n.getFeatureString('startReligionTitle'));
  }

  override onRegister(scene: SnakeScene): void {
    if ((scene as unknown as { chosenReligionId: string | null }).chosenReligionId) return;
    this.popup = new ChoicePopup(scene);
    this.scheduleChoiceFlow(scene);
  }

  override onGameOver(scene: SnakeScene): void {
    this.flowActive = false;
    this.popup?.hide();
    scene.resetStartingChoices();
    this.scheduleChoiceFlow(scene);
  }

  private scheduleChoiceFlow(scene: SnakeScene): void {
    scene.time.delayedCall(30, () => {
      if (
        (scene as unknown as { titleVisible: boolean }).titleVisible ||
        !scene.getFlag<boolean>('run.startChoicesReady')
      ) {
        this.scheduleChoiceFlow(scene);
        return;
      }
      scene.paused = true;
      scene.skillTree.hideOverlay();
      this.showChoiceFlow(scene);
    });
  }

  private showChoiceFlow(scene: SnakeScene): void {
    if (this.flowActive) return;
    this.flowActive = true;
    this.popup ??= new ChoicePopup(scene);
    const rng = (scene.random?.bind(scene) ?? Math.random) as () => number;
    const show = (
      title: string,
      options: readonly CharacterCreationOption[],
      choose: (option: CharacterCreationOption) => void,
    ): void => {
      const candidates = pickN(options, 3, rng);
      const cards: ChoiceOption[] = candidates.map((option) => ({
        id: option.id,
        title: option.name,
        description: getCharacterCreationCardDescription(option),
      }));
      this.popup?.show(title, cards, (id) => {
        const chosen = options.find((option) => option.id === id);
        if (chosen) choose(chosen);
      });
    };
    const showClass = (): void =>
      show(i18n.getFeatureString('classTitle'), CLASSES, (chosen) => {
        scene.setClassChoice(chosen.id, chosen.mods);
        scene.setFlag('run.startChoicesReady', undefined);
        scene.paused = false;
        this.flowActive = false;
        this.popup?.hide();
      });
    const showBackground = (): void =>
      show(i18n.getFeatureString('backgroundTitle'), BACKGROUNDS, (chosen) => {
        scene.setBackgroundChoice(chosen.id, chosen.mods);
        showClass();
      });
    show(i18n.getFeatureString('faithTitle'), FAITHS, (chosen) => {
      scene.setReligionChoice(chosen.id, chosen.mods);
      showBackground();
    });
  }
}

function pickN<T>(arr: readonly T[], n: number, rng: () => number): T[] {
  const pool = arr.slice();
  const out: T[] = [];
  while (out.length < Math.min(n, pool.length)) {
    const i = Math.floor(rng() * pool.length);
    out.push(pool.splice(i, 1)[0]!);
  }
  return out;
}

export default new ReligionChoiceFeature();
