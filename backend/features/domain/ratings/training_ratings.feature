@wip
Feature: Training ratings
  A training rating records the attendance (present, late, excused,
  unexcused). Setting a player to excused or unexcused lets the performance
  values expire (rule 7). Training rating methods reject the ID of a match with
  AppointmentNotFound. A change to the current value records nothing (rule 12).

  Names like "Mia" stand for the playerId of a player, names like "M1" and "T1"
  for the ID of an appointment.

  Background:
    Given team 7 "U19" in season "2026_27" with tier "Kreisliga"
    And the squad contains "Mia"
    And match "M1" on "2026-09-12"
    And training "T1" on "2026-09-15" with duration 90

  Rule: Attendance

    Scenario Outline: Record the attendance
      When the attendance of "Mia" in "T1" is recorded as "<attendance>"
      Then the following is recorded:
        | event              | appointmentId | playerId | attendance   |
        | AttendanceRecorded | T1            | Mia      | <attendance> |

      Examples:
        | attendance |
        | present    |
        | late       |
        | excused    |
        | unexcused  |

    Scenario: Recording the current attendance records nothing
      Given "Mia" takes part in "T1" as "late"
      When the attendance of "Mia" in "T1" is recorded as "late"
      Then nothing is recorded

    Scenario: The attendance of an inactive player cannot be recorded
      Given "Mia" has been deactivated
      When the attendance of "Mia" in "T1" is recorded as "present"
      Then it is rejected with "PlayerInactive"

  Rule: Performance values expire when a player is excused or unexcused (rule 7)

    Background:
      Given "Mia" takes part in "T1" as "present"
      And "Mia" has performance grade 2 in "T1"

    Scenario: Switching between present and late keeps the values
      Given "Mia" takes part in "T1" as "late"
      When the performance grade of "Mia" in "T1" is withdrawn
      Then the following is recorded:
        | event                     | appointmentId | playerId |
        | PerformanceGradeWithdrawn | T1            | Mia      |

    Scenario Outline: After excused or unexcused the recording starts empty
      Given "Mia" does not take part in "T1" as "<attendance>"
      And "Mia" takes part in "T1" as "present"
      When the performance grade of "Mia" in "T1" is withdrawn
      Then nothing is recorded

      Examples:
        | attendance |
        | excused    |
        | unexcused  |

    Scenario: The comment stays when a player is excused
      Given "Mia" has a comment in "T1"
      And "Mia" does not take part in "T1" as "excused"
      When the comment of "Mia" in "T1" is removed
      Then the following is recorded:
        | event                | appointmentId | playerId |
        | RatingCommentRemoved | T1            | Mia      |

  Rule: Mark all active players as present

    Scenario: All active players without attendance are marked as present
      Given the squad contains "Ben"
      And the squad contains "Lea"
      And the squad contains "Tom"
      And "Ben" takes part in "T1" as "late"
      And "Lea" has been deactivated
      And "Tom" has a comment in "T1"
      When all active players are marked as present in "T1"
      Then the following is recorded:
        | event              | appointmentId | playerId | attendance |
        | AttendanceRecorded | T1            | Mia      | present    |
        | AttendanceRecorded | T1            | Tom      | present    |

    Scenario: An excused player is not marked as present
      Given "Mia" does not take part in "T1" as "excused"
      When all active players are marked as present in "T1"
      Then nothing is recorded

    Scenario: Marking all as present with nobody left records nothing
      Given "Mia" takes part in "T1"
      When all active players are marked as present in "T1"
      Then nothing is recorded

  Rule: Training rating methods only accept existing trainings

    Scenario Outline: A training rating method with the ID of a match is rejected
      When <action>
      Then it is rejected with "AppointmentNotFound"

      Examples:
        | action                                                   |
        | the attendance of "Mia" in "M1" is recorded as "present" |
        | all active players are marked as present in "M1"         |

    Scenario Outline: A training rating method with an unknown ID is rejected
      When <action>
      Then it is rejected with "AppointmentNotFound"

      Examples:
        | action                                                   |
        | the attendance of "Mia" in "X1" is recorded as "present" |
        | all active players are marked as present in "X1"         |

    Scenario: Recording the attendance of a player not in the squad is rejected
      When the attendance of "Ben" in "T1" is recorded as "present"
      Then it is rejected with "PlayerNotInSquad"

  Rule: A deleted team cannot be changed

    Scenario Outline: Training rating methods on a deleted team are rejected
      Given the team has been deleted
      When <action>
      Then it is rejected with "TeamDeleted"

      Examples:
        | action                                                   |
        | the attendance of "Mia" in "T1" is recorded as "present" |
        | all active players are marked as present in "T1"         |
