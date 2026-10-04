# DLSS 5 Design

Status: Proposed  
Scope: Presentation-only feature  
Initial release: one user-facing toggle  
Primary systems: frame interpolation and synthetic analog NPC portraits

## Summary

DLSS 5 is a deliberately overqualified presentation feature for Snake for the Modern Gamer.

The joke is that Snake behaves like it has a modern AI graphics stack. The implementation should still be real enough that turning the feature on produces visible, useful presentation changes.

The first version of DLSS 5 enables two systems:

1. **Frame Generation** — smooth visual interpolation between authoritative world presentation states.
2. **Neural Portrait Reconstruction** — deterministic synthetic human portraits for NPCs that do not already have intentional authored portrait art, with runtime analog/VHS treatment.

DLSS 5 must never alter simulation state, collision, AI, save semantics, combat timing, quest state, or deterministic game logic. It lies to the player's eyeballs only.

## Product Goal

Snake already behaves like a sandbox made out of several games, genres, and browser integrations colliding with each other. DLSS 5 should extend that identity at the presentation layer.

The intended reaction is:

> Why does Snake have DLSS 5?

followed immediately by:

> Oh no. It actually does something.

The feature should look ridiculous in the options menu while remaining architecturally boring underneath.

## User Experience

Add a new settings branch beside the existing Resolution and Difficulty settings.

```text
SETTINGS

[ Resolution ]
[ Difficulty ]
[ DLSS 5 ]
[ Back ]
```

The first DLSS 5 screen should stay simple.

```text
DLSS 5
Deep Learning Snake Supersampling

Current: OFF

[ ENABLE DLSS 5 ]
[ Back ]

Advanced neural rendering technologies may
alter movement smoothness and perceived humanity.
```

When enabled, both initial DLSS 5 systems are active. When disabled, Snake uses the existing presentation paths.

Do not expose individual Frame Generation, Portrait Reconstruction, Super Resolution, or post-processing controls in the first release.

The setting should persist locally in the same spirit as the existing resolution and character-mode settings. It is not part of gameplay save state.

## Feature Gate

DLSS 5 has two layers of gating:

- A build/runtime feature capability determines whether the game supports DLSS 5 at all.
- A player setting determines whether DLSS 5 presentation is enabled.

Conceptually:

```ts
interface Dlss5Settings {
  enabled: boolean;
}
```

If the feature capability is unavailable, the settings entry should not expose a broken control.

If the capability exists but the player setting is disabled, all DLSS 5 paths become no-ops and existing presentation remains authoritative.

## Design Flow

```text
                         SETTINGS
                            |
                            v
                      DLSS 5 ON/OFF
                            |
                  +---------+---------+
                  |                   |
                  v                   v
         FRAME GENERATION      NEURAL PORTRAITS
                  |                   |
                  |                   |
      Previous render scene        Actor ID
       Current render scene           |
                  |                   v
                  v              Stable hash
          Match sprites by ID          |
                  |                   v
          Interpolate position    Synthetic face source
                  |                   |
                  v                   v
          Smooth visual motion    Runtime image load
                                      |
                                      v
                               Analog processing
                                      |
                         +------------+------------+
                         |            |            |
                         v            v            v
                      pixelation   scanlines    VHS noise
                                      |
                                      v
                                  portrait UI
```

## Architecture

DLSS 5 should sit between existing presentation data and final rendering.

Current conceptual path:

```text
game state
  -> buildWorldPresentationScene()
  -> WorldRenderScene
  -> renderer
```

DLSS 5 path:

```text
game state
  -> buildWorldPresentationScene()
  -> authoritative WorldRenderScene
  -> DLSS 5 presentation processor
  -> display WorldRenderScene
  -> renderer
```

The processor must not mutate the authoritative scene.

A reasonable initial module boundary is:

```text
src/presentation/dlss5/
  dlss5Settings.ts
  dlss5PresentationProcessor.ts
  frameInterpolation.ts
  portraitResolver.ts
  analogPortraitProcessor.ts
```

Exact placement should follow the repository's existing UI/presentation organization when implementation begins. The important boundary is behavioral: DLSS 5 consumes presentation state and produces presentation state or runtime visual assets.

## Frame Generation

### Goal

Make discrete world movement appear smoother without changing the simulation cadence.

The game continues to move actors, the snake, enemies, animals, cars, projectiles, and other entities according to authoritative game logic.

DLSS 5 only interpolates what gets drawn.

### Existing seam

`WorldRenderScene` already represents world sprites with stable IDs and render-space coordinates.

Conceptually:

```ts
interface RenderSprite {
  id: string;
  x: number;
  y: number;
  // ...
}
```

This makes presentation interpolation possible without teaching individual gameplay systems about smoothing.

### Core behavior

Maintain the previous and current authoritative render scenes.

For sprites that exist in both scenes with the same stable ID:

```ts
renderX = lerp(previous.x, current.x, phase);
renderY = lerp(previous.y, current.y, phase);
```

The interpolated coordinates are display-only.

For sprites that cannot be matched safely, use the current authoritative position.

