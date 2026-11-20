@wip
Feature: Edit a team
  Name, season, tier, crest and coaches of a team can be changed field by field.
  The same rules as for creating apply (rule 2). A change to the current value
  records nothing (rule 12). Crest and coaches are stored as files; the team
  only records that they changed.

  Background:
    Given team 7 "U19" in season "2026_27" with tier "Kreisliga"

  Scenario: Rename the team
    When the team is renamed to "U19 II"
    Then the following is recorded:
      | event       | name   |
      | TeamRenamed | U19 II |

  Scenario: Spaces around the new name are removed
    When the team is renamed to "  U19 II  "
    Then the following is recorded:
      | event       | name   |
      | TeamRenamed | U19 II |

  Scenario: An empty name is rejected
    When the team is renamed to "   "
    Then it is rejected with "InvalidName"

  Scenario: Renaming to the current name records nothing
    When the team is renamed to "U19"
    Then nothing is recorded

  Scenario: Change the season
    When the season is changed to "2027_28"
    Then the following is recorded:
      | event         | season  |
      | SeasonChanged | 2027_28 |

  Scenario: An invalid season is rejected
    When the season is changed to "2027_29"
    Then it is rejected with "InvalidSeason"

  Scenario: Changing to the current season records nothing
    When the season is changed to "2026_27"
    Then nothing is recorded

  Scenario: Change the tier
    When the tier is changed to "Bezirksliga"
    Then the following is recorded:
      | event       | tier        |
      | TierChanged | Bezirksliga |

  Scenario: Remove the tier
    When the tier is removed
    Then the following is recorded:
      | event       | tier |
      | TierChanged |      |

  Scenario: Changing to the current tier records nothing
    When the tier is changed to "Kreisliga"
    Then nothing is recorded

  Scenario: Upload a crest
    When a crest is uploaded
    Then the following is recorded:
      | event         |
      | CrestUploaded |

  Scenario: Uploading a new crest replaces the old one
    Given the team has a crest
    When a crest is uploaded
    Then the following is recorded:
      | event         |
      | CrestUploaded |

  Scenario: Remove the crest
    Given the team has a crest
    When the crest is removed
    Then the following is recorded:
      | event        |
      | CrestRemoved |

  Scenario: Removing a crest that does not exist records nothing
    When the crest is removed
    Then nothing is recorded

  Scenario: Change the coaches
    When the coaches are changed
    Then the following is recorded:
      | event          |
      | CoachesChanged |

  Scenario: Remove the coaches
    Given the team has coaches
    When the coaches are removed
    Then the following is recorded:
      | event          |
      | CoachesRemoved |

  Scenario: Removing coaches that do not exist records nothing
    When the coaches are removed
    Then nothing is recorded
