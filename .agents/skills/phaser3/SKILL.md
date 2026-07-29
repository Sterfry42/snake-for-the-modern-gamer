---

name: phaser3
description: Guide for how to understand phaser 3.

---

# Skill: Learn and Use Phaser 3.90

## Purpose

Use the locally installed Phaser 3.90 API to accomplish game-development tasks reliably.

This skill is optimized for producing working Phaser code, scenes, game objects, animations, input handlers, physics interactions, UI elements, and gameplay systems.

The objective is not to explain Phaser.

The objective is to discover the correct Phaser APIs required to implement the requested game feature.

Examples:

```text
Create a player controller
Add a health bar
Spawn enemies
Implement tilemap collisions
Create a particle effect
Add drag-and-drop inventory
Implement camera follow
Create a dialogue system
Build a shader effect
```

---

# Scope

Target:

```text
phaser@3.90.x
```

Never assume APIs from:

```text
Phaser 2
Phaser CE
Phaser 4
Older Phaser 3 examples
Community plugins
```

Always verify against the installed version.

---

# Core Principle

Phaser is a large framework.

Do not attempt to learn all of Phaser.

Start from the requested gameplay objective and discover only the APIs required to implement that objective.

---

# Phaser Mental Model

Before investigating APIs, model Phaser as a collection of systems attached to a Scene.

Most gameplay tasks can be solved by identifying:

1. Which Scene subsystem owns the capability.
2. Which objects are created by that subsystem.
3. Which methods connect those objects together.

Think of Phaser as:

```text
Scene
├─ add
│  ├─ sprite
│  ├─ image
│  ├─ text
│  ├─ graphics
│  ├─ container
│  └─ particles
│
├─ physics
│  ├─ arcade
│  ├─ matter
│  ├─ bodies
│  ├─ colliders
│  └─ overlaps
│
├─ input
│  ├─ pointer
│  ├─ keyboard
│  ├─ gamepad
│  ├─ drag
│  └─ events
│
├─ cameras
│  ├─ main
│  ├─ follow
│  ├─ zoom
│  ├─ shake
│  └─ effects
│
├─ anims
│  ├─ create
│  ├─ generateFrameNumbers
│  ├─ generateFrameNames
│  └─ play
│
├─ tweens
│  ├─ add
│  ├─ chain
│  └─ timeline
│
├─ sound
│  ├─ add
│  ├─ play
│  └─ events
│
├─ time
│  ├─ delayedCall
│  ├─ addEvent
│  └─ timers
│
├─ events
│  ├─ scene events
│  ├─ game object events
│  └─ custom events
│
├─ load
│  ├─ image
│  ├─ atlas
│  ├─ spritesheet
│  ├─ audio
│  ├─ tilemap
│  └─ json
│
└─ data
   ├─ registry
   ├─ game state
   └─ shared values
```

---

# Object Hierarchy Model

Most gameplay entities ultimately become Game Objects.

```text
GameObject
├─ Image
├─ Sprite
├─ Text
├─ Graphics
├─ Container
├─ TileSprite
└─ ParticleEmitter
```

Many tasks become:

```text
Create Object
 → Configure Object
 → Attach Behaviors
 → Update Object
```

Example:

```text
Player Character
 → Sprite
 → Arcade Physics Body
 → Keyboard Input
 → Animations
 → Camera Follow
```

---

# Gameplay Translation Layer

Convert feature requests into Phaser systems before searching APIs.

Examples:

```text
"Player movement"

→ Input
→ Physics
→ Sprite
→ Animation
```

```text
"Inventory UI"

→ Containers
→ Text
→ Input
→ Events
```

```text
"Enemy patrol"

→ Physics
→ Time
→ Tweens
```

```text
"Damage popup"

→ Text
→ Tweens
```

```text
"Screen shake"

→ Cameras
```

```text
"Explosion"

→ Particles
→ Sound
→ Camera Effects
```

```text
"Quest tracker"

→ UI Objects
→ Data Manager
→ Events
```

Only after identifying the systems should the agent begin symbol lookup.

---

# Scene Lifecycle Model

Every implementation must fit into the Scene lifecycle.

```text
init()
 └─ receive data

preload()
 └─ load assets

create()
 └─ create objects
 └─ register events
 └─ initialize systems

update()
 └─ frame-by-frame logic

shutdown()
 └─ cleanup scene resources

destroy()
 └─ final teardown
```

Before generating code, determine where each operation belongs.

Asset loading belongs in:

```text
preload()
```

Object creation belongs in:

```text
create()
```

Continuous behavior belongs in:

```text
update()
```

---

# Common Relationship Patterns

Movement:

```text
Input
 → Physics Body
 → Sprite
```

Animation:

```text
Animation Manager
 → Animation
 → Sprite.play()
```

Collision:

```text
Physics World
 → Collider
 → Callback
```

Camera Follow:

```text
Camera
 → Target Game Object
```

UI Interaction:

```text
Input Event
 → Game Object
 → Callback
```

Timers:

```text
Time Manager
 → Timer Event
 → Callback
```

Most Phaser features are compositions of these patterns.

---

# Investigation Heuristic

When given a task:

1. Identify the gameplay goal.
2. Map the goal to Scene subsystems.
3. Map subsystems to objects.
4. Map objects to APIs.
5. Verify APIs with TypeScript declarations.
6. Inspect examples if uncertainty remains.
7. Generate implementation.

Never start by searching the entire Phaser API surface.

Always navigate through the Scene-centered mental model first.

---

# Phase 1: Discover Phaser Entry Points

Locate:

```ts
require.resolve("phaser/package.json")
```

Read:

```text
package.json
```

Determine:

* installed version
* type declarations
* entry modules
* available namespaces

Verify:

```text
3.90.x
```

If a different version is installed, treat local declarations as the source of truth.

---

# Phase 2: Build a Phaser Symbol Graph

Use the TypeScript Compiler API.

Create a Program using Phaser declaration files.

```ts
const program = ts.createProgram(...);
const checker = program.getTypeChecker();
```

Walk exported symbols.

Capture:

```ts
{
  name,
  namespace,
  type,
  documentation,
  relationships
}
```

Common namespaces include:

```text
Phaser.Game
Phaser.Scene
Phaser.GameObjects
Phaser.Physics
Phaser.Input
Phaser.Cameras
Phaser.Animations
Phaser.Tilemaps
Phaser.Sound
Phaser.Time
Phaser.Math
Phaser.Loader
```

Build an index of:

```text
Namespace
Class
Method
Property
Event
Factory Method
```

---

# Phase 3: Build a Gameplay Capability Map

Convert API structure into gameplay capabilities.

Example:

```text
Capability: Player Movement

Relevant Symbols:
- Phaser.Scene
- Phaser.Physics.Arcade.Sprite
- scene.input.keyboard
- scene.physics.add
```

Example:

```text
Capability: Camera Follow

Relevant Symbols:
- scene.cameras.main
- startFollow()
- setZoom()
```

Example:

```text
Capability: Tilemap Collision

Relevant Symbols:
- Phaser.Tilemaps.Tilemap
- createLayer()
- setCollisionByProperty()
- physics.add.collider()
```

Store capabilities rather than raw API descriptions.

---

# Phase 4: Search Phaser Examples

Phaser ships with extensive examples and patterns.

Prioritize discovery from:

```text
examples/
labs/
templates/
```

If available locally.

Otherwise inspect:

```text
README
documentation references
example source files bundled with the project
```

Extract:

* object creation patterns
* scene lifecycle usage
* animation setup
* physics setup
* event handling
* camera usage
* particle systems
* UI construction

Treat examples as highly authoritative.

---

# Phase 5: Understand Scene Lifecycle

Every task should be mapped into Phaser's lifecycle.

Learn how requested behavior interacts with:

```text
constructor
init()
preload()
create()
update()
shutdown
destroy
```

Determine:

* where assets load
* where objects spawn
* where logic executes
* where cleanup occurs

Generated code should place behavior in the appropriate lifecycle method.

---

# Phase 6: Identify Relevant Subsystems

For the requested task, identify which Phaser systems are involved.

Examples:

### Platformer Movement

```text
Arcade Physics
Input
Camera
Animation
```

### Inventory UI

```text
GameObjects
Input
Containers
Events
```

### RTS Unit Selection

```text
Input
Geometry
Cameras
Groups
```

### Procedural Dungeon

```text
Tilemaps
Math
Data Structures
Cameras
```

Ignore unrelated subsystems.

---

# Phase 7: Learn Relationships

Build an operational graph.

Example:

```text
Scene
 └─ physics
     └─ add
         └─ sprite
             └─ body
```

Example:

```text
Scene
 └─ anims
     └─ create
         └─ Sprite.play
```

Example:

```text
Scene
 └─ input
     └─ keyboard
         └─ createCursorKeys
```

Focus on object interaction patterns.

Most Phaser tasks require understanding object relationships more than individual methods.

---

# Phase 8: Verify Against Type Information

Before generating code:

Verify:

```text
Class names
Factory methods
Method names
Parameters
Event names
Return types
```

Examples:

```ts
scene.physics.add.sprite(...)
```

Verify that:

```text
physics exists
add exists
sprite exists
arguments are valid
```

Prefer type information over memory.

---

# Phase 9: Generate Phaser Code

Produce code that:

* Uses documented Phaser APIs
* Matches Phaser 3.90 typings
* Follows common Phaser patterns
* Fits into scene lifecycle correctly
* Avoids internal implementation details

Favor:

```text
Scene methods
Factory methods
Managers
Official game objects
Official physics systems
```

Avoid:

```text
Private fields
Undocumented internals
Source-level hacks
Monkey patches
```

---

# Phaser-Specific Priorities

When investigating a feature, search in this order:

### 1. Scene APIs

```text
Phaser.Scene
```

### 2. Relevant Manager

```text
physics
anims
input
sound
cameras
time
tweens
```

### 3. Game Object Factories

```text
scene.add.*
scene.physics.add.*
```

### 4. Events

```text
pointer events
keyboard events
animation events
physics events
scene events
```

### 5. Example Implementations

Prefer working Phaser examples over theoretical API descriptions.

---

# Confidence Rules

High confidence:

```text
Present in typings
Documented in JSDoc
Appears in examples
Appears in common Phaser workflows
```

Medium confidence:

```text
Present in typings
Weak documentation
Usage inferred from surrounding APIs
```

Low confidence:

```text
Only found in implementation code
Not publicly documented
```

Never use low-confidence APIs when a documented alternative exists.

---

# Output Model

Maintain an internal model:

```text
Gameplay Goal
 └─ Required Phaser Systems
     └─ Required Objects
         └─ Required Methods
             └─ Valid Scene Integration
                 └─ Working Implementation
```

Do not attempt to teach Phaser.

Learn only enough of Phaser 3.90 to implement the requested feature correctly and idiomatically.
