Feature: Backend version
  The settings show the version of the backend so trainers can tell
  which release they are using. The version is available without login.

  Scenario: Version is available without a session
    When a visitor asks for the backend version
    Then the response status is 200
    And the response contains the version of the backend
