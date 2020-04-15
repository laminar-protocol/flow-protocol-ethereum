Feature: Margin Protocol

  Scenario: Margin liquidity pool
    Given accounts
      | Name  | Amount  |
      | Bob  | $10 000 |
      | Alice | $10 000 |
    And margin create liquidity pool
    And margin deposit liquidity
      | Name  | Amount  | Result        |
      | Bob  | $10 000 | Ok             |
      | Alice | $5 000  | Ok            |
    Then margin liquidity is $15000

