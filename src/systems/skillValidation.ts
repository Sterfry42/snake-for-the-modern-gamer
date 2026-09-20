import type { SkillPerkDefinition } from './skillTypes.js';

export function validateSkillDefinitions(definitions: readonly SkillPerkDefinition[]): string[] {
  const errors: string[] = [];
  const byId = new Map<string, SkillPerkDefinition>();
  for (const definition of definitions) {
    if (byId.has(definition.id)) errors.push(`Duplicate perk id '${definition.id}'.`);
    byId.set(definition.id, definition);
    if (definition.costByRank.length === 0) errors.push(`Perk '${definition.id}' has no ranks.`);
    if (
      definition.rankDescriptions.length !== definition.costByRank.length ||
      definition.effectsByRank.length !== definition.costByRank.length
    ) {
      errors.push(`Rank data mismatch for perk '${definition.id}'.`);
    }
    if (!Number.isFinite(definition.position.x) || !Number.isFinite(definition.position.y)) {
      errors.push(`Perk '${definition.id}' has an invalid position.`);
    }
    if (definition.kind === 'combo' && !definition.secondaryBranch) {
      errors.push(`Combo perk '${definition.id}' must declare a secondary branch.`);
    }
    if (definition.grantableAtStart && definition.costByRank.length !== 1) {
      errors.push(`Starting perk '${definition.id}' must be rank-one safe.`);
    }
  }
  for (const definition of definitions) {
    for (const requirement of definition.requires ?? []) {
      if (!byId.has(requirement))
        errors.push(`Perk '${definition.id}' requires unknown perk '${requirement}'.`);
      if (requirement === definition.id) errors.push(`Perk '${definition.id}' requires itself.`);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) {
      errors.push(`Prerequisite cycle includes '${id}'.`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const requirement of byId.get(id)?.requires ?? []) visit(requirement);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of byId.keys()) visit(id);
  return [...new Set(errors)];
}

export function assertValidSkillDefinitions(definitions: readonly SkillPerkDefinition[]): void {
  const errors = validateSkillDefinitions(definitions);
  if (errors.length > 0) throw new Error(`Invalid skill catalog:\n${errors.join('\n')}`);
}
