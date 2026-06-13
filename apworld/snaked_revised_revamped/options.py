from dataclasses import dataclass

from Options import Choice, PerGameCommonOptions, Toggle


class Cardsanity(Choice):
    """Controls whether card collection checks and card AP items are included."""

    display_name = "Cardsanity"
    option_off = 0
    option_checks_only = 1
    option_checks_and_items = 2
    default = 2


class Artifactsanity(Choice):
    """Controls whether artifact recovery checks and artifact AP items are included."""

    display_name = "Artifactsanity"
    option_off = 0
    option_checks_only = 1
    option_checks_and_items = 2
    default = 2


class TrapFrequency(Choice):
    """Controls how many boss trap items are added to the item pool."""

    display_name = "Trap Frequency"
    option_none = 0
    option_low = 1
    option_normal = 2
    option_high = 3
    option_why = 4
    default = 2


class Goal(Choice):
    """Controls the runtime goal check the browser client reports as completion."""

    display_name = "Goal"
    option_score_1000 = 0
    option_score_10000 = 1
    option_length_250 = 2
    option_artifact_hunt = 3
    option_dennis_survival = 4
    default = 0


class IncludeCardTableChecks(Toggle):
    """Adds card table win checks."""

    display_name = "Include Card Table Checks"
    default = 1


class IncludeArchaeologyChecks(Toggle):
    """Adds Moleman archaeology milestone checks."""

    display_name = "Include Archaeology Checks"
    default = 1


@dataclass
class SnakedOptions(PerGameCommonOptions):
    cardsanity: Cardsanity
    artifactsanity: Artifactsanity
    trap_frequency: TrapFrequency
    goal: Goal
    include_card_table_checks: IncludeCardTableChecks
    include_archaeology_checks: IncludeArchaeologyChecks
