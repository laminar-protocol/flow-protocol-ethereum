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

  Scenario: margin trader take profit
    Given accounts
      | Name  | Amount  |
      | Pool  | $10 000 |
      | Alice | $10 000 |
    And margin create liquidity pool
    And margin deposit liquidity
      | Name  | Amount  |
      | Pool  | $10 000 |
    And margin deposit
      | Name  | Amount  |
      | Alice | $5 000  |
    And oracle price
      | Currency  | Price  |
      | FEUR      | $3     |
    And margin spread
      | Pair    | Value |
      | EURUSD  | $0.03 |
    And margin set accumulate
      | Pair   | Frequency | Offset |
      | EURUSD | 10        | 1      |
    And margin set min leveraged amount to $100
    And margin set default min leveraged amount to $100
    And margin set swap rate
      | Pair    | Long | Short |
      | EURUSD  | -1%  | 1%    |
    And margin enable trading pair EURUSD
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Long 10  | $5000  | $4    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $5000  |
    And oracle price
      | Currency  | Price  |
      | FEUR      | $4     |
    When close positions
      | Name  | ID | Price |
      | Alice | 0  | $2    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $9700  |
    And margin liquidity is $5300

  Scenario: margin trader stop lost
    Given accounts
      | Name  | Amount  |
      | Pool  | $10 000 |
      | Alice | $10 000 |
    And margin create liquidity pool
    And margin deposit liquidity
      | Name  | Amount  |
      | Pool  | $10 000 |
    And margin deposit
      | Name  | Amount  |
      | Alice | $5 000  |
    And oracle price
      | Currency  | Price  |
      | FEUR      | $3     |
    And margin spread
      | Pair    | Value |
      | EURUSD  | $0.03 |
    And margin set accumulate
      | Pair   | Frequency | Offset |
      | EURUSD | 10        | 1      |
    And margin set min leveraged amount to $100
    And margin set default min leveraged amount to $100
    And margin set swap rate
      | Pair    | Long | Short |
      | EURUSD  | -1%  | 1%    |
    And margin enable trading pair EURUSD
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Long 10  | $5000  | $4    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $5000  |
    And oracle price
      | Currency  | Price  |
      | FEUR      | $2.8   |
    When close positions
      | Name  | ID | Price |
      | Alice | 0  | $2    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $3700  |
    And margin liquidity is $11300

  Scenario: margin trader stop lost
    Given accounts
      | Name  | Amount  |
      | Pool  | $10 000 |
      | Alice | $10 000 |
    And margin create liquidity pool
    And margin deposit liquidity
      | Name  | Amount  |
      | Pool  | $10 000 |
    And margin deposit
      | Name  | Amount  |
      | Alice | $5 000  |
    And oracle price
      | Currency  | Price  |
      | FEUR      | $3     |
    And margin spread
      | Pair    | Value |
      | EURUSD  | $0.03 |
    And margin set accumulate
      | Pair   | Frequency | Offset |
      | EURUSD | 10        | 1      |
    And margin set min leveraged amount to $100
    And margin set default min leveraged amount to $100
    And margin set swap rate
      | Pair    | Long | Short |
      | EURUSD  | -1%  | 1%    |
    And margin enable trading pair EURUSD
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Long 10  | $5000  | $4    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $5000  |
    And oracle price
      | Currency  | Price  |
      | FEUR      | $2.8   |
    When close positions
      | Name  | ID | Price |
      | Alice | 0  | $2    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $3700  |
    And margin liquidity is $11300

  Scenario: margin trader liquidate
    Given accounts
      | Name  | Amount  |
      | Pool  | $10 000 |
      | Alice | $10 000 |
    And margin create liquidity pool
    And margin deposit liquidity
      | Name  | Amount  |
      | Pool  | $10 000 |
    And margin deposit
      | Name  | Amount  |
      | Alice | $5 000  |
    And oracle price
      | Currency  | Price  |
      | FEUR      | $3     |
    And margin spread
      | Pair    | Value |
      | EURUSD  | $0.03 |
    And margin set accumulate
      | Pair   | Frequency | Offset |
      | EURUSD | 10        | 1      |
    And margin set min leveraged amount to $100
    And margin set default min leveraged amount to $100
    And margin set swap rate
      | Pair    | Long | Short |
      | EURUSD  | -1%  | 1%    |
    And margin enable trading pair EURUSD
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Long 10  | $5000  | $4    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $5000  |
    And oracle price
      | Currency  | Price  |
      | FEUR      | $2.2   |
    And margin trader margin call
      | Name  | Result     |
      | Alice | SafeTrader |
    And oracle price
      | Currency  | Price  |
      | FEUR      | $2.1   |
    And margin trader margin call
      | Name  | Result |
      | Alice | Ok     |
    And margin trader liquidate
      | Name  | Result                  |
      | Alice | NotReachedRiskThreshold |
    And oracle price
      | Currency  | Price  |
      | FEUR      | $1.9   |
    And margin trader liquidate
      | Name  | Result |
      | Alice | Ok     |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $0  |
    Then margin liquidity is $15000

  Scenario: margin liquidity pool liquidate
    Given accounts
      | Name  | Amount  |
      | Pool  | $10 000 |
      | Alice | $10 000 |
    And margin create liquidity pool
    And margin deposit liquidity
      | Name  | Amount  |
      | Pool  | $10 000 |
    And margin deposit
      | Name  | Amount  |
      | Alice | $5 000  |
    And oracle price
      | Currency  | Price  |
      | FEUR      | $3     |
    And margin spread
      | Pair    | Value |
      | EURUSD  | $0.04 |
    And margin set accumulate
      | Pair   | Frequency | Offset |
      | EURUSD | 10        | 1      |
    And margin set min leveraged amount to $100
    And margin set default min leveraged amount to $100
    And margin set swap rate
      | Pair    | Long | Short |
      | EURUSD  | -1%  | 1%    |
    And margin enable trading pair EURUSD
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Long 10  | $5000  | $4    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $5000  |
    And treasury balance is $0
    And oracle price
      | Currency  | Price  |
      | FEUR      | $4.1   |
    And margin liquidity pool margin call
      | Result   |
      | SafePool |
    And oracle price
      | Currency  | Price  |
      | FEUR      | $4.2   |
    And margin liquidity pool margin call
      | Result |
      | Ok     |
    And margin liquidity pool liquidate
      | Result                  |
      | NotReachedRiskThreshold |
    And oracle price
      | Currency  | Price  |
      | FEUR      | $5.0   |
    And margin liquidity pool liquidate
      | Result |
      | Ok     |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $14600 |
    Then margin liquidity is $0
    And treasury balance is $400
  Scenario: margin multiple users multiple currencies
    Given accounts
      | Name  | Amount  |
      | Pool  | $20 000 |
      | Alice | $10 000 |
      | Bob   | $10 000 |
    And margin create liquidity pool
    And margin deposit liquidity
      | Name  | Amount  |
      | Pool  | $20 000 |
    And margin deposit
      | Name  | Amount  |
      | Alice | $9 000  |
      | Bob   | $9 000  |
    And oracle price
      | Currency  | Price  |
      | FEUR      | $3     |
      | FJPY      | $5     |
    And margin spread
      | Pair    | Value |
      | EURUSD  | $0.03 |
      | JPYEUR  | $0.03 |
    And margin set accumulate
      | Pair   | Frequency | Offset |
      | EURUSD | 10        | 1      |
      | JPYEUR | 10        | 1      |
    And margin set min leveraged amount to $100
    And margin set default min leveraged amount to $100
    And margin set swap rate
      | Pair    | Long | Short |
      | EURUSD  | -1%  | 1%    |
      | JPYEUR  | -1%  | 1%    |
    And margin enable trading pair EURUSD
    And margin enable trading pair JPYEUR
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Long 10  | $5000  | $4    |
      | Bob   | JPYEUR | Short 10 | $6000  | $1    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $1000 | $9000  |
      | Bob   | $1000 | $9000  |
    And oracle price
      | Currency  | Price  |
      | FEUR      | $3.1   |
      | FJPY      | $4.9   |
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | JPYEUR | Long 20  | $1000  | $4    |
    When close positions
      | Name  | ID | Price |
      | Bob   | 1  | $4    |
    Then margin balances are
      | Name  | Free  | Margin                 |
      | Alice | $1000 | $9000                  |
      | Bob   | $1000 | 9483999999999999999600 |
    And margin liquidity is 19516000000000000000400
    And oracle price
      | Currency  | Price  |
      | FEUR      | $2.9   |
      | FJPY      | $5.1   |
    When close positions
      | Name  | ID | Price |
      | Alice | 0  | $2    |
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Bob   | EURUSD | Short 20 | $2000  | $2    |
    Then margin balances are
      | Name  | Free  | Margin                 |
      | Alice | $1000 | $8200                  |
      | Bob   | $1000 | 9483999999999999999600 |
    And oracle price
      | Currency  | Price  |
      | FEUR      | $2.8   |
      | FJPY      | $5.2   |
    When close positions
      | Name  | ID | Price |
      | Alice | 2  | $1    |
      | Bob   | 3  | $4    |
    Then margin balances are
      | Name  | Free  | Margin                  |
      | Alice | $1000 | 8806193548387096773600 |
      | Bob   | $1000 | 9563999999999999999600 |
    And margin liquidity is 19629806451612903226800

  Scenario: margin accumulate swap
    Given accounts
      | Name  | Amount  |
      | Pool  | $10 000 |
      | Alice | $10 000 |
    And margin create liquidity pool
    And margin deposit liquidity
      | Name  | Amount  |
      | Pool  | $10 000 |
    And margin deposit
      | Name  | Amount  |
      | Alice | $5 000  |
    And oracle price
      | Currency  | Price |
      | FEUR      | $3    |
    And margin spread
      | Pair    | Value |
      | EURUSD  | $0.02 |
    And margin set accumulate
      | Pair   | Frequency | Offset |
      | EURUSD | 10        | 1      |
    And margin set min leveraged amount to $100
    And margin set default min leveraged amount to $100
    And margin set swap rate
      | Pair    | Long | Short |
      | EURUSD  | -1%  | 1%    |
    And margin enable trading pair EURUSD
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Long 10  | $5000  | $4    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $5000  |
    And margin execute block 1..9
    When close positions
      | Name  | ID | Price |
      | Alice | 0  | $2    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $4649  |
    Then margin liquidity is $10351
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Short 10  | $5000 | $2    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $4649  |
    And margin execute block 9..22
    When close positions
      | Name  | ID | Price |
      | Alice | 1  | $4    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $4151  |
    Then margin liquidity is $10849
    And margin set additional swap 0.5% for EURUSD
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Long 10  | $5000  | $4    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $4151  |
    And margin execute block 22..32
    When close positions
      | Name  | ID | Price |
      | Alice | 2  | $2    |
    Then margin balances are
      | Name  | Free  | Margin                 |
      | Alice | $5000 | 3724500000000000000000 |
    Then margin liquidity is 11275500000000000000000
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Short 10  | $5000 | $2    |
    Then margin balances are
      | Name  | Free  | Margin                 |
      | Alice | $5000 | 3724500000000000000000 |
    And margin execute block 32..42
    When close positions
      | Name  | ID | Price |
      | Alice | 3  | $4    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $3301  |
    Then margin liquidity is $11699