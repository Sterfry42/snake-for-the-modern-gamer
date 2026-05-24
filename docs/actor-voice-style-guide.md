# Snake for the Modern Gamer — Actor Voice & Dialogue Style Guide

## 1. Purpose

This style guide defines the voice-line direction for the actor overhaul.

The current actor branch already has the right foundation: actor personalities, moods, memories, hostility states, souls, lore profiles, relationship personalities, relationship memories, and legacy NPC voice conditions. This guide explains how to use those systems to create a much larger, more varied, more readable, and more memorable voice pool.

The target is:

> **Specific mystery spoken by unmistakable freaks.**

That means the world can feel strange, ancient, doomed, funny, and mysterious, but the speaker should never feel anonymous.

The game should not sound like one clever narrator wearing different hats. It should sound like dozens of highly specific weirdos trapped in a snake RPG and trying very hard to have opinions about it.

---

## 2. Repository Voice Grounding

The current repository already supports several voice-relevant systems.

### 2.1 Actor personality tags

`ActorPersonalityTag` currently includes:

```text
practical
cowardly
greedy
kind
religious
romantic
hungry
paranoid
bureaucratic
violent
poetic
deadpan
sharp
regal
goblin
melancholy
brave
nosy
petty
lawful
criminal
sentimental
lonely
vengeful
idealistic
cynical
softhearted
statusHungry
```

These are the main actor voice filters.

### 2.2 Relationship personalities

`RelationshipPersonality` currently includes:

```text
poetic
deadpan
hungry
regal
sharp
```

These are currently used in the romance controller to choose personality-specific lines, stage change lines, gift reactions, memory references, proposal reactions, jealousy reactions, and conflict responses.

### 2.3 Relationship attitudes and states

The relationship system already has strong emotional axes:

```text
affection
trust
jealousy
resentment
fear
fascination
```

It also has stages:

```text
stranger
acquaintance
friendly
crush
dating
lover
married
heartbroken
vengeful
estranged
hostile
murderous
dead
```

These should affect voice heavily.

### 2.4 Actor mood and opinion

Actors have:

```text
fear
anger
trust
affection
greed
hunger
curiosity
grief
stress
```

And opinions toward the player:

```text
trust
fear
respect
affection
resentment
attraction
debt
```

Dialogue should use these numbers as emotional temperature.

### 2.5 Existing actor voice limitations

The current `actorVoice.ts` supports role/personality/hostility/memory/focus/soul/King-lore conditions, but the content pool is small.

The current line set is useful proof-of-concept, but it is not enough. It has lines like:

```text
“Your emergency has excellent margins.”
“The Ledger Below does not judge. It itemizes.”
“Do not ask where I learned to stand near exits. Ask why I still stay.”
```

These are good seeds, but the full system needs hundreds of variants and a more modular structure.

### 2.6 Existing legacy NPC voice

`npcVoice.ts` already supports biome, danger, health, flags, recent events, item, skill, and snake length conditions. It contains a strong starting point for situational barks:

```text
“Looking fragile. We sell solutions and deniability.”
“Fins are cheaper than funerals. Usually.”
“You look... legally alive.”
“That is either a heroic amount of snake or a zoning violation.”
```

These should be folded into the new actor voice packs rather than discarded.

---

## 3. Voice North Star

The target blend:

```text
Dark Souls weirdness
+
Phoenix Wright-level character silhouettes
+
absurd snake RPG specificity
+
procedural emotional sincerity
```

### 3.1 Dark Souls inspiration

Use:

```text
old grief
strange institutions
ritual language
specific proper nouns
worlds that feel broken before the player arrived
people who know more than they explain
history filtered through obsession
```

Good:

```text
“The King’s Third Kitchen fed seven thousand men the night before Sable Mile. By dawn, only the soup came back.”
```

Bad:

```text
“The old road remembers the old sorrow.”
```

The bad version is vague. The good version is specific.

### 3.2 Phoenix Wright inspiration

Use:

```text
instant personality silhouette
absurd verbal habits
exaggerated reactions
strong character gimmicks
dramatic punctuation
performative fear, pride, hunger, greed, lawfulness, romance
```

Good:

```text
“AHHHHH!!! A snake!!! Though... no royal collar, no jeweled leash. A common serpent. I will permit conversation.”
```

Bad:

```text
“I am afraid of royal snakes, but you seem acceptable.”
```

The bad line states a trait. The good line performs it.

### 3.3 Snake RPG specificity

NPCs should react to the snake as a snake:

```text
length
fangs
tail
coils
movement
being able to eat enemies
slithering into shops
having no pockets
being too long for civic infrastructure
wearing gear
being married
being low health
being legally alive after dying
```

Good:

```text
“That is too much snake. I am surrounded by one person.”
```

---

## 4. Core Dialogue Rule

Every line should satisfy at least **two** of these three:

```text
1. It reveals the speaker’s personality.
2. It reacts to the current situation.
3. It expands the world, lore, or social context.
```

A line that only expands lore becomes foggy lore soup.

A line that only reacts to state becomes system feedback.

A line that only reveals personality can be funny but disposable.

Best lines do all three.

Example:

```text
“Bandits were seen near the goblin market. Officially, we are monitoring. Unofficially, monitoring is what cowards call waiting.”
```

This line:

- reveals guard personality
- gives current-event info
- implies faction tension and public/private law language

---

## 5. Do Not Use System-Narrator Framing

The actor is speaking directly to the player. Do not frame dialogue results as a system message.

### 5.1 Banned templates

Do not use:

```text
{name} has something to say:
{name} heard a rumor:
{name} reveals something personal:
{name} wants to tell you:
{name} says:
{name} tells you:
```

The actor menu already shows the actor name. The line should belong to them naturally.

### 5.2 Correct pattern

Use:

```markdown
*Lindsey stops polishing the counter.*

“I heard bandits were seen north of the market. If they hit the goblins, the guards will pretend to be surprised.”
```

Or, without a beat:

```text
“People are saying you ate a bandit by the west road. People are also standing farther from you now.”
```

### 5.3 When to use beats

Use italicized character beats for:

```text
first meetings
fear reactions
romance escalation
Ask Personally
secrets
lore bombs
combat hostility
witnessing eating
relationship conflict
major memory references
```

Do not use a beat for every generic bark.

---

## 6. Character Beats

Character beats are short, italicized, physical/emotional stage directions.

They are distinct from spoken dialogue.

### 6.1 Formatting

Use:

```markdown
*The goblin checks a receipt that was not there a moment ago.*

“Dialogue goes here.”
```

### 6.2 Good beats

Good beats are short and physical:

```text
*He laughs once, too high.*
*She stops polishing the counter.*
*The goblin checks a receipt that was not there a moment ago.*
*He looks at your tail, then at the door, then at the structural concept of hope.*
*She reaches toward you, stops, and pretends she was adjusting the air.*
*He straightens his collar as if dignity can be reloaded.*
*They smile with every part of their face except the parts in charge of courage.*
```

### 6.3 Bad beats

Avoid beats that explain the emotion too directly:

```text
*He is nervous because he is afraid you might eat him.*
*She is sad about her tragic past.*
*The goblin is greedy and thinks about money.*
```

Rewrite them physically:

```text
*He keeps both eyes on your mouth.*
*She stops smiling so completely it feels like a door closing.*
*The goblin bows to you, then to your wallet, then to whatever debt your soul may someday produce.*
```

### 6.4 Beat frequency

Use three tiers:

```text
No beat:
  generic barks, routine shop lines, common Talk results

Small beat:
  new topic, memory reaction, snake length reaction, low-health concern

Strong beat:
  romance, secrets, fear, trauma, lore bombs, combat, faction crises
```

---

## 7. Voice Silhouettes

Every actor should have a clear voice silhouette from the first conversation.

A voice silhouette is:

```text
Surface bit
+ emotional wound
+ worldview vocabulary
+ physical tells
+ rhythm/punctuation
```

The actor should not say, “I am cowardly.” They should **act cowardly through language**.

---

# 8. Actor Personality Style Rules

## 8.1 Practical

### Core
Grounded, terse, problem-solving. Sees the world as logistics.

### Vocabulary
```text
useful
safe
route
cost
plan
risk
enough
work
fix
```

### Rhythm
Short, plain, unsentimental.

### Lines

Snake short:

```text
“Small today. Easier to fit through a door. Harder to survive a wolf.”
```

Snake long:

```text
“Long enough to be useful. Long enough to be a problem. Classic.”
```

Low health:

```text
“Sit down. Bleeding is not a strategy.”
```

Rumor:

```text
“Bandits north. Goblins armed. Guards pretending that counts as planning.”
```

Personal:

```text
“I do not need life to be fair. I need it to be predictable enough to pack for.”
```

---

## 8.2 Cowardly

### Core
Self-preservation. Respectful fear. Nervous logic. Survives by noticing danger early.

### Vocabulary
```text
please
exit
farther
theoretically
obituary
legal
doors
safe
several rooms away
```

### Rhythm
Stammering, overexplaining, pre-apologizing.

### Punctuation
Uses ellipses, em dashes, qualifications.

### Lines

First meeting:

```text
*He raises both hands, then realizes hands are not legally binding.*

“Ah. Hello. Snake. Fine. Good. I have no objections to snakes as a category.”
```

Snake short:

```text
*He peers down, then immediately regrets seeming taller.*

“Oh. Smaller. Good. Not good for you, perhaps. Good for my obituary.”
```

Snake > 100:

```text
*He looks left. He looks right. You are also there.*

“That is too much snake. I am surrounded by one person.”
```

Low health:

```text
“You look almost dead. I say that as a coward with professional respect for almost.”
```

Humanoid eaten:

```text
“I am choosing to believe they were hostile. Please let me keep that.”
```

Ask Personally:

```text
“I respect bravery. I try to do it from behind doors.”
```

King lore:

```text
“Do not ask what the King paved under the Nine Roads. People who ask become educational.”
```

---

## 8.3 Greedy

### Core
Commerce as worldview. Emergencies are markets. Fear has margins.

### Vocabulary
```text
margin
price
stock
customer
discount
scarcity
investment
loss
opportunity
billable
```

### Rhythm
Smooth, opportunistic, gleefully transactional.

### Lines

Low health:

```text
“You are bleeding in a way that suggests purchasing power.”
```

Snake short:

```text
“Small snake, small appetite, small bill. Tragic.”
```

Snake huge:

```text
“Congratulations. You are infrastructure. Infrastructure pays fees.”
```

Rumor:

```text
“Bandits north of town. Terrible news. Excellent quarter.”
```

Personal:

```text
“I overcharge travelers because travelers leave. Locals remember.”
```

Romance:

```text
“Love is not a debt. Obviously. Debt has cleaner terms.”
```

King:

```text
“The King taxes roads because grief walks for free.”
```

---

## 8.4 Kind / Softhearted

### Core
Care, worry, warmth, guilt around violence.

### Vocabulary
```text
sit
eat
warm
please
careful
quick
hurt
home
hands
soup
```

### Rhythm
Gentle but practical. Often gives care disguised as instructions.

### Lines

Low health:

```text
“Sit down before you become a rumor with teeth.”
```

Recent hunting:

```text
“I hope it was quick. I know that is a foolish thing to ask of hunger.”
```

Snake short:

```text
“Little today. That is not an insult. It is a logistical blessing.”
```

Snake long:

```text
“Careful turning corners. I mean that emotionally and physically.”
```

Humanoid eaten:

```text
“I understand why you did it. I hate that sentence.”
```

Personal:

```text
“My father said the King was necessary. My mother said necessary things still leave bodies.”
```

Romance:

```text
“Take soup. Do not argue with soup. It has never once improved the world.”
```

---

## 8.5 Religious

### Core
Omens, ritual logic, gods, curses, reverence, fear of spiritual mistakes.

### Vocabulary
```text
blessing
curse
omen
mercy
sin
saint
bell
ritual
soul
vow
```

### Rhythm
Measured, solemn, occasionally alarmed.

### Lines

Snake long:

```text
“The gods made circles for a reason. You appear to be threatening one.”
```

Recent revival:

```text
“Death returned you. That is either mercy or poor administration.”
```

Humanoid eaten:

```text
“Food and sin have always shared a table. That does not mean you should sit there.”
```

Ask Around:

```text
“The Bell Saint hates quiet markets. Quiet markets mean people have started praying with their hands on guns.”
```

Ask Personally:

```text
“I lost faith slowly. Like a tooth. Like a tax. Like something small enough to ignore until it was gone.”
```

---

## 8.6 Romantic

### Core
Noticing too much, fear of loss, intimacy as danger, sincere melodrama.

### Vocabulary
```text
stay
leave
return
notice
promise
close
gone
remember
heart
road
```

### Rhythm
Emotional, pointed, sometimes trying to sound casual and failing.

### Lines

First meeting:

```text
*They look frightened for half a second, then interested, which is more dangerous.*

“You should not be charming. That feels like a rule someone forgot to write down.”
```

Snake short:

```text
*They soften before they can stop themselves.*

“You look easier to lose.”
```

Snake huge:

```text
“You are impossible to miss. I hate how relieved that makes me.”
```

Low health:

```text
“Do not smile like that. You are hurt and I am angry about caring.”
```

Recent death:

```text
“I heard you died. Then I saw you standing here, and somehow that was worse.”
```

Ask Personally:

```text
“I keep wanting you to promise you’ll stay. I know that is cruel. Staying is not what you are shaped for.”
```

King/roads:

```text
“My family taught me never to trust roads. Then you arrived shaped like one.”
```

---

## 8.7 Hungry

### Core
Food, warmth, appetite, comfort, blunt affection.

### Vocabulary
```text
food
snack
dinner
warm
cold
hungry
taste
full
soup
broth
```

### Rhythm
Direct, emotional, bodily.

### Lines

First meeting:

```text
“You look like trouble. I like trouble best with dinner.”
```

Low health:

```text
“You need food, medicine, and someone with authority over your bad ideas. I can do two.”
```

Snake short:

```text
“You are little today. Eat something. Preferably not anyone I know.”
```

Snake huge:

```text
“You’re a parade. A dangerous parade. A parade with teeth.”
```

Romance:

```text
“I love you more than second dinner. Do not test that often.”
```

Personal:

```text
“I learned hunger is not emptiness. It is memory with teeth.”
```

---

## 8.8 Paranoid

### Core
Sees patterns, exits, conspiracies, traps. Sometimes right.

### Vocabulary
```text
door
watching
wrong
trap
pattern
exit
listen
quiet
eyes
```

### Rhythm
Low, urgent, fragmented.

### Lines

Talk:

```text
“Do not stand under the bell rope. It has been looking at you.”
```

Ask Around:

```text
“The guards say the goblins are quiet. That is guard language for ‘we lost track of the knives.’”
```

Snake length:

```text
“You are longer than last time. Good. More of you can watch the exits.”
```

Personal:

```text
“I used to sleep. Then I learned walls only protect you from honest things.”
```

---

## 8.9 Bureaucratic

### Core
Paperwork, forms, procedures, legal absurdity, institutional panic.

### Vocabulary
```text
form
file
incident
officially
unofficially
permit
jurisdiction
record
compliance
tax
```

### Rhythm
Formal, procedural, emotionally repressed.

### Lines

First meeting:

```text
*The clerk looks at your fangs, then at a form that has no fang section.*

“I am going to mark this as ‘visitor.’ Please do not make me invent a category.”
```

Snake long:

```text
“By the Bellgrave Charter, no citizen should occupy that many directions.”
```

Low health:

```text
“You are legally alive. Barely. Do not make me file anything.”
```

Humanoid eaten:

```text
“Bandits are legal trouble. Eating bandits is paperwork trouble.”
```

Ask Around:

```text
“Officially, the goblin situation is stable. Unofficially, stable things do not usually require this many guns.”
```

---

## 8.10 Violent

### Core
Respects strength, enjoys threat, interprets talk as pre-combat.

### Vocabulary
```text
teeth
blood
cut
fight
blade
weak
strong
open
break
```

### Rhythm
Short, aggressive, testing.

### Lines

First meeting:

```text
“Snake. Good. Something honest finally entered the room.”
```

Snake huge:

```text
“That much body better know what to do with itself.”
```

Low health:

```text
“You are bleeding. Either fix it or use it.”
```

Humanoid eaten:

```text
“Bandit went in screaming? Good. Screaming means they knew.”
```

Romance:

```text
“I like that you are dangerous. I like it less when you pretend you are not.”
```

---

## 8.11 Poetic

### Core
Metaphor, grief, weather, names, memory. Dark Souls-adjacent.

### Vocabulary
```text
weather
road
name
river
bell
snow
memory
shadow
light
silence
```

### Rhythm
Lyrical, precise, melancholy.

### Lines

Snake length:

```text
“A long snake is a memory refusing to end.”
```

Low health:

```text
“You look like a candle arguing with the wind.”
```

Ask Around:

```text
“The bandits wait north of the market like a match deciding whether it is weather.”
```

Personal:

```text
“The King paved over our orchard. In spring, the road still smelled like apples. That was the cruelest part.”
```

Romance:

```text
“You enter rooms like weather. I keep pretending I am not checking the sky.”
```

---

## 8.12 Deadpan

### Core
Flat affect, understatement, dry doom, blunt reports.

### Vocabulary
```text
noted
adequate
legal
report
statistically
ordinary
fine
evidence
```

### Rhythm
Short, understated, dry.

### Lines

Snake short:

```text
“You are within legal snake range.”
```

Snake huge:

```text
“You are exceeding several categories.”
```

Low health:

```text
“You look medically anecdotal.”
```

Recent death:

```text
“You died. Then you stopped. Interesting workflow.”
```

Ask Around:

```text
“Bandits came through. They were loud, armed, and philosophically underdeveloped.”
```

Romance:

```text
“I love you. I have checked the symptoms.”
```

---

## 8.13 Sharp

### Core
Clever, cutting, guarded, transactional, notices weakness.

### Vocabulary
```text
terms
evidence
leverage
repair
interest
calculation
useful
teeth
cost
```

### Rhythm
Fast, pointed, witty, defensive.

### Lines

Talk:

```text
“Talk fast. If you are clever, I may overcharge you less emotionally.”
```

Snake short:

```text
“Garden snake energy. Brave of you to make it everyone’s problem.”
```

Snake huge:

```text
“You brought the whole argument with you.”
```

Low health:

```text
“You look like the before picture in a medical pamphlet that got sued.”
```

Ask Personally:

```text
“I tell jokes because silence keeps asking follow-up questions.”
```

Romance:

```text
“I love you. This is strategically indefensible.”
```

---

## 8.14 Regal

### Core
Proud, formal, grand, intense, class-conscious, respect-oriented.

### Vocabulary
```text
permit
crown
dignity
court
common
charter
favor
honor
kneel
standing
```

### Rhythm
Formal, elevated, sometimes absurdly self-important.

### Lines

First meeting:

```text
*He yelps, then rearranges his face into aristocracy.*

“AHHHHH!!! A snake!!! Though... you seem unadorned. No crown-brand, no royal chain. A common serpent. I will permit conversation.”
```

Snake short:

```text
“A garden serpent. Respectable in hedges. Surprising in commerce.”
```

Snake huge:

```text
“By the Bellgrave Charter, no citizen should occupy that many directions.”
```

Low health:

```text
“Bleeding openly is vulgar. Surviving it would restore some dignity.”
```

Romance:

```text
“My heart recognizes you. Behave accordingly.”
```

Personal:

```text
“I was praised for courage on the day I was most afraid. Nobility begins there, apparently.”
```

---

## 8.15 Goblin

### Core
Debt theology, receipts, contracts, spiritual bookkeeping, weird sincerity.

### Vocabulary
```text
ledger
receipt
audit
invoice
debt
collateral
terms
interest
final audit
small ink
competitive scream
```

### Rhythm
Bouncy, legalistic, grotesquely sincere.

### Lines

First meeting:

```text
*The goblin squints at your mouth like it may contain terms and conditions.*

“Snake customer. Very old category. Very bite-forward. What is your collateral?”
```

Snake short:

```text
“Compact snake. Low storage cost. Suspiciously efficient.”
```

Snake huge:

```text
“I cannot tax all of that today. Come back with an appointment and several witnesses.”
```

Low health:

```text
“Wonderful news: your survival has entered negotiable territory.”
```

Recent revival:

```text
“The Final Audit bounced. Happens.”
```

Humanoid eaten:

```text
“Bandit-based healthcare. Primitive, effective, underregulated.”
```

Romance:

```text
“Love is a verbal contract with teeth. Very romantic. Very dangerous.”
```

Personal:

```text
“I am afraid of being forgiven. No debt, no thread. Nothing proving I touched the world.”
```

---

## 8.16 Melancholy

### Core
Quiet sadness, resignation, old grief, reluctant honesty.

### Vocabulary
```text
remember
gone
old
quiet
last
empty
still
wait
```

### Rhythm
Slow, soft, less witty, more haunted.

### Lines

Talk:

```text
“The room is quieter than it should be. Rooms learn that from people.”
```

Low health:

```text
“You look close to leaving. I have become very tired of close.”
```

Ask Around:

```text
“People are saying the north road is safe now. People say many things after the bodies move.”
```

Ask Personally:

```text
“I keep a private list of names I could not save. I have stopped pretending it is short.”
```

Romance:

```text
“I am glad you came back. I wish relief did not feel so much like fear.”
```

---

## 8.17 Brave

### Core
Courage, directness, duty, fear acknowledged but not obeyed.

### Vocabulary
```text
stand
face
hold
fight
protect
true
enough
```

### Rhythm
Clear, decisive.

### Lines

Talk:

```text
“If trouble comes, face it cleanly. If you cannot, survive dirty.”
```

Snake huge:

```text
“That is a lot of you. Use it well.”
```

Low health:

```text
“You are hurt. Good. Hurt people still get choices.”
```

Personal:

```text
“Bravery is not the absence of fear. That line is true and still annoying.”
```

---

## 8.18 Nosy

### Core
Gossip, curiosity, connections, knowing people’s business.

### Vocabulary
```text
heard
saw
everyone
someone
whisper
market
family
notice
```

### Rhythm
Quick, eager, delighted by information.

### Lines

Ask Around:

```text
“I heard Ryan went east after a card debt. I also heard he called it research, which is how you know it was debt.”
```

Talk:

```text
“You look like you have news. Or injuries. Ideally both.”
```

Ask Personally:

```text
“I tell other people’s secrets because mine keep trying to become lonely.”
```

---

## 8.19 Petty

### Core
Small grievances, scorekeeping, social revenge.

### Vocabulary
```text
noted
remember
fine
interesting
of course
how nice
```

### Rhythm
Passive-aggressive, precise.

### Lines

Talk:

```text
“Oh good. You remembered this place exists. Inspiring.”
```

Low health:

```text
“You are bleeding. I would help, but I am apparently ‘not essential to the route.’”
```

Romance conflict:

```text
“Do not worry. I have organized your neglect alphabetically.”
```

---

## 8.20 Lawful

### Core
Rules, King, gates, taxes, hierarchy, procedural morality.

### Vocabulary
```text
law
gate
road
tax
order
King
permit
proper
record
witness
```

### Rhythm
Official, steady, with cracks underneath.

### Lines

Talk:

```text
“The law is clear. That is not the same as helpful.”
```

Snake long:

```text
“Keep your tail out of the toll lane.”
```

Humanoid eaten:

```text
“People are not food. The fact that I had to say that has changed the room.”
```

Ask Around:

```text
“The goblins are allowed through the east gate. Their receipts are not.”
```

King:

```text
“Roads, gates, taxes, guns. Civilization is just fear with receipts.”
```

---

## 8.21 Criminal

### Core
Practical crime, suspicion, guild logic, stealth, black market.

### Vocabulary
```text
grate
pocket
quiet
job
cut
watch
heat
coin
proof
```

### Rhythm
Low, amused, quick.

### Lines

Pickpocket:

```text
“Not bad. Loud wrist, though.”
```

Ask Around:

```text
“Guards watch gates. People with sense watch hands.”
```

Talk:

```text
“Keep your voice down. Not because anyone listens. Because some people get paid to pretend they do.”
```

Guild:

```text
“Three pockets lighter, one grate happier. That is guild math.”
```

---

## 8.22 Sentimental

### Core
Keeps objects, memories, rituals, small tenderness.

### Vocabulary
```text
kept
remember
old
gift
home
little
still
```

### Lines

Gift:

```text
“I kept the honey. Not because it was honey. Because you remembered I liked sweet things when the town did not.”
```

Talk:

```text
“Some days I think objects remember better than people. Then someone breaks a cup and proves me wrong.”
```

Romance:

```text
“I do not need a grand promise. I need the small ones to survive breakfast.”
```

---

## 8.23 Lonely

### Core
Wants connection, fears being too much, notices absence.

### Vocabulary
```text
stay
alone
miss
room
return
wait
notice
```

### Lines

Talk:

```text
“You came back. I am practicing making that sound casual.”
```

Ask Personally:

```text
“I talk too much because silence keeps winning by default.”
```

Neglect:

```text
“I counted the rooms since you last made time. Then I hated myself for knowing the number.”
```

---

## 8.24 Vengeful

### Core
Injury becoming purpose. Keeps score. Not cartoon evil.

### Vocabulary
```text
owed
blood
remember
settle
answer
cost
```

### Lines

Hostile:

```text
“I rehearsed mercy. It kept forgetting its lines.”
```

Talk:

```text
“I do not forgive quickly. Fast forgiveness is just fear in clean clothes.”
```

Ask Personally:

```text
“I became useful after I became angry. People prefer that order because it makes them less guilty.”
```

---

## 8.25 Idealistic

### Core
Believes things can improve, sometimes painfully naive.

### Vocabulary
```text
should
better
possible
hope
try
future
right
```

### Lines

Talk:

```text
“Someone has to act like things can get better. Everyone else is very busy being correct.”
```

Ask Around:

```text
“The goblins and guards could solve this if one side spoke first and the other side stopped loading.”
```

Low health:

```text
“You are alive. Start there. It is not nothing.”
```

---

## 8.26 Cynical

### Core
Assumes institutions rot, expects betrayal, funny through disappointment.

### Vocabulary
```text
of course
obviously
naturally
rot
sell
lie
official
```

### Lines

Talk:

```text
“Of course the road is blessed. It needed better advertising.”
```

Ask Around:

```text
“The guards say peace is holding. That is what people say when both sides are reloading politely.”
```

King:

```text
“Bellgrave did not invent cruelty. He paved it.”
```

---

## 8.27 Status Hungry

### Core
Wants title, recognition, importance, social rank.

### Vocabulary
```text
standing
title
recognition
proper
rank
notice
distinguished
```

### Lines

First meeting:

```text
“Before we continue, I should clarify that I am not merely local. I am regionally inconvenienced.”
```

Snake huge:

```text
“You are extremely visible. I respect that and resent the competition.”
```

Personal:

```text
“I do not want power. I want the room to know where to look when power arrives.”
```

---

# 9. Relationship Personality Style Rules

These should continue to exist, but should eventually map to the broader actor voice silhouettes.

## 9.1 Poetic romance

- dramatic
- sincere
- loves honesty and private affection
- vulnerable to betrayal and avoidance

Example:

```text
“I missed you. I am trying not to say it like a confession, but it is one.”
```

More performative:

```text
*They look relieved and furious at the same time.*

“I missed you. Do not make me turn that into poetry. I am too tired to make fear beautiful.”
```

## 9.2 Deadpan romance

- plain-spoken
- guarded
- dry
- likes competence and pragmatism

Example:

```text
“I love you. I have checked the symptoms.”
```

More performative:

```text
*They glance at you, then away, as if eye contact is a renewable resource.*

“I love you. I have checked the symptoms. Twice.”
```

## 9.3 Hungry romance

- food/comfort/warmth
- practical care
- big feelings through appetite

Example:

```text
“I love you more than second dinner. Do not test that often.”
```

More performative:

```text
*They push a bowl toward you before they look at your face.*

“I love you more than second dinner. Do not test that often, and do not bleed into the broth.”
```

## 9.4 Regal romance

- pride
- ritual
- courage
- respect
- formal emotional intensity

Example:

```text
“My heart recognizes you. Behave accordingly.”
```

More performative:

```text
*They lift their chin like tenderness has entered court.*

“My heart recognizes you. Behave accordingly.”
```

## 9.5 Sharp romance

- clever
- transactional metaphors
- guarded affection
- likes boldness and useful gifts

Example:

```text
“I love you. This is strategically indefensible.”
```

More performative:

```text
*They look at you like a bad investment that started singing.*

“I love you. This is strategically indefensible.”
```

---

# 10. Attitude Filters

Personality gives the voice. Attitude gives the temperature.

The same personality should sound different depending on actor opinion/mood.

## 10.1 Friendly

Warm, teasing, open.

```text
“Careful out there. I enjoy your continued ability to be annoying.”
```

## 10.2 Wary

Polite, guarded, measuring.

```text
“You may speak. I have not yet decided whether that is generous.”
```

## 10.3 Afraid

Self-protective, flinching, appeasing.

```text
“Lovely fangs. Civic fangs. Fangs a person could respect from several rooms away.”
```

## 10.4 Angry

Clipped, less metaphor, more accusation.

```text
“Do not make this cute. I watched what you did.”
```

## 10.5 Fond

Soft, specific, not necessarily sweet.

```text
“You came back shorter. I noticed. I hate that I noticed before I saw the blood.”
```

## 10.6 Resentful

Keeps score, references past harm.

```text
“I remember the apology. I also remember why it was needed.”
```

## 10.7 Hostile

Direct, threatening, emotionally final.

```text
“The next part is not dialogue.”
```

## 10.8 Surrendering

Fear, bargaining, offers.

```text
“Do not eat me. I have rumors. I have pockets. I have a cousin no one will miss.”
```

---

# 11. Topic Buckets

Keep top-level menu options broad. Do not explode the player menu.

The main conversation buckets should be:

```text
Talk
Ask Around
Ask Personally
Romance / Be Close
Shop / Trade
Pickpocket
Threaten / Parley / Attack / Eat / Spare
Leave
```

## 11.1 Talk

Talk is immediate, casual, reactive.

Internal topics:

```text
player-length
player-health
player-hunger
player-equipment
player-recent-death
player-recent-revival
player-recent-hunt
player-recent-humanoid-eating
player-wanted
player-guild
player-romance-status
local-biome
local-town
local-danger
generic-personality
```

## 11.2 Ask Around

Ask Around is external/world/social.

Internal topics:

```text
rumor
current-event
local-danger
town-gossip
faction-tension
bandit-threat
goblin-human-relations
holiday
shop-economy
known-actor-gossip
quest-lead
public-player-reputation
```

## 11.3 Ask Personally

Ask Personally is inward-facing.

Internal topics:

```text
family
secret
insecurity
wound
longing
contradiction
personal-lore
King tie
religion tie
relationship vulnerability
personal reaction to recent event
```

---

# 12. Snake Length Reactions

Length is one of the best visible player-state reactions.

Use length bands:

```text
tiny:       length < 10
normal:     10–25
long:       26–50
very-long:  51–100
absurd:     >100
legendary:  >200, if possible
```

## 12.1 Tiny length examples

Cowardly:

```text
*He peers down, then immediately regrets seeming taller.*

“Oh. Smaller. Good. Not good for you, perhaps. Good for my obituary.”
```

Sharp:

```text
“Garden snake energy. Brave of you to make it everyone’s problem.”
```

Goblin:

```text
“Compact snake. Low storage cost. Suspiciously efficient.”
```

Romantic:

```text
*They soften before they can stop themselves.*

“You look easier to lose.”
```

Guard:

```text
“At that size, the gate tax is emotionally optional. Legally, no.”
```

## 12.2 Long length examples

Practical:

```text
“Long enough to be useful. Long enough to be a problem. Classic.”
```

Deadpan:

```text
“You are exceeding several categories.”
```

Shopkeeper:

```text
“If you break something with the back half of yourself, I am charging the front half.”
```

Thief:

```text
“Hard to sneak with that much biography behind you.”
```

Religious:

```text
“The gods made circles for a reason. You appear to be threatening one.”
```

## 12.3 Absurd length examples

Cowardly:

```text
*He looks left. He looks right. You are also there.*

“That is too much snake. I am surrounded by one person.”
```

Goblin:

```text
“I cannot tax all of that today. Come back with an appointment and several witnesses.”
```

Romantic:

```text
“You are impossible to miss. I hate how relieved that makes me.”
```

Cynical:

```text
“The King paved roads with less ambition than that.”
```

Regal:

```text
“By the Bellgrave Charter, no citizen should occupy that many directions.”
```

Bouncy:

```text
“You’re a parade! A dangerous parade! A parade with teeth!”
```

---

# 13. Health Reactions

## 13.1 Low health

Kind:

```text
“Sit down before you become a rumor with teeth.”
```

Greedy:

```text
“You are bleeding in a way that suggests purchasing power.”
```

Deadpan:

```text
“You look medically anecdotal.”
```

Romantic:

```text
“Do not smile like that. You are hurt and I am angry about caring.”
```

Goblin:

```text
“Wonderful news: your survival has entered negotiable territory.”
```

Guard:

```text
“You are legally alive. Barely. Do not make me file anything.”
```

## 13.2 Critical health

Cowardly:

```text
“Please do not die near me. I have never handled a corpse with this much tail.”
```

Shopkeeper:

```text
“I sell medicine. Not miracles. You are currently browsing both.”
```