### Phase

Interpolation phase should be based on the presentation/simulation timing already available to the scene rather than adding an independent game clock.

The result should converge to the authoritative state and never alter when the next simulation step occurs.

### Teleports and discontinuities

Do not interpolate across obvious discontinuities.

Examples:

- room changes
- teleportation
- respawn
- large position jumps
- entity replacement under the same logical slot
- scene rebuilds where previous state is no longer comparable

These should snap directly to authoritative presentation.

### Spawn and despawn

New sprites should appear at their current authoritative position.

Removed sprites should disappear according to existing behavior unless a later presentation effect explicitly owns their exit animation.

Do not invent simulation-lifetime extension merely to make interpolation look smooth.

### Initial scope

The first implementation should prioritize stable moving entities:

- snake segments
- runtime NPCs
- enemies
- animals
- vehicles
- projectiles where interpolation does not misrepresent gameplay

Static props and tiles do not require interpolation.

### Non-goal: predictive movement

Version one should not extrapolate future positions.

DLSS 5 Frame Generation is interpolation between known presentation states, not prediction.

A future intentionally reckless mode could experiment with extrapolation, but that is outside this design.

## Neural Portrait Reconstruction

### Goal

When DLSS 5 is enabled, NPC portrait surfaces should be able to replace generic/procedural fallback portraits with deterministic synthetic human faces.

The world remains stylized. The portrait suddenly looks like a damaged photograph of a real person.

That mismatch is the feature.

### Authored portraits remain authoritative

DLSS 5 must not overwrite intentional bespoke character artwork.

Portrait priority should be:

```text
1. authored/bespoke portrait
2. DLSS 5 synthetic portrait
3. existing procedural/current fallback
```

This preserves deliberate character identity while upgrading otherwise generic portrait cases.

### Deterministic identity

A synthetic portrait must remain stable for a given actor.

Do not save temporary image URLs.

Use the actor's stable identity to derive a dataset index.

Conceptually:

```ts
const portraitIndex =
  stableStringHashPositive(actor.id) % SYNTHETIC_PORTRAIT_COUNT;
```

If actor IDs remain stable, the derived portrait does not need to become gameplay save data.

### Remote source

Initial candidate source:

- `lambdaWalker/ds.photo_id` on Hugging Face
- synthetic ID-style portraits
- indexed corpus suitable for deterministic actor-to-face mapping

Implementation must verify and record the source's current license and required attribution before shipping.

The repository should not commit these portrait textures.

### Runtime flow

```text
actor
  -> portrait resolver
  -> stable synthetic portrait index
  -> remote dataset row lookup
  -> temporary remote image URL
  -> browser/runtime image load
  -> analog processing
  -> runtime texture cache
  -> portrait UI
```

Only stable source identity/indexing may be persisted or derived. Signed or temporary delivery URLs must never be persisted.

### Failure behavior

Remote portraits are enhancement-only.

Any failure returns to the existing portrait path.

Examples:

- offline browser
- API unavailable
- CORS failure
- rate limit
- malformed row
- image decode failure
- texture creation failure

Conceptually:

```ts
try {
  return await resolveDlss5Portrait(actor);
} catch {
  return resolveExistingPortrait(actor);
}
```

DLSS 5 must never block dialogue, dating scenes, menus, or world simulation while waiting for a remote portrait.

### Loading behavior

Portrait loading should be asynchronous.

If a synthetic face is not yet available when a portrait surface opens:

1. immediately show the existing fallback portrait,
2. load and process the synthetic portrait,
3. replace the portrait only if the same portrait surface is still showing the same actor.

This prevents stale asynchronous responses from replacing the wrong character.

### Cache

Processed portraits should be cached in memory by stable portrait identity for the life of the game session.

Do not repeatedly fetch and process the same actor portrait.

Browser HTTP caching may provide an additional layer, but the feature should not rely on browser cache behavior for correctness.

## Analog Portrait Treatment

The source image should remain clearly recognizable as a synthetic photographic person.

The treatment should make it feel like an unstable analog artifact rather than destroy it.

Initial treatment:

- downsample the source image to a lower internal resolution,
- upscale with nearest-neighbor sampling for blocky pixels,
- apply slight desaturation,
- add subtle horizontal scanlines,
- add low-strength animated noise,
- add a very small RGB/chromatic offset,
- occasionally apply a narrow horizontal VHS tracking displacement.

The effect should read as damaged video or a digitized ID photograph.

Avoid heavy distortion that makes every face unreadable.

### Runtime-only assets

All processing must happen at runtime.

No processed portrait files are committed to the repository.

Temporary canvases, render textures, generated textures, or Phaser runtime textures are acceptable.

## Presentation Contract

DLSS 5 is allowed to change:

- rendered positions
- portrait presentation
- post-processing
- runtime presentation textures
- visual timing between authoritative simulation steps

DLSS 5 is not allowed to change:

- authoritative entity positions
- collision
- movement rules
- game tick cadence
- AI decisions
- damage timing
- inventory
- saves
- quest state
- relationships
- actor identity
- deterministic world generation

This boundary is load-bearing.

## Settings Persistence

Use a dedicated local presentation setting.

Suggested storage concept:

```text
snakeDlss5Enabled = true | false
```

Exact naming should follow existing repository conventions.

Default should be **OFF** for the initial release so remote portrait loading and interpolation can be validated without silently changing presentation for existing players.

Once mature, the default can be reconsidered separately.

## Performance

DLSS 5 should not create a large per-frame allocation burden.

Frame interpolation should:

- index previous sprites by stable ID,
- reuse maps/structures when reasonable,
- avoid rebuilding gameplay state,
- operate only on presentation data.

Portrait processing should happen once per unique synthetic portrait per session, not every frame.

Animated VHS treatment should prefer lightweight shader/post-FX or small overlay effects rather than regenerating a full 512x512 image every frame.

## Privacy and Network Behavior

Synthetic portrait loading sends normal web requests to the configured external source.

DLSS 5 should not send actor names, dialogue, save data, world seeds, or user data to the portrait provider.

The remote request should be based only on public dataset identifiers/indexes needed to fetch the selected synthetic image.

No face recognition, webcam input, or real-person lookup is part of this feature.

## Testing

### Settings

Verify:

- DLSS 5 can be enabled and disabled.
- setting persists across reloads.
- feature-disabled builds do not expose a broken control.
- disabling DLSS 5 immediately restores existing presentation behavior.

### Frame interpolation

Verify:

- matching stable sprite IDs interpolate coordinates.
- simulation coordinates remain unchanged.
- missing previous sprite snaps to current position.
- missing current sprite is not kept alive by interpolation.
- large discontinuities do not smear across the map.
- room changes do not interpolate unrelated coordinates.
- interpolation phase clamps safely to `0..1`.

### Portraits

Verify:

- authored portraits remain authored.
- identical actor IDs derive identical synthetic indexes.
- different actor IDs distribute across the portrait pool.
- remote failure uses existing fallback.
- loading never blocks portrait UI.
- stale async portrait results cannot overwrite another actor.
- processed portrait cache prevents repeat processing.

### Analog processing

Verify at minimum:

- runtime texture creation succeeds for a valid loaded image.
- processed output uses the intended reduced resolution path.
- cleanup removes temporary runtime resources when the scene/game is destroyed.

Visual effects should also receive a manual smoke test because exact VHS quality is aesthetic rather than purely functional.

## Rollout Plan

### Milestone 1 — DLSS 5 shell

- add DLSS 5 feature capability
- add local enabled setting
- add Settings -> DLSS 5 screen
- expose one ON/OFF control
- no visual behavior yet

### Milestone 2 — Frame Generation

- add previous/current presentation scene tracking
- add stable-ID interpolation
- guard teleports and room transitions
- cover with presentation tests
- hook into the active world renderer

### Milestone 3 — Neural Portrait Reconstruction

- add portrait resolution seam
- add deterministic synthetic index selection
- integrate the remote synthetic portrait source
- add asynchronous fallback-safe loading
- add runtime portrait cache

### Milestone 4 — Analog treatment

- add downsample/pixelation
- add scanlines/noise
- add chromatic/VHS displacement
- tune the treatment so the face stays readable

### Milestone 5 — Polish

- benchmark interpolation overhead
- verify offline behavior
- verify portrait-source attribution requirements
- test title/settings/controller navigation
- test dialogue/dating portrait lifetime edge cases

## Future DLSS 5 Extensions

The architecture should leave room for future presentation technologies without requiring them in the first release.

Possible later additions:

- Super Resolution: lower-resolution render target followed by upscale/sharpen.
- Ray Reconstruction: lighting, bloom, contrast, and atmosphere reconstruction.
- Neural Sharpness: dedicated sharpening pass.
- RTX HDR: exaggerated color grading and bloom.
- DLAA: antialiasing/upscale path without dynamic resolution.
- additional advanced settings once there are enough real subfeatures to justify them.

The first release should not build empty switches for these.

## Acceptance Criteria

DLSS 5 v1 is complete when:

- Settings contains a DLSS 5 screen with one persistent ON/OFF setting.
- Turning DLSS 5 off preserves current presentation.
- Turning DLSS 5 on visibly smooths supported moving entities without touching authoritative simulation state.
- Turning DLSS 5 on gives eligible non-authored NPC portraits deterministic synthetic photographic faces.
- Synthetic portraits receive readable pixelated/VHS analog treatment at runtime.
- No portrait textures are added to the repository.
- Network or portrait-service failure falls back cleanly to existing portraits.
- Existing authored portraits are preserved.
- Automated tests cover interpolation, deterministic portrait assignment, settings persistence, and fallback behavior.
- Normal repository validation remains green.

## Guiding Principle

DLSS 5 should be absurd in presentation and conservative in architecture.

The game may claim to perform advanced neural rendering.

Underneath, the implementation should be simple, deterministic, presentation-only, failure-tolerant, and easy to remove from the render path.

In other words: the sign on the job site says **DLSS 5**. The load-bearing beam underneath says **lerp**.
