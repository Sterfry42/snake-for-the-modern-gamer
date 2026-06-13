from BaseClasses import Item, ItemClassification

from .locations import ARTIFACT_DEFINITIONS, CARD_DEFINITIONS, CORE_ITEM_IDS


ITEM_BASE_ID = 913000000


def _key_part(value: str) -> str:
    return value.replace("-", "_")


def _title(value: str) -> str:
    return value.replace("-", " ").title()


item_table = {
    "Score Bundle +5": ITEM_BASE_ID + 1,
    "Score Bundle +10": ITEM_BASE_ID + 2,
    "Victory": ITEM_BASE_ID + 3,
}

item_key_to_name = {
    "score_bundle_5": "Score Bundle +5",
    "score_bundle_10": "Score Bundle +10",
    "victory": "Victory",
}

item_metadata = {
    "Score Bundle +5": {"kind": "score-bundle", "amount": 5, "classification": "filler"},
    "Score Bundle +10": {"kind": "score-bundle", "amount": 10, "classification": "filler"},
    "Victory": {"kind": "victory", "classification": "progression"},
}

for index, item_id in enumerate(CORE_ITEM_IDS):
    name = _title(item_id)
    item_table[name] = ITEM_BASE_ID + 4 + index
    item_key_to_name[f"grant_{_key_part(item_id)}"] = name
    item_metadata[name] = {
        "kind": "inventory-item",
        "item_id": item_id,
        "classification": "useful",
    }

for index, (card_id, card_name) in enumerate(CARD_DEFINITIONS):
    item_table[card_name] = ITEM_BASE_ID + 44 + index
    item_key_to_name[f"grant_card_{_key_part(card_id)}"] = card_name
    item_metadata[card_name] = {
        "kind": "card",
        "card_id": card_id,
        "classification": "useful",
    }

for index, (artifact_id, artifact_name) in enumerate(ARTIFACT_DEFINITIONS):
    item_table[artifact_name] = ITEM_BASE_ID + 60 + index
    item_key_to_name[f"grant_artifact_{_key_part(artifact_id)}"] = artifact_name
    item_metadata[artifact_name] = {
        "kind": "artifact",
        "artifact_id": artifact_id,
        "classification": "useful",
    }

bundle_and_trap_items = [
    ("score_bundle_25", "Score Bundle +25", 71, {"kind": "score-bundle", "amount": 25}),
    ("score_bundle_100", "Score Bundle +100", 72, {"kind": "score-bundle", "amount": 100}),
    ("score_bundle_500", "Score Bundle +500", 73, {"kind": "score-bundle", "amount": 500}),
    ("length_bundle_1", "Length Bundle +1", 74, {"kind": "length-bundle", "amount": 1}),
    ("length_bundle_3", "Length Bundle +3", 75, {"kind": "length-bundle", "amount": 3}),
    ("length_bundle_10", "Length Bundle +10", 76, {"kind": "length-bundle", "amount": 10}),
    ("healing_bundle", "Healing Bundle", 77, {"kind": "inventory-item", "item_id": "healing-potion"}),
    ("apple_bundle", "Apple Bundle", 78, {"kind": "inventory-item", "item_id": "apple-normal"}),
    ("food_bundle", "Food Bundle", 79, {"kind": "inventory-item", "item_id": "ramen"}),
    ("ofuda_bundle", "Ofuda Bundle", 80, {"kind": "inventory-item", "item_id": "ofuda"}),
    ("freak_dennis_trap", "Freak Dennis Trap", 81, {"kind": "trap", "trap_id": "freak-dennis"}),
    ("freaker_dennis_trap", "Freaker Dennis Trap", 82, {"kind": "trap", "trap_id": "freaker-dennis"}),
    ("jason_statham_trap", "Jason Statham Trap", 83, {"kind": "trap", "trap_id": "jason-statham"}),
]

for key, name, offset, metadata in bundle_and_trap_items:
    item_table[name] = ITEM_BASE_ID + offset
    item_key_to_name[key] = name
    item_metadata[name] = {
        **metadata,
        "classification": "trap" if metadata["kind"] == "trap" else metadata.get("classification", "useful"),
    }


item_groups = {
    "Score Bundles": {name for name, metadata in item_metadata.items() if metadata["kind"] == "score-bundle"},
    "Length Bundles": {name for name, metadata in item_metadata.items() if metadata["kind"] == "length-bundle"},
    "Cards": {card_name for _, card_name in CARD_DEFINITIONS},
    "Artifacts": {artifact_name for _, artifact_name in ARTIFACT_DEFINITIONS},
    "Traps": {name for name, metadata in item_metadata.items() if metadata["kind"] == "trap"},
}


class SnakedItem(Item):
    game = "Snaked. Revised. Revamped."


def get_item_classification(name: str) -> ItemClassification:
    classification = item_metadata[name].get("classification", "filler")
    if classification == "progression":
        return ItemClassification.progression
    if classification == "useful":
        return ItemClassification.useful
    if classification == "trap":
        return ItemClassification.trap
    return ItemClassification.filler