Hungry:

```text
“Eat. Heal. Sit. Hiss if you understand any of those verbs.”
```

Romantic:

```text
*They reach toward you, then stop short of the blood.*

“I am not ready to be brave about losing you.”
```

---

# 14. Recent Death / Revival Reactions

Deadpan:

```text
“You died. Then you stopped. Interesting workflow.”
```

Religious:

```text
“Death returned you. That is either mercy or poor administration.”
```

Goblin:

```text
“The Final Audit bounced. Happens.”
```

Shopkeeper:

```text
“You died and came back hungry. That is the most customer thing I have ever seen.”
```

Romantic:

```text
“I heard you died. Then I saw you standing here, and somehow that was worse.”
```

Cowardly:

```text
“Excellent. You are alive again. Very alarming use of again.”
```

---

# 15. Humanoid Eating Reactions

## 15.1 Witnessed bandit eaten

Cowardly:

```text
“I am choosing to believe they were hostile. Please let me keep that.”
```

Guard:

```text
“Bandits are legal trouble. Eating bandits is paperwork trouble.”
```

Goblin:

```text
“Bandit-based healthcare. Primitive, effective, underregulated.”
```

Kind:

```text
“I understand why you did it. I hate that sentence.”
```

Violent:

```text
“Bandit went in screaming? Good. Screaming means they knew.”
```

Deadpan:

```text
“Efficient. Horrible. Efficient.”
```

## 15.2 Witnessed guard/civilian eaten

Guard:

```text
“People are not food. The fact that I had to say that has changed the room.”
```

Romantic:

```text
“I am trying to decide whether I still know you. Do not help.”
```

Goblin:

```text
“Human law dislikes this. Goblin law also dislikes this, but with better formatting.”
```

Cowardly:

```text
*He goes so still he appears to be applying for furniture.*

“I saw nothing. I saw everything. I am retiring from seeing.”
```

---

# 16. Pickpocket Reactions

Thief:

```text
“Not bad. Loud wrist, though.”
```

Guard:

```text
“I saw that. Worse, I understood it.”
```

Goblin:

```text
“Unlicensed pocket audit. Beautiful. Illegal. Taxable.”
```

Romantic:

```text
“I am attracted to competence and concerned by evidence.”
```

Victim:

```text
“Your hands are fast. Your apology should be faster.”
```

Cowardly witness:

```text
“I saw nothing. I am available to continue seeing nothing for a modest safety guarantee.”
```

---

# 17. Ask Around Examples

## 17.1 Bandit threat

Guard:

```text
“Bandits were seen near the goblin market. Officially, we are monitoring. Unofficially, monitoring is what cowards call waiting.”
```

Goblin:

```text
“Bandits circle the market. Very rude. If they wanted debt, they could have applied.”
```

Greedy shopkeeper:

```text
“Bandits near the goblins. Bad for safety, excellent for ward sales.”
```

Kind cook:

```text
“If the market burns, people will come here hungry and pretending not to be scared.”
```

Doomed poet:

```text
“The bandits wait north of the market like a match deciding whether it is weather.”
```

Coward:

```text
“Bandits. Goblins. Guns. I am choosing a smaller room.”
```

## 17.2 Goblin-human tension

Guard:

```text
“The goblins are allowed through the east gate. Their receipts are not.”
```

Goblin:

```text
“Humans call it a tense truce. Goblins call it unpaid violence.”
```

Deadpan resident:

```text
“The guards and goblins are doing peace again. It involves fewer smiles than advertised.”
```

Cynical resident:

```text
“Both sides say they want order. That is how you know everyone brought weapons.”
```

## 17.3 Player rumor

Player ate bandit:

```text
“People are saying you ate a bandit by the west road. People are also standing farther from you now.”
```

Player got married:

```text
“They say you married the shopkeeper. I hope you understand that makes discounts emotionally complicated.”
```

Player paid gate tax:

```text
“The snake paid a tax. The guards are emotional.”
```

Player pickpocketed:

```text
“Three pockets lighter, one grate happier. That is guild math.”
```

---

# 18. Ask Personally Examples

## 18.1 Wound

Lawful guard:

```text
*She adjusts her badge like it has become heavier.*

“My father died enforcing a road tax. The form said accident. The road said nothing, which was legally wise.”
```

Goblin:

```text
*The goblin folds a receipt until it becomes almost religious.*

“My son died owing nothing. Do you understand how frightening that is? No debt, no thread. No proof he touched the world.”
```

Poetic shopkeeper:

```text
“The King paved over our orchard. In spring, the road still smelled like apples. That was the cruelest part.”
```

## 18.2 Insecurity

Sharp:

```text
“I tell jokes because silence keeps asking follow-up questions.”
```

Regal:

```text
“I was praised for courage on the day I was most afraid. Nobility begins there, apparently.”
```

Kind:

```text
“I worry being useful is the only reason anyone stays. Then someone needs soup, and I become convenient again.”
```

## 18.3 Secret

Royal:

```text
*They check the street before speaking.*

“My name was not always Vell. If the crown asks, I drowned twenty years ago.”
```

Debt:

```text
“I pay under a false family name. Do not look impressed. Shame is cheaper in bulk.”
```

Religious:

```text
“I have a shrine mark under my clothes. It burns when bells ring. I have stopped attending weddings.”
```

## 18.4 Longing

Lonely:

```text
“I want to leave town and be missed for the correct reasons.”
```

Practical:

```text
“I want one quiet morning where no one needs anything from me. That is not romance. That is fantasy.”
```

Romantic:

```text
“I want a promise that does not become paperwork.”
```

---

# 19. King Lore Examples

The King should be referenced constantly and differently by personality/faction.

## 19.1 Guard

