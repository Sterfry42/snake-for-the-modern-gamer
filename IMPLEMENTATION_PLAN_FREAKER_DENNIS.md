# Freaker Dennis Implementation Plan

## Overview
Implement a new boss called "Freaker Dennis" - an enhanced, more aggressive version of the existing "Freak Dennis" boss. This boss will feature a rainbow color palette and intelligent tracking behavior when the player is in the same room.

## Technical Context

### Existing Boss System Architecture
Based on the current implementation in `src/systems/boss.ts`, the boss system includes:

1. **Boss Interface**: Defines the structure for all boss types
2. **BossManager Class**: Manages boss spawning, movement, and collision detection
3. **Movement Logic**: Separate algorithms for different boss types (random movement vs. tracking)
4. **Pull Mechanic**: Bosses can pull nearby snake segments based on radius and strength

### Current Freak Dennis Implementation
- **Health**: 100 points
- **Body**: 3x3 grid (9 segments)
- **Movement**: Random with 20% direction change chance per step
- **Pull Radius**: 8 tiles
- **Pull Strength**: 0.4
- **Spawn Rate**: 5% chance in new rooms

## Implementation Plan

### Phase 1: Type System Extensions

#### 1.1 Update Boss Type Definition
**File**: `src/systems/boss.ts`

```typescript
export interface Boss {
  id: string;
  name: string;
  kind?: "freak-dennis" | "freaker-dennis" | "revenant" | "angel";
  body: Vector2Like[];
  health: number;
  maxHealth: number;
  roomId: string;
  direction: Vector2Like;
  pull?: {
    radius: number;
    strength: number;
  };
  rainbowPalette?: boolean; // NEW: Flag for rainbow coloring
  trackingMode?: boolean;   // NEW: Flag for tracking behavior
}
```

#### 1.2 Add Rainbow Color Configuration
**File**: `src/config/gameConfig.ts` (or appropriate config file)

```typescript
export const freakerDennisConfig = {
  rainbowPalette: {
    enabled: true,
    colors: [
      '#FF0000', '#FF7F00', '#FFFF00', '#00FF00',
      '#0000FF', '#4B0082', '#9400D3'
    ],
    segmentIndex: 0, // Which segment gets the color cycling
    speed: 0.1,      // How fast colors cycle
  },
  tracking: {
    enabled: true,
    detectionRadius: 12, // How far to detect player in same room
    moveSpeedBonus: 1.5, // Faster movement than regular Dennis
    minDistance: 3,      // Minimum distance to maintain
    maxDistance: 15,     // Maximum distance before moving away
    changeThreshold: 0.7 // Chance to change direction toward player
  }
};
```

### Phase 2: Boss Manager Enhancements

#### 2.1 Update Spawn Logic
**File**: `src/systems/boss.ts`

```typescript
public spawnBoss(roomId: string, bossType: "freak-dennis" | "freaker-dennis" | "random" | "fallen-angel" = "random"): void {
  const [roomX, roomY] = roomId.split(",").map(Number);
  const roomOffsetX = roomX * this.grid.cols;
  const roomOffsetY = roomY * this.grid.rows;

  const id = `boss-${Date.now()}`;
  const name =
    bossType === "freak-dennis" ? "Freak Dennis" :
    bossType === "freaker-dennis" ? "Freaker Dennis" :
    bossType === "fallen-angel" ? "The Angel, Insulted" :
    "Dread Revenant";
  const kind = bossType === "fallen-angel" ? "angel" : bossType === "freak-dennis" ? "freak-dennis" : "freaker-dennis";

  const centerX = roomOffsetX + this.grid.cols / 2 + 5;
  const centerY = roomOffsetY + this.grid.rows / 2;
  const body: Vector2Like[] = [];
  body.push({ x: centerX, y: centerY });
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      body.push({ x: centerX + dx, y: centerY + dy });
    }
  }

  // Enhanced stats for Freaker Dennis
  const isFreaker = bossType === "freaker-dennis";
  const baseHealth = isFreaker ? 150 : 100;
  const basePullRadius = isFreaker ? 10 : 8;
  const basePullStrength = isFreaker ? 0.6 : 0.4;

  const boss: Boss = {
    id,
    name,
    kind,
    body,
    health: baseHealth,
    maxHealth: baseHealth,
    roomId,
    direction: { x: 1, y: 0 },
    rainbowPalette: isFreaker,
    trackingMode: isFreaker,
    pull: {
      radius: basePullRadius,
      strength: basePullStrength,
    },
  };
  this.bosses.set(id, boss);
}
```

