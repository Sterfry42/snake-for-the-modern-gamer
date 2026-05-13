# Spell Slot And Follower System Design

## Goal

Overhaul magic so `Q` is no longer hard-wired to one spell.

The player should eventually be able to open a spell tab, choose what the `Q` slot casts, and build toward summoner play. Summoning should not start as a one-off magic exception. It should sit on top of a general follower/partner system that also supports non-magical companions.

The first non-magic slice should be goblin hirelings:

- hire a goblin from a goblin camp;
- the goblin follows the snake across rooms;
- the goblin attacks enemies;
- goblins may also attack animals because goblins are not civic-minded;
- the goblin can occasionally pause the player with a companion quest prompt.

## Current State

`Q` currently appears to be handled in `SkillTreeManager.handleKeyDown()`.

Current behavior:

- if the key is not `q`, the skill tree manager ignores it;
- if paused, `q` is consumed;
- if Arcane Pulse is not unlocked, `spellFailed()` plays;
- if mana is insufficient, `spellFailed()` plays;
- otherwise `tryCastArcanePulse()` is called.

So the current system is not really a spell system. It is a single hard-coded spell hotkey with mana checks.

There is already some useful groundwork:

- `SkillEffectRegisterSpell` exists, but only logs a placeholder message.
- `SkillTreeStats` tracks mana and Arcane Pulse / Arcane Veil unlock state.
- Goblin camps, goblin faction standing, goblin shopkeepers, goblin guards, animals, and enemies already exist.

## Design Direction

Split the future system into three layers:

1. **Ability Registry**
   Defines castable abilities/spells/commands.

2. **Action Slot Binding**
   Stores what `Q` is bound to for the current run.

3. **Follower System**
   Owns companion actors, including summoned units and hired partners.

Magic should bind to the same slot system as companion commands. A summoner build should be able to bind `Q` to:

- summon creature;
- command active summon to attack;
- recall follower;
- swap follower stance;
- cast direct damage spell;
- cast defensive spell;
- cast utility spell.

## Spell Tab

The skill tree overlay should gain a new tab:

```text
Skills | Inventory | Map | Spells
```

The Spells tab is not just a list of unlocked spells. It is a loadout surface for action slots.

### MVP UI

For the first version, support only one action slot:

```text
Q Slot
Current: Arcane Pulse

[Arcane Pulse]
[Arcane Veil]
[Recall Follower]
[Command Follower]
[Summon Familiar] locked
```

Each row should show:

- ability name;
- type: spell, command, summon, passive;
- mana cost or cooldown;
- unlock source;
- short mechanical description;
- whether it can currently be bound.

Selecting a row binds it to `Q`.

### Later UI

Future action slots can be:

```ts
type ActionSlotId = "q" | "e-alt" | "mouse-right" | "quick-1" | "quick-2";
```

But the first implementation should keep only `q`. Avoid building a full action bar until there are enough abilities to justify it.

## Ability Model

Use a registry so skills, equipment, quests, factions, and followers can all unlock actions without each system owning key input.

```ts
type AbilityKind = "spell" | "summon" | "command" | "item" | "debug";

interface AbilityDefinition {
  id: string;
  label: string;
  kind: AbilityKind;
  description: string;
  iconKey?: string;
  manaCost?: number;
  cooldownTicks?: number;
  canBind(runtime: AbilityRuntime): boolean;
  canUse(runtime: AbilityRuntime): { ok: true } | { ok: false; reason: string };
  use(runtime: AbilityRuntime): AbilityUseResult;
}
```

Example ability ids:

- `arcane-pulse`
- `arcane-veil`
- `command-follower-attack`
- `recall-follower`
- `summon-rat-familiar`
- `summon-bone-snake`
- `dismiss-summon`

## Action Slot State

Store the current `Q` binding in flags first.

```ts
interface ActionSlotState {
  q?: string;
}
```

Flag:

