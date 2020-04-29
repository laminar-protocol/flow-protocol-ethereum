Feature: Margin Protocol

  Scenario: Margin liquidity pool
    Given accounts
      | Name  | Amount  |
      | Pool  | $10 000 |
      | Alice | $10 000 |
    And margin create liquidity pool
    And margin deposit liquidity
      | Name  | Amount  | Result        |
      | Pool  | $10 000 | Ok            |
      | Alice | $5 000  | Ok            |
      | Alice | $6 000  | BalanceTooLow |
    Then margin liquidity is $15000

  Scenario: Open and close
    Given accounts
      | Name  | Amount  |
      | Pool  | $10 000 |
      | Alice | $10 000 |
      | Bob   | $10 000 |
    And margin create liquidity pool
    And margin deposit liquidity
      | Name  | Amount  |
      | Pool  | $10 000 |
    And margin deposit
      | Name  | Amount  |
      | Alice | $5 000  |
      | Bob   | $5 000  |
    And oracle price
      | Currency  | Price  |
      | FEUR      | $2     |
      | FJPY      | $1     |
    And margin spread
      | Pair    | Value |
      | EURUSD  | $0.02 |
      | JPYUSD  | $0.01 |
    And margin set min leveraged amount to $100
    And margin set default min leveraged amount to $100
    And margin set swap rate
    | Pair   | Long | Short |
    | EURUSD | -1%  | 1%    |
    | JPYUSD | -1%  | 1%    |
    And margin enable trading pair EURUSD
    And margin enable trading pair JPYUSD
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Long 10  | $5000  | $4    |
      | Bob   | JPYUSD | Long 50  | $5000  | $4    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $5000  |
      | Bob   | $5000 | $5000  |
    Then trader margin positions are
      | Name  | Equity  | Free Margin | Margin Held |
      | Alice | $4800   | $3790       | $1010       |
      | Bob   | $4900   | $4799       | $101        |
    When close positions
      | Name  | ID | Price |
      | Alice | 0  | $0    |
      | Bob   | 1  | $0    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $4800  |
      | Bob   | $5000 | $4900  |
    And margin liquidity is $10300
    When margin withdraw
      | Name  | Amount |
      | Alice | $4800  |
      | Bob   | $4900  |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $9800 | $0     |
      | Bob   | $9900 | $0     |