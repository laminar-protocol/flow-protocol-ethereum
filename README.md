Table of Contents
<!-- TOC -->

- [Introduction](#introduction)
- [Overview](#overview)
- [The Collateralized Synthetic Asset Protocol](#the-collateralized-synthetic-asset-protocol)
  - [Liquidity Pool](#liquidity-pool)
  - [Collateral](#collateral)
  - [Liquidation Incentive](#liquidation-incentive)
  - [fToken](#ftoken)
    - [Deposit/Mint](#depositmint)
    - [Withdraw](#withdraw)
    - [Liquidation](#liquidation)
    - [Exchange Rate](#exchange-rate)
- [The Collateralized Margin Trading Protocol](#the-collateralized-margin-trading-protocol)
  - [Liquidity Pool](#liquidity-pool-1)
  - [Margin Protocol](#margin-protocol)
    - [Collateralized Position](#collateralized-position)
  - [Trading Pair](#trading-pair)
    - [Status of a Position](#status-of-a-position)
    - [Profit & Loss](#profit--loss)
- [The Money Market Protocol](#the-money-market-protocol)
  - [iToken](#itoken)
  - [Interest Allocation](#interest-allocation)
    - [Interest Share](#interest-share)
      - [Allocation to Liquidity Provider](#allocation-to-liquidity-provider)
      - [Allocation to fToken depositor](#allocation-to-ftoken-depositor)
    - [Interest Share Exchange Rate](#interest-share-exchange-rate)
- [Implementation](#implementation)
  - [Flow Protocol Smart Contracts on Ethereum](#flow-protocol-smart-contracts-on-ethereum)
  - [Flowchain as parachain on Polkadot](#flowchain-as-parachain-on-polkadot)
  - [Oracle Reference Implementation](#oracle-reference-implementation)
    - [Oracle Server](#oracle-server)

<!-- /TOC -->

## Introduction
Laminar aims to create an open finance platform along with financial assets to serve traders from both the crypto and mainstream finance worlds. Forex market alone has an average daily trading volume of $5 trillion, while the most active DeFi projects (mostly on Ethereum) have about $500 million of funds locked in smart contracts. 

Laminar's goal is to provide people with better access to trading instruments, and introduce new, competitive business models to mainstream financial service providers. The Flow Protocols - as Laminar's flagship product - will help to solve the challenges of opaque pricing and price manipulation in the current financial markets, bridges on- and off-chain participants, and ultimately boosts on-chain trading liquidity, exposure, and variety

This document serves as a general overview of Flow protocols - generalized synthetic asset, margin trading and money market protocols, and as a brief introduction to its reference implementation on Ethereum as Smart Contracts and on Polkadot as parachain. We will add more details for developers to build on top of the protocol as it evolves further.

## Overview 
Flow protocol is generalized for any type of synthetic assets and trading, the first version will focus on synthesizing EUR and JPY as crypto assets, and Forex as margin trading market, due to market demand and validation from both traders and liquidity providers. 

Flow protocols have the following properties：

- **Instant Liquidity**: traders trade against smart contracts (or runtime modules in Polkadot/Substrate terms) instead of order books, hence there's instant and infinite liquidity, provided that the collateral ratio doesn't fall below the preset liquidation threshold.

- **Asset Efficiency for traders**: While all positions are over-collateralized, ***traders only need to put up collateral for the value of the positions***. The rest of the risks are taken on by the liquidity providers. In return, liquidity providers earn transaction fees, e.g. in the form of a bid and ask spread in a Forex case. Savvy liquidity providers would have initiatives to hedge their risks on- or off-chain, depending on the asset type and their risk management strategies. Margin traders will also be able to trade against the liquidity pools, that ***traders’ risks and liabilities are capped by the margin locked***, while their potential profits are also secured by the protocol.

- **Better trading experience**: Flow Protocols enable ***transparent pricing and counter-party actions*** governed by the protocol and the community while providing an excellent trading experience comparable to the off-chain services. When collateralized positions are at risk, they will be open to the public for liquidation with rewards, which ensure the soundness and safety of the liquidity pools.

- **Integrated money market**: assets deposited into the protocols both from the traders and liquidity providers will earn interest that further increases on-chain liquidity. We look to work with DeFi partners such as Compound.Finance for Ethereum implementation to enable such service via a general interface with multiple providers.  

- **Tokenized positions**: Users can deposit USD stablecoins in exchange for synthetic stable fiat assets in the form of fTokens (Flow Tokens) e.g. fEUR. Traders can also tokenize margin positions connected to their short or long leveraged positions. These tokenized positions enable fluidity across asset classes, e.g. through easily tradable fTokens and margin tokens in open markets, or as building blocks of other financial services. We can't wait for programmers and the community to explore further use cases!

Below we will introduce the following protocols
- Collateralized Synthetic Asset Protocol (draft design and implementation available)
- Money Market Protocol (to be published, design is being finalized)
- Collateralized Margin Trading Protocol (to be published, design is being finalized)

For formal verification on the synthetic asset design, please refer to the [Flow Synthetic Asset Whitepaper](https://github.com/laminar-protocol/flow-protocol-whitepaper)

## The Collateralized Synthetic Asset Protocol
The collateralized synthetic asset protocol allows user to mint non-USD stable-coin fToken e.g. fEUR or fJPY using USD stable-coin e.g. DAI or equivalent as collateral. There are a number of use cases for fToken
- as the basis for margin trading protocol
- as general purpose stable-coin/currency for payments
- as a sore of value where holders can deposit it into money market to earn interest

### Liquidity Pool
Liquidity pool is set up by a liquidity provider for a particular fToken, where a certain amount of funds e.g. USD stable-coins are locked in it to serve as collateral, the spreads (bid and ask spread for a given Forex symbol e.g. EURUSD) are set up which is essentially fees to the liquidity provider, and liquidity provider's own collateral ratio is set. 

Liquidity provider's own collateral ratio needs to be greater than the collateral ratio of the particular fToken defined in the protocol. It gives liquidity provider another layer of safety protection on top of the protocol default. Anyone who implements the Liquidity Pool interface can become a liquidity provider. An efficient market with multiple liquidity provider will trend towards competitive spread.

Liquidity Pool Pseudo Interface
```
    function getBidSpread(address fToken) returns (unit bidSpread);
    function getAskSpread(address fToken) returns (unit askSpread);
    function getCollateralRatio(address fToken) returns (unit ratio);
```

### Collateral
A position is always over-collateralized for risk management purposes. The **`additional collateral ratio`** is defined per fToken. A 10% **`additional collateral ratio`** represents 110% collateral coverage ratio meaning 110% collateral is required for the position. 

To mint a new fToken (e.g. fUER), trader's deposit includes the **USD amount required** based on exchange rate, plus the **spread paid** to the liquidity provider. Both of these will be contributed to the collateral, and the remaining comes from the liquidity pool to make up a total of 110% collateral. The additional collateral is there to protect the position from exchange rate fluctuation hence stabilizing the fToken.

For example, to mint USD$1,001 worth of fEUR, with exchange rate of 1:1 for simplicity, ask spread at 0.001, **`additional collateral ratio`** as 10%, the following would happen
- user deposits USD$1,001 to exchange 1,000 fEUR where USD$1 is spread paid
- total collateral required is USD$1,100 ($1,000 * 110%)
- additional collateral from the liquidity pool would be USD$99 ($1,100 - $1,000 - $1)

Pseudo formula:
```
askPrice = exchangePrice + askSpread;
flowTokenAmount = baseTokenAmount / askPrice;
totalCollateral = flowTokenAmount * exchangePrice * ( collateralRatio + 1 );
collateralFromPool = totalCollateral - baseTokenAmount;
```

### Liquidation Incentive
The current collateral ratio is re-calculated at every deposit/withdraw action with exchange rate at the time. If the current collateral ratio is below the **`liquidation ratio`** which is defined per fToken, then the liquidity pool is open for public liquidation incentivized by a monetary reward. 

A liquidator would deposit fToken back to liquidity pool hence free up partial or full collateral depending on the deposited amount therefore increase collateral ratio. Anyone can be a liquidator at this point.

This reward consists of the **spread earned** from the trade plus **a portion of the liquidity's collateral**. The incentive formula aims to reward liquidator proportionally to the risks of the pool hence minimizing probability of discounting fToken redeemable value.

There's also an **`extreme liquidation ratio`** below which all available collateral from liquidity provider plus the spread earned from the trade will will be rewarded to the liquidator as extra layer of protection.

[TODO] provide an example

Pseudo formula when collateral ratio is between **`liquidation ratio`** and **`extreme liquidation ratio`**.
```
reward = (liquidationRatio - currentLiquidityProviderCollateralRatio) / (liquidationRatio - extremeLiquidationRatio) * collateralFreed
```
[TODO] optimal liquidation point for best profit


### fToken
fToken (Flow Token) is non-USD stable-coin backed by selected trusted USD stable-coin.

#### Deposit/Mint
Deposit USD stable-coin will mint and return fToken e.g. fEUR. The number of flow tokens minted is the amount of underlying asset being provided divided by the ask price from selected liquidity pool. For liquidity provider, the additional collateral required for a mint action is total collateral required subtract what deposited amount. For more details see the [Collateral Section](###collateral).

Pseudo Deposit function:
```
function deposit(FlowToken token, LiquidityPoolInterface pool, uint baseTokenAmount)
```

#### Withdraw
The amount of underlying asset withdrawn is the number of Flow tokens multiplied by the bid price from the current exchange rate. The amount withdrawn must be less than the user's account balance, and the liquidity pool available balance. 

The collateral required will be re-calculated after the withdrawn amount; if the collateral required is less than the current collateral, then the liquidity pool can be refunded after deducting the withdrawn amount from the difference between current and required collateral. 

Pseudo formula:
```
baseTokenAmount = flowTokenAmount * bidPrice

if (requiredCollaterals <= collaterals) {
    collateralsToRemove = collaterals - requiredCollaterals;
    refundToPool = collateralsToRemove - withdrawnAmount;
}
```
Pseudo Withdraw function:
```
function withdraw(FlowToken token, LiquidityPoolInterface pool, uint flowTokenAmount)
```

#### Liquidation
If a liquidity pool has negative liquidity i.e. current collateral is below **`liquidation threshold`**, then it is subject to liquidation by anyone to bring the collateral back to required level. When a liquidation happens, a liquidator deposits some or all minted fToken on behalf of the liquidity provider, and in return receive a reward from the outstanding collateral. If the collateral is below the **`extreme liquidation threshold`**, then additional reward is given to liquidator. For more details refer to the [Liquidation Incentive Section](###liquidation-incentive).

Pseudo Liquidation function:
```
function liquidate(FlowToken token, LiquidityPoolInterface pool, uint flowTokenAmount) 
```

#### Exchange Rate
The exchange rate for a Forex pair is provided by a price oracle from reputable sources like Bloomberg. Each liquidity provider has freedom to apply a spread on top of this price for its own liquidity pool to provide traders/users a bid and ask price for each Forex pair. 

```
bidPrice = exchangePrice - bidSpread;
askPrice = exchangePrice + askSpread;
```
## The Collateralized Margin Trading Protocol
The collateralized margin trading protocol allows user to trade leveraged long or short fToken e.g. fEUR or fJPY against base currency - USD, in the form of USD stable-coin e.g. DAI or equivalent. There are a number of use cases for margin trading
- as a hedge against future price fluctuation e.g. an importer, who might need to pay JPY to supplier in 2 month time, can use a 10x leverage with 10% margin hedging for the full risk expecting price fluctuating within 10%
- as a profit amplifying instrument for traders in low-volatile market like Forex

When a trader opens a long position e.g. 10x leveraged EURUSD of 1000 USD, essentially the trader puts in $1,000 margin for the price fluctuation risks of $10,000. At the same time the liquidity provider via the liquidity pool would collateralize an equivalent amount of $1,000 to secure this position. The protocol caps the potential gain and protects the loss for either party at $1,000, meaning capping price fluctuation at 10% (1/leverage). The detail mechanisms and potential fees are explained in the following sections. 

[TODO] Tokenization of margin positions, partial closing a margin position and other more advanced trading techniques will be added in V2, and more details of the spec will be released as we progress.

### Liquidity Pool
The margin trading protocol can use the same liquidity pool as the synthetic asset protocol. A liquidity pool can decide what tokens it supports and what leverage levels are allowed. 

```
function openPosition(address tradingPair, uint positionId, address quoteToken, int leverage, uint baseTokenAmount) returns (bool);
```

For other details of a liquidity pool, please refer to [Liquidity Pool in Synthetic Asset](#liquidity-pool).

### Margin Protocol
The `Margin Protocol` sets up the flow margin trading platform, supported trading pairs and leverages. It provides public methods for users and others programs to do margin trading such as `openPosition`, and `closePosition`.

Traders are free to choose a liquidity pool to trade against based on their preferences, such as price and available liquidity. 

```
function openPosition(MarginTradingPair pair, LiquidityPoolInterface pool, uint baseTokenAmount);
function closePosition(MarginTradingPair pair, uint positionId);
function getPrice(address tokenAddr);
function getAskSpread(LiquidityPoolInterface pool, address token);
function getBidSpread(LiquidityPoolInterface pool, address token);
function addTradingPair(address pair);
```

#### Collateralized Position
When a trader wants to long 10x EURUSD, he/she opens a position for that particular trading pair at a given price. 

Following on the previous example of $1,000 long 10x EURUSD example, the trader and the liquidity pool each contributes $1,000 to the collateral. The `Margin Protocol` would use the `Money Market` to mange these funds to earn while trading. Please see the Money Market section to see how it guarantees trading liquidity while earning interest. 

### Trading Pair
Each trading pair e.g. long 10x EURUSD or short 5x JPYUSD and associated trading rules are encapsulated in a separate contract, which can then be tokenized.

```
constructor(address marginProtocol, MoneyMarketInterface moneyMarket_, address quoteToken_, int leverage_, uint safeMarginPercent_, uint liquidationFee_)
```

At this stage, the base token for each trading pair is defaulted to USD. The *quote token* can be any asset provided there is associated oracle price feed to support trading. In our Forex implementation, the quote token is fToken e.g. fEUR or fJPY, but it can easily be set up as any other type of asset like gold or SP500 etc. 

Leveraged long is defined as a positive number like 10 as 10x long leverage, whereas leveraged short is defined as a negative number like -5 as 5x short leverage.

Safe margin is a threshold defined for liquidity provider to stop loss of a given position. Liquidation fee is an incentive given to anyone closed the position. More details in the next section. 

#### Status of a Position
The protocol caps the profit and loss at collateralized margin of each position to ultimately protect participating parties. To make this even safer, we define three thresholds of a position - beyond each point more parties are incentivized to monitor and close the position. 

**A Position is `liquidated`**
When a position is completely liquidated, meaning one party (either the trader or the liquidity pool) has lost the full of its collateralized margin, then *anyone* can come in and close the position with a reward aka the `Liquidation Fee`. 

**A Position is `unsafe`**
When a liquidity pool lost more than the pre-defined `Safe Margin`, then the pool can choose to close the position to stop the loss. 

**A Position is `safe`**
In any other situation, the position is deemed safe, and only person who opened the position can close it. 

#### Profit & Loss
Here we work through a simple example to demonstrate how profit and loss is calculated. As a trader, I open a long 10x EURUSD position with $105 (where $5 is liquidation fee and $100 as investment principle) 
```
//Pseudo P&L calculation
    const openPrice = startPrice + askSpread;
    const closePrice = endPrice - bidSpread;
    const diff = (closePrice - openPrice) / openPrice;
    const leverage = await pair.leverage();
    const leveragedDiff = diff * leverage.toNumber();
    const expectedProfit = principal * leveragedDiff;
```
```
//Plug in the numbers
    openPrice = 1.2 + 0.01 = 1.21
    closePrice = 1.31 - 0.01 = 1.3 // the EURUSD price jumps up 10% in trader's favor
    diff = (1.3 - 1.21) / 1.21 = 0.07438
    leveraged diff = 0.07438 x 10 = 0.7438
    profit = 100 * 0.7438 = 74.38 //wow
```

## The Money Market Protocol 
The money market protocol serves the synthetic asset and margin trading protocols to further increase liquidity on chain. It connects to chosen money markets e.g. Compound.Finance to maximize return while guaranteeing liquidity of the asset and trading protocols. Liquidity provider would earn interest on funds in liquidity pools and collaterals. Users would earn interest on deposited fTokens. Not all the funds managed by the Money Market would earn interest, as a certain amount of cash is required to ensure liquidity for trading.

### iToken
iToken e.g. iUSD similar to the concept of cToken in Compound.Finance, is a way to account for interest earned for the funds managed by the money market. The value of iToken increases overtime. 

A liquidity pool would accept iToken as locked funds to serve as collateral. A liquidity provider would deposit USD stable-coin into the Money Market to mint iUSD and transfer the iUSDs into the liquidity pool.

When a trade happens e.g. trading USD stable-coin for fEUR, the trader's fund would convert to iUSD as collateral, while liquidity pool would transfer the remaining required iUSD into the collateral. 

```
// this can be achieved in one method
function mintTo(address liquidityPoolAddress, uint baseTokenAmount)
```
The Money Market would then invest a **proportion** of the USD stable-coins that have been converted to iUSD into chosen lending platform. This proportion is calculated based on the **minimum liquidity level** set in the protocol and the utilization of funds (based on total supply and total borrowed) on the chosen lending platform. The rationale behind this is that not all money invested in lending platforms like Compound can be fully withdrawn at all times, hence we need to calculate the appropriate amount to invest to ensure certain amount of funds can be withdrawn at all times in the Flow Protocols. 

```
// initial deposit of $100,000 to Money Market
minimum_liquidity_level = 40% 
fund_to_money_market_0 = 100,000 // this could be initial liquidity injection from liquidity provider
proportion_to_invest_0 = (1 - minimum_liquidity_level) * TS / ( TB - (1 - minimum_liquidity_level) * fund_to_money_market_0) 
                       = 85.21%                    // TS is total supply of external lending platform; TS_0 = 34,000,000; 
                                                   // TB is total borrow of that platform; TB_0 = 24,000,000;
amount_invested_0 = fund_to_money_market_0 * proportion_to_invest_0 = 100,000 * 85.21% 
                  = 85,213
```
Subsequent deposits into the Money Market will require rebalance to ensure the **minimum liquidity level** is maintained for ***ALL*** the funds managed in the Money Market.  

```
// subsequent deposit of $200,000 to Money Market
fund_to_money_market_1 = 200,000 // this could be a new position opened
proportion_to_invest_1 = 85.93%  // TS_1 (total supply) = 34,200,000; TB_1 = 24,000,000;
                                 // TS and TB here are arbitrary; they will be obtained from external lending platform. 
                                 // when supply is larger relative to amount borrowed, proportion_to_invest will be bigger
amount_invested_1 = 200,000 * 85.93% = 171,859
```
Rebalance formula: we need to calculate the ***adjustment*** required that is whether and how much we need to invest in or withdraw from the lending platform to maintain the minimum liquidity requirement for all funds managed in the Money Market. This **adjustment** is the difference between the **minimum liquidity amount**, minus the **withdraw-able amount** from lending platform, minus **current liquidity** in the protocol.

```
adjustment_1 = minimum_liquidity_level * total_fund_managed_1 - total_amount_invested_1 * withdrawable_proportion_1 - total_liquidity_1 
             = 40% * (100,000 + 200,000) - (85,213 + 171,859) * 30.18% - 42,928 = -500

// If adjustment_1 > 0, then additional amount can be invested; if adjustment_1 < 0, the amount needs to be withdrawn; otherwise no action is required. 

withdrawable_proportion_1 = (TS_1 + amount_invested_1 - TB_1) / (TS_1 + amount_invested_1)
                          = (34,200,000 + 171,859 - 24,000,000) / (34,200,000 + 171,859) = 30.18%
```  
For more details, please refer to the whitepaper.

### Interest Allocation
Interest earned from funds in the liquidity pool belongs to the liquidity provider who puts up that capital investment. This is accounted in iToken when liquidity provider withdrawing say USD from a liquidity pool. 

#### Interest Share
Interest earned from funds in the collateral is shared between liquidity provider and those who deposited fToken into the Money Market. **Interest share** similar to shares of a company is a way to measure contribution and account for distribution of returns. 

##### Allocation to Liquidity Provider
When a new position is added, the over-collateral amount would be transferred from liquidity pool to the collateral, and an equivalent amount of interest share is minted to account for return to the liquidity provider. When the position is closed, the interest share would be burnt.

For example, if a new position of 100 USD to 99 fEUR is added, (for simplicity sake, spread is ignored in calculation), the additional collateral ratio is 10%, then $10 is required from the liquidity pool as additional collateral. Consequently 10 interest shares are minted to account for the contribution. 

If this is the only fEUR position, and there's only 10 interest share issued, then liquidity provider will receive 100% (10/10) of total interest earned.

##### Allocation to fToken depositor 
When a fToken holder deposits fToken to the Money Market, then an equivalent amount of interest share accounted in the underlying USD would be minted. The interest share would be burnt when fToken is withdrawn.

Following on the previous example, if a user deposits 9 fEUR (=10 USD), then 10 interest shares would be minted and accounted as the contribution of this user. At this point, liquidity provider will receive 50% (10/20 interest shares) of total interest earned, while the user will receive 50% of total interest earned.

#### Interest Share Exchange Rate
[TODO] add more details once design finalized.

## Implementation 
We have been R&D our protocol on Ethereum, where the network is highly secure with valuable assets as basis for trading. There are also existing DeFi community and DeFi building blocks such as stablecoin. However for our target protocol participants - traders and liquidity providers, a high performance and low cost specialized trading blockchain is required to deliver the intended experience. For instance, the platform needs to be capable of handling large trading volume and frequent price fluctuations. Hence we extend our R&D to Polkadot and substrate, to develop the Flowchain parachain.

### Flow Protocol Smart Contracts on Ethereum
A reference implementation of the Flow Margin Trading Protocol, Synthetic Asset Protocol and Money Market Protocol smart contracts are deployed on Ethereum Kovan test net. 

[The Flow Exchange Web App](https://flow.laminar.one/) gives people a friendly and easy way to test the functionalities of the protocols. It is still work in progress, so please kindly excuse bugs and provide feedback to help us improve.

[The Laminar Flow Protocol Subgraph](https://thegraph.com/explorer/subgraph/laminar-protocol/flow-protocol-subgraph) provides an easy way to query the synthetic assets, margin positions, liquidity pools, and other useful information off the blockchain.

We will continue to develop and improve the protocols, and new contracts would be deployed as we progress. Find the latest deployed contracts [here](https://github.com/laminar-protocol/flow-protocol-ethereum/blob/master/artifacts/deployment.json).

Please refer to [the Wiki Guide](https://github.com/laminar-protocol/flow-protocol-ethereum/wiki) for using and developing on top of these contracts.

### Flowchain as parachain on Polkadot 
Assumptions:
- ideally there is a stablecoin that we can use as building block for our protocol. We are exploring various stablecoin options with various parties, but stablecoin itself warrants as a separate project and is outside of the scope of Flow protocols.
- ideally there is an Ethereum bridge that we can use to pipe value from our Ethereum contracts into the parachain for high speed trading. Again we are exploring options with various parties, but it in itself warrants as a separate project and is outside the scope of this project.

High level module outline for Flowchain Synthetic Asset protocol as per below:  
- **`flow-protocol`** module
```
// Dispatachable methods
fn create_flow_token(string name, string symbol)
fn deposit(FlowToken token, LiquidityPoolId pool, uint baseTokenAmount)
fn withdraw(FlowToken token, LiquidityPoolId pool, uint flowTokenAmount)
fn liquidate(FlowToken token, LiquidityPoolId pool, uint flowTokenAmount)
fn add_collateral(FlowToken token, LiquidityPoolId pool, uint amount)
```
- **`generic-asset`** module that supports FlowToken
```
// Dispatachable methods mostly related to FlowToken
fn set_additional_collateral_Ratio(uint percent)
fn set_liquidation_ratio(uint percent)
fn set_extreme_liquidation_ratio(uint percent)
fn mint(address account, uint amount)
fn burn(address account, uint amount)
fn get_position(address poolAddr)
fn set_position(address poolAddr)
fn add_position(address poolAddr, uint additonalCollaterals, uint additionaMinted)
fn remove_position(address poolAddr, uint collateralsToRemove, uint mintedToRemove)

fn total_balance(AccountId accountId)
fn free_balance(AccountId accountId)
fn total_issuance()
fn transfer(AccountId sender, AccountId recipient, Balance: amount)
```
- **`liquidity_pool`** module
```
// Dispatachable methods
fn get_bid_spread(FlowTokenId fToken)
fn get_ask_spread(FlowTokenId fToken)
fn get_additional_collateral_ratio(FlowTokenId fToken)
fn set_spread(uint value) 
fn set_collateral_ratio(uint value) 
fn enable_token(FlowTokenId token) 
fn disable_token(FlowTokenId token) 
```
- **`price_oracle`** module
```
//Draft dispatchable methods
fn get_price(SymbolId symbol) 
fn set_price(SymbolId symbol, uint price)
```

We will update type, storage, events and other details once we progress further.

### Oracle Reference Implementation
We have defined the oracle interface and assume trusted oracles to provide price feed to the protocols.
```
// Pseudo Interface
    function isPriceOracle() returns (bool);
    function getPrice(SymbolId symbol) returns (uint);
```

At this stage, we have a simple Oracle design to serve our purpose for proofing the concept.

The oracle price is set by price feed administrator. We will watch closely governance standards in the oracle space, and gradually improve this. Due to sensitivity to pricing in trading use cases, two price baselines are defined to protect sudden and dramatic (potentially malicious) price fluctuation. 

The difference between the new price and the last price is capped by the **`delta last limit`**. We also take a snapshot of price over a certain period. The difference between the capped new price and the snapshot price is further capped by the **`delta snapshot limit`**.

Pseudo cap function, for last price cap, `priceCap` is the **`delta last limit`**, and `lastPrice` is the Oracle last price; for snapshot price cap, `priceCap` is the **`delta snapshot limit`**, and `lastPrice` is the snapshot price.

#### Oracle Server
There will be multiple Oracle servers set up to feed prices into the Oracle contract onchain. For mainnet, reputable price source like Bloomberg Forex API will be fetched to the server then feed into the Oracle contract. Monitoring services will be set up to ensure server availability and price sanity. 

Note: any compromised oracle server is able to influence the price to a limited degree due to the price cap function built into the Oracle contract. A K'th largest algorithm will be able to tolerate up to K compromised servers. 

Again we will continue watch closely the development in the Oracle space and open to collaboration to make it more resilient for our trading platform.