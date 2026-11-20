@wip
Feature: Create a team
  A team is created once with a name, a season and an optional tier.
  The name must not be empty and the season has the format YYYY_YY,
  where YY is the year after YYYY (rule 2).

  Scenario: Create a team with all data
    When team 7 is created with name "U19", season "2026_27" and tier "Kreisliga"
    Then the following is recorded:
      | event       | teamId | name | season  | tier      |
      | TeamCreated | 7      | U19  | 2026_27 | Kreisliga |

  Scenario: Create a team without tier
    When team 7 is created with name "U19", season "2026_27" and no tier
    Then the following is recorded:
      | event       | teamId | name | season  | tier |
      | TeamCreated | 7      | U19  | 2026_27 |      |

  Scenario: Spaces around the name are removed
    When team 7 is created with name "  U19  ", season "2026_27" and no tier
    Then the following is recorded:
      | event       | teamId | name | season  | tier |
      | TeamCreated | 7      | U19  | 2026_27 |      |

  Scenario: An empty name is rejected
    When team 7 is created with name "", season "2026_27" and no tier
    Then it is rejected with "InvalidName"

  Scenario: A name of only spaces is rejected
    When team 7 is created with name "   ", season "2026_27" and no tier
    Then it is rejected with "InvalidName"

  Scenario Outline: A season in the correct format is accepted
    When team 7 is created with name "U19", season "<season>" and no tier
    Then the team is created

    Examples:
      | season  |
      | 2026_27 |
      | 2099_00 |

  Scenario Outline: An invalid season is rejected
    When team 7 is created with name "U19", season "<season>" and no tier
    Then it is rejected with "InvalidSeason"

    Examples:
      | season   | reason                        |
      | 2026_28  | second year is not next year  |
      | 2026_26  | second year is the same year  |
      | 2026/27  | wrong separator               |
      | 26_27    | first year too short          |
      | 2026_027 | second year too long          |
