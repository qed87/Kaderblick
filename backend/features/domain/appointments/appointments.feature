@wip
Feature: Appointments
  Matches and trainings are appointments. They share date, notes and deletion.
  Ratings only exist for appointments that exist and are not deleted (rule 5).
  An appointment ID is unique among the existing appointments of a team.
  A deleted appointment is no longer kept: it counts as unknown, and its ID
  is free again (rule 10). A change to the current value records nothing
  (rule 12).
  Notes are stored as a file; the team only records that they changed.

  Names like "M1" and "T1" stand for the ID of an appointment.

  Background:
    Given team 7 "U19" in season "2026_27" with tier "Kreisliga"
    And match "M1" on "2026-09-12"
    And training "T1" on "2026-09-15" with duration 90

  Rule: Reschedule

    Scenario Outline: Reschedule an appointment
      When "<appointment>" is rescheduled to "2026-09-20"
      Then the following is recorded:
        | event                  | appointmentId | date       |
        | AppointmentRescheduled | <appointment> | 2026-09-20 |

      Examples:
        | appointment |
        | M1          |
        | T1          |

    Scenario: Rescheduling to the current date records nothing
      When "M1" is rescheduled to "2026-09-12"
      Then nothing is recorded

  Rule: Notes

    Scenario Outline: Write notes
      When notes are written for "<appointment>"
      Then the following is recorded:
        | event                   | appointmentId |
        | AppointmentNotesWritten | <appointment> |

      Examples:
        | appointment |
        | M1          |
        | T1          |

    Scenario: Writing notes again records the change
      Given "M1" has notes
      When notes are written for "M1"
      Then the following is recorded:
        | event                   | appointmentId |
        | AppointmentNotesWritten | M1            |

    Scenario: Remove notes
      Given "T1" has notes
      When the notes of "T1" are removed
      Then the following is recorded:
        | event                   | appointmentId |
        | AppointmentNotesRemoved | T1            |

    Scenario: Removing notes that do not exist records nothing
      When the notes of "M1" are removed
      Then nothing is recorded

  Rule: Delete

    Scenario Outline: Delete an appointment
      When "<appointment>" is deleted
      Then the following is recorded:
        | event              | appointmentId |
        | AppointmentDeleted | <appointment> |

      Examples:
        | appointment |
        | M1          |
        | T1          |

    Scenario Outline: A deleted appointment cannot be changed
      Given "<appointment>" has been deleted
      When <action>
      Then it is rejected with "AppointmentNotFound"

      Examples:
        | appointment | action                                       |
        | M1          | "M1" is rescheduled to "2026-09-20"          |
        | M1          | notes are written for "M1"                   |
        | M1          | the notes of "M1" are removed                |
        | M1          | "M1" is deleted                              |
        | M1          | the matchday of "M1" is changed to 3         |
        | M1          | the result of "M1" is recorded as 2:1        |
        | T1          | "T1" is rescheduled to "2026-09-20"          |
        | T1          | "T1" is deleted                              |
        | T1          | the duration of "T1" is changed to 75        |
        | T1          | the topic of "T1" is changed to "Pressing"   |

  Rule: Appointment IDs are unique among existing appointments

    Scenario Outline: An ID that is already used is rejected
      When <action>
      Then it is rejected with "IdAlreadyUsed"

      Examples:
        | action                                                    |
        | match "M1" is scheduled on "2026-09-19"                   |
        | match "T1" is scheduled on "2026-09-19"                   |
        | training "T1" is scheduled on "2026-09-19" with duration 90 |
        | training "M1" is scheduled on "2026-09-19" with duration 90 |

    Scenario: The ID of a deleted appointment can be used again
      Given "M1" has been deleted
      When match "M1" is scheduled on "2026-09-19"
      Then the following is recorded:
        | event          | appointmentId | date       | matchday | opponent | venue | competition |
        | MatchScheduled | M1            | 2026-09-19 |          |          |       |             |

  Rule: Only existing appointments can be changed

    Scenario Outline: Changing an unknown appointment is rejected
      When <action>
      Then it is rejected with "AppointmentNotFound"

      Examples:
        | action                              |
        | "X1" is rescheduled to "2026-09-20" |
        | notes are written for "X1"          |
        | the notes of "X1" are removed       |
        | "X1" is deleted                     |

  Rule: A deleted team cannot be changed

    Scenario Outline: Appointment methods on a deleted team are rejected
      Given the team has been deleted
      When <action>
      Then it is rejected with "TeamDeleted"

      Examples:
        | action                                                      |
        | match "M2" is scheduled on "2026-09-19"                     |
        | training "T2" is scheduled on "2026-09-19" with duration 90 |
        | "M1" is rescheduled to "2026-09-20"                         |
        | notes are written for "M1"                                  |
        | the notes of "M1" are removed                               |
        | "M1" is deleted                                             |
        | the matchday of "M1" is changed to 3                        |
        | the opponent of "M1" is removed                             |
        | the result of "M1" is recorded as 2:1                       |
        | the result of "M1" is cleared                               |
        | the duration of "T1" is changed to 75                       |
        | the topic of "T1" is changed to "Pressing"                  |
        | the focus of "T1" is changed to "tactics"                   |
