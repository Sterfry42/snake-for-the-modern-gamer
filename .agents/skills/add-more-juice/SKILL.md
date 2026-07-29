---
name: add-more-juice
description: Guide for adding satisfying visual and audio feedback ("juice") to game events. Covers the JuiceManager architecture, core primitives (tones, particles, camera effects, overlays), how to add new juice methods, and the existing juice catalog organized by category.
---

# Add More Juice

When the user wants to make game events feel more satisfying — apple eats, level-ups, combat hits, UI interactions, ambient atmosphere — use this skill.

## What Is "Juice"?

In game dev, "juice" means the extra visual and audio polish that makes interactions feel responsive and satisfying: screen shake, particle bursts, sound effects, camera zooms, color flashes, floating labels, expanding rings, ambient sparkles, etc.

This game's juice lives in **one file**: `src/ui/juice.ts` (~8,800 lines). It's the `JuiceManager` class, instantiated as `this.juice` on `SnakeScene`.

## Architecture Overview

### The JuiceManager Class

```
src/ui/juice.ts
├── Types (ToneOptions, TweenState, BossMusicResult, etc.)
├── BOSS_MUSIC_REGISTRY (jason-statham boss music definition)
├── buildGenericBossMusic() (fallback boss music)
└── JuiceManager class
    ├── Constructor: AudioContext, masterGain, particleLayer (depth 25), overlayLayer (depth 30)
    ├── Core primitives (private helpers)
    ├── Public juice methods (one per game event)
    ├── Music systems (boss, title, card, archaeology, arcade, house, town, heaven, hell, powerup)
    ├── Ambient systems (cherry blossom, jade peak, unicorn glitter)
    └── Utility methods (playChord, playArpeggio, playRise, playFall, playWhoosh, etc.)
```

### Core Primitives (The Building Blocks)

Every juice method is a composition of these primitives:

| Primitive | Method | What It Does |
|---|---|---|
| **Tone** | `playTone({ frequency, duration, type, volume, frequencyEnd? })` | Creates a Web Audio oscillator with an exponential gain ramp-down |
| **Camera shake** | `kickCamera(intensity, duration)` | `cameras.main.shake(duration, intensity)` |
| **Camera zoom** | `punchZoom(targetZoom, duration)` | Zooms in then eases back to 1.0 (prevents drift) |
| **Particle burst** | `spawnBurst(x, y, { colors, count, radius })` | Spawns N circles that fade/scale to zero |
| **Expanding ring** | `ringPulse(x, y, color, startRadius, lineWidth, duration)` | Graphics-based expanding circle that fades |
| **Blast wave** | `blastWave(x, y, colors, baseRadius)` | 3 staggered ring pulses with color variation |
| **Floating label** | `floatingLabel(x, y, label, color, fontSize)` | Text that floats up and fades |
| **Screen flash** | `cameras.main.flash(duration, r, g, b, true)` | Full-screen color flash |
| **Screen tint** | `screenTint(color, alpha, duration)` | Rect-based overlay with tweened alpha |
| **Scanlines** | `screenScanlines()` | Retro scanline overlay |
| **Vignette** | `vignette` / `ensureVignette()` | Dark edge overlay |
| **Vignette pulse** | `vignettePulse()` | Vignette alpha burst |

### Layer System

| Layer | Depth | Purpose |
|---|---|---|
| `particleLayer` | 25 | Burst particles, ambient effects |
| `overlayLayer` | 30 | Rings, text, screen effects |

Elements on `overlayLayer` render above `particleLayer`.

## How to Add a New Juice Method

### Step 1: Decide What Event Needs Juice

Common event types that need juice:
- **Consumption**: apple eats, item use, food consumption
- **Scoring**: score changes, multipliers, combos
- **Combat**: hits, kills, damage taken, healing
- **Progression**: level-up, perk purchase, stat increase
- **UI**: button clicks, menu opens, tab switches
- **Ambient**: movement, biome atmosphere, weather
- **Transitions**: room changes, scene starts/ends
- **Special**: boss events, achievements, quest milestones

