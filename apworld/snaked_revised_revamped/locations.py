from BaseClasses import Location


LOCATION_BASE_ID = 912000000


location_table = {
    "Reach Score 1": LOCATION_BASE_ID + 1,
    "Reach Score 10": LOCATION_BASE_ID + 2,
    "Reach Length 1": LOCATION_BASE_ID + 3,
    "Reach Length 10": LOCATION_BASE_ID + 4,
    "Eat Your First Apple": LOCATION_BASE_ID + 5,
}


location_groups = {
    "Score": {
        "Reach Score 1",
        "Reach Score 10",
    },
    "Length": {
        "Reach Length 1",
        "Reach Length 10",
    },
    "Apples": {
        "Eat Your First Apple",
    },
}


class SnakedLocation(Location):
    game = "Snaked. Revised. Revamped."
