@wip
Feature: Trainings
  A training has a date, a duration in minutes, an optional topic and a list
  of focus areas. The duration is a whole number from 1 to 600 minutes (rule 8).
  Training methods reject the ID of a match with AppointmentNotFound. A change
  to the current value records nothing (rule 12).

  Names like "M1" and "T1" stand for the ID of an appointment. Focus areas are
  written as a comma-separated list; an empty cell is an empty list.
  A cell in quotes keeps the spaces around its value.

  Background:
    Given team 7 "U19" in season "2026_27" with tier "Kreisliga"

  Rule: Schedule a training

    Scenario: Schedule a training with all data
      When a training is scheduled with:
        | appointmentId | date       | duration | topic    | focus              |
        | T1            | 2026-09-15 | 90       | Pressing | tactics, fitness   |
      Then the following is recorded:
        | event             | appointmentId | date       | duration | topic    | focus            |
        | TrainingScheduled | T1            | 2026-09-15 | 90       | Pressing | tactics, fitness |

    Scenario: Schedule a training without topic and focus
      When training "T1" is scheduled on "2026-09-15" with duration 90
      Then the following is recorded:
        | event             | appointmentId | date       | duration | topic | focus |
        | TrainingScheduled | T1            | 2026-09-15 | 90       |       |       |

    Scenario: Spaces around the topic are removed
      When a training is scheduled with:
        | appointmentId | date       | duration | topic          |
        | T1            | 2026-09-15 | 90       | "  Pressing  " |
      Then the following is recorded:
        | event             | appointmentId | date       | duration | topic    | focus |
        | TrainingScheduled | T1            | 2026-09-15 | 90       | Pressing |       |

    Scenario: A topic of only spaces counts as no topic
      When a training is scheduled with:
        | appointmentId | date       | duration | topic |
        | T1            | 2026-09-15 | 90       | "   " |
      Then the following is recorded:
        | event             | appointmentId | date       | duration | topic | focus |
        | TrainingScheduled | T1            | 2026-09-15 | 90       |       |       |

    Scenario: A focus area given twice is recorded once
      When a training is scheduled with:
        | appointmentId | date       | duration | focus                     |
        | T1            | 2026-09-15 | 90       | tactics, fitness, tactics |
      Then the following is recorded:
        | event             | appointmentId | date       | duration | topic | focus            |
        | TrainingScheduled | T1            | 2026-09-15 | 90       |       | tactics, fitness |

    Scenario Outline: A duration from 1 to 600 minutes is accepted
      When training "T1" is scheduled on "2026-09-15" with duration <duration>
      Then the training is scheduled

      Examples:
        | duration |
        | 1        |
        | 600      |

    Scenario Outline: An invalid duration is rejected
      When training "T1" is scheduled on "2026-09-15" with duration <duration>
      Then it is rejected with "InvalidValue"

      Examples:
        | duration |
        | 0        |
        | -1       |
        | 601      |
        | 1.5      |

  Rule: Edit a training

    Background:
      Given a training with:
        | appointmentId | date       | duration | topic    | focus            |
        | T1            | 2026-09-15 | 90       | Pressing | tactics, fitness |

    Scenario: Change the duration
      When the duration of "T1" is changed to 75
      Then the following is recorded:
        | event                   | appointmentId | minutes |
        | TrainingDurationChanged | T1            | 75      |

    Scenario Outline: An invalid duration is rejected when changing
      When the duration of "T1" is changed to <duration>
      Then it is rejected with "InvalidValue"

      Examples:
        | duration |
        | 0        |
        | 601      |

    Scenario: Change the topic
      When the topic of "T1" is changed to "Spieleröffnung"
      Then the following is recorded:
        | event                | appointmentId | topic          |
        | TrainingTopicChanged | T1            | Spieleröffnung |

    Scenario: Remove the topic
      When the topic of "T1" is removed
      Then the following is recorded:
        | event                | appointmentId | topic |
        | TrainingTopicChanged | T1            |       |

    Scenario: Change the focus
      When the focus of "T1" is changed to "technique, shooting"
      Then the following is recorded:
        | event                | appointmentId | focus               |
        | TrainingFocusChanged | T1            | technique, shooting |

    Scenario: Remove all focus areas
      When the focus of "T1" is changed to ""
      Then the following is recorded:
        | event                | appointmentId | focus |
        | TrainingFocusChanged | T1            |       |

    Scenario Outline: A change to the current value records nothing
      When <action>
      Then nothing is recorded

      Examples:
        | action                                          |
        | the duration of "T1" is changed to 90           |
        | the topic of "T1" is changed to "Pressing"      |
        | the focus of "T1" is changed to "tactics, fitness" |
        | the focus of "T1" is changed to "fitness, tactics" |

  Rule: Training methods only apply to trainings

    Scenario Outline: A training method for a match is rejected
      Given match "M1" on "2026-09-12"
      When <action>
      Then it is rejected with "AppointmentNotFound"

      Examples:
        | action                                     |
        | the duration of "M1" is changed to 75      |
        | the topic of "M1" is changed to "Pressing" |
        | the topic of "M1" is removed               |
        | the focus of "M1" is changed to "tactics"  |
