from BaseClasses import Item, ItemClassification


ITEM_BASE_ID = 913000000


item_table = {
    "Score Bundle +5": ITEM_BASE_ID + 1,
    "Score Bundle +10": ITEM_BASE_ID + 2,
    "Victory": None,
}


item_groups = {
    "Score Bundles": {
        "Score Bundle +5",
        "Score Bundle +10",
    },
}


item_pool = [
    "Score Bundle +5",
    "Score Bundle +5",
    "Score Bundle +5",
    "Score Bundle +10",
    "Score Bundle +10",
]


class SnakedItem(Item):
    game = "Snaked. Revised. Revamped."


def get_item_classification(name: str) -> ItemClassification:
    if name == "Victory":
        return ItemClassification.progression
    return ItemClassification.filler
