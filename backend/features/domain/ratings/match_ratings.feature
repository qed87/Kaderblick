Feature: Match ratings
  A match rating records the participation (starting, substitute, absent) and,
  for players who take part, goals, assists, saves and cards. Setting a player
  to absent lets the performance values expire (rule 7). Goals, assists and
  saves are set as absolute whole numbers of at least 0 (rules 8 and 11); a new
  rating starts with 0. Each card can be shown once per player and match
  (rule 9). Match rating methods reject the ID of a training with
  AppointmentNotFound. A change to the current value records nothing (rule 12).

  Names like "Mia" stand for the playerId of a player, names like "M1" and "T1"
  for the ID of an appointment.

  Background:
    Given team 7 "U19" in season "2026_27" with tier "Kreisliga"
    And the squad contains "Mia"
    And match "M1" on "2026-09-12"
    And training "T1" on "2026-09-15" with duration 90

  Rule: Participation

    Scenario Outline: Record the participation
      When the participation of "Mia" in "M1" is recorded as "<participation>"
      Then the following is recorded:
        | event                 | appointmentId | playerId | participation   |
        | ParticipationRecorded | M1            | Mia      | <participation> |

      Examples:
        | participation |
        | starting      |
        | substitute    |
        | absent        |

    Scenario: Recording the current participation records nothing
      Given "Mia" takes part in "M1" as "substitute"
      When the participation of "Mia" in "M1" is recorded as "substitute"
      Then nothing is recorded

    Scenario: The participation of an inactive player cannot be recorded
      Given "Mia" has been deactivated
      When the participation of "Mia" in "M1" is recorded as "starting"
      Then it is rejected with "PlayerInactive"

  Rule: Performance values expire when a player is set to absent (rule 7)

    Background:
      Given "Mia" takes part in "M1" as "starting"
      And "Mia" has performance grade 2 in "M1"
      And "Mia" has 2 goals in "M1"
      And "Mia" has been shown a "yellow" card in "M1"

    Scenario: Switching between starting and substitute keeps the values
      Given "Mia" takes part in "M1" as "substitute"
      When the performance grade of "Mia" in "M1" is withdrawn
      Then the following is recorded:
        | event                     | appointmentId | playerId |
        | PerformanceGradeWithdrawn | M1            | Mia      |

    Scenario Outline: After absent the recording starts empty
      Given "Mia" does not take part in "M1" as "absent"
      And "Mia" takes part in "M1" as "starting"
      When <action>
      Then the following is recorded:
        | event   | appointmentId | playerId | <column> |
        | <event> | M1            | Mia      | <value>  |

      Examples:
        | action                                  | event             | column | value  |
        | "Mia" gets performance grade 2 in "M1"  | PerformanceGraded | grade  | 2      |
        | the goals of "Mia" in "M1" are set to 2 | GoalsRecorded     | count  | 2      |
        | "Mia" is shown a "yellow" card in "M1"  | CardShown         | card   | yellow |

    Scenario: After absent there is no grade to withdraw
      Given "Mia" does not take part in "M1" as "absent"
      And "Mia" takes part in "M1" as "starting"
      When the performance grade of "Mia" in "M1" is withdrawn
      Then nothing is recorded

    Scenario: The comment stays when a player is set to absent
      Given "Mia" has a comment in "M1"
      And "Mia" does not take part in "M1" as "absent"
      When the comment of "Mia" in "M1" is removed
      Then the following is recorded:
        | event                | appointmentId | playerId |
        | RatingCommentRemoved | M1            | Mia      |

  Rule: Goals, assists and saves are absolute whole numbers

    Scenario Outline: Set a counter
      Given "Mia" takes part in "M1"
      When the <counter> of "Mia" in "M1" are set to 3
      Then the following is recorded:
        | event   | appointmentId | playerId | count |
        | <event> | M1            | Mia      | 3     |

      Examples:
        | counter | event           |
        | goals   | GoalsRecorded   |
        | assists | AssistsRecorded |
        | saves   | SavesRecorded   |

    Scenario: A counter is replaced, not increased
      Given "Mia" takes part in "M1"
      And "Mia" has 2 goals in "M1"
      When the goals of "Mia" in "M1" are set to 1
      Then the following is recorded:
        | event         | appointmentId | playerId | count |
        | GoalsRecorded | M1            | Mia      | 1     |

    Scenario Outline: An invalid count is rejected
      Given "Mia" takes part in "M1"
      When the <counter> of "Mia" in "M1" are set to <count>
      Then it is rejected with "InvalidValue"

      Examples:
        | counter | count |
        | goals   | -1    |
        | assists | 1.5   |
        | saves   | -2    |

    Scenario: Setting the current count records nothing
      Given "Mia" takes part in "M1"
      And "Mia" has 2 goals in "M1"
      When the goals of "Mia" in "M1" are set to 2
      Then nothing is recorded

    Scenario Outline: A new rating starts with 0
      Given "Mia" takes part in "M1"
      When the <counter> of "Mia" in "M1" are set to 0
      Then nothing is recorded

      Examples:
        | counter |
        | goals   |
        | assists |
        | saves   |

  Rule: Each card is shown at most once (rule 9)

    Scenario Outline: Show a card
      Given "Mia" takes part in "M1"
      When "Mia" is shown a "<card>" card in "M1"
      Then the following is recorded:
        | event     | appointmentId | playerId | card   |
        | CardShown | M1            | Mia      | <card> |

      Examples:
        | card      |
        | yellow    |
        | yellowRed |
        | red       |

    Scenario: A card that is already shown is rejected
      Given "Mia" takes part in "M1"
      And "Mia" has been shown a "yellow" card in "M1"
      When "Mia" is shown a "yellow" card in "M1"
      Then it is rejected with "CardAlreadyShown"

    Scenario: Different cards can be shown to the same player
      Given "Mia" takes part in "M1"
      And "Mia" has been shown a "yellow" card in "M1"
      When "Mia" is shown a "yellowRed" card in "M1"
      Then the following is recorded:
        | event     | appointmentId | playerId | card      |
        | CardShown | M1            | Mia      | yellowRed |

    Scenario: Withdraw a card
      Given "Mia" takes part in "M1"
      And "Mia" has been shown a "red" card in "M1"
      When the "red" card of "Mia" in "M1" is withdrawn
      Then the following is recorded:
        | event         | appointmentId | playerId | card |
        | CardWithdrawn | M1            | Mia      | red  |

    Scenario: Withdrawing a card that is not shown is rejected
      Given "Mia" takes part in "M1"
      When the "red" card of "Mia" in "M1" is withdrawn
      Then it is rejected with "CardNotShown"

    Scenario: A withdrawn card can be shown again
      Given "Mia" takes part in "M1"
      And "Mia" has been shown a "yellow" card in "M1"
      And the "yellow" card of "Mia" in "M1" has been withdrawn
      When "Mia" is shown a "yellow" card in "M1"
      Then the following is recorded:
        | event     | appointmentId | playerId | card   |
        | CardShown | M1            | Mia      | yellow |

  Rule: Match values need participation and an active player (rules 4 and 6)

    Scenario Outline: A match value without participation is rejected
      When <action>
      Then it is rejected with "NotParticipating"

      Examples:
        | action                                          |
        | the goals of "Mia" in "M1" are set to 1         |
        | the assists of "Mia" in "M1" are set to 1       |
        | the saves of "Mia" in "M1" are set to 1         |
        | "Mia" is shown a "yellow" card in "M1"          |
        | the "yellow" card of "Mia" in "M1" is withdrawn |

    Scenario Outline: A match value for an inactive player is rejected
      Given "Mia" takes part in "M1"
      And "Mia" has been shown a "yellow" card in "M1"
      And "Mia" has been deactivated
      When <action>
      Then it is rejected with "PlayerInactive"

      Examples:
        | action                                          |
        | the goals of "Mia" in "M1" are set to 1         |
        | the assists of "Mia" in "M1" are set to 1       |
        | the saves of "Mia" in "M1" are set to 1         |
        | "Mia" is shown a "red" card in "M1"             |
        | the "yellow" card of "Mia" in "M1" is withdrawn |

  Rule: Mark all active players as starting

    Scenario: All active players without participation are marked as starting
      Given the squad contains "Ben"
      And the squad contains "Lea"
      And the squad contains "Tom"
      And "Ben" takes part in "M1" as "substitute"
      And "Lea" has been deactivated
      And "Tom" has a comment in "M1"
      When all active players are marked as starting in "M1"
      Then the following is recorded:
        | event                 | appointmentId | playerId | participation |
        | ParticipationRecorded | M1            | Mia      | starting      |
        | ParticipationRecorded | M1            | Tom      | starting      |

    Scenario: A player set to absent is not marked as starting
      Given "Mia" does not take part in "M1" as "absent"
      When all active players are marked as starting in "M1"
      Then nothing is recorded

    Scenario: Marking all as starting with nobody left records nothing
      Given "Mia" takes part in "M1"
      When all active players are marked as starting in "M1"
      Then nothing is recorded

  Rule: Match rating methods only accept existing matches

    Scenario Outline: A match rating method with the ID of a training is rejected
      Given "Mia" takes part in "T1"
      When <action>
      Then it is rejected with "AppointmentNotFound"

      Examples:
        | action                                                       |
        | the participation of "Mia" in "T1" is recorded as "starting" |
        | the goals of "Mia" in "T1" are set to 1                      |
        | the assists of "Mia" in "T1" are set to 1                    |
        | the saves of "Mia" in "T1" are set to 1                      |
        | "Mia" is shown a "yellow" card in "T1"                       |
        | the "yellow" card of "Mia" in "T1" is withdrawn              |
        | all active players are marked as starting in "T1"            |

    Scenario Outline: A match rating method with an unknown ID is rejected
      When <action>
      Then it is rejected with "AppointmentNotFound"

      Examples:
        | action                                                       |
        | the participation of "Mia" in "X1" is recorded as "starting" |
        | all active players are marked as starting in "X1"            |

    Scenario Outline: A match rating method for a player not in the squad is rejected
      When <action>
      Then it is rejected with "PlayerNotInSquad"

      Examples:
        | action                                                       |
        | the participation of "Ben" in "M1" is recorded as "starting" |
        | the goals of "Ben" in "M1" are set to 1                      |
        | "Ben" is shown a "yellow" card in "M1"                       |
        | the "yellow" card of "Ben" in "M1" is withdrawn              |

  Rule: A deleted team cannot be changed

    Scenario Outline: Match rating methods on a deleted team are rejected
      Given "Mia" takes part in "M1"
      And the team has been deleted
      When <action>
      Then it is rejected with "TeamDeleted"

      Examples:
        | action                                                         |
        | the participation of "Mia" in "M1" is recorded as "substitute" |
        | the goals of "Mia" in "M1" are set to 1                        |
        | the assists of "Mia" in "M1" are set to 1                      |
        | the saves of "Mia" in "M1" are set to 1                        |
        | "Mia" is shown a "yellow" card in "M1"                         |
        | the "yellow" card of "Mia" in "M1" is withdrawn                |
        | all active players are marked as starting in "M1"              |