### Step 2: Pick the Right Primitives

A typical juice method combines 2-5 primitives:

```typescript
// Example pattern: a hit event
myNewEffect(worldX: number, worldY: number) {
  // 1. Sound — a punchy tone
  this.playTone({
    frequency: 200,
    frequencyEnd: 80,
    duration: 0.15,
    type: 'sawtooth',
    volume: 0.12,
  });

  // 2. Camera — subtle shake
  this.kickCamera(0.02, 80);

  // 3. Particles — burst at the hit location
  this.spawnBurst(worldX, worldY, {
    colors: [0xff6b6b, 0xff8f8f, 0xffc2c2],
    count: 10,
    radius: 20,
  });

  // 4. Expanding ring — shockwave
  this.ringPulse(worldX, worldY, 0xff6b6b, 8, 3, 200);
}
```

### Step 3: Write the Method

Place new methods **alphabetically** within their section in the class. Public methods go in the main body. Follow the existing naming convention: `camelCase` with descriptive names.

**Parameter patterns:**
- Most methods take `worldX: number, worldY: number` for positioning
- Some take event-specific params (e.g., `amount: number` for score, `streak: number` for combos)
- Optional params use `= defaultValue` syntax
- Type-specific variants use optional string params (e.g., `appleTypeId?: string`)

**Tone parameters (the most common):**
```typescript
this.playTone({
  frequency: number,       // Start frequency in Hz
  frequencyEnd?: number,   // End frequency (creates a sweep)
  duration: number,        // Duration in seconds
  type: OscillatorType,    // 'sine' | 'square' | 'sawtooth' | 'triangle'
  volume: number,          // 0.0 to ~0.2 (keep it subtle)
});
```

**Particle burst parameters:**
```typescript
this.spawnBurst(x, y, {
  colors: number[],    // Array of hex color values (e.g., 0xff6b6b)
  count: number,       // Number of particles
  radius: number,      // Max spread distance
});
```

### Step 4: Wire It Up

The `JuiceManager` is instantiated in `src/scenes/snakeScene.ts`:

```typescript
this.juice = new JuiceManager(this);
```

Call it from wherever the game event occurs:

```typescript
this.juice.myNewEffect(worldX, worldY);
```

## Existing Juice Catalog (What's Already There)

### Apple & Consumption Events
- `appleChomp(x, y, violenceLevel, appleTypeId?)` — Main apple eat, scales with violence and apple type
- `appleStreak(x, y, streak, appleTypeId?)` — Consecutive apple eats
- `itemPickup(x, y)` — General item pickup
- `itemConsume(x, y)` — Item consumption
- `itemDrop(x, y)` — Item drop
- `itemCraft(x, y)` — Crafting
- `itemUpgrade(x, y)` — Item upgrade
- `treasurePickup(x, y)` — Treasure chest pickup
- `powerupPickup(x, y)` — Power-up collection
- `powerupTick(x, y)` — Power-up progress tick

### Scoring & Progression
- `scoreDelta(x, y, amount)` — Score change with magnitude scaling
- `lengthGain(x, y, amount)` — Snake growth
- `levelUp(x, y)` — Level-up fanfare
- `statIncrease(x, y)` — Stat point allocation
- `statMilestone(x, y)` — Stat milestone
- `scoreMultiplierBoost(multiplier)` — Multiplier increase
- `comboBreak(x, y)` — Combo chain broken

### Combat & Damage
- `playerHit(x, y, health, maxHealth, source?)` — Player takes damage
- `damageTaken(x, y, isBig?)` — Generic damage
- `damageBlocked(x, y)` — Damage blocked/absorbed
- `criticalHit(x, y)` — Critical hit
- `healReceived(x, y, isBig?)` — Healing
- `enemyEaten(x, y)` — Eating an enemy
- `enemySnakeDefeated(x, y)` — Defeating an enemy snake
- `enemyDefeated(x, y, isBoss?)` — Generic enemy defeat
- `enemySpawn(x, y, isDangerous?)` — Enemy appearing
- `mobHit(x, y)` — Mob hit
- `bossHit(x, y)` — Boss hit
- `playerShot(x, y, dx, dy)` — Player firing
- `predationFrenzy(x, y)` — Predation frenzy mode
- `predationRend(x, y)` — Predation rend
- `predationApex(x, y)` — Predation apex activation

### UI & Menu
- `uiButton(x, y)` — Button press
- `uiTabSwitch()` — Tab switch
- `uiSparkle(x, y)` — UI sparkle
- `uiMenuOpened()` — Menu opens
- `uiMenuClosed()` — Menu closes
- `uiDialogConfirm()` / `uiDialogCancel()` — Dialog actions
- `uiNotification(x, y)` — Notification toast
- `notice(x, y)` — General notice
- `announce(x, y, overlay, text)` — Big announcement text

### Status & Health
- `healthLow(x, y)` — Low health warning
- `healthFull(x, y)` — Full health
- `dangerPulse(x, y)` — Danger level pulse
- `statusEffectApplied(x, y, isBuff?)` — Buff/debuff applied
- `statusEffectRemoved(x, y)` — Status effect removed

### Quest & Achievement
- `questOffered()` / `questAccepted()` / `questRejected()` — Quest states
- `questCompleted(x, y)` — Quest done (with camera + particles)
- `questFailed(x, y)` — Quest failed
- `questUpdated(x, y)` — Quest updated
- `questAbandoned(x, y)` — Quest abandoned
- `questChainStarted(x, y)` / `questChainCompleted(x, y)` — Chain events
- `achievementUnlock(x, y)` — Achievement unlocked (with camera + particles)
- `achievementProgress(x, y)` — Achievement progress

### Skill Tree
- `skillTreeOpened()` — Skill tree opens
- `skillTreeClosed()` — Skill tree closes
- `perkPurchased()` — Perk bought
- `perkPurchaseFailed()` — Perk purchase failed

### Movement & Environment
- `movementTick(x, y?)` — Every movement tick (particles + sound)
- `turnSkid(x, y, perpX, perpY, count?)` — Direction change
- `wallGraze(x, y)` — Wall graze
- `wallImpact(x, y)` — Wall hit
- `wallChomp(x, y)` — Wall consume
- `terrainInteraction(x, y)` — Terrain interaction
- `seismicPulse(x, y)` — Seismic pulse
- `collapseControl(x, y)` — Collapse control
- `caveEjection(x, y, urgent?)` — Cave ejection
- `faultLineSweep(x, y)` — Fault line sweep
- `blockBreak(x, y)` — Block break
- `blockPlace(x, y)` — Block place
- `roomTransition(x, y)` — Room change
- `caveEnter(x, y)` — Cave entry
- `caveDiscover(x, y)` — Cave discovery
- `caveReward(x, y)` — Cave reward

### Biome & Atmosphere
- `ambientSparkle(x, y)` — Ambient sparkle particles
- `ambientBubble(x, y)` — Ambient bubbles
- `ambientEmber(x, y)` — Ambient embers
- `snowDrift(x, y)` — Snow drift particles
- `heatHaze(x, y)` — Heat haze distortion
- `dustDevil(x, y)` — Dust devil particles
- `libertyHeatShimmer(x, y)` — Heat shimmer (Liberty biome)
- `coldBodyStage(x, y, level?)` — Cold exposure visual
- `coldBodyDamage(x, y)` — Cold damage
- `heatBodyStage(x, y, level?)` — Heat exposure visual
- `heatBodyDamage(x, y)` — Heat damage
- `neonFlicker(x, y)` — Neon light flicker
- `fireworkPop(x, y)` — Firework
- `monumentSparkle(x, y)` — Monument sparkle
- `villageLantern(x, y)` — Village lantern glow
- `villageBreath(x, y)` — Village ambient pulse
- `villageReveal(x, y)` — Village discovery
- `biomeReveal(x, y)` — Biome discovery