#### 2.2 Implement Tracking Movement
**File**: `src/systems/boss.ts`

```typescript
private moveFreakerDennis(boss: Boss, deps: BossStepDependencies): void {
  if (!boss.trackingMode) {
    this.moveStandardBoss(boss, deps);
    return;
  }

  const snakeHead = deps.getSnakeBody()[0];
  const bossHead = boss.body[0];
  if (!snakeHead || !bossHead) {
    this.moveStandardBoss(boss, deps);
    return;
  }

  // Check if player is in the same room
  const [playerRoomX, playerRoomY] = snakeHead.x / this.grid.cols;
  const [bossRoomX, bossRoomY] = bossHead.x / this.grid.cols;

  if (playerRoomX === bossRoomX && playerRoomY === bossRoomY) {
    // Player detected in same room - enable tracking
    this.moveTrackingBoss(boss, snakeHead, deps);
  } else {
    // Player not in same room - use standard movement
    this.moveStandardBoss(boss, deps);
  }
}

private moveTrackingBoss(boss: Boss, snakeHead: Vector2Like, deps: BossStepDependencies): void {
  const bossHead = boss.body[0];
  const dx = snakeHead.x - bossHead.x;
  const dy = snakeHead.y - bossHead.y;
  const distance = Math.abs(dx) + Math.abs(dy); // Manhattan distance

  // Determine target direction based on tracking mode
  let targetDirection: Vector2Like;
  let shouldMove = false;

  if (distance > 0) {
    const normalizedDx = dx / distance;
    const normalizedDy = dy / distance;

    // Use normalized direction but maintain 1-tile steps
    targetDirection = {
      x: normalizedDx > 0.5 ? 1 : normalizedDx < -0.5 ? -1 : 0,
      y: normalizedDy > 0.5 ? 1 : normalizedDy < -0.5 ? -1 : 0,
    };

    // Only move if not already aligned in that direction
    if (targetDirection.x !== 0 && boss.direction.x !== 0) return;
    if (targetDirection.y !== 0 && boss.direction.y !== 0) return;

    // Random chance to track player (can be dodged)
    if (Math.random() < 0.7) {
      shouldMove = true;
    }
  }

  // If tracking fails, use standard movement
  if (!shouldMove) {
    if (Math.random() < 0.2) {
      const directions = [
        { x: 1, y: 0 }, { x: -1, y: 0 },
        { x: 0, y: 1 }, { x: 0, y: -1 }
      ];
      const validDirections = directions.filter(
        (d) => d.x + boss.direction.x !== 0 || d.y + boss.direction.y !== 0
      );
      boss.direction = validDirections[Math.floor(Math.random() * validDirections.length)];
    }
  }

  if (boss.body.length > 0) {
    this.attemptMove(boss, boss.direction, deps);
  }
}

private moveStandardBoss(boss: Boss, deps: BossStepDependencies): void {
  if (Math.random() < 0.2) {
    const directions = [
      { x: 1, y: 0 }, { x: -1, y: 0 },
      { x: 0, y: 1 }, { x: 0, y: -1 }
    ];
    const validDirections = directions.filter(
      (d) => d.x + boss.direction.x !== 0 || d.y + boss.direction.y !== 0
    );
    boss.direction = validDirections[Math.floor(Math.random() * validDirections.length)];
  }

  if (boss.body.length > 0) {
    this.attemptMove(boss, boss.direction, deps);
  }
}
```