```ts
flags["actions.slots"] = {
  q: "arcane-pulse"
}
```

The binding should survive save/load. If the saved ability is no longer available, fall back to the first available ability or leave the slot empty.

## Input Flow

`SkillTreeManager.handleKeyDown()` should stop owning the spell decision.

New direction:

1. Scene receives `q`.
2. Scene asks `ActionSlotController` for the bound `q` ability.
3. Controller validates the ability.
4. Controller checks mana/cooldown/follower state.
5. Ability executes.
6. UI/juice receives success or failure feedback.

Pseudo-flow:

```ts
if (key === "q") {
  const result = actionSlots.use("q");
  if (!result.ok) {
    juice.spellFailed();
    skillTreeOverlay.announce(result.reason, "#ff6b6b", 1800);
  }
  return true;
}
```

Arcane Pulse becomes just one registered ability.

## Follower System

Followers are actors attached to the player.

They are not normal enemies. They need their own state, behavior, rendering, and save data.

```ts
type FollowerKind = "hireling" | "summon" | "pet" | "escort" | "quest";

type FollowerStance =
  | "follow"
  | "guard"
  | "attack"
  | "hold"
  | "forage"
  | "flee";

interface FollowerInstance {
  id: string;
  definitionId: string;
  kind: FollowerKind;
  displayName: string;
  roomId: string;
  position: Vector2Like;
  health: number;
  maxHealth: number;
  factionId?: string;
  stance: FollowerStance;
  loyalty: number;
  hiredAtMs?: number;
  expiresAtMs?: number;
  flags: Record<string, unknown>;
}
```

Followers should be stored separately from enemies and animals:

```ts
flags["followers.instances"] = FollowerInstance[]
```

Later cleanup can move this into typed save data.

## Follower Manager

Add a `FollowerManager` owned by `SnakeGame`, similar to `EnemyManager` and `AnimalManager`.

Responsibilities:

- load/save follower instances;
- step followers each game tick;
- move followers between rooms with the player;
- decide target priorities;
- apply follower attacks;
- handle follower damage/death;
- emit UI flags for follower events;
- provide render snapshots to the scene.

Suggested API:

```ts
class FollowerManager {
  getFollowers(roomId: string): readonly FollowerInstance[];
  getAllFollowers(): readonly FollowerInstance[];
  hire(definitionId: string, roomId: string, position: Vector2Like): FollowerInstance;
  dismiss(followerId: string): void;
  setStance(followerId: string, stance: FollowerStance): void;
  step(context: FollowerStepContext): FollowerStepResult;
}
```

## Movement Rules

Follower movement should be simple at first.

MVP rules:

- follower tries to stay within 2-4 tiles of the snake head;
- if too far away in the same room, it pathfinds one tile toward the head;
- if the snake changes rooms, the follower appears near the entrance after a short delay;
- follower cannot occupy the snake head tile;
- follower should avoid walls, water unless allowed, and lethal hazards;
- follower should not cause player self-collision.

Do not make followers physically extend the snake body. They are separate actors.

### Teleport Catch-Up

If a follower is more than one room away, use catch-up teleport:

```ts
if (distanceRooms(follower.roomId, player.roomId) > 1) {
  follower.roomId = player.roomId;
  follower.position = nearestSafeTileBehindPlayer();
}
```

This avoids pathfinding across the whole world.

## Combat Rules

Followers need target preferences.

```ts
interface TargetPriority {
  enemies: number;
  hostileNpcs: number;
  animals: number;
  bosses: number;
}
```

Goblin hireling priority:

```ts
{
  enemies: 100,
  hostileNpcs: 90,
  animals: 55,
  bosses: 20
}
```

Goblin behavior:

- attacks normal enemies nearby;
- attacks hostile goblins only if the player has already made the camp violent;
- attacks animals if no enemy is available or if its personality is aggressive;
- avoids bosses unless directly commanded;
- may shoot or stab depending on implementation simplicity.

MVP attack:

