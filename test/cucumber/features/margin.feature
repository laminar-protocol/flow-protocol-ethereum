Feature: Margin Protocol

  Scenario: Sample...
    Given accounts
      | Name  | Amount  |
      | Alice | $10     |
      | Bob   | $10     |
    And transfer to
      | Name      | Amount  |
      | Alice     | $10     |
      | Bob       | $10     |
    Then Alice balance is $20
    And Bob balance is $20