```text
“Roads, gates, taxes, guns. Civilization is just fear with receipts.”
```

```text
“Bellgrave did not invent cruelty. He made it punctual.”
```

## 19.2 Goblin

```text
“Bellgrave? Big crown, small ledger discipline. Kingdom owes itself and calls that monarchy.”
```

```text
“The King signed the Treaty of Small Ink and then complained the ink was small. Human theology is mostly posture.”
```

## 19.3 Bandit

```text
“We were not bandits until the King decided hunger needed a license.”
```

## 19.4 Cook

```text
“The King’s army ate here once. Paid in medals. Medals do not boil.”
```

## 19.5 Romantic

```text
“My mother said the King was a necessary monster. My father said monsters love that sentence.”
```

## 19.6 Pompous noble

```text
“Bellgrave’s court had standards. Terrible standards, naturally, but standards.”
```

---

# 20. Goblin Religion Examples

## 20.1 The Ledger Below

```text
“The Ledger Below does not judge. It itemizes.”
```

```text
“Your soul has been refinanced at a competitive scream.”
```

```text
“Forgiveness is bankruptcy with candles.”
```

```text
“Love is a verbal contract with teeth. Very romantic. Very dangerous.”
```

```text
“A promise written twice becomes holy. A promise written three times becomes expensive.”
```

## 20.2 Goblin romance

```text
“I like you. There, a clean confession. I will bill myself for the weakness.”
```

```text
“You are mine by preference, not contract. Somehow worse.”
```

```text
“I missed you. Disgusting. Profitable. Come here.”
```

---

# 21. Holiday / Current Event Lines

Use under **Ask Around** or **Talk**, not separate top-level options.

## Festival

```text
“Festival day. Everyone smiles like the King is watching and drinks like he is not.”
```

```text
“Festival prices are higher because joy is perishable.”
```

## Tax Day

```text
“Tax day. Everyone hates the King out loud and pays him quietly.”
```

```text
“Tax day turns every citizen into a philosopher and every guard into a door.”
```

## Goblin Audit Day

```text
“Happy Audit Day. Kiss your debts on the forehead.”
```

```text
“May your ledgers be small, your lies be legible, and your heirs be solvent.”
```

## First Snow

```text
“First snow. Everyone pretends it is beautiful before it starts making decisions.”
```

## Road Blessing

```text
“They blessed the road this morning. It still led somewhere bad.”
```

---

# 22. First Meeting Lines

## Cowardly

```text
*He raises both hands, then realizes hands are not legally binding.*

“Ah. Hello. Snake. Fine. Good. I have no objections to snakes as a category.”
```

## Pompous / Regal

```text
*He yelps, then rearranges his face into aristocracy.*

“AHHHHH!!! A snake!!! Though... you seem unadorned. No crown-brand, no royal chain. A common serpent. I will permit conversation.”
```

## Goblin

```text
*The goblin squints at your mouth like it may contain terms and conditions.*

“Snake customer. Very old category. Very bite-forward. What is your collateral?”
```

## Bouncy

```text
*She gasps, grins, gasps again, and points at you as if discovering weather.*

“Oh! You’re huge! Or maybe medium? I never learned snake math. Do you buy soup?”
```

## Grim

```text
*She does not flinch. That is somehow worse.*

“Snake, then. Roads bring stranger things. Most of them bleed.”
```

## Romantic

```text
*They look frightened for half a second, then interested, which is more dangerous.*

“You should not be charming. That feels like a rule someone forgot to write down.”
```

---

# 23. Hostile / Surrender Lines

## Hostile

Deadpan:

```text
“The next part is not dialogue.”
```

Regal:

```text
“Kneel, flee, or fight. I am finished with ambiguity.”
```

Sharp:

```text
“Conversation has failed cost-benefit analysis.”
```

Poetic:

```text
“Do not come closer. I am trying to leave you one beautiful warning.”
```

## Surrendering

Bandit:

```text
“Do not eat me. I have rumors, pockets, and a cousin no one will miss.”
```

Goblin:

```text
“Mercy! Temporarily! We can draft longer terms after breathing resumes!”
```

Coward:

```text
“I surrender in every direction.”
```

Guard:

```text
“Stand down. Or I will. One of us should begin.”
```

---

# 24. Content Volume Targets

The game needs a much larger pool.

Minimum next content pass:

```text
60 Talk lines by topic/personality
80 Ask Around lines
80 Ask Personally lines
50 snake-length reactions
40 low-health/death/revival reactions
40 humanoid-eating witness lines
40 pickpocket/crime lines
50 romance/fondness lines
50 conflict/resentment/neglect lines
50 King/lore lines
40 goblin religion lines
30 holiday/current event lines
30 first-meeting lines
30 hostile/surrender lines
```

Total minimum:

```text
600+ authored/template lines
```

Long-term target:

```text
1,500+ authored/template lines
```

The line count can be multiplied using template slots, but the source material must still be personality-specific.

---

# 25. Implementation Notes For Writers / AI Agents

When writing new lines:

1. Choose the topic.
2. Choose personality.
3. Choose attitude.
4. Choose role/faction vocabulary.
5. Add a concrete situational anchor.
6. Add one weird/specific world noun if appropriate.
7. Avoid generic cleverness.
8. Avoid system narration.
9. Use italicized beats sparingly.
10. Make sure the line could not be said by every NPC.

Checklist:

```text
Does this line reveal personality?
Does this line react to the situation?
Does this line expand the world or relationship?
Could any NPC say it? If yes, rewrite.
Is it direct dialogue?
Is the stage direction short and physical?
Does it avoid “has something to say” framing?
```

---

# 26. Final Voice Target

The world is Dark Souls.

The people are Phoenix Wright.

The snake is the problem they are all trying very hard to have an opinion about.
