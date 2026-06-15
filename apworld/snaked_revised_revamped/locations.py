from BaseClasses import Location


LOCATION_BASE_ID = 912000000


def _key_part(value: str) -> str:
    return value.replace("-", "_")


def _location(name: str, offset: int) -> tuple[str, int]:
    return name, LOCATION_BASE_ID + offset


CARD_DEFINITIONS = [
    ("moss-two", "Moss Two"),
    ("moss-five", "Moss Five"),
    ("moss-eight", "Moss Eight"),
    ("teeth-three", "Teeth Three"),
    ("teeth-seven", "Teeth Seven"),
    ("lantern-three", "Lantern Three"),
    ("market-ace", "Market Ace"),
    ("moon-jack", "Moon Jack"),
    ("smoke-smog", "Smoke Smog"),
    ("careful-five", "Careful Five"),
    ("accountant-one", "Accountant One"),
    ("too-much-sauce", "Too Much Sauce"),
    ("angel-audit", "Angel Audit"),
    ("royal-scale", "Royal Scale"),
    ("freak-dennis-fog", "Freak Dennis Fog"),
    ("goblin-receipt", "Goblin Receipt"),
]


ARTIFACT_DEFINITIONS = [
    ("moleman-lunchbox", "Moleman Lunchbox"),
    ("surveyor-compass", "Surveyor Compass"),
    ("lucky-trowel", "Lucky Trowel"),
    ("ancient-snake-scale", "Ancient Snake Scale"),
    ("burrowing-boots", "Burrowing Boots"),
    ("cracked-shrine-fragment", "Cracked Shrine Fragment"),
    ("rusted-prospectors-charm", "Rusted Prospector's Charm"),
    ("cartographers-pencil", "Cartographer's Pencil"),
    ("preserved-orchard-seed", "Preserved Orchard Seed"),
    ("pocket-fossil", "Pocket Fossil"),
    ("molemans-lucky-pebble", "Moleman's Lucky Pebble"),
]


CORE_ITEM_IDS = [
    "weapon-revolver",
    "weapon-market-revolver",
    "weapon-jade-katana",
    "boots-quick",
    "boots-heavy",
    "boots-swim-fins",
    "boots-lead-flippers",
    "boots-geta",
    "helm-seer",
    "helm-sunshade",
    "helm-hazard-halo",
    "helm-cave-echo",
    "ring-seismic",
    "ring-ledger",
    "ring-back-alley-dividend",
    "gloves-mason",
    "cloak-veil",
    "cloak-frostguard",
    "cloak-firebreak",
    "cloak-furoshiki",
    "belt-regenerator",
    "belt-smuggler-cache",
    "amulet-phoenix",
    "amulet-baby-bottle",
    "amulet-time-splinter",
    "amulet-scavenger",
    "fishing-rod",
    "fishing-rod-carpenter",
    "fishing-rod-master",
    "ofuda",
    "orange-juice",
    "life-tonic",
    "healing-potion",
    "oni-charm",
    "kitsune-charm",
    "samurai-token",
    "jizo-stone",
    "raiju-bottle",
    "kappa-bowl",
    "katana-blueprint",
]


location_table = dict(
    [
        _location("Reach Score 1", 1),
        _location("Reach Score 10", 2),
        _location("Reach Length 1", 3),
        _location("Reach Length 10", 4),
        _location("Eat Your First Apple", 5),
        _location("Reach Score 100", 6),
        _location("Reach Score 250", 7),
        _location("Reach Score 1,000", 8),
        _location("Reach Score 10,000", 9),
        _location("Reach Length 100", 10),
        _location("Reach Length 250", 11),
    ]
)

APPLE_TYPES = [
    "normal",
    "shielded",
    "gold",
    "pearl",
    "skittish",
    "mochi",
    "wasabi",
    "yuzu",
    "koi",
    "amacha",
    "caffeinated",
]

for index, apple_type in enumerate(APPLE_TYPES):
    location_table[f"Eat a {apple_type.replace('-', ' ').title()} Apple"] = LOCATION_BASE_ID + 12 + index

QUESTS = [
    ("tax-collector-future-body", "Tax Collector Future Body"),
    ("green-purchase", "Green Purchase"),
    ("find-my-baby", "Find My Baby"),
    ("goblin-ledger-debt", "Goblin Ledger Debt"),
    ("freak-you", "Freak You"),
    ("starforged-heliopause", "Starforged Heliopause"),
]

for index, (_, label) in enumerate(QUESTS):
    location_table[f"Complete {label}"] = LOCATION_BASE_ID + 23 + index

