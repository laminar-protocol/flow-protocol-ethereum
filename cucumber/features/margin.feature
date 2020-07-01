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
      | Name | Amount  |
      | Pool | $10 000 |
    And margin deposit
      | Name  | Amount |
      | Alice | $5 000 |
      | Bob   | $5 000 |
    And oracle price
      | Currency | Price |
      | FEUR     | $2    |
      | FJPY     | $1    |
    And margin spread
      | Pair   | Value |
      | EURUSD | $0.02 |
      | JPYUSD | $0.01 |
    And margin set min leveraged amount to $100
    And margin set default min leveraged amount to $100
    And margin set swap rate
      | Pair   | Long | Short |
      | EURUSD | -1%  | 1%    |
      | JPYUSD | -1%  | 1%    |
    And margin enable trading pair EURUSD
    And margin enable trading pair JPYUSD
    And margin set risk threshold(margin_call, stop_out)
      | Pair   | Trader   | ENP        | ELL        |
      | EURUSD | (3%, 1%) | (30%, 10%) | (30%, 10%) |
      | JPYUSD | (3%, 1%) | (30%, 10%) | (30%, 10%) |
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Long 10  | $5000  | $4    |
      | Bob   | JPYUSD | Long 50  | $5000  | $4    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $5000  |
      | Bob   | $5000 | $5000  |
    Then margin trader info are
      | Name  | Equity | Margin Held | Margin Level         | Free Margin | Unrealized PL |
      | Alice | $4800  | $1010       | 0_475247524752475248 | $3790       | $-200         |
      | Bob   | $4900  | $101        | 0_970297029702970297 | $4799       | $-100         |
    Then margin pool info are
      | ENP                  | ELL                  | Required Deposit |
      | 0_679867986798679867 | 0_679867986798679867 | 0                |
    When close positions
      | Name  | ID | Price |
      | Alice | 0  | $0    |
      | Bob   | 1  | $0    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $4800  |
      | Bob   | $5000 | $4900  |
    Then margin trader info are
      | Name  | Equity | Margin Held | Margin Level | Free Margin | Unrealized PL |
      | Alice | $4800  | $0          | MaxValue     | $4800       | $0            |
      | Bob   | $4900  | $0          | MaxValue     | $4900       | $0            |
    Then margin pool info are
      | ENP      | ELL      | Required Deposit |
      | MaxValue | MaxValue | 0                |
    And margin liquidity is $10 300
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
      | Name | Amount  |
      | Pool | $10 000 |
    And margin deposit
      | Name  | Amount |
      | Alice | $5 000 |
    And oracle price
      | Currency | Price |
      | FEUR     | $3    |
    And margin spread
      | Pair   | Value |
      | EURUSD | $0.03 |
    And margin set accumulate
      | Pair   | Frequency | Offset |
      | EURUSD | 10min     | 1min   |
    And margin set min leveraged amount to $100
    And margin set default min leveraged amount to $100
    And margin set swap rate
      | Pair   | Long | Short |
      | EURUSD | -1%  | 1%    |
    And margin enable trading pair EURUSD
    And margin set risk threshold(margin_call, stop_out)
      | Pair   | Trader   | ENP        | ELL        |
      | EURUSD | (3%, 1%) | (30%, 10%) | (30%, 10%) |
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Long 10  | $5000  | $4    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $5000  |
    Then margin trader info are
      | Name  | Equity | Margin Held | Margin Level         | Free Margin | Unrealized PL |
      | Alice | $4700  | $1515       | 0_310231023102310231 | $3185       | $-300         |
    Then margin pool info are
      | ENP                  | ELL                  | Required Deposit |
      | 0_679867986798679867 | 0_679867986798679867 | 0                |
    And oracle price
      | Currency | Price |
      | FEUR     | $4    |
    When close positions
      | Name  | ID | Price |
      | Alice | 0  | $2    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $9700  |
    Then margin trader info are
      | Name  | Equity | Margin Held | Margin Level | Free Margin | Unrealized PL |
      | Alice | $9700  | $0          | MaxValue     | $9700       | $0            |
    Then margin pool info are
      | ENP      | ELL      | Required Deposit |
      | MaxValue | MaxValue | 0                |
    And margin liquidity is $5300

  Scenario: margin trader stop lost
    Given accounts
      | Name  | Amount  |
      | Pool  | $10 000 |
      | Alice | $10 000 |
    And margin create liquidity pool
    And margin deposit liquidity
      | Name | Amount  |
      | Pool | $10 000 |
    And margin deposit
      | Name  | Amount |
      | Alice | $5 000 |
    And oracle price
      | Currency | Price |
      | FEUR     | $3    |
    And margin spread
      | Pair   | Value |
      | EURUSD | $0.03 |
    And margin set accumulate
      | Pair   | Frequency | Offset |
      | EURUSD | 10min     | 1min   |
    And margin set min leveraged amount to $100
    And margin set default min leveraged amount to $100
    And margin set swap rate
      | Pair   | Long | Short |
      | EURUSD | -1%  | 1%    |
    And margin enable trading pair EURUSD
    And margin set risk threshold(margin_call, stop_out)
      | Pair   | Trader   | ENP        | ELL        |
      | EURUSD | (3%, 1%) | (30%, 10%) | (30%, 10%) |
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Long 10  | $5000  | $4    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $5000  |
    Then margin trader info are
      | Name  | Equity | Margin Held | Margin Level         | Free Margin | Unrealized PL |
      | Alice | $4700  | $1515       | 0_310231023102310231 | $3185       | $-300         |
    Then margin pool info are
      | ENP                  | ELL                  | Required Deposit |
      | 0_679867986798679867 | 0_679867986798679867 | 0                |
    And oracle price
      | Currency | Price |
      | FEUR     | $2.8  |
    When close positions
      | Name  | ID | Price |
      | Alice | 0  | $2    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $3700  |
    Then margin trader info are
      | Name  | Equity | Margin Held | Margin Level | Free Margin | Unrealized PL |
      | Alice | $3700  | $0          | MaxValue     | $3700       | $0            |
    Then margin pool info are
      | ENP      | ELL      | Required Deposit |
      | MaxValue | MaxValue | 0                |
    And margin liquidity is $11300

  Scenario: margin trader liquidate
    Given accounts
      | Name  | Amount  |
      | Pool  | $10 000 |
      | Alice | $10 000 |
    And margin create liquidity pool
    And margin deposit liquidity
      | Name | Amount  |
      | Pool | $10 000 |
    And margin deposit
      | Name  | Amount |
      | Alice | $5 000 |
    And oracle price
      | Currency | Price |
      | FEUR     | $3    |
    And margin spread
      | Pair   | Value |
      | EURUSD | $0.03 |
    And margin set accumulate
      | Pair   | Frequency | Offset |
      | EURUSD | 10min     | 1min   |
    And margin set min leveraged amount to $100
    And margin set default min leveraged amount to $100
    And margin set swap rate
      | Pair   | Long | Short |
      | EURUSD | -1%  | 1%    |
    And margin enable trading pair EURUSD
    And margin set risk threshold(margin_call, stop_out)
      | Pair   | Trader   | ENP        | ELL        |
      | EURUSD | (3%, 1%) | (30%, 10%) | (30%, 10%) |
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Long 10  | $5000  | $4    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $5000  |
    Then margin trader info are
      | Name  | Equity | Margin Held | Margin Level         | Free Margin | Unrealized PL |
      | Alice | $4700  | $1515       | 0_310231023102310231 | $3185       | $-300         |
    Then margin pool info are
      | ENP                  | ELL                  | Required Deposit |
      | 0_679867986798679867 | 0_679867986798679867 | 0                |
    And oracle price
      | Currency | Price |
      | FEUR     | $2.2  |
    And margin trader margin call
      | Name  | Result     |
      | Alice | SafeTrader |
    And oracle price
      | Currency | Price |
      | FEUR     | $2.1  |
    Then margin trader info are
      | Name  | Equity | Margin Held | Margin Level         | Free Margin | Unrealized PL |
      | Alice | $200   | $1515       | 0_013201320132013201 | $-1315      | $-4800        |
    Then margin pool info are
      | ENP                  | ELL                  | Required Deposit |
      | 0_976897689768976897 | 0_976897689768976897 | 0                |
    And margin trader margin call
      | Name  | Result |
      | Alice | Ok     |
    And margin trader liquidate
      | Name  | Result                  |
      | Alice | NotReachedRiskThreshold |
    And oracle price
      | Currency | Price |
      | FEUR     | $1.9  |
    Then margin trader info are
      | Name  | Equity | Margin Held | Margin Level          | Free Margin | Unrealized PL |
      | Alice | $-800  | $1515       | -0_052805280528052805 | $-2315      | $-5800        |
    Then margin pool info are
      | ENP                  | ELL                  | Required Deposit |
      | 1_042904290429042904 | 1_042904290429042904 | 0                |
    And margin trader liquidate
      | Name  | Result |
      | Alice | Ok     |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $0     |
    Then margin trader info are
      | Name  | Equity | Margin Held | Margin Level | Free Margin | Unrealized PL |
      | Alice | $0     | $0          | MaxValue     | $0          | $0            |
    Then margin pool info are
      | ENP      | ELL      | Required Deposit |
      | MaxValue | MaxValue | 0                |
    Then margin liquidity is $15000

  Scenario: margin multiple users multiple currencies
    Given accounts
      | Name  | Amount  |
      | Pool  | $20 000 |
      | Alice | $10 000 |
      | Bob   | $10 000 |
    And margin create liquidity pool
    And margin deposit liquidity
      | Name | Amount  |
      | Pool | $20 000 |
    And margin deposit
      | Name  | Amount |
      | Alice | $9 000 |
      | Bob   | $9 000 |
    And oracle price
      | Currency | Price |
      | FEUR     | $3    |
      | FJPY     | $5    |
    And margin spread
      | Pair   | Value |
      | EURUSD | $0.03 |
      | JPYEUR | $0.03 |
    And margin set accumulate
      | Pair   | Frequency | Offset |
      | EURUSD | 10min     | 1min   |
      | JPYEUR | 10min     | 1min   |
    And margin set min leveraged amount to $100
    And margin set default min leveraged amount to $100
    And margin set swap rate
      | Pair   | Long | Short |
      | EURUSD | -1%  | 1%    |
      | JPYEUR | -1%  | 1%    |
    And margin enable trading pair EURUSD
    And margin enable trading pair JPYEUR
    And margin set risk threshold(margin_call, stop_out)
      | Pair   | Trader   | ENP        | ELL        |
      | EURUSD | (3%, 1%) | (30%, 10%) | (30%, 10%) |
      | JPYEUR | (3%, 1%) | (30%, 10%) | (30%, 10%) |
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Long 10  | $5000  | $4    |
      | Bob   | JPYEUR | Short 10 | $6000  | $1    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $1000 | $9000  |
      | Bob   | $1000 | $9000  |
    Then margin trader info are
      | Name  | Equity | Margin Held             | Margin Level         | Free Margin             | Unrealized PL |
      | Alice | $8700  | $1515                   | 0_574257425742574257 | $7185                   | $-300         |
      | Bob   | $7920  | 2945_999999999999998800 | 0_268839103869653768 | 4974_000000000000001200 | $-1080        |
    Then margin pool info are
      | ENP                  | ELL                  | Required Deposit |
      | 0_479264738847791975 | 0_479264738847791975 | 0                |
    And oracle price
      | Currency | Price |
      | FEUR     | $3.1  |
      | FJPY     | $4.9  |
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | JPYEUR | Long 20  | $1000  | $4    |
    When close positions
      | Name | ID | Price |
      | Bob  | 1  | $4    |
    Then margin balances are
      | Name  | Free  | Margin                  |
      | Alice | $1000 | $9000                   |
      | Bob   | $1000 | 9483_999999999999999600 |
    Then margin trader info are
      | Name  | Equity                  | Margin Held             | Margin Level         | Free Margin             | Unrealized PL |
      | Alice | $9014                   | 1764_649999999999999900 | 0_447500372337784838 | 7249_350000000000000100 | $14           |
      | Bob   | 9483_999999999999999600 | $0                      | MaxValue             | 9483_999999999999999600 | $0            |
    Then margin pool info are
      | ENP                  | ELL                  | Required Deposit |
      | 0_968177530655810951 | 0_968177530655810951 | 0                |
    And margin liquidity is 19516_000000000000000400
    And oracle price
      | Currency | Price |
      | FEUR     | $2.9  |
      | FJPY     | $5.1  |
    When close positions
      | Name  | ID | Price |
      | Alice | 0  | $2    |
    When open positions
      | Name | Pair   | Leverage | Amount | Price |
      | Bob  | EURUSD | Short 20 | $2000  | $2    |
    Then margin balances are
      | Name  | Free  | Margin                  |
      | Alice | $1000 | $8200                   |
      | Bob   | $1000 | 9483_999999999999999600 |
    Then margin trader info are
      | Name  | Equity                  | Margin Held            | Margin Level         | Free Margin             | Unrealized PL          |
      | Alice | 8542_129032258064515700 | 249_649999999999999900 | 1_828808607913147372 | 8292_479032258064515800 | 342_129032258064515700 |
      | Bob   | 9363_999999999999999600 | $287                   | 1_631358885017421603 | 9076_999999999999999600 | $-120                  |
    Then margin pool info are
      | ENP                  | ELL                  | Required Deposit |
      | 1_930085487564177643 | 1_930085487564177643 | 0                |
    And oracle price
      | Currency | Price |
      | FEUR     | $2.8  |
      | FJPY     | $5.2  |
    When close positions
      | Name  | ID | Price |
      | Alice | 2  | $1    |
      | Bob   | 3  | $4    |
    Then margin balances are
      | Name  | Free  | Margin                  |
      | Alice | $1000 | 8806_193548387096773600 |
      | Bob   | $1000 | 9563_999999999999999600 |
    Then margin trader info are
      | Name  | Equity                  | Margin Held | Margin Level | Free Margin             | Unrealized PL |
      | Alice | 8806_193548387096773600 | 0           | MaxValue     | 8806_193548387096773600 | 0             |
      | Bob   | 9563_999999999999999600 | 0           | MaxValue     | 9563_999999999999999600 | 0             |
    Then margin pool info are
      | ENP      | ELL      | Required Deposit |
      | MaxValue | MaxValue | 0                |
    And margin liquidity is 19629_806451612903226800

  Scenario: margin accumulate swap
    Given accounts
      | Name  | Amount  |
      | Pool  | $10 000 |
      | Alice | $10 000 |
    And margin create liquidity pool
    And margin deposit liquidity
      | Name | Amount  |
      | Pool | $10 000 |
    And margin deposit
      | Name  | Amount |
      | Alice | $5 000 |
    And oracle price
      | Currency | Price |
      | FEUR     | $3    |
    And margin spread
      | Pair   | Value |
      | EURUSD | $0.02 |
    And margin set accumulate
      | Pair   | Frequency | Offset |
      | EURUSD | 10min     | 1min   |
    And margin set min leveraged amount to $100
    And margin set default min leveraged amount to $100
    And margin enable trading pair EURUSD
    And margin set swap rate
      | Pair   | Long | Short |
      | EURUSD | -1%  | 1%    |
    And margin set risk threshold(margin_call, stop_out)
      | Pair   | Trader   | ENP        | ELL        |
      | EURUSD | (3%, 1%) | (30%, 10%) | (30%, 10%) |
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Long 10  | $5000  | $4    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $5000  |
    And margin execute time 1min..9min
    When close positions
      | Name  | ID | Price |
      | Alice | 0  | $2    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $4649  |
    Then margin liquidity is $10351
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Short 10 | $5000  | $2    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $4649  |
    And margin execute time 9min..22min
    When close positions
      | Name  | ID | Price |
      | Alice | 1  | $4    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $4747  |
    Then margin liquidity is $10253
    And margin set additional swap 0.5% for EURUSD
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Long 10  | $5000  | $4    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $4747  |
    And margin execute time 22min..32min
    When close positions
      | Name  | ID | Price |
      | Alice | 2  | $2    |
    Then margin balances are
      | Name  | Free  | Margin                  |
      | Alice | $5000 | 4471_500000000000000000 |
    Then margin liquidity is 10528_500000000000000000
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Short 10 | $5000  | $2    |
    Then margin balances are
      | Name  | Free  | Margin                  |
      | Alice | $5000 | 4471_500000000000000000 |
    And margin execute time 32min..42min
    When close positions
      | Name  | ID | Price |
      | Alice | 3  | $4    |
    Then margin balances are
      | Name  | Free  | Margin                  |
      | Alice | $5000 | 4495_000000000000000000 |
    Then margin liquidity is 10505_000000000000000000

  Scenario: margin risk thresholds
    Given accounts
      | Name  | Amount  |
      | Pool  | $10 000 |
      | Alice | $10 000 |
    And margin create liquidity pool
    And margin deposit liquidity
      | Name | Amount  |
      | Pool | $10 000 |
    And margin deposit
      | Name  | Amount |
      | Alice | $5 000 |
    And oracle price
      | Currency | Price |
      | FEUR     | $3    |
    And margin spread
      | Pair   | Value |
      | EURUSD | $0.04 |
    And margin set accumulate
      | Pair   | Frequency | Offset |
      | EURUSD | 10min     | 1min   |
    And margin set min leveraged amount to $100
    And margin set default min leveraged amount to $100
    And margin set swap rate
      | Pair   | Long | Short |
      | EURUSD | -1%  | 1%    |
    And margin enable trading pair EURUSD
    And margin set risk threshold(margin_call, stop_out)
      | Pair   | Trader   | ENP        | ELL        |
      | EURUSD | (8%, 5%) | (50%, 30%) | (50%, 30%) |
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Long 10  | $5000  | $4    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $5000  |
    Then margin trader info are
      | Name  | Equity | Margin Held | Margin Level         | Free Margin | Unrealized PL |
      | Alice | $4600  | $1520       | 0_302631578947368421 | $3080       | $-400         |
    Then margin pool info are
      | ENP                  | ELL                  | Required Deposit |
      | 0_684210526315789473 | 0_684210526315789473 | 0                |
    And treasury balance is $0
    And oracle price
      | Currency | Price |
      | FEUR     | $2.3  |
    Then margin trader info are
      | Name  | Equity | Margin Held | Margin Level         | Free Margin | Unrealized PL |
      | Alice | $1100  | $1520       | 0_072368421052631579 | $-420       | $-3900        |
    Then margin pool info are
      | ENP                  | ELL                  | Required Deposit |
      | 0_914473684210526315 | 0_914473684210526315 | 0                |
    And margin trader margin call
      | Name  | Result |
      | Alice | Ok     |
    And margin trader liquidate
      | Name  | Result                  |
      | Alice | NotReachedRiskThreshold |
    And margin trader become safe
      | Name  | Result       |
      | Alice | UnsafeTrader |
    And margin set risk threshold(margin_call, stop_out)
      | Pair   | Trader   | ENP        | ELL        |
      | EURUSD | (5%, 3%) | (50%, 30%) | (50%, 30%) |
    And margin trader become safe
      | Name  | Result |
      | Alice | Ok     |
    And oracle price
      | Currency | Price |
      | FEUR     | $3.6  |
    Then margin trader info are
      | Name  | Equity | Margin Held | Margin Level         | Free Margin | Unrealized PL |
      | Alice | $7600  | $1520       | 0_500000000000000000 | $6080       | $2600         |
    Then margin pool info are
      | ENP                  | ELL                  | Required Deposit |
      | 0_486842105263157894 | 0_486842105263157894 | $1600            |
    And margin liquidity pool margin call
      | Result |
      | Ok     |
    And margin liquidity pool liquidate
      | Result                  |
      | NotReachedRiskThreshold |
    And margin liquidity pool become safe
      | Result     |
      | UnsafePool |
    And margin set risk threshold(margin_call, stop_out)
      | Pair   | Trader   | ENP        | ELL        |
      | EURUSD | (5%, 3%) | (40%, 30%) | (50%, 30%) |
    And margin liquidity pool become safe
      | Result     |
      | UnsafePool |
    And margin set risk threshold(margin_call, stop_out)
      | Pair   | Trader   | ENP        | ELL        |
      | EURUSD | (5%, 3%) | (40%, 30%) | (40%, 30%) |
    And margin liquidity pool become safe
      | Result |
      | Ok     |
    Then margin trader info are
      | Name  | Equity | Margin Held | Margin Level         | Free Margin | Unrealized PL |
      | Alice | $7600  | $1520       | 0_500000000000000000 | $6080       | $2600         |
    Then margin pool info are
      | ENP                  | ELL                  | Required Deposit |
      | 0_486842105263157894 | 0_486842105263157894 | 0                |

  Scenario: margin trader owning and repayment
    Given accounts
      | Name  | Amount  |
      | Pool  | $10 000 |
      | Alice | $10 000 |
    And margin create liquidity pool
    And margin deposit liquidity
      | Name | Amount  |
      | Pool | $10 000 |
    And margin deposit
      | Name  | Amount |
      | Alice | $5000  |
    And oracle price
      | Currency | Price |
      | FEUR     | $3    |
      | FJPY     | $3    |
    And margin spread
      | Pair   | Value |
      | EURUSD | $0.03 |
      | JPYUSD | $0.03 |
    And margin set accumulate
      | Pair   | Frequency | Offset |
      | EURUSD | 10min     | 1min   |
      | JPYUSD | 10min     | 1min   |
    And margin set min leveraged amount to $100
    And margin set default min leveraged amount to $100
    And margin set swap rate
      | Pair   | Long | Short |
      | EURUSD | -1%  | 1%    |
      | JPYUSD | -1%  | 1%    |
    And margin enable trading pair EURUSD
    And margin enable trading pair JPYUSD
    And margin set risk threshold(margin_call, stop_out)
      | Pair   | Trader   | ENP        | ELL        |
      | EURUSD | (3%, 1%) | (30%, 10%) | (30%, 10%) |
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Long 10  | $5000  | $4    |
      | Alice | JPYUSD | Long 10  | $5000  | $4    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $5000  |
    Then margin trader info are
      | Name  | Equity | Margin Held | Margin Level         | Free Margin | Unrealized PL |
      | Alice | $4400  | $3030       | 0_145214521452145215 | $1370       | $-600         |
    Then margin pool info are
      | ENP                  | ELL                  | Required Deposit |
      | 0_349834983498349834 | 0_349834983498349834 | 0                |
    And oracle price
      | Currency | Price |
      | FEUR     | $2    |
      | FJPY     | $4    |
    When close positions
      | Name  | ID | Price |
      | Alice | 0  | $1    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $-300  |
    And margin liquidity is $15_300
    Then margin trader info are
      | Name  | Equity | Margin Held | Margin Level         | Free Margin | Unrealized PL |
      | Alice | $4400  | $1515       | 0_290429042904290429 | $2885       | $4700         |
    When close positions
      | Name  | ID | Price |
      | Alice | 1  | $3    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $4400  |
    And margin liquidity is $10600

  Scenario: margin liquidity pool liquidate
    Given accounts
      | Name  | Amount  |
      | Pool  | $10 000 |
      | Alice | $10 000 |
    And margin create liquidity pool
    And margin deposit liquidity
      | Name | Amount  |
      | Pool | $10 000 |
    And margin deposit
      | Name  | Amount |
      | Alice | $5 000 |
    And oracle price
      | Currency | Price |
      | FEUR     | $3    |
    And margin spread
      | Pair   | Value |
      | EURUSD | $0.04 |
    And margin set accumulate
      | Pair   | Frequency | Offset |
      | EURUSD | 10min     | 1min   |
    And margin set min leveraged amount to $100
    And margin set default min leveraged amount to $100
    And margin set swap rate
      | Pair   | Long | Short |
      | EURUSD | -1%  | 1%    |
    And margin enable trading pair EURUSD
    And margin set risk threshold(margin_call, stop_out)
      | Pair   | Trader   | ENP        | ELL        |
      | EURUSD | (3%, 1%) | (20%, 10%) | (20%, 10%) |
    When open positions
      | Name  | Pair   | Leverage | Amount | Price |
      | Alice | EURUSD | Long 10  | $5000  | $4    |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $5000  |
    Then margin trader info are
      | Name  | Equity | Margin Held | Margin Level         | Free Margin | Unrealized PL |
      | Alice | $4600  | $1520       | 0_302631578947368421 | $3080       | $-400         |
    Then margin pool info are
      | ENP                  | ELL                  | Required Deposit |
      | 0_684210526315789473 | 0_684210526315789473 | 0                |
    And treasury balance is $0
    And oracle price
      | Currency | Price |
      | FEUR     | $4.1  |
    Then margin trader info are
      | Name  | Equity | Margin Held | Margin Level         | Free Margin | Unrealized PL |
      | Alice | $10100 | $1520       | 0_664473684210526316 | $8580       | $5100         |
    Then margin pool info are
      | ENP                  | ELL                  | Required Deposit |
      | 0_322368421052631578 | 0_322368421052631578 | 0                |
    And margin liquidity pool margin call
      | Result   |
      | SafePool |
    And oracle price
      | Currency | Price |
      | FEUR     | $4.5  |
    And margin liquidity pool margin call
      | Result |
      | Ok     |
    And margin liquidity pool liquidate
      | Result                  |
      | NotReachedRiskThreshold |
    And oracle price
      | Currency | Price |
      | FEUR     | $5.0  |
    Then margin trader info are
      | Name  | Equity | Margin Held | Margin Level         | Free Margin | Unrealized PL |
      | Alice | $14600 | $1520       | 0_960526315789473684 | $13080      | $9600         |
    Then margin pool info are
      | ENP                  | ELL                  | Required Deposit |
      | 0_026315789473684210 | 0_026315789473684210 | $4600            |
    And margin liquidity pool liquidate
      | Result |
      | Ok     |
    Then margin balances are
      | Name  | Free  | Margin |
      | Alice | $5000 | $14600 |
    Then margin trader info are
      | Name  | Equity | Margin Held | Margin Level | Free Margin | Unrealized PL |
      | Alice | $14600 | $0          | MaxValue     | $14600      | $0            |
    Then margin pool info are
      | ENP      | ELL      | Required Deposit |
      | MaxValue | MaxValue | 0                |
    And margin liquidity is 0
    And treasury balance is 400_000000000000000000