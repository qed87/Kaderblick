Feature: Matches
  A match has a date and optionally matchday, opponent, venue, competition and
  result. The matchday is a whole number of at least 1, the goals of the result
  are whole numbers of at least 0 (rule 8). Match methods reject the ID of a
  training with AppointmentNotFound. A change to the current value records
  nothing (rule 12).

  Names like "M1" and "T1" stand for the ID of an appointment.
  A cell in quotes keeps the spaces around its value.

  Background:
    Given team 7 "U19" in season "2026_27" with tier "Kreisliga"

  Rule: Schedule a match

    Scenario: Schedule a match with all data
      When a match is scheduled with:
        | appointmentId | date       | matchday | opponent    | venue | competition |
        | M1            | 2026-09-12 | 3        | SV Beispiel | home  | league      |
      Then the following is recorded:
        | event          | appointmentId | date       | matchday | opponent    | venue | competition |
        | MatchScheduled | M1            | 2026-09-12 | 3        | SV Beispiel | home  | league      |

    Scenario: Schedule a match with only a date
      When match "M1" is scheduled on "2026-09-12"
      Then the following is recorded:
        | event          | appointmentId | date       | matchday | opponent | venue | competition |
        | MatchScheduled | M1            | 2026-09-12 |          |          |       |             |

    Scenario: Spaces around the opponent are removed
      When a match is scheduled with:
        | appointmentId | date       | opponent          |
        | M1            | 2026-09-12 | "  SV Beispiel  " |
      Then the following is recorded:
        | event          | appointmentId | date       | matchday | opponent    | venue | competition |
        | MatchScheduled | M1            | 2026-09-12 |          | SV Beispiel |       |             |

    Scenario Outline: An invalid matchday is rejected
      When a match is scheduled with:
        | appointmentId | date       | matchday   |
        | M1            | 2026-09-12 | <matchday> |
      Then it is rejected with "InvalidValue"

      Examples:
        | matchday |
        | 0        |
        | -1       |
        | 1.5      |

    Scenario: An opponent of only spaces is rejected
      When a match is scheduled with:
        | appointmentId | date       | opponent |
        | M1            | 2026-09-12 | "   "    |
      Then it is rejected with "InvalidValue"

  Rule: Edit a match

    Background:
      Given a match with:
        | appointmentId | date       | matchday | opponent    | venue | competition |
        | M1            | 2026-09-12 | 3        | SV Beispiel | home  | league      |

    Scenario: Change the matchday
      When the matchday of "M1" is changed to 4
      Then the following is recorded:
        | event           | appointmentId | matchday |
        | MatchdayChanged | M1            | 4        |

    Scenario: An invalid matchday is rejected when changing
      When the matchday of "M1" is changed to 0
      Then it is rejected with "InvalidValue"

    Scenario: Remove the matchday
      When the matchday of "M1" is removed
      Then the following is recorded:
        | event           | appointmentId |
        | MatchdayRemoved | M1            |

    Scenario: Change the opponent
      When the opponent of "M1" is changed to "FC Muster"
      Then the following is recorded:
        | event           | appointmentId | opponent  |
        | OpponentChanged | M1            | FC Muster |

    Scenario: Remove the opponent
      When the opponent of "M1" is removed
      Then the following is recorded:
        | event           | appointmentId |
        | OpponentRemoved | M1            |

    Scenario: Change the venue
      When the venue of "M1" is changed to "away"
      Then the following is recorded:
        | event        | appointmentId | venue |
        | VenueChanged | M1            | away  |

    Scenario: Remove the venue
      When the venue of "M1" is removed
      Then the following is recorded:
        | event        | appointmentId |
        | VenueRemoved | M1            |

    Scenario: Change the competition
      When the competition of "M1" is changed to "cup"
      Then the following is recorded:
        | event              | appointmentId | competition |
        | CompetitionChanged | M1            | cup         |

    Scenario: Remove the competition
      When the competition of "M1" is removed
      Then the following is recorded:
        | event              | appointmentId |
        | CompetitionRemoved | M1            |

    Scenario Outline: A change to the current value records nothing
      When <action>
      Then nothing is recorded

      Examples:
        | action                                            |
        | the matchday of "M1" is changed to 3              |
        | the opponent of "M1" is changed to "SV Beispiel"  |
        | the venue of "M1" is changed to "home"            |
        | the competition of "M1" is changed to "league"    |

    Scenario Outline: Removing a value that does not exist records nothing
      Given match "M2" on "2026-09-19"
      When <action>
      Then nothing is recorded

      Examples:
        | action                              |
        | the matchday of "M2" is removed     |
        | the opponent of "M2" is removed     |
        | the venue of "M2" is removed        |
        | the competition of "M2" is removed  |
        | the result of "M2" is cleared       |

  Rule: Result

    Background:
      Given match "M1" on "2026-09-12"

    Scenario: Record the result
      When the result of "M1" is recorded as 2:1
      Then the following is recorded:
        | event               | appointmentId | goalsFor | goalsAgainst |
        | MatchResultRecorded | M1            | 2        | 1            |

    Scenario: Correct the result
      Given the result of "M1" is 2:1
      When the result of "M1" is recorded as 2:2
      Then the following is recorded:
        | event               | appointmentId | goalsFor | goalsAgainst |
        | MatchResultRecorded | M1            | 2        | 2            |

    Scenario: Recording the current result records nothing
      Given the result of "M1" is 2:1
      When the result of "M1" is recorded as 2:1
      Then nothing is recorded

    Scenario Outline: An invalid result is rejected
      When the result of "M1" is recorded as <goalsFor>:<goalsAgainst>
      Then it is rejected with "InvalidValue"

      Examples:
        | goalsFor | goalsAgainst |
        | -1       | 0            |
        | 0        | -1           |

    Scenario: Clear the result
      Given the result of "M1" is 2:1
      When the result of "M1" is cleared
      Then the following is recorded:
        | event              | appointmentId |
        | MatchResultCleared | M1            |

  Rule: Match methods only apply to matches

    Scenario Outline: A match method for a training is rejected
      Given training "T1" on "2026-09-15" with duration 90
      When <action>
      Then it is rejected with "AppointmentNotFound"

      Examples:
        | action                                           |
        | the matchday of "T1" is changed to 3             |
        | the matchday of "T1" is removed                  |
        | the opponent of "T1" is changed to "FC Muster"   |
        | the opponent of "T1" is removed                  |
        | the venue of "T1" is changed to "away"           |
        | the venue of "T1" is removed                     |
        | the competition of "T1" is changed to "cup"      |
        | the competition of "T1" is removed               |
        | the result of "T1" is recorded as 2:1            |
        | the result of "T1" is cleared                    |