for index, item_id in enumerate(CORE_ITEM_IDS):
    location_table[f"Find {item_id.replace('-', ' ').title()}"] = LOCATION_BASE_ID + 29 + index

for index, (_, card_name) in enumerate(CARD_DEFINITIONS):
    location_table[f"Collect {card_name}"] = LOCATION_BASE_ID + 69 + index

location_table.update(
    {
        "Win at Porch Table": LOCATION_BASE_ID + 85,
        "Win at Market Table": LOCATION_BASE_ID + 86,
        "Win at Freak Dennis Dare": LOCATION_BASE_ID + 87,
    }
)

ACHIEVEMENT_LOCATIONS = [
    ("achievement_core_firstApple", "A Classic"),
    ("achievement_core_bigBite", "Big Bite"),
    ("achievement_stats_score500", "Making Points"),
    ("achievement_stats_score1000", "Four Digits"),
    ("achievement_stats_score10000", "Score Lord"),
    ("achievement_stats_length100", "Long Snake"),
    ("achievement_stats_length250", "Legendary Length"),
    ("achievement_stats_length1000", "World Serpent"),
    ("achievement_exploration_rooms25", "Road Trip"),
    ("achievement_equipment_swim25", "Olympic Swimmer"),
    ("achievement_biomes_discoverAll", "World Tour"),
    ("achievement_towns_openGate", "City Limits"),
    ("achievement_guild_enterHideout", "Down the Grate"),
    ("achievement_hazards_hotSurvival", "Heat Wave"),
    ("achievement_hazards_coldSurvival", "Cold Snap"),
    ("achievement_hazards_heatResistance", "Fireproof"),
    ("achievement_hazards_coldResistance", "Winterized"),
    ("achievement_towns_wanted5", "Public Enemy"),
    ("achievement_guild_initiation", "In the Guild"),
    ("achievement_towns_bigIron", "Big Iron"),
    ("achievement_house_expansion", "Room to Grow"),
    ("achievement_quests_first", "Helpful Snake"),
    ("achievement_quests_five", "Errand Coil"),
    ("achievement_treasure_first", "Treasure Hunter"),
    ("achievement_treasure_five", "Cache Collector"),
    ("achievement_relationships_firstDate", "First Date"),
    ("achievement_relationships_married", "Till Death"),
    ("achievement_relationships_child", "Family Expansion"),
    ("achievement_relationships_divorced", "Record Closed"),
    ("achievement_fishing_firstCatch", "Gone Fishin'"),
    ("achievement_fishing_rare", "Rare Bite"),
    ("achievement_fishing_legendary", "Legend of the Lake"),
    ("achievement_fishing_completeJournal", "Complete Catch Journal"),
    ("achievement_archaeology_firstArtifact", "Dusty Treasure"),
    ("achievement_archaeology_chain3", "Chain Reaction"),
    ("achievement_archaeology_chain5", "Excavation Combo"),
    ("achievement_archaeology_depth25", "Deep Dig"),
    ("achievement_archaeology_depth50", "Too Deep"),
    ("achievement_archaeology_allArtifacts", "Museum Wing"),
    ("achievement_equipment_equipFirst", "Dress for the Job"),
    ("achievement_equipment_fullLoadout", "Full Loadout"),
    ("achievement_equipment_secondChance", "Second Chances"),
    ("achievement_combat_gunKill", "Formal Disagreement"),
    ("achievement_combat_katanaSmite", "Cut Through Bureaucracy"),
    ("achievement_food_drunk", "Get Drunk"),
    ("achievement_food_comboMeal", "Combo Meal"),
    ("achievement_boss_defeatFreakDennis", "Freak Off"),
    ("achievement_boss_defeatFreakerDennis", "Freakier Friday"),
    ("achievement_boss_damageJasonVulnerable", "Now He's Vulnerable"),
    ("achievement_boss_defeatJasonStatham", "Statham Must Fall"),
    ("achievement_divine_meetAngel", "Meet the Angel"),
    ("achievement_divine_meetGoblinAngel", "Meet the Goblin Angel"),
    ("achievement_rivals_length25", "Let Them Cook"),
    ("achievement_skillTree_oneBranch", "Specialist"),
    ("achievement_skillTree_allBranches", "Fully Realized Snake"),
    ("achievement_caves_appleRushClear", "Core Before the Collapse"),
    ("achievement_companions_first", "Coil and Company"),
    ("achievement_shops_generalBuyout", "Nothing Left but the Counter"),
    ("achievement_cards_fullDeck", "Full Deck"),
    ("achievement_cards_win_porch_table", "Card Sharp: Porch Table"),
    ("achievement_cards_win_market_table", "Card Sharp: Market Table"),
    ("achievement_cards_win_dennis_dare", "Card Sharp: Freak Dennis Dare"),
    ("achievement_equipment_cowbell200", "For Whom the Bell Coils"),
    ("achievement_equipment_wardTrinity", "Terms and Conditions Apply"),
    ("achievement_system_zoomFlurry", "Enhance! Enhance!"),
]

