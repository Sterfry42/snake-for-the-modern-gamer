from dataclasses import dataclass

from Options import Choice, PerGameCommonOptions, Range, Toggle


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
    """Complete a percentage of enabled achievement locations."""

    display_name = "Goal"
    option_achievement_percentage = 0
    default = 0


class AchievementGoalPercentage(Range):
    """Percentage of enabled achievement locations required for the default goal."""

    display_name = "Achievement Goal Percentage"
    range_start = 40
    range_end = 100
    default = 60


class DeathLink(Choice):
    """Incoming DeathLink consumes a life when possible in soft mode."""

    display_name = "DeathLink"
    option_off = 0
    option_soft = 1
    default = 0


class IncludeCardTableChecks(Toggle):
    """Deprecated compatibility option. Card table wins are represented by achievements."""

    display_name = "Include Card Table Checks"
    default = 0


class IncludeArchaeologyChecks(Toggle):
    """Deprecated compatibility option. Archaeology milestones are represented by achievements."""

    display_name = "Include Archaeology Checks"
    default = 0


@dataclass
class SnakedOptions(PerGameCommonOptions):
    cardsanity: Cardsanity
    artifactsanity: Artifactsanity
    trap_frequency: TrapFrequency
    goal: Goal
    include_card_table_checks: IncludeCardTableChecks
    include_archaeology_checks: IncludeArchaeologyChecks
    achievement_goal_percentage: AchievementGoalPercentage
    death_link: DeathLink
