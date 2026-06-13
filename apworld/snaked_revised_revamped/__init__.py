from BaseClasses import Region, Tutorial
from worlds.AutoWorld import WebWorld, World

from .items import SnakedItem, get_item_classification, item_pool, item_table
from .locations import SnakedLocation, location_groups, location_table


class SnakedWeb(WebWorld):
    theme = "grass"
    tutorials = [
        Tutorial(
            "Multiworld Setup Guide",
            "A guide to setting up Snaked. Revised. Revamped. for Archipelago.",
            "English",
            "setup_en.md",
            "setup/en",
            ["Sterling"],
        )
    ]


class SnakedWorld(World):
    game = "Snaked. Revised. Revamped."
    web = SnakedWeb()

    item_name_to_id = item_table
    location_name_to_id = location_table
    item_name_groups = {
        "Score Bundles": {
            "Score Bundle +5",
            "Score Bundle +10",
        },
    }
    location_name_groups = location_groups

    def create_regions(self) -> None:
        menu = Region("Menu", self.player, self.multiworld)
        snake_run = Region("Snake Run", self.player, self.multiworld)

        self.multiworld.regions += [menu, snake_run]
        menu.connect(snake_run)

        for name, location_id in location_table.items():
            snake_run.locations.append(SnakedLocation(self.player, name, location_id, snake_run))

    def create_item(self, name: str) -> SnakedItem:
        return SnakedItem(name, get_item_classification(name), item_table[name], self.player)

    def create_items(self) -> None:
        for name in item_pool:
            self.multiworld.itempool.append(self.create_item(name))

        self.multiworld.get_location("Reach Score 10", self.player).place_locked_item(
            self.create_item("Victory")
        )

    def set_rules(self) -> None:
        self.multiworld.completion_condition[self.player] = lambda state: state.has(
            "Victory", self.player
        )

    def fill_slot_data(self) -> dict:
        return {
            "phase": 1,
            "location_name_to_id": location_table,
            "item_name_to_id": {
                name: code for name, code in item_table.items() if code is not None
            },
            "checks": {
                "score_1": location_table["Reach Score 1"],
                "score_10": location_table["Reach Score 10"],
                "length_1": location_table["Reach Length 1"],
                "length_10": location_table["Reach Length 10"],
                "first_apple_eaten": location_table["Eat Your First Apple"],
            },
            "items": {
                "score_bundle_5": item_table["Score Bundle +5"],
                "score_bundle_10": item_table["Score Bundle +10"],
            },
            "goal": "score_10",
        }