for index, (_, name) in enumerate(ACHIEVEMENT_LOCATIONS):
    location_table[name] = 912001000 + index
location_table["Achievement Percentage Goal"] = 912009999

for index, (_, artifact_name) in enumerate(ARTIFACT_DEFINITIONS):
    location_table[f"Recover {artifact_name}"] = LOCATION_BASE_ID + 88 + index

location_table.update(
    {
        "Reach Archaeology Depth 10": LOCATION_BASE_ID + 99,
        "Reach Archaeology Depth 25": LOCATION_BASE_ID + 100,
        "Reach Archaeology Depth 50": LOCATION_BASE_ID + 101,
        "Reach Archaeology Chain 5": LOCATION_BASE_ID + 102,
        "Reach Archaeology Chain 10": LOCATION_BASE_ID + 103,
        "Recover First Archaeology Cache": LOCATION_BASE_ID + 104,
        "Defeat Jason Statham": LOCATION_BASE_ID + 105,
    }
)


location_key_to_name = {
    "score_1": "Reach Score 1",
    "score_10": "Reach Score 10",
    "length_1": "Reach Length 1",
    "length_10": "Reach Length 10",
    "first_apple_eaten": "Eat Your First Apple",
    "score_100": "Reach Score 100",
    "score_250": "Reach Score 250",
    "score_1000": "Reach Score 1,000",
    "score_10000": "Reach Score 10,000",
    "length_100": "Reach Length 100",
    "length_250": "Reach Length 250",
}

for apple_type in APPLE_TYPES:
    location_key_to_name[f"apple_{apple_type}"] = f"Eat a {apple_type.replace('-', ' ').title()} Apple"
for quest_id, label in QUESTS:
    location_key_to_name[f"quest_{_key_part(quest_id)}"] = f"Complete {label}"
for item_id in CORE_ITEM_IDS:
    location_key_to_name[f"item_{_key_part(item_id)}"] = f"Find {item_id.replace('-', ' ').title()}"
for card_id, card_name in CARD_DEFINITIONS:
    location_key_to_name[f"card_{_key_part(card_id)}"] = f"Collect {card_name}"
location_key_to_name.update(
    {
        "card_table_porch_table": "Win at Porch Table",
        "card_table_market_table": "Win at Market Table",
        "card_table_dennis_dare": "Win at Freak Dennis Dare",
    }
)
for key, name in ACHIEVEMENT_LOCATIONS:
    location_key_to_name[key] = name
location_key_to_name["achievement_goal"] = "Achievement Percentage Goal"
for artifact_id, artifact_name in ARTIFACT_DEFINITIONS:
    location_key_to_name[f"artifact_{_key_part(artifact_id)}"] = f"Recover {artifact_name}"
location_key_to_name.update(
    {
        "archaeology_depth_10": "Reach Archaeology Depth 10",
        "archaeology_depth_25": "Reach Archaeology Depth 25",
        "archaeology_depth_50": "Reach Archaeology Depth 50",
        "archaeology_chain_5": "Reach Archaeology Chain 5",
        "archaeology_chain_10": "Reach Archaeology Chain 10",
        "archaeology_first_cache": "Recover First Archaeology Cache",
        "boss_jason_statham": "Defeat Jason Statham",
    }
)

location_name_to_key = {name: key for key, name in location_key_to_name.items()}


location_groups = {
    "Score": {name for name in location_table if name.startswith("Reach Score")},
    "Length": {name for name in location_table if name.startswith("Reach Length")},
    "Apples": {name for name in location_table if name.startswith("Eat")},
    "Quests": {name for name in location_table if name.startswith("Complete")},
    "Items": {name for name in location_table if name.startswith("Find")},
    "Cards": {name for name in location_table if name.startswith("Collect")},
    "Card Tables": {name for name in location_table if name.startswith("Win at")},
    "Artifacts": {name for name in location_table if name.startswith("Recover")},
    "Bosses": {"Defeat Jason Statham"},
    "Achievements": {name for _, name in ACHIEVEMENT_LOCATIONS},
}


class SnakedLocation(Location):
    game = "Snaked. Revised. Revamped."