### Jade Peak (Japanese-themed biome)
- `bambooSway(x, y)` — Bamboo swaying particles
- `ramenSteam(x, y)` — Steam particles
- `shimenawaGlow(x, y)` — Sacred rope glow
- `mochiPound(x, y)` — Mochi pounding sound + particles
- `wasabiMist(x, y)` — Wasabi mist particles
- `kappaSplash(x, y)` — Water splash
- `swimSplash(x, y)` — Swim splash
- `craneWingFlap(x, y)` — Crane feather particles
- `tanukiShadow(x, y)` — Tanuki shadow
- `shrineLanternGlow(x, y)` — Shrine lantern glow
- `ofudaFloat(x, y)` — Ofuda paper float
- `koiRipple(x, y)` — Koi pond ripple
- `origamiCraneFly(x, y)` — Origami crane fly-through
- `zenRipple(x, y)` — Zen garden ripple
- `toriiSparkle(x, y)` — Torii gate sparkle
- `sakuraPetalBurst(x, y)` — Cherry blossom burst
- `onpuClapper(x, y)` — Onpu clapper sound
- `jadePeakAmbientRandom(x, y?)` — Random ambient trigger

### Cherry Blossom Ambient
- `startCherryBlossomAmbient()` / `stopCherryBlossomAmbient()` — Toggle ambient petals
- `spawnCherryPetal(x, y)` — Single petal particle

### Unicorn Glitter
- `startUnicornGlitter()` / `stopUnicornGlitter()` — Toggle trail
- `spawnUnicornGlitter()` — Trail particle burst

### Music Systems
- `startBossMusic(kind?)` / `stopBossMusic()` — Boss music
- `startPowerupMusic()` / `stopPowerupMusic()` — Power-up music
- `startHouseAmbience()` / `stopHouseAmbience()` — House ambience
- `startTownMusic()` / `stopTownMusic()` — Town music
- `startHeavenMusic()` / `stopHeavenMusic()` — Heaven music
- `startHellMusic()` / `stopHellMusic()` — Hell music
- `startTitleMusic()` / `stopTitleMusic()` — Title screen music
- `startCardMusic()` / `stopCardMusic()` — Card game music
- `startArchaeologyMusic()` / `stopArchaeologyMusic()` — Archaeology music
- `setArcadeMusicState(state)` / `stopArcadeMusic()` — Arcade music
- `arcadeEffect(effectName)` — Arcade SFX dispatcher

### Fishing
- `fishingHookLanded(x, y)` — Hook landed
- `fishingCatch(x, y, isRare?, isLegendary?)` — Fish caught
- `fishingEscape(x, y)` — Fish escaped
- `fishingTensionWarning(x, y)` — Tension warning
- `fishingSnapWarning(x, y)` — Line about to snap
- `fishingNewSpecies(x, y)` — New species discovered

### Animals
- `animalTamed(x, y, isFriendly?)` — Animal tamed
- `animalHuntFail(x, y)` — Hunt failed
- `animalStartled(x, y)` — Animal startled
- `animalFed(x, y)` — Animal fed
- `animalBond(x, y)` — Animal bond increase
- `animalBirth(x, y)` — Animal birth
- `animalDeath(x, y)` — Animal death

### Actors & Relationships
- `actorTalk(x, y)` — Actor talking
- `actorRumor(x, y)` — Actor sharing rumor
- `actorPersonalReveal(x, y)` — Personal story revealed
- `actorGift(x, y)` — Gift given
- `actorPickpocketSuccess(x, y)` — Pickpocket succeeded
- `actorPickpocketFail(x, y)` — Pickpocket failed
- `actorThreaten(x, y)` — Actor threatened
- `actorParley(x, y)` — Parley attempt
- `actorSpare(x, y)` — Actor spared
- `actorApologyAccepted(x, y)` — Apology accepted
- `actorApologyRejected(x, y)` — Apology rejected
- `relationshipChoice(x, y)` — Relationship decision
- `relationshipLevelUp(x, y)` — Relationship level up
- `datingSceneStart(x, y)` / `datingSceneEnd(x, y)` — Dating scenes
- `firstDate(x, y)` — First date
- `breakup(x, y)` — Breakup
- `makeup(x, y)` — Makeup

