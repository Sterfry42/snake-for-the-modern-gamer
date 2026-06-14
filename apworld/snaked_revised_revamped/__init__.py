from BaseClasses import Region, Tutorial
from worlds.AutoWorld import WebWorld, World

from .items import (
    SnakedItem,
    get_item_classification,
    item_groups,
    item_key_to_name,
    item_metadata,
    item_table,
)
from .locations import (
    SnakedLocation,
    location_groups,
    location_key_to_name,
    location_name_to_key,
    location_table,
)
from .options import SnakedOptions


GOAL_KEY_BY_OPTION = {
    0: "score_1000",
    1: "score_10000",
    2: "length_250",
    3: "archaeology_first_cache",
    4: "boss_jason_statham",
    5: "achievement_goal",
}

TRAP_COUNT_BY_OPTION = {
    0: 0,
    1: 2,
    2: 5,
    3: 9,
    4: 15,
}


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
    item_name_groups = item_groups
    location_name_groups = location_groups
    options_dataclass = SnakedOptions

    def _option_value(self, name: str) -> int:
        return int(getattr(self.options, name).value)

    def _goal_key(self) -> str:
        return GOAL_KEY_BY_OPTION.get(self._option_value("goal"), "score_1000")

    def _enabled_location_table(self) -> dict[str, int]:
        cardsanity = self._option_value("cardsanity")
        artifactsanity = self._option_value("artifactsanity")
        include_card_tables = bool(self._option_value("include_card_table_checks"))
        include_archaeology = bool(self._option_value("include_archaeology_checks"))
        enabled: dict[str, int] = {}
        for name, location_id in location_table.items():
            key = location_name_to_key[name]
            if key.startswith("card_") and not key.startswith("card_table_") and cardsanity == 0:
                continue
            if key.startswith("card_table_") and not include_card_tables:
                continue
            if key.startswith("artifact_") and artifactsanity == 0:
                continue
            if key.startswith("archaeology_") and not include_archaeology:
                continue
            if key == "achievement_goal" and self._goal_key() != "achievement_goal":
                continue
            enabled[name] = location_id
        goal_name = location_key_to_name[self._goal_key()]
        enabled[goal_name] = location_table[goal_name]
        return enabled

    def _enabled_item_names(self) -> list[str]:
        cardsanity = self._option_value("cardsanity")
        artifactsanity = self._option_value("artifactsanity")
        names: list[str] = []
        for name, metadata in item_metadata.items():
            if name == "Victory":
                continue
            kind = metadata["kind"]
            if kind == "card" and cardsanity != 2:
                continue
            if kind == "artifact" and artifactsanity != 2:
                continue
            if kind == "trap":
                continue
            names.append(name)

        trap_names = [name for name, metadata in item_metadata.items() if metadata["kind"] == "trap"]
        trap_count = TRAP_COUNT_BY_OPTION.get(self._option_value("trap_frequency"), 5)
        for index in range(trap_count):
            names.append(trap_names[index % len(trap_names)])
        return names

    def create_regions(self) -> None:
        menu = Region("Menu", self.player, self.multiworld)
        snake_run = Region("Snake Run", self.player, self.multiworld)

        self.multiworld.regions += [menu, snake_run]
        menu.connect(snake_run)

        for name, location_id in self._enabled_location_table().items():
            snake_run.locations.append(SnakedLocation(self.player, name, location_id, snake_run))

    def create_item(self, name: str) -> SnakedItem:
        return SnakedItem(name, get_item_classification(name), item_table[name], self.player)

    def create_items(self) -> None:
        enabled_locations = self._enabled_location_table()
        item_pool = self._enabled_item_names()
        target_count = max(0, len(enabled_locations) - 1)
        while len(item_pool) < target_count:
            item_pool.append(self.get_filler_item_name())
        item_pool = item_pool[:target_count]

        for name in item_pool:
            self.multiworld.itempool.append(self.create_item(name))

        goal_name = location_key_to_name[self._goal_key()]
        self.multiworld.get_location(goal_name, self.player).place_locked_item(self.create_item("Victory"))

    def get_filler_item_name(self) -> str:
        return "Score Bundle +5"

    def set_rules(self) -> None:
        self.multiworld.completion_condition[self.player] = lambda state: state.has(
            "Victory", self.player
        )

    def fill_slot_data(self) -> dict:
        enabled_locations = self._enabled_location_table()
        return {
            "phase": 2,
            "location_name_to_id": enabled_locations,
            "item_name_to_id": item_table,
            "checks": {
                key: location_table[name]
                for key, name in location_key_to_name.items()
                if name in enabled_locations
            },
            "items": {key: item_table[name] for key, name in item_key_to_name.items()},
            "item_metadata": item_metadata,
            "goal": self._goal_key(),
            "achievementGoalPercentage": self._option_value("achievement_goal_percentage"),
            "enabledAchievementLocationKeys": [
                key
                for key, name in location_key_to_name.items()
                if key.startswith("achievement_") and key != "achievement_goal" and name in enabled_locations
            ],
            "achievementMetadata": {
                key: {"name": name}
                for key, name in location_key_to_name.items()
                if key.startswith("achievement_") and key != "achievement_goal" and name in enabled_locations
            },
            "deathLink": self._option_value("death_link"),
        }