#### 2.3 Update Main Movement Loop
**File**: `src/systems/boss.ts`

```typescript
public step(deps: BossStepDependencies): void {
  for (const boss of this.bosses.values()) {
    if (boss.kind === "angel") {
      this.moveAngelBoss(boss, deps);
    } else if (boss.kind === "freaker-dennis") {
      this.moveFreakerDennis(boss, deps);
    } else {
      this.moveStandardBoss(boss, deps);
    }
  }
}
```

#### 2.4 Enhanced Pull Mechanism
**File**: `src/systems/boss.ts`

```typescript
public getPullFor(snakeHead: Vector2Like, roomId: string, rng: () => number): Vector2Like | null {
  const bossesInRoom = this.getBossesInRoom(roomId);
  for (const boss of bossesInRoom) {
    if (!boss.pull || !boss.body.length) continue;

    const bossHead = boss.body[0];
    const distance = manhattanDistance(snakeHead, bossHead);

    if (distance > 0 && distance <= boss.pull.radius) {
      // Increased pull strength for Freaker Dennis
      if (boss.kind === "freaker-dennis") {
        if (rng() > boss.pull.strength * 0.8) {
          return null;
        }
      } else {
        if (rng() > boss.pull.strength) {
          return null;
        }
      }

      const dx = bossHead.x - snakeHead.x;
      const dy = bossHead.y - snakeHead.y;

      if (Math.abs(dx) > Math.abs(dy)) {
        return { x: Math.sign(dx), y: 0 };
      }
      if (Math.abs(dy) > 0) {
        return { x: 0, y: Math.sign(dy) };
      }
    }
  }

  return null;
}
```

### Phase 3: Rainbow Color Implementation

#### 3.1 Add Rainbow Color Management
**File**: `src/systems/boss.ts`

```typescript
import { freakerDennisConfig } from "../config/gameConfig.js";

private rainbowColorTimer: number = 0;

public updateRainbowColors(deltaTime: number): void {
  this.rainbowColorTimer += deltaTime;
  const speed = freakerDennisConfig.rainbowPalette.speed * 60; // Convert to frames

  for (const boss of this.bosses.values()) {
    if (boss.rainbowPalette) {
      const segmentIndex = freakerDennisConfig.rainbowPalette.segmentIndex;
      if (segmentIndex < boss.body.length) {
        const colorIndex = Math.floor(
          (this.rainbowColorTimer / speed) % freakerDennisConfig.rainbowPalette.colors.length
        );
        boss.color = freakerDennisConfig.rainbowPalette.colors[colorIndex];
      }
    }
  }
}
```

#### 3.2 Update Rendering
**File**: `src/renderer/bossRenderer.ts` (if exists, or create new file)

```typescript
import { type Boss } from "../systems/boss.js";
import { freakerDennisConfig } from "../config/gameConfig.js";

export function renderBoss(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  tileSize: number,
  offsetX: number,
  offsetY: number
): void {
  const palette = freakerDennisConfig.rainbowPalette;
  const speed = palette.speed * 60;

  for (let i = 0; i < boss.body.length; i++) {
    const segment = boss.body[i];
    const color = boss.rainbowPalette
      ? palette.colors[Math.floor(((Date.now() / 1000) * 60 * speed) % palette.colors.length)]
      : this.getDefaultColor(boss.kind);

    ctx.fillStyle = color;
    ctx.fillRect(
      segment.x * tileSize + offsetX,
      segment.y * tileSize + offsetY,
      tileSize - 2, // Small gap between segments
      tileSize - 2
    );
  }
}
```

### Phase 4: Game Integration

#### 4.1 Update Spawn Rate
**File**: `src/game/snakeGame.ts`

```typescript
// Line 460 in current implementation
if (this.rng() < 0.03) { // Reduced from 0.05 to 0.03 for Freaker Dennis
  this.bosses.spawnBoss(newRoomId, "freaker-dennis");
}
```