### Factions
- `factionRaidWarning(x, y)` — Raid warning
- `factionRaidActive(x, y)` — Raid active
- `factionRaidAftermath(x, y)` — Raid aftermath
- `factionSkirmish(x, y)` — Skirmish
- `factionCrackdown(x, y)` — Crackdown
- `factionRelationChange(x, y, improved?, worsened?)` — Relation change

### Artifacts
- `artifactDiscover(x, y)` — Artifact discovered
- `artifactEquip(x, y)` — Artifact equipped
- `artifactActivate(x, y)` — Artifact activated
- `artifactPowerUp(x, y)` — Artifact powered up
- `artifactDecay(x, y)` — Artifact decaying

### Shop
- `shopPurchase(x, y, isBig?)` — Shop purchase
- `shopSell(x, y)` — Shop sell
- `shopWardPurchase(x, y)` — Ward purchase
- `shopRefresh(x, y)` — Shop refresh

### Spells & Magic
- `spellFailed(x, y)` — Spell failed
- `manaUnlocked(x, y)` — Mana unlocked
- `arcaneSpellUnlocked(x, y)` — Arcane spell unlocked
- `arcaneVeilPrimed(x, y)` — Veil primed
- `arcanePulse(x, y)` — Arcane pulse
- `arcaneVeilBurst(x, y)` — Veil burst

### Portal & Teleport
- `portalActivate(x, y)` — Portal activate
- `gateOpen(x, y)` — Gate open
- `gateClose(x, y)` — Gate close
- `teleport(x, y)` — Teleport
- `respawn(x, y)` — Respawn

### Puzzles & Traps
- `puzzleSolved(x, y)` — Puzzle solved
- `trapTriggered(x, y, isDangerous?)` — Trap triggered

### Multiplayer & Archipelago
- `multiplayerJoin(x, y)` — Player joins
- `multiplayerLeave(x, y)` — Player leaves
- `multiplayerDeath(x, y)` — Player dies
- `apCheckFound(x, y)` — AP check found
- `apItemReceived(x, y)` — AP item received
- `apLocationSent(x, y)` — AP location sent

### Special Events
- `raccoonPopup(x, y, triumphant?)` — Raccoon popup
- `raccoonForagePickup(x, y)` — Raccoon forage
- `raccoonWeightThreshold(x, y)` — Raccoon weight milestone
- `babyCry(x, y)` — Baby crying
- `childHug(x, y)` — Child hug
- `toiletFlush(x, y)` — Toilet flush
- `eagleFlyover()` — Eagle fly-through
- `tumbleweed()` — Tumbleweed
- `gridironCrowdRoar(x, y)` — Football crowd
- `footballShot(x, y)` — Football kick
- `footballPass(x, y)` — Football pass
- `footballCatch(x, y)` — Football catch
- `footballFumble(x, y)` — Football fumble
- `maneuverUse(x, y, maneuverId?)` — Maneuver used
- `maneuverRejected(x, y)` — Maneuver rejected
- `victoryFanfare(x, y)` — Victory fanfare
- `defeatFanfare(x, y)` — Defeat fanfare
- `gameOver(x, y)` — Game over
- `bigExplosion(x, y)` — Big explosion
- `slowMoFlash(x, y)` — Slow-mo flash
- `roomTransition(x, y)` — Room transition
- `interiorPulse(x, y)` — Interior ambience
- `rareItemHighlight(x, y)` — Rare item glow
- `snakeGrowthCelebration(x, y, amount?)` — Snake growth celebration
- `screenShake(intensity, duration)` — Direct camera shake
- `screenFlash(color, duration, alpha?)` — Direct screen flash
- `cameraZoom(targetZoom, duration)` — Direct camera zoom
- `spawnStarBurst(x, y, color, count?)` — Star burst particles
- `spawnConfetti(x, y, colors, count?)` — Confetti particles

