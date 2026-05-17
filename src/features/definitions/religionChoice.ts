import { Feature } from '../feature.js';
import type SnakeScene from '../../scenes/snakeScene.js';
import { ChoicePopup, type ChoiceOption } from '../../ui/choicePopup.js';
import { i18n } from '../../i18n/i18nManager.js';

type Mods = {
  tickDelayScalar?: number;
  wallSenseBonus?: number;
  seismicPulseBonus?: number;
  invulnerabilityBonus?: number;
  regenerator?: { interval: number; amount: number };
  phoenixCharges?: number;
  masonryEnabled?: boolean;
  shrineBlessing?: boolean;
  yokaiInsight?: boolean;
  spiritualLength?: boolean;
};

type Religion = { id: string; name: string; description: string; mods: Mods };
type Background = Religion;
type ClassSpec = Religion;

// Uses real-world (historical) religion names purely as in‑game flavor labels.
// Descriptions are neutral and reference only game effects.
const RELIGIONS: Religion[] = [
  {
    id: 'christianity',
    name: 'Christianity',
    description: 'Gameplay bonus: +1 extra life charge.',
    mods: { phoenixCharges: 1 },
  },
  {
    id: 'hellenism',
    name: 'Ancient Greek (Hellenism)',
    description: 'Gameplay bonus: +1 seismic pulse radius.',
    mods: { seismicPulseBonus: 1 },
  },
  {
    id: 'norse',
    name: 'Norse Paganism',
    description: 'Gameplay bonus: masonry building enabled.',
    mods: { masonryEnabled: true },
  },
  {
    id: 'egyptian',
    name: 'Ancient Egyptian Religion',
    description: 'Gameplay bonus: +2 wall sense, +1 invulnerability on apple.',
    mods: { wallSenseBonus: 2, invulnerabilityBonus: 1 },
  },
  {
    id: 'zoroastrianism',
    name: 'Zoroastrianism',
    description: 'Gameplay bonus: move 10% faster.',
    mods: { tickDelayScalar: 0.9 },
  },
  {
    id: 'mesopotamian',
    name: 'Ancient Mesopotamian Religion',
    description: 'Gameplay bonus: regenerate +1 length every 24 ticks.',
    mods: { regenerator: { interval: 24, amount: 1 } },
  },
  {
    id: 'kami',
    name: 'Kami Worship',
    description: 'Gameplay bonuses: periodic shrine blessings, yokai insight, and passive spiritual length growth.',
    mods: { shrineBlessing: true, yokaiInsight: true, spiritualLength: true },
  },
];

const BACKGROUNDS: Background[] = [
  {
    id: 'noble',
    name: 'Noble',
    description: 'Gameplay bonus: +1 invulnerability on apple.',
    mods: { invulnerabilityBonus: 1 },
  },
  {
    id: 'artisan',
    name: 'Artisan',
    description: 'Gameplay bonus: masonry enabled.',
    mods: { masonryEnabled: true },
  },
  {
    id: 'hermit',
    name: 'Hermit',
    description: 'Gameplay bonus: regen +1 length every 30 ticks.',
    mods: { regenerator: { interval: 30, amount: 1 } },
  },
  {
    id: 'scout',
    name: 'Scout',
    description: 'Gameplay bonus: +1 wall sense.',
    mods: { wallSenseBonus: 1 },
  },
  {
    id: 'runner',
    name: 'Runner',
    description: 'Gameplay bonus: 5% faster movement.',
    mods: { tickDelayScalar: 0.95 },
  },
  {
    id: 'sapper',
    name: 'Sapper',
    description: 'Gameplay bonus: +1 seismic pulse radius.',
    mods: { seismicPulseBonus: 1 },
  },
];