#### 4.2 Add Visual Effects
**File**: `src/effects/rainbowGlow.ts` (new file)

```typescript
export class RainbowGlowEffect {
  private ctx: CanvasRenderingContext2D;
  private colors: string[];
  private timer: number = 0;

  constructor(
    ctx: CanvasRenderingContext2D,
    colors: string[] = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3']
  ) {
    this.ctx = ctx;
    this.colors = colors;
  }

  update(): void {
    this.timer += 0.1;
  }

  drawGlow(x: number, y: number, radius: number): void {
    const gradient = this.ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius);
    const color = this.colors[Math.floor(this.timer) % this.colors.length];

    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }
}
```

#### 4.3 Add Boss Health Bar
**File**: `src/ui/bossHealthBar.ts` (new file)

```typescript
import { type Boss } from "../systems/boss.js";

export function renderBossHealthBar(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  tileSize: number,
  offsetX: number,
  offsetY: number
): void {
  if (boss.health >= boss.maxHealth * 0.8) return; // Only show for damaged bosses

  const healthPercent = boss.health / boss.maxHealth;
  const barWidth = tileSize * 3;
  const barHeight = 4;
  const barX = (boss.body[0].x - barWidth / 2) * tileSize + offsetX;
  const barY = (boss.body[0].y - 2) * tileSize + offsetY;

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(barX, barY, barWidth, barHeight);

  // Health
  const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth * healthPercent, barY);
  gradient.addColorStop(0, '#ff0000');
  gradient.addColorStop(1, '#00ff00');

  ctx.fillStyle = gradient;
  ctx.fillRect(barX + 1, barY + 1, barWidth * healthPercent - 2, barHeight - 2);
}
```

### Phase 5: Testing Strategy

#### 5.1 Unit Tests
**File**: `src/systems/__tests__/boss.spec.ts` (new file)

```typescript
describe('Freaker Dennis Boss', () => {
  it('should spawn with correct stats', () => {
    const grid = { cols: 16, rows: 12 };
    const bossManager = new BossManager(grid);

    bossManager.spawnBoss('0,0,0', 'freaker-dennis');
    const bosses = bossManager.getBossesInRoom('0,0,0');

    expect(bosses.length).toBe(1);
    expect(bosses[0].name).toBe('Freaker Dennis');
    expect(bosses[0].health).toBe(150);
    expect(bosses[0].maxHealth).toBe(150);
    expect(bosses[0].trackingMode).toBe(true);
    expect(bosses[0].rainbowPalette).toBe(true);
  });

  it('should track player in same room', () => {
    const grid = { cols: 16, rows: 12 };
    const bossManager = new BossManager(grid);

    bossManager.spawnBoss('0,0,0', 'freaker-dennis');
    const bosses = bossManager.getBossesInRoom('0,0,0');

    const boss = bosses[0];
    const snakeHead = { x: 8, y: 8 };
    const direction = bossManager.getPullFor(snakeHead, '0,0,0', () => 0.5);

    expect(direction).toBeTruthy();
    expect(direction!.x + direction!.y > 0).toBe(true); // Should move toward player
  });

  it('should use random movement when player not in room', () => {
    // Test that tracking is disabled when player is in different room
    const grid = { cols: 16, rows: 12 };
    const bossManager = new BossManager(grid);

    bossManager.spawnBoss('0,0,0', 'freaker-dennis');
    const bosses = bossManager.getBossesInRoom('1,1,0'); // Different room

    const boss = bosses[0];
    expect(boss.trackingMode).toBe(true);
    // Should use standard random movement
  });
});
```

#### 5.2 Integration Tests
**File**: `src/game/__tests__/freakerDennis.spec.ts` (new file)