### Utility Audio
- `playChord(frequencies, duration, volume?)` — Multiple simultaneous tones
- `playArpeggio(frequencies, speed?)` — Sequential tones
- `playRise(duration?, startFreq?, endFreq?)` — Rising sweep
- `playFall(duration?, startFreq?, endFreq?)` — Falling sweep
- `playWhoosh(direction?)` — Whoosh sound
- `playClick()` — Click sound
- `playDoubleClick()` — Double click
- `playSlide()` — Slide sound
- `playCowbell()` — Cowbell (toggleable)

## Design Principles

### 1. Scale with Importance
Bigger events get more primitives. A basic apple eat might use 2 primitives (tone + particles). A boss defeat might use 6 (multiple tones + camera shake + particle burst + expanding ring + floating label).

### 2. Match Tone Type to Event Mood
- **Positive events** (healing, leveling, collecting): `'sine'` or `'triangle'` — smooth, pleasant
- **Impact events** (hits, breaks, crashes): `'sawtooth'` or `'square'` — aggressive, punchy
- **Mysterious events** (discovery, magic): `'sine'` with low frequency — ethereal
- **Negative events** (damage, failure): `'sawtooth'` with descending frequency — painful

### 3. Frequency Ranges
- **Low (30-120 Hz)**: Rumbles, impacts, bass drops
- **Mid (200-600 Hz)**: Most game SFX, chimes, clicks
- **High (800-2000+ Hz)**: Sparkles, chimes, spark effects

### 4. Volume Discipline
Keep individual tones at `0.03` to `0.15`. The master gain is already at `0.9`. Stacking many loud tones will clip. When in doubt, go quieter.

### 5. Particle Count Guidelines
- **Subtle**: 3-6 particles
- **Normal**: 6-12 particles
- **Big**: 12-20 particles
- **Explosion**: 20-40 particles

### 6. Clean Up After Yourself
All particles and graphics objects call `.destroy()` in `onComplete`. Never leave orphaned game objects. The particle layer auto-cleans via this pattern.

### 7. Use World Coordinates
Always accept `worldX, worldY` parameters. The snake scene converts from room-local to world coordinates before calling juice methods. Never use room-local coordinates in juice methods.

### 8. Composability
Each juice method should be a self-contained composition of primitives. Methods can call other methods (e.g., `appleChomp` calls `playTone`, `kickCamera`, `spawnBurst`, `ringPulse`).

### 9. RNG for Variety
Use `this.rng()` for subtle randomness in timing, color selection, or particle count to avoid repetitive feel. The `rng` getter delegates to `this.scene.random()`.

## Patterns to Follow

### Pattern: Event with magnitude scaling
```typescript
myEffect(worldX: number, worldY: number, magnitude: number) {
  const capped = Math.max(1, Math.min(10, magnitude));
  this.playTone({
    frequency: 200 + capped * 40,
    frequencyEnd: 100 + capped * 20,
    duration: 0.1 + capped * 0.02,
    type: 'sawtooth',
    volume: 0.06 + capped * 0.01,
  });
  this.spawnBurst(worldX, worldY, {
    colors: [0xff6b6b, 0xff8f8f, 0xffc2c2],
    count: 6 + capped * 2,
    radius: 12 + capped * 4,
  });
  if (capped >= 5) {
    this.kickCamera(0.02, 80);
  }
}
```