const CLASSES: ClassSpec[] = [
  {
    id: 'warrior',
    name: 'Warrior',
    description: 'Gameplay bonus: +1 extra life charge.',
    mods: { phoenixCharges: 1 },
  },
  {
    id: 'seer',
    name: 'Seer',
    description: 'Gameplay bonus: +1 wall sense, +1 seismic radius.',
    mods: { wallSenseBonus: 1, seismicPulseBonus: 1 },
  },
  {
    id: 'mystic',
    name: 'Mystic',
    description: 'Gameplay bonus: +1 invulnerability on apple.',
    mods: { invulnerabilityBonus: 1 },
  },
  {
    id: 'builder',
    name: 'Builder',
    description: 'Gameplay bonus: masonry enabled and 5% slower (heavier).',
    mods: { masonryEnabled: true, tickDelayScalar: 1.05 },
  },
  {
    id: 'ranger',
    name: 'Ranger',
    description: 'Gameplay bonus: 10% faster.',
    mods: { tickDelayScalar: 0.9 },
  },
  {
    id: 'regenerator',
    name: 'Regenerator',
    description: 'Gameplay bonus: regen +1 length every 20 ticks.',
    mods: { regenerator: { interval: 20, amount: 1 } },
  },
];

class ReligionChoiceFeature extends Feature {
  private popup?: ChoicePopup;
  private flowActive = false;

  constructor() {
    super('religionChoice', i18n.getFeatureString('startReligionTitle'));
  }

  override onRegister(scene: SnakeScene): void {
    // Only show once per run.
    if ((scene as any).chosenReligionId) {
      return;
    }
    this.popup = new ChoicePopup(scene);
    this.scheduleChoiceFlow(scene);
  }

  override onGameOver(scene: SnakeScene): void {
    this.flowActive = false;
    this.popup?.hide();
    (scene as any).resetStartingChoices?.();
    this.scheduleChoiceFlow(scene);
  }

  private scheduleChoiceFlow(scene: SnakeScene): void {
    scene.time.delayedCall(30, () => {
      if ((scene as any).titleVisible || !scene.getFlag<boolean>('run.startChoicesReady')) {
        this.scheduleChoiceFlow(scene);
        return;
      }
      scene.paused = true;
      scene.skillTree.hideOverlay();
      this.showChoiceFlow(scene);
    });
  }

  private showChoiceFlow(scene: SnakeScene): void {
    if (this.flowActive) {
      return;
    }
    this.flowActive = true;
    this.popup ??= new ChoicePopup(scene);
    const rng = (scene.random?.bind(scene) ?? Math.random) as () => number;
    const showReligion = () => {
      const candidates = pickN(RELIGIONS, 3, rng);
      const options: ChoiceOption[] = candidates.map((r) => ({
        id: r.id,
        title: r.name,
        description: r.description,
      }));
      this.popup?.show(i18n.getFeatureString('faithTitle'), options, (id) => {
        scene.paused = true;
        const chosen = RELIGIONS.find((r) => r.id === id);
        if (chosen) {
          (scene as any).setReligionChoice?.(chosen.id, chosen.mods);
          scene.juice.skillTreeOpened();
          showBackground();
        }
      });
    };

    const showBackground = () => {
      const candidates = pickN(BACKGROUNDS, 3, rng);
      const options: ChoiceOption[] = candidates.map((b) => ({
        id: b.id,
        title: b.name,
        description: b.description,
      }));
      this.popup?.show(i18n.getFeatureString('backgroundTitle'), options, (id) => {
        scene.paused = true;
        const chosen = BACKGROUNDS.find((b) => b.id === id);
        if (chosen) {
          (scene as any).setBackgroundChoice?.(chosen.id, chosen.mods);
          scene.juice.skillTreeOpened();
          showClass();
        }
      });
    };

    const showClass = () => {
      const candidates = pickN(CLASSES, 3, rng);
      const options: ChoiceOption[] = candidates.map((c) => ({
        id: c.id,
        title: c.name,
        description: c.description,
      }));
      this.popup?.show(i18n.getFeatureString('classTitle'), options, (id) => {
        scene.paused = true;
        const chosen = CLASSES.find((c) => c.id === id);
        if (chosen) {
          (scene as any).setClassChoice?.(chosen.id, chosen.mods);
          scene.juice.skillTreeOpened();
          scene.setFlag('run.startChoicesReady', undefined);
          scene.paused = false;
          this.flowActive = false;
          this.popup?.hide();
        }
      });
    };
    showReligion();
  }
}

function pickN<T>(arr: readonly T[], n: number, rng: () => number): T[] {
  const pool = arr.slice();
  const out: T[] = [];
  while (out.length < Math.min(n, pool.length)) {
    const i = Math.floor(rng() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

export default new ReligionChoiceFeature();