- if adjacent to target, deal 1 damage or consume a weak enemy;
- if ranged, fire a simple projectile every N ticks;
- when it kills an animal, goblin faction may not care, but town/fisher/druid systems may later care.

## Friendly Fire And Body Blocking

MVP should avoid complex friendly fire.

Rules:

- followers cannot damage the player;
- follower projectiles should ignore the snake body;
- followers do not block the snake by default;
- enemies can damage followers;
- animals can flee followers.

Later difficulty modifiers can make followers block paths or accidentally hit things.

## Goblin Hireling MVP

Goblin camps already have shopkeepers and guards. Add a new shop option:

```text
Hire Goblin Knife Cousin - 35 score
Follows you around, stabs enemies, and makes animal populations nervous.
```

Requirements:

- goblin faction standing is not `violent`;
- player can afford the fee;
- only one hired goblin at a time for MVP.

Hire result:

```ts
followers.hire("goblin-knife-cousin", currentRoomId, goblinCamp.center);
flags["followers.activeGoblinHireling"] = true;
adjustFactionAlignment("goblin-camps", +1);
```

Possible names:

- Nib
- Crangle
- Motwick
- Scrip
- Ledgerbite

## Goblin Hireling Definition

```ts
const GOBLIN_HIRELING_DEFINITION = {
  id: "goblin-knife-cousin",
  label: "Goblin Knife Cousin",
  kind: "hireling",
  factionId: "goblin-camps",
  maxHealth: 2,
  attackDamage: 1,
  attackCooldownTicks: 6,
  targetPriority: {
    enemies: 100,
    hostileNpcs: 90,
    animals: 55,
    bosses: 20
  },
  defaultStance: "guard"
};
```

## Companion Quest Pauses

Followers should be able to interrupt the run with companion quest prompts, but this must be throttled.

Example trigger conditions:

- follower has been alive for 3 rooms;
- follower killed at least 2 enemies;
- follower killed an animal;
- player enters a goblin camp;
- follower loyalty is high or low;
- random chance passes.

Prompt shape:

```ts
interface CompanionQuestOffer {
  followerId: string;
  questId: string;
  title: string;
  pages: string[];
  acceptLabel: string;
  rejectLabel: string;
}
```

Scene behavior:

- pause the game;
- show dialogue using existing quest popup UI;
- accept starts a staged quest;
- reject may lower loyalty;
- after resolution, set a cooldown flag.

Suggested cooldown:

```ts
flags["followers.nextQuestOfferAtRoomsVisited"] = roomsVisited + 8;
```

## Example Goblin Companion Quest

Title: **The Knife Cousin's Other Knife**

Trigger:

- hired goblin has killed 2 enemies;
- player is at least 4 rooms away from the original camp.

Goblin line:

```text
I have remembered a second knife. It is buried in a place that owes me an apology.
```

Objective:

```text
Find the goblin's buried knife-cache and decide whether to give it back.
```

Resolution choices:

- return the knife: goblin gains damage or attack cooldown improves;
- keep the knife: player gets a small equipment reward, goblin loyalty drops;
- sell the knife at a goblin camp: score reward, faction alignment changes.

This establishes that companions can create small quest branches without being magical summons.

## Summoner Build Foundation

Once followers work, magical summons are just temporary followers.

Summon-specific fields:

```ts
interface SummonFollowerData {
  summonedByAbilityId: string;
  manaUpkeep?: number;
  durationTicks?: number;
  expiresAtTick?: number;
  maxInstances?: number;
}
```

Possible summoner abilities:

- `summon-rat-familiar`: cheap scout, attacks animals and weak enemies;
- `summon-bone-snake`: short-lived attacker that follows snake movement lines;
- `summon-lantern-wisp`: reveals nearby danger and pings quest markers;
- `summon-goblin-debt-collector`: faction-flavored summon unlocked by goblin debt quests;
- `command-minions`: tells all summons to attack the nearest hostile target.