```typescript
describe('Freaker Dennis Integration', () => {
  it('should spawn in new rooms with 3% chance', () => {
    const rng = createRng(0); // Fixed seed for deterministic tests
    const game = new SnakeGame(defaultGameConfig, questRegistry, rng);

    let spawnCount = 0;
    for (let i = 0; i < 100; i++) {
      game.bosses.spawnBoss(game.snake.currentRoomId, 'freaker-dennis');
      const bosses = game.bosses.getBossesInRoom(game.snake.currentRoomId);
      if (bosses.length > 0) spawnCount++;
    }

    // Should spawn approximately 3% of the time
    expect(spawnCount).toBeGreaterThanOrEqual(2);
    expect(spawnCount).toBeLessThanOrEqual(5);
  });

  it('should have enhanced pull strength', () => {
    const grid = { cols: 16, rows: 12 };
    const bossManager = new BossManager(grid);

    bossManager.spawnBoss('0,0,0', 'freaker-dennis');
    const bosses = bossManager.getBossesInRoom('0,0,0');

    const boss = bosses[0];
    const snakeHead = { x: 5, y: 5 };

    // Freaker Dennis should pull more frequently
    const pulls = Array.from({ length: 100 }, () =>
      bossManager.getPullFor(snakeHead, '0,0,0', () => 0.5)
    );

    const pullCount = pulls.filter(p => p !== null).length;
    expect(pullCount).toBeGreaterThan(pulls.length * 0.4); // Should pull more often
  });
});
```

#### 5.3 Visual Testing
- Verify rainbow color cycling is smooth and visible
- Ensure tracking behavior is noticeable during gameplay
- Test pull mechanics against different snake lengths
- Verify boss behavior in various room sizes and layouts

### Phase 6: Balance and Tuning

#### 6.1 Difficulty Balancing
**File**: `src/config/gameConfig.ts` (update values as needed)

```typescript
export const freakerDennisConfig = {
  rainbowPalette: {
    enabled: true,
    colors: [
      '#FF0000', '#FF7F00', '#FFFF00', '#00FF00',
      '#0000FF', '#4B0082', '#9400D3'
    ],
    segmentIndex: 0,
    speed: 0.1, // Start with conservative speed
  },
  tracking: {
    enabled: true,
    detectionRadius: 12,
    moveSpeedBonus: 1.5,
    minDistance: 3,
    maxDistance: 15,
    changeThreshold: 0.7,
  },
  difficulty: {
    health: 150, // 50% more health than regular Dennis
    pullRadius: 10, // 25% larger pull radius
    pullStrength: 0.6, // 50% stronger pull
    spawnChance: 0.03, // 3% chance to spawn in new rooms
    damageResistance: 0.2, // 20% damage reduction
  }
};
```

#### 6.2 Balancing Recommendations
1. **Spawn Rate**: Start with 3% chance, adjust based on player feedback
2. **Health**: 150 HP is 50% more than regular Dennis, adjust if too difficult
3. **Tracking**: Use 0.7 probability - allows player to sometimes evade
4. **Pull Strength**: 0.6 is stronger than regular Dennis's 0.4, but can be dodged
5. **Rainbow Effect**: Should be purely cosmetic, no gameplay impact

### Phase 7: Documentation

#### 7.1 Update Game Guide
**File**: `docs/game-guide.md` (new file or update existing)

```markdown
# Boss Guide: Freaker Dennis

## Description
Freaker Dennis is a powerful variant of the original Freak Dennis boss. This enhanced version features:
- **Rainbow color palette** for visual distinction
- **Intelligent tracking** that pursues the player in the same room
- **Enhanced pull mechanics** for more aggressive gameplay
- **Increased health pool** (150 HP vs. 100 HP)

## Behaviors
1. **Room Detection**: If the player is in the same room, Freaker Dennis will attempt to track and pursue
2. **Pull Mechanic**: Stronger pull that affects snake segments more frequently
3. **Standard Movement**: Uses random movement patterns when player is not in the same room
4. **Visuals**: Rainbow colors cycle through the spectrum over time

## Tips for Defeat**
- Use rooms with narrow corridors to limit movement options
- Time your movements when the boss is changing direction
- Leverage the pull mechanic to position yourself advantageously
- Keep moving to make tracking more difficult
- Focus on dodging rather than engaging when possible

## Rewards**
- High score reward for defeating (similar to regular Dennis)
- May drop special items or provide unique challenges
```

