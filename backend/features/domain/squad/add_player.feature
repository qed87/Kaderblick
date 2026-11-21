Feature: Add a player to the squad
  A player is added by playerId, optionally with shirt number and position.
  A player is at most once in the squad of a team (rule 3), but may be in the
  squads of several teams. Duplicate shirt numbers are allowed.

  Names like "Mia" stand for the playerId of a player.

  Background:
    Given team 7 "U19" in season "2026_27" with tier "Kreisliga"

  Scenario: Add a player with shirt number and position
    When "Mia" is added to the squad with shirt number 10 and position "MF"
    Then the following is recorded:
      | event              | playerId | shirtNumber | position |
      | PlayerAddedToSquad | Mia      | 10          | MF       |

  Scenario: Add a player without shirt number and position
    When "Mia" is added to the squad
    Then the following is recorded:
      | event              | playerId | shirtNumber | position |
      | PlayerAddedToSquad | Mia      |             |          |

  Scenario: A player cannot be added twice
    Given the squad contains "Mia"
    When "Mia" is added to the squad
    Then it is rejected with "PlayerAlreadyInSquad"

  Scenario: A player can be added again after being removed
    Given the squad contains "Mia"
    And "Mia" has been removed from the squad
    When "Mia" is added to the squad
    Then the following is recorded:
      | event              | playerId | shirtNumber | position |
      | PlayerAddedToSquad | Mia      |             |          |

  Scenario: Two players may have the same shirt number
    Given the squad contains "Mia" with shirt number 10
    When "Jonas" is added to the squad with shirt number 10 and position "ST"
    Then the following is recorded:
      | event              | playerId | shirtNumber | position |
      | PlayerAddedToSquad | Jonas    | 10          | ST       |