Summoner build stats:

- max summons;
- summon duration;
- summon health;
- command cooldown;
- mana upkeep reduction;
- follower loyalty bonus;
- animal aggression reduction or increase depending on build flavor.

## Q Slot And Summoner Commands

Summoner play should make `Q` interesting.

Examples:

```text
Q: Summon Bone Snake
```

Casts a temporary follower.

```text
Q: Command Followers
```

All followers switch to `attack` and target nearby enemies.

```text
Q: Recall Followers
```

Pulls followers to the nearest safe tile behind the snake.

```text
Q: Swap Stance
```

Cycles `follow -> guard -> attack -> hold`.

The spell tab should allow the player to bind whichever command best fits their build.

## Rendering

Add follower rendering to `SnakeRenderer` or a sibling renderer.

Follower visual needs:

- sprite variant by type;
- health pip or flash on hit;
- small icon/marker when off-screen or catching up;
- distinct outline so followers are not confused with enemies;
- stance indicator for command mode later.

Goblin hireling can reuse or adapt goblin enemy/NPC palettes.

## UI And HUD

MVP HUD:

```text
Q: Arcane Pulse
Follower: Nib (Guard) ♥♥
```

If the player has no Q binding:

```text
Q: Unbound
```

Spell tab should make this obvious and actionable.

Failure messages:

- `Q slot is unbound.`
- `Not enough mana.`
- `No follower to command.`
- `Follower is down.`
- `Summon limit reached.`

## Save/Load

Save these via flags first:

```ts
flags["actions.slots"]
flags["actions.cooldowns"]
flags["followers.instances"]
flags["followers.nextQuestOfferAtRoomsVisited"]
```

Follower save data must include:

- definition id;
- display name;
- current room id;
- position;
- health;
- stance;
- loyalty;
- timers;
- quest flags.

## Implementation Slices

### Slice 1: Q Slot Registry

- Create ability definitions for Arcane Pulse and Arcane Veil.
- Add `ActionSlotController`.
- Store `flags["actions.slots"].q`.
- Change `q` input to use bound ability.
- Add Spells tab with bind buttons.
- Keep Arcane Pulse as default when unlocked.

### Slice 2: Follower Data Only

- Add `FollowerInstance` types.
- Add `FollowerManager`.
- Save/load follower flags.
- Add scene debug method or temporary cheat to spawn a follower.
- Render follower as a simple colored square or goblin sprite.

### Slice 3: Goblin Hireling

- Add goblin shop hire option.
- Hire one goblin follower.
- Follow player across rooms.
- Attack nearby enemies.
- Add basic follower health/death.

### Slice 4: Animals And Personality

- Goblin can target animals.
- Animals can flee.
- Killing animals can set event flags.
- Later quests/factions can react.

### Slice 5: Companion Quest Prompt

- Add companion quest offer checks.
- Pause and show dialogue.
- Start one staged companion quest.
- Add loyalty changes.

### Slice 6: Summoner Magic

- Add first summon spell.
- Summon creates a temporary follower.
- Add `Command Followers` and `Recall Followers` abilities.
- Add summoner skill tree perks.

## Open Questions

- Should followers be able to die permanently?
- Should hired goblins require wages over time?
- Should goblins become hostile if the player dismisses them in danger?
- Should animal killing affect a druid/fisher/forest faction later?
- Should magical summons count against the same follower limit as hirelings?
- Should `Q` be usable while menus are open for rebinding previews, or only in gameplay?
- Should follower collision ever block the snake?

## Design Rules

- Summons are followers, not bespoke spell particles.
- Followers are actors, not snake body segments.
- The Q slot is an action binding, not a spell hardcode.
- Goblin hirelings should prove the system before magic depends on it.
- Companion quests should be rare enough to feel special, not constant interruptions.
- Every follower should create at least two kinds of consequence: combat help, faction/social reaction, quest hook, economy cost, or world behavior.
