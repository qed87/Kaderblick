Feature: Delete a team
  A deleted team stays in the event store, but no further changes are
  possible: every business method is rejected with TeamDeleted (rule 1).

  Background:
    Given team 7 "U19" in season "2026_27" with tier "Kreisliga"
    And the squad contains "Mia"

  Scenario: Delete the team
    When the team is deleted
    Then the following is recorded:
      | event       |
      | TeamDeleted |

  Scenario Outline: A deleted team cannot be changed
    Given the team has been deleted
    When <action>
    Then it is rejected with "TeamDeleted"

    Examples:
      | action                                     |
      | the team is renamed to "U19 II"            |
      | the season is changed to "2027_28"         |
      | the tier is changed to "Bezirksliga"       |
      | the tier is removed                        |
      | a crest is uploaded                        |
      | the crest is removed                       |
      | the coaches are changed                    |
      | the coaches are removed                    |
      | the team is deleted                        |
      | "Jonas" is added to the squad              |
      | "Mia" gets shirt number 10                 |
      | the shirt number of "Mia" is removed       |
      | "Mia" gets position "ST"                   |
      | the position of "Mia" is removed           |
      | "Mia" is deactivated                       |
      | "Mia" is reactivated                       |
      | "Mia" is removed from the squad            |
      | the profile of "Mia" is noted as changed   |
