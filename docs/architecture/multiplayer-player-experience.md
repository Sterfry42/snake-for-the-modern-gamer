# Multiplayer player experience

The shared authority, normal SnakeScene, revisioned room stream, and input-only reconnect protocol remain the architecture. This cutover adds player-scoped creation, survival presentation, safe placement, and durable ownership to those existing boundaries.

## Placement and participation

New guest characters start in the configured world origin, relative to the configured initial body and direction. `findSafePlayerSpawn` searches deterministically without gameplay RNG. The whole body and three forward cells must avoid solid/liquid terrain, construction, Actors, enemies, bosses, portals, pickups, active bomb blast areas, and living player bodies with clearance. Pending creation bodies reserve separate starting positions. A full origin returns a controlled error rather than relocating a newcomer to the host.

An existing saved primary character retains the first-claim compatibility behavior. Reconnect restores that character's exact location and direction queue; it does not run the new-character placement algorithm. Knowing a character's resume token never grants world management permission.

`isPlayerInWorld` defines physical participation. Creation and death/afterlife encounters cannot move, shoot, take damage, block another snake, or become a projectile target. Ordinary pause/dialogue holds still leave a living character vulnerable. World clocks continue while connected players have pending personal choices. Rescue completion rechecks placement because peers or world objects may now occupy the old body, then grants the existing post-revival protection window. Terminal return places only that character at a safe origin.

## Survival and authored screens

`AuthoritativeDeaths` resolves the selected player's outcome on the session queue. It recognizes canonical Phoenix interception, then uses ward, companion rescue, growth rescue, and the existing life/Arcane Veil consumption path. Angel execution bypasses ordinary rescues. Growth rescue retains its charged tail cost after restoring the pre-death body.

The private `PlayerLifecycle` record owns one encounter ID, revision, phase, source, rescuer, destination, and available choices. `deathEncounterAction` accepts only the current ID/revision and an offered bounded choice. Charges and effects are applied once, independently of presentation or reconnect. Peers receive activity and modest death/return notices, never another player's encounter choices or dialogue.

SnakeScene reuses its existing Angel, Goblin Angel, taunt, romance, Heaven, Hell, and Ledger presentation. Authority performs real relationship changes, karma/retaliation, and canonical Hell escape/card consumption. Reload reconstructs the durable encounter instead of spending again. A pending choice has no automatic timeout selection.

Terminal death offers an explicit return to the shared world after the Ledger. This preserves the established connected-session policy: score, inventory, skills, quests, and relationships survive; peers and world progression are not reset. It is not a new run or a new character. No spectator or shared-lives system is introduced.

## Creation

Production session creation requires per-player faith/background/class setup unless a loaded character already has completed valid selections. `AuthoritativeCharacterCreation` draws and retains canonical offers once, accepts only offered registry IDs in the current stage, and applies canonical modifiers, SPECIAL adjustments, life charges, mechanic flags, and starting perks once. Existing partial selections are preserved. No arbitrary client modifier payload is trusted. The normal ChoicePopup displays canonical descriptions while other players continue.

## Durability and ownership

`GameSaveData.hosted` schema version 1 atomically includes materialized rooms, private character records, the primary-claim marker, and SHA-256 resume-token associations in the same checkpoint as world state. `HostedCheckpoint` validates the envelope and rejects unknown hosted schemas, duplicate character IDs, and ownership associations to absent characters. Legacy checkpoints without a hosted section remain readable.

Raw random resume tokens remain private browser credentials. They are never saved on the server, included in invites, or broadcast to peers. Even privileged network checkpoint views strip the entire hosted section. Host keys remain separately configured and must be authenticated again after restart. Existing simultaneous-tab takeover rules still apply.

Startup loads the default checkpoint before accepting players. Retained characters stay outside physical simulation until their credential reconnects, in any order. The 30-second autosave and explicit host Save capture world and all characters together. Crash recovery promises the **last successful checkpoint**, not the last input or last attempted autosave. Keep the server save directory private and retain the same directory across restarts. Clearing checkpoints also removes their restart recovery data; browser local storage remains necessary to retain the corresponding resume credential.

Manual host loads rewind shared world state, restore the saved primary, keep attached guest character contexts, and cancel current activities. The existing Save/Load menu warns about this before loading. A process restart instead restores all character records from the checkpoint together.

## Specialty audit and remaining scope

| Area                                                                       | Connected ownership and status                                                                                                           |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Movement, collision, guns, bombs, vehicles                                 | Existing authoritative paths retained; lifecycle gates physical participation.                                                           |
| Inventory, equipment, shops, quests, construction, cooking/alchemy         | Existing bounded authoritative intents retained; replica writes remain rejected.                                                         |
| NPC interaction/dating, guild and black market                             | Existing private interaction leases and validated server consequences retained.                                                          |
| Fishing, baseball, archaeology                                             | Existing server clocks, validation and rewards retained; death cancels temporary activity.                                               |
| Faith/background/class, lives and afterlife                                | Migrated through the lifecycle records and actions described above.                                                                      |
| Starforged Vanguard, Killstreak Arsenal, radio gameplay bonuses, Minecraft | Unavailable in connected mode; their scene-owned gameplay features are not registered remotely. No remote client reward path is enabled. |
| GoPro recording, home/restaurant arcade, train/rollercoaster rides         | Explicit unavailable entry feedback; no local reward, charge, travel or replica mutation.                                                |

The crew panel's World rules discloses unavailable features, personal/shared progress, and checkpoint recovery. Specialty migration remains future work; this cutover does not claim full feature parity. Offline feature registration and normal authored presentation remain in place.

## Verification

`playerLifecycle.test.ts` covers safe origin placement, full-origin rejection, returning positions, independent creation, invalid/stale choices, source precedence/costs, simultaneous private encounters, physical exclusion, taunts/execution, romance, terminal transitions, safe rescue return, and Hell escape.

`durableCharacters.test.ts` checks atomic file recovery, reverse-order credentials, private state and ownership filtering, invalid schemas, and an actual stop/restart of a child Node server with two independently created characters. `playerExperience.smoke.spec.ts` drives four separate browser contexts through creation and refresh, simultaneous Angel/Goblin Angel presentations and romance reconnect, and the normal Heaven/Hell/Ledger screens while peers continue. The existing browser suites continue covering offline startup, pause tabs, inventory, combat presentation, interactions, specialties, invites, and reconnect prediction.