### Pattern: Multi-tone sequence
```typescript
myFanfare(worldX: number, worldY: number) {
  // Ascending chord
  this.playTone({ frequency: 262, duration: 0.2, type: 'triangle', volume: 0.08 });
  globalThis.setTimeout(() => {
    this.playTone({ frequency: 330, duration: 0.2, type: 'triangle', volume: 0.08 });
  }, 100);
  globalThis.setTimeout(() => {
    this.playTone({ frequency: 392, duration: 0.3, type: 'triangle', volume: 0.08 });
  }, 200);
  this.spawnBurst(worldX, worldY, { colors: [0xffd166, 0xfff3a8, 0x5dd6a2], count: 16, radius: 30 });
}
```

### Pattern: Camera + particles combo
```typescript
myImpact(worldX: number, worldY: number) {
  this.kickCamera(0.03, 100);
  this.punchZoom(1.05, 80);
  this.spawnBurst(worldX, worldY, { colors: [0xffffff, 0xffd166, 0xff6b6b], count: 14, radius: 25 });
  this.ringPulse(worldX, worldY, 0xffd166, 5, 3, 220);
}
```

### Pattern: Ambient loop
```typescript
startAmbientEffect() {
  // Create a timer that fires repeatedly
  this.scene.time.addEvent({
    delay: 2000,
    callback: () => {
      const cam = this.scene.cameras.main;
      const x = Phaser.Math.Between(0, cam.width);
      const y = Phaser.Math.Between(0, cam.height);
      this.ambientParticle(x, y);
    },
    loop: true,
  });
}

stopAmbientEffect() {
  // Clear all timers / destroy particles
}
```

## What NOT to Do

- **Don't create new classes** — all juice lives in `JuiceManager`
- **Don't use `globalThis.setTimeout` for timing-critical effects** — use Phaser tweens and timers instead
- **Don't forget to destroy particles** — every spawned particle must call `.destroy()` in `onComplete`
- **Don't hardcode screen coordinates** — always use `worldX, worldY` or derive from camera dimensions
- **Don't add dead JSDoc comment blocks** — keep comments to 1-2 lines max
- **Don't use `@ts-expect-error`** — fix the root cause
- **Don't modify the master gain** — it's set to 0.9 in the constructor
- **Don't create new layers** — use the existing `particleLayer` (depth 25) and `overlayLayer` (depth 30)

## Testing Your Juice

1. Run `npm run format` to ensure formatting is clean
2. Run `npm run typecheck` to verify TypeScript
3. Run `npm run lint` to check for ESLint issues
4. Run `npm run test` to make sure nothing broke
5. Test in the actual game — run it and trigger the event

## Quick Reference: Color Palette

Common colors used throughout the juice system:

| Color | Hex | Usage |
|---|---|---|
| Warm gold | `0xfff3a8` | Apples, score, positive |
| Bright gold | `0xffd166` | Golden items, rare |
| Green | `0x5dd6a2` | Growth, healing, positive |
| Blue | `0x9ad1ff` | Shield, water, calm |
| Red | `0xff6b6b` | Damage, danger, negative |
| Orange | `0xff8c42` | Warning, heat |
| Purple | `0xc77dff` | Magic, wasabi, mystery |
| Pink | `0xffbdfd` | Sweet, amacha, romance |
| White | `0xffffff` | Sparkles, flashes |

## Useful Phaser APIs Used

- `this.scene.cameras.main.shake(duration, intensity)` — Screen shake
- `this.scene.cameras.main.flash(duration, r, g, b, hold)` — Screen flash
- `this.scene.cameras.main.zoomTo(target, duration, ease, true)` — Camera zoom
- `this.scene.tweens.add({...})` — Tween animations
- `this.scene.add.circle(x, y, radius, color)` — Circle particles
- `this.scene.add.rectangle(x, y, width, height, color)` — Rect particles
- `this.scene.add.graphics()` — Drawing shapes (rings, beams)
- `this.scene.add.text(x, y, text, style)` — Floating labels
- `this.ctx.createOscillator()` / `this.ctx.createGain()` — Web Audio

## The Wise Old Snake

The wise old snake has cataloged every juice effect in the game. If it were here, it'd say: "An apple a day keeps the boring game away."