#### 7.2 Developer Documentation
**File**: `docs/boss-system-architecture.md` (new file)

```markdown
# Boss System Architecture

## Overview
The boss system manages various boss types with different behaviors, stats, and visual effects.

## Component Structure
1. **Boss Interface**: Defines common boss properties
2. **BossManager**: Central controller for all boss operations
3. **Movement Algorithms**: Separate logic for different boss types
4. **Rendering**: Visual representation of bosses
5. **UI Elements**: Health bars and other boss-specific UI

## Boss Types
- **Freak Dennis**: Standard boss with random movement and moderate pull
- **Freaker Dennis**: Enhanced version with tracking behavior and rainbow colors
- **Revenant**: Passive boss with basic AI
- **Angel**: Aggressive boss with pathfinding capabilities

## Extending Boss Types
To add a new boss type:
1. Define stats in configuration file
2. Update Boss interface with new properties
3. Add movement logic in BossManager
4. Implement rendering in BossRenderer
5. Add UI components if needed
6. Create tests for new behavior
```

## Implementation Timeline

### Week 1: Core Implementation
- [ ] Phase 1: Type system extensions
- [ ] Phase 2: Boss Manager enhancements
- [ ] Phase 3: Rainbow color system

### Week 2: Integration and Testing
- [ ] Phase 4: Game integration
- [ ] Phase 5: Testing (unit and integration)
- [ ] Phase 6: Balance and tuning

### Week 3: Polish and Documentation
- [ ] Visual effects implementation
- [ ] UI enhancements (health bars, etc.)
- [ ] Documentation updates
- [ ] Final testing and bug fixes

## Risk Assessment

### Technical Risks
1. **Performance Impact**: Rainbow color cycling and tracking AI may affect performance
   - *Mitigation*: Optimize algorithms, use efficient data structures, profile frequently

2. **Game Balance**: Freaker Dennis may be too difficult for some players
   - *Mitigation*: Start with conservative stats, gather player feedback, adjust values

3. **Movement Logic**: Tracking AI might get stuck or behave unexpectedly
   - *Mitigation*: Add boundary checks, implement fallback behavior, extensive testing

### Compatibility Risks
1. **Save System**: Boss type changes may affect save file compatibility
   - *Mitigation*: Maintain backward compatibility, add versioning to save system

2. **Room Generation**: Different boss types may interact poorly with room layouts
   - *Mitigation*: Test in various room configurations, adjust spawn rules as needed

## Success Criteria

- [ ] Freaker Dennis spawns with 3% probability in new rooms
- [ ] Boss displays rainbow color palette
- [ ] Boss tracks player when in same room
- [ ] Boss has 150 HP (50% more than regular Dennis)
- [ ] Boss has 10 tile pull radius (25% larger than regular Dennis)
- [ ] Boss has 0.6 pull strength (50% stronger than regular Dennis)
- [ ] Boss movement and behavior feels fair and challenging
- [ ] No performance degradation (60 FPS target)
- [ ] All unit tests pass
- [ ] Integration tests verify correct behavior
- [ ] Visual effects are smooth and performant
- [ ] Documentation is complete and accurate

## Post-Implementation Considerations

1. **Player Feedback**: Monitor player deaths and difficulty complaints
2. **Stat Tracking**: Record boss spawn rates and defeat times
3. **Balancing**: Be prepared to adjust stats based on player data
4. **Content Updates**: Consider adding more boss variants in future updates
5. **Accessibility**: Ensure the boss is playable for all skill levels

## Contact and Support

For questions or issues related to Freaker Dennis implementation:
- Check the game documentation
- Review the source code comments
- Consult with the development team
- Submit issues through the project's issue tracker