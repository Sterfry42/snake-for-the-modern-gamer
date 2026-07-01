Below is an implementation plan that is designed to fit naturally alongside the existing Snake McDonald's implementation rather than introducing a completely separate system. The goal is for Snake Cane's to reuse as much of the NPC, structure, interaction, and reward infrastructure as possible.

---

# Snake Cane's Implementation

## Overview

Add a new rare generated structure:

* **Structure Name:** Snake Cane's
* **NPC:** Vlad
* **NPC Count:** Exactly one
* **Purpose:** Acts as a food vendor similar to Snake McDonald's.
* **Interaction:** Upon speaking to Vlad, the player is presented with a spinner that randomly selects one combo meal.

Unlike McDonald's, there is no menu selection by the player. Vlad always uses the spinner.

---

# Directory Layout

Mirror the existing McDonald's implementation.

```
src/
    world/
        structures/
            snake_canes.ts
            snake_canes_generator.ts

    npcs/
        vlad.ts

    ui/
        combo_spinner.ts

    items/
        food/
            box_combo_extra_toast.ts
            box_combo_coleslaw.ts
            three_finger_combo.ts
            caniac_combo.ts
```

If the McDonald's implementation already groups these differently, simply mirror that layout.

---

# Structure Generation

Create a new structure definition:

```
SnakeCanesStructure
```

Properties:

* Similar rarity to McDonald's
* Appears on valid building terrain
* Road/path leading to entrance
* Parking lot if the game already supports decorative parking

Interior:

* Counter
* Kitchen decorations
* Dining area
* One employee spawn position behind the counter

---

# NPC

Create

```
class Vlad extends NPC
```

Properties:

```
name = "Vlad"

role = Vendor

canMove = false

spawnPosition = BehindCounter
```

Behavior:

Idle:

* Looks at player
* Occasionally turns
* Plays idle animation

Interaction:

```
Press Interact

↓

Dialogue

↓

Spinner

↓

Receive Food

↓

Dialogue Ends
```

---

# Dialogue

Example opening lines:

```
"Welcome to Snake Cane's."

"You hungry?"

"Let's see what fate has in store."

"Time for the combo spinner."

Immediately after:

```

StartComboSpinner()

```

---

# Spinner UI

Rather than presenting buttons, use a spinning wheel.

Entries:

```

1.

Box Combo
(extra toast)

2.

Box Combo
(cole slaw)

3.

3 Finger Combo

4.

Caniac Combo

````

The spinner should:

- Spin for roughly 2–4 seconds
- Slow naturally
- Stop on one section
- Play click sounds while spinning
- Play a success sound once stopped

This makes the interaction feel more like a game show than a menu.

---

# Random Selection

Internally:

```ts
const meals = [
    BOX_EXTRA_TOAST,
    BOX_COLESLAW,
    THREE_FINGER,
    CANIAC
];

const result =
    meals[random.nextInt(meals.length)];
````

Each option:

```
25%
```

No weighting.

---

# Food Items

Create four unique food definitions.

---

## Box Combo (Extra Toast)

Display name

```
Box Combo
(Extra Toast)
```

Description

```
Four chicken fingers,
extra Texas toast,
fries,
Cane's sauce,
drink.
```

---

## Box Combo (Cole Slaw)

Display

```
Box Combo
(Cole Slaw)
```

Description

```
Four chicken fingers,
cole slaw,
Texas toast,
fries,
drink.
```

---

## 3 Finger Combo

Display

```
3 Finger Combo
```

Description

```
Three chicken fingers,
fries,
Texas toast,
drink.
```

---

## Caniac Combo

Display

```
Caniac Combo
```

Description

```
Six chicken fingers,
fries,
Texas toast,
drink.
```

---

# Reward Logic

After spinner finishes:

```
Player inventory

↓

Create selected item

↓

Give to player

↓

Show popup

"You received:

Caniac Combo!"
```

---

# Vlad Closing Dialogue

Randomly choose one:

```
"Enjoy."

```

```
"Come back soon."

```

```
"That's a good one."

```

```
"Can't argue with the spinner."

```

```
"The wheel never lies."

```

---

# Prevent Farming (Optional)

If desired, mirror the McDonald's behavior.

Options:

### One purchase per visit

```
Vlad:

"Sorry, we're closed."

```

after first interaction.

---

### Daily reset

Reset after one in-game day.

---

### Infinite

Allow unlimited spins.

This depends on how McDonald's currently behaves; matching its behavior will keep the player experience consistent.

---

# Save Data

Store:

```
StructureID

↓

Vlad state

↓

Has player interacted?

↓

Remaining cooldown
```

If unlimited interactions are allowed, no additional persistence beyond NPC existence is necessary.

---

# Assets Needed

## Sprite

* Snake Cane's exterior
* Interior tiles
* Counter
* Kitchen decorations

## NPC

```
Vlad
```

* Idle sprite
* Talking sprite

## UI

Spinner:

* Circular wheel
* Pointer
* Spin animation

## Audio

* Wheel spinning clicks
* Winning ding
* Interaction sound

---

# Implementation Order

1. Duplicate the existing McDonald's structure implementation as a starting point.
2. Rename it to `SnakeCanesStructure` and replace the building assets.
3. Replace the McDonald's employee NPC with `Vlad`.
4. Remove the menu-selection UI and implement the four-option spinner.
5. Add the four combo item definitions.
6. Connect the spinner's result to item creation and inventory rewards.
7. Add Vlad's dialogue and interaction state.
8. Hook the structure into world generation using the same registration mechanism and spawn frequency as Snake McDonald's (or a slightly lower frequency if desired).
9. Test save/load behavior, repeated interactions, and spinner randomness to ensure each combo appears with approximately equal probability over many interactions.
