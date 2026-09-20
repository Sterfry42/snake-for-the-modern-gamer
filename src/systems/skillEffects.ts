import type { SkillEffect, SkillEffectContext } from './skillTypes.js';

export function applySkillEffect(effect: SkillEffect, context: SkillEffectContext): void {
  switch (effect.type) {
    case 'tickDelayScalar': {
      context.system.applyActionStepIntervalScalar(effect.factor, effect.sourceId);
      break;
    }
    case 'extraLifeCharge': {
      context.system.addExtraLives(effect.count);
      context.runtime.notifyExtraLifeGained();
      break;
    }
    case 'scoreMultiplier': {
      context.system.setScoreMultiplier(effect.multiplier);
      break;
    }
    case 'scoreMultiplierBonus': {
      context.system.addScoreMultiplierBonus(effect.bonus);
      break;
    }
    case 'setFlag': {
      context.system.applyFlagEffect(effect);
      break;
    }
    case 'instantGrow': {
      context.runtime.growSnake(effect.segments);
      break;
    }
    case 'manaEnable': {
      context.system.enableMana({ max: effect.max, regen: effect.regen });
      break;
    }
    case 'manaUpgrade': {
      context.system.upgradeMana({ maxBonus: effect.maxBonus, regenBonus: effect.regenBonus });
      break;
    }
    case 'unlockArcanePulse': {
      context.system.unlockArcanePulse();
      break;
    }
    case 'unlockArcaneVeil': {
      context.system.unlockArcaneVeil();
      break;
    }
    case 'registerSpell': {
      break;
    }
    case 'statModifier': {
      break;
    }
    case 'derivedStatModifier': {
      context.system.applyDerivedStatModifier(effect);
      break;
    }
    case 'unlockMechanic': {
      break;
    }
    case 'placeholder': {
      break;
    }
    default: {
      const exhaustive: never = effect;
      console.warn('Unhandled skill effect', exhaustive);
    }
  }
}
