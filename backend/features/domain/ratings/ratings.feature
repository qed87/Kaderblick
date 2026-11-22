Feature: Ratings
  A rating is the performance of a player at an appointment. Performance grade,
  fairness, attributes and comment work the same for matches and trainings.
  A player takes part when recorded as starting or substitute (match) or as
  present or late (training). Performance values can only be recorded for a
  player who takes part (rule 6) and is active (rule 4). The comment is not a
  performance value. A change to the current value records nothing (rule 12).

  Names like "Mia" stand for the playerId of a player, names like "M1" and "T1"
  for the ID of an appointment.

  Background:
    Given team 7 "U19" in season "2026_27" with tier "Kreisliga"
    And the squad contains "Mia"
    And match "M1" on "2026-09-12"
    And training "T1" on "2026-09-15" with duration 90

  Rule: Performance grade from 1 to 6 in half steps

    Scenario Outline: Grade the performance
      Given "Mia" takes part in "<appointment>"
      When "Mia" gets performance grade <grade> in "<appointment>"
      Then the following is recorded:
        | event             | appointmentId | playerId | grade   |
        | PerformanceGraded | <appointment> | Mia      | <grade> |

      Examples:
        | appointment | grade |
        | M1          | 1     |
        | M1          | 2.5   |
        | T1          | 6     |

    Scenario Outline: An invalid performance grade is rejected
      Given "Mia" takes part in "M1"
      When "Mia" gets performance grade <grade> in "M1"
      Then it is rejected with "InvalidValue"

      Examples:
        | grade |
        | 0     |
        | 0.5   |
        | 6.5   |
        | 2.25  |

    Scenario: Grading the current performance grade records nothing
      Given "Mia" takes part in "M1"
      And "Mia" has performance grade 2.5 in "M1"
      When "Mia" gets performance grade 2.5 in "M1"
      Then nothing is recorded

    Scenario Outline: Withdraw the performance grade
      Given "Mia" takes part in "<appointment>"
      And "Mia" has performance grade 2.5 in "<appointment>"
      When the performance grade of "Mia" in "<appointment>" is withdrawn
      Then the following is recorded:
        | event                     | appointmentId | playerId |
        | PerformanceGradeWithdrawn | <appointment> | Mia      |

      Examples:
        | appointment |
        | M1          |
        | T1          |

    Scenario: Withdrawing a performance grade that does not exist records nothing
      Given "Mia" takes part in "M1"
      When the performance grade of "Mia" in "M1" is withdrawn
      Then nothing is recorded

  Rule: Fairness from 1 to 6 in whole numbers

    Scenario Outline: Grade the fairness
      Given "Mia" takes part in "<appointment>"
      When "Mia" gets fairness grade <grade> in "<appointment>"
      Then the following is recorded:
        | event          | appointmentId | playerId | grade   |
        | FairnessGraded | <appointment> | Mia      | <grade> |

      Examples:
        | appointment | grade |
        | M1          | 1     |
        | T1          | 6     |

    Scenario Outline: An invalid fairness grade is rejected
      Given "Mia" takes part in "M1"
      When "Mia" gets fairness grade <grade> in "M1"
      Then it is rejected with "InvalidValue"

      Examples:
        | grade |
        | 0     |
        | 7     |
        | 2.5   |

    Scenario: Grading the current fairness records nothing
      Given "Mia" takes part in "M1"
      And "Mia" has fairness grade 2 in "M1"
      When "Mia" gets fairness grade 2 in "M1"
      Then nothing is recorded

    Scenario: Withdraw the fairness grade
      Given "Mia" takes part in "T1"
      And "Mia" has fairness grade 2 in "T1"
      When the fairness grade of "Mia" in "T1" is withdrawn
      Then the following is recorded:
        | event                  | appointmentId | playerId |
        | FairnessGradeWithdrawn | T1            | Mia      |

    Scenario: Withdrawing a fairness grade that does not exist records nothing
      Given "Mia" takes part in "T1"
      When the fairness grade of "Mia" in "T1" is withdrawn
      Then nothing is recorded

  Rule: Attributes from 0 to 5 stars in whole numbers

    Scenario Outline: Rate an attribute
      Given "Mia" takes part in "<appointment>"
      When "Mia" gets <stars> stars for "<attribute>" in "<appointment>"
      Then the following is recorded:
        | event          | appointmentId | playerId | attribute   | stars   |
        | AttributeRated | <appointment> | Mia      | <attribute> | <stars> |

      Examples:
        | appointment | attribute        | stars |
        | M1          | effort           | 0     |
        | M1          | technique        | 5     |
        | M1          | gameIntelligence | 3     |
        | T1          | duels            | 4     |
        | T1          | teamSpirit       | 1     |

    Scenario Outline: An invalid number of stars is rejected
      Given "Mia" takes part in "M1"
      When "Mia" gets <stars> stars for "effort" in "M1"
      Then it is rejected with "InvalidValue"

      Examples:
        | stars |
        | -1    |
        | 6     |
        | 2.5   |

    Scenario: Rating the current number of stars records nothing
      Given "Mia" takes part in "M1"
      And "Mia" has 3 stars for "effort" in "M1"
      When "Mia" gets 3 stars for "effort" in "M1"
      Then nothing is recorded

    Scenario: Attributes are rated independently
      Given "Mia" takes part in "M1"
      And "Mia" has 3 stars for "effort" in "M1"
      When "Mia" gets 3 stars for "technique" in "M1"
      Then the following is recorded:
        | event          | appointmentId | playerId | attribute | stars |
        | AttributeRated | M1            | Mia      | technique | 3     |

  Rule: Performance values need participation (rule 6)

    Scenario Outline: A performance value without participation is rejected
      When <action>
      Then it is rejected with "NotParticipating"

      Examples:
        | action                                              |
        | "Mia" gets performance grade 2 in "M1"              |
        | the performance grade of "Mia" in "M1" is withdrawn |
        | "Mia" gets fairness grade 2 in "T1"                 |
        | the fairness grade of "Mia" in "T1" is withdrawn    |
        | "Mia" gets 3 stars for "effort" in "M1"             |

    Scenario Outline: A player who does not take part cannot be graded
      Given "Mia" does not take part in "<appointment>" as "<status>"
      When "Mia" gets performance grade 2 in "<appointment>"
      Then it is rejected with "NotParticipating"

      Examples:
        | appointment | status    |
        | M1          | absent    |
        | T1          | excused   |
        | T1          | unexcused |

    Scenario Outline: Substitutes and late players take part
      Given "Mia" takes part in "<appointment>" as "<status>"
      When "Mia" gets performance grade 2 in "<appointment>"
      Then the following is recorded:
        | event             | appointmentId | playerId | grade |
        | PerformanceGraded | <appointment> | Mia      | 2     |

      Examples:
        | appointment | status     |
        | M1          | substitute |
        | T1          | late       |

  Rule: Comment

    Scenario Outline: Write a comment
      When a comment is written for "Mia" in "<appointment>"
      Then the following is recorded:
        | event                | appointmentId | playerId |
        | RatingCommentWritten | <appointment> | Mia      |

      Examples:
        | appointment |
        | M1          |
        | T1          |

    Scenario: Writing a comment again records the change
      Given "Mia" has a comment in "M1"
      When a comment is written for "Mia" in "M1"
      Then the following is recorded:
        | event                | appointmentId | playerId |
        | RatingCommentWritten | M1            | Mia      |

    Scenario: A comment is possible for an inactive player
      Given "Mia" has been deactivated
      When a comment is written for "Mia" in "T1"
      Then the following is recorded:
        | event                | appointmentId | playerId |
        | RatingCommentWritten | T1            | Mia      |

    Scenario: Remove the comment
      Given "Mia" has a comment in "T1"
      When the comment of "Mia" in "T1" is removed
      Then the following is recorded:
        | event                | appointmentId | playerId |
        | RatingCommentRemoved | T1            | Mia      |

    Scenario: Removing a comment that does not exist records nothing
      When the comment of "Mia" in "M1" is removed
      Then nothing is recorded

  Rule: Reset a rating

    Scenario Outline: Reset a rating
      Given "Mia" takes part in "<appointment>"
      When the rating of "Mia" in "<appointment>" is reset
      Then the following is recorded:
        | event       | appointmentId | playerId |
        | RatingReset | <appointment> | Mia      |

      Examples:
        | appointment |
        | M1          |
        | T1          |

    Scenario: After a reset the player is no longer recorded as taking part
      Given "Mia" takes part in "M1"
      And "Mia" has performance grade 2 in "M1"
      And the rating of "Mia" in "M1" has been reset
      When "Mia" gets performance grade 2 in "M1"
      Then it is rejected with "NotParticipating"

    Scenario: The comment stays after a reset
      Given "Mia" takes part in "M1"
      And "Mia" has a comment in "M1"
      And the rating of "Mia" in "M1" has been reset
      When the comment of "Mia" in "M1" is removed
      Then the following is recorded:
        | event                | appointmentId | playerId |
        | RatingCommentRemoved | M1            | Mia      |

    Scenario: Resetting a rating with nothing recorded records nothing
      When the rating of "Mia" in "M1" is reset
      Then nothing is recorded

    Scenario: Resetting a rating with only a comment records nothing
      Given "Mia" has a comment in "M1"
      When the rating of "Mia" in "M1" is reset
      Then nothing is recorded

    Scenario: The rating of an inactive player can be reset
      Given "Mia" takes part in "M1"
      And "Mia" has been deactivated
      When the rating of "Mia" in "M1" is reset
      Then the following is recorded:
        | event       | appointmentId | playerId |
        | RatingReset | M1            | Mia      |

  Rule: Inactive players cannot be rated (rule 4)

    Scenario Outline: Recording a value for an inactive player is rejected
      Given "Mia" takes part in "<appointment>"
      And "Mia" has performance grade 2 in "<appointment>"
      And "Mia" has been deactivated
      When <action>
      Then it is rejected with "PlayerInactive"

      Examples:
        | appointment | action                                              |
        | M1          | "Mia" gets performance grade 3 in "M1"              |
        | M1          | the performance grade of "Mia" in "M1" is withdrawn |
        | T1          | "Mia" gets fairness grade 2 in "T1"                 |
        | T1          | the fairness grade of "Mia" in "T1" is withdrawn    |
        | T1          | "Mia" gets 3 stars for "effort" in "T1"             |

    Scenario: Values of an inactive player are kept
      Given "Mia" takes part in "M1"
      And "Mia" has performance grade 2 in "M1"
      And "Mia" has been deactivated
      And "Mia" has been reactivated
      When the performance grade of "Mia" in "M1" is withdrawn
      Then the following is recorded:
        | event                     | appointmentId | playerId |
        | PerformanceGradeWithdrawn | M1            | Mia      |

  Rule: Ratings expire when the player or the appointment is removed (rule 10)

    Scenario: A player added again starts without ratings
      Given "Mia" takes part in "M1"
      And "Mia" has performance grade 2 in "M1"
      And "Mia" has been removed from the squad
      And the squad contains "Mia"
      When "Mia" gets performance grade 2 in "M1"
      Then it is rejected with "NotParticipating"

    Scenario: A new appointment with the ID of a deleted one starts without ratings
      Given "Mia" takes part in "M1"
      And "Mia" has performance grade 2 in "M1"
      And "M1" has been deleted
      And match "M1" on "2026-09-19"
      When "Mia" gets performance grade 2 in "M1"
      Then it is rejected with "NotParticipating"

  Rule: Only squad players at existing appointments can be rated

    Scenario Outline: Rating a player who is not in the squad is rejected
      When <action>
      Then it is rejected with "PlayerNotInSquad"

      Examples:
        | action                                              |
        | "Ben" gets performance grade 2 in "M1"              |
        | the performance grade of "Ben" in "M1" is withdrawn |
        | "Ben" gets fairness grade 2 in "T1"                 |
        | "Ben" gets 3 stars for "effort" in "T1"             |
        | a comment is written for "Ben" in "M1"              |
        | the comment of "Ben" in "M1" is removed             |
        | the rating of "Ben" in "T1" is reset                |

    Scenario Outline: Rating at an unknown or deleted appointment is rejected
      Given "T1" has been deleted
      When <action>
      Then it is rejected with "AppointmentNotFound"

      Examples:
        | action                                           |
        | "Mia" gets performance grade 2 in "X1"           |
        | "Mia" gets performance grade 2 in "T1"           |
        | the fairness grade of "Mia" in "T1" is withdrawn |
        | "Mia" gets 3 stars for "effort" in "X1"          |
        | a comment is written for "Mia" in "T1"           |
        | the comment of "Mia" in "X1" is removed          |
        | the rating of "Mia" in "T1" is reset             |

  Rule: Checks are made in a fixed order

    Scenario Outline: The first violated rule is reported
      Given "Mia" has been deactivated
      When <action>
      Then it is rejected with "<error>"

      Examples:
        | action                                 | error               |
        | "Ben" gets performance grade 2 in "X1" | AppointmentNotFound |
        | "Ben" gets performance grade 9 in "M1" | PlayerNotInSquad    |
        | "Mia" gets performance grade 9 in "M1" | PlayerInactive      |

    Scenario: Participation is checked before the value
      When "Mia" gets performance grade 9 in "M1"
      Then it is rejected with "NotParticipating"

  Rule: A deleted team cannot be changed

    Scenario Outline: Rating methods on a deleted team are rejected
      Given "Mia" takes part in "M1"
      And the team has been deleted
      When <action>
      Then it is rejected with "TeamDeleted"

      Examples:
        | action                                              |
        | "Mia" gets performance grade 2 in "M1"              |
        | the performance grade of "Mia" in "M1" is withdrawn |
        | "Mia" gets fairness grade 2 in "M1"                 |
        | the fairness grade of "Mia" in "M1" is withdrawn    |
        | "Mia" gets 3 stars for "effort" in "M1"             |
        | a comment is written for "Mia" in "M1"              |
        | the comment of "Mia" in "M1" is removed             |
        | the rating of "Mia" in "M1" is reset                |
