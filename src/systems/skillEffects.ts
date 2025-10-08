import type { SkillEffect, SkillEffectContext } from "./skillTypes.js";

export function applySkillEffect(effect: SkillEffect, context: SkillEffectContext): void {
  switch (effect.type) {
    case "tickDelayScalar": {
      context.system.applyTickDelayScalar(effect.factor, effect.sourceId);
      break;
    }
    case "extraLifeCharge": {
      context.system.addExtraLives(effect.count);
      context.runtime.notifyExtraLifeGained();
      break;
    }
    case "scoreMultiplier": {
      context.system.setScoreMultiplier(effect.multiplier);
      break;
    }
    case "scoreMultiplierBonus": {
      context.system.addScoreMultiplierBonus(effect.bonus);
      break;
    }
    case "setFlag": {
      context.system.applyFlagEffect(effect);
      break;
    }
    case "instantGrow": {
      context.runtime.growSnake(effect.segments);
      break;
    }
    case "manaEnable": {
      context.system.enableMana({ max: effect.max, regen: effect.regen });
      break;
    }
    case "manaUpgrade": {
      context.system.upgradeMana({ maxBonus: effect.maxBonus, regenBonus: effect.regenBonus });
      break;
    }
    case "unlockArcanePulse": {
      context.system.unlockArcanePulse();
      break;
    }
    case "unlockArcaneVeil": {
      context.system.unlockArcaneVeil();
      break;
    }
    case "registerSpell": {
      console.info(`[Skills] Registered spell '${effect.spellId}'. (Effect implementation pending.)`);
      break;
    }
    case "statModifier": {
      console.info(`[Skills] Applied stat modifier '${effect.stat}' by ${effect.value}. (Effect implementation pending.)`);
      break;
    }
    case "unlockMechanic": {
      console.info(`[Skills] Unlocked mechanic '${effect.mechanic}'. ${effect.note ?? "(Effect implementation pending.)"}`);
      break;
    }
    case "placeholder": {
      console.info(`[Skills] Placeholder effect triggered: ${effect.note}`);
      break;
    }
    default: {
      const exhaustive: never = effect;
      console.warn("Unhandled skill effect", exhaustive);
    }
  }
}
