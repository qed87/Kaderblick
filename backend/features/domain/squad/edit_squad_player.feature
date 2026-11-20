@wip
Feature: Edit a squad player
  Shirt number, position and active state of a squad player are changed field
  by field. Only players in the squad can be changed (rule 3). A change to the
  current value records nothing (rule 12).

  Names like "Mia" stand for the playerId of a player.

  Background:
    Given team 7 "U19" in season "2026_27" with tier "Kreisliga"
    And the squad contains "Mia" with shirt number 10 and position "MF"

  Rule: Shirt number

    Scenario: Assign a shirt number
      When "Mia" gets shirt number 7
      Then the following is recorded:
        | event               | playerId | number |
        | ShirtNumberAssigned | Mia      | 7      |

    Scenario: Assigning the current shirt number records nothing
      When "Mia" gets shirt number 10
      Then nothing is recorded

    Scenario: Remove the shirt number
      When the shirt number of "Mia" is removed
      Then the following is recorded:
        | event              | playerId |
        | ShirtNumberRemoved | Mia      |

    Scenario: Removing a shirt number that does not exist records nothing
      Given the shirt number of "Mia" has been removed
      When the shirt number of "Mia" is removed
      Then nothing is recorded

  Rule: Position

    Scenario: Change the position
      When "Mia" gets position "ST"
      Then the following is recorded:
        | event           | playerId | position |
        | PositionChanged | Mia      | ST       |

    Scenario: Changing to the current position records nothing
      When "Mia" gets position "MF"
      Then nothing is recorded

    Scenario: Remove the position
      When the position of "Mia" is removed
      Then the following is recorded:
        | event           | playerId |
        | PositionRemoved | Mia      |

    Scenario: Removing a position that does not exist records nothing
      Given the position of "Mia" has been removed
      When the position of "Mia" is removed
      Then nothing is recorded

  Rule: Active and inactive

    Scenario: Deactivate a player
      When "Mia" is deactivated
      Then the following is recorded:
        | event             | playerId |
        | PlayerDeactivated | Mia      |

    Scenario: Deactivating an inactive player records nothing
      Given "Mia" has been deactivated
      When "Mia" is deactivated
      Then nothing is recorded

    Scenario: Reactivate a player
      Given "Mia" has been deactivated
      When "Mia" is reactivated
      Then the following is recorded:
        | event             | playerId |
        | PlayerReactivated | Mia      |

    Scenario: Reactivating an active player records nothing
      When "Mia" is reactivated
      Then nothing is recorded

  Rule: Remove from the squad and profile changes

    Scenario: Remove a player from the squad
      When "Mia" is removed from the squad
      Then the following is recorded:
        | event                  | playerId |
        | PlayerRemovedFromSquad | Mia      |

    Scenario: A profile change is noted in the team
      When the profile of "Mia" is noted as changed
      Then the following is recorded:
        | event                | playerId |
        | PlayerProfileChanged | Mia      |

    Scenario: Every profile change is noted
      Given the profile of "Mia" has been noted as changed
      When the profile of "Mia" is noted as changed
      Then the following is recorded:
        | event                | playerId |
        | PlayerProfileChanged | Mia      |

  Rule: Only squad players can be changed

    Scenario Outline: Changing a player who is not in the squad is rejected
      When <action>
      Then it is rejected with "PlayerNotInSquad"

      Examples:
        | action                                     |
        | "Jonas" gets shirt number 7                |
        | the shirt number of "Jonas" is removed     |
        | "Jonas" gets position "ST"                 |
        | the position of "Jonas" is removed         |
        | "Jonas" is deactivated                     |
        | "Jonas" is reactivated                     |
        | "Jonas" is removed from the squad          |
        | the profile of "Jonas" is noted as changed |

    Scenario: A removed player can no longer be changed
      Given "Mia" has been removed from the squad
      When "Mia" gets shirt number 7
      Then it is rejected with "PlayerNotInSquad"
