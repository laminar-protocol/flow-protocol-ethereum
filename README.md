# flow-protocol

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

## Collateralized Synthetic Asset Protocol
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

To mint a new fToken (e.g. fUER), trader's deposit includes the **USD amount required** based on exchange rate, plus the **spread paid** to the liquidity provider. Both of these will be contributed to the collateral, and the remaining comes from the liquidity pool to make up a total of 110% collateral. The additional collateral is there to protect the position from exchange rate fluctuation hence stablizing the fToken.

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
## Money Market Protocol
We will provide more details once we have a draft design.

## Collateralized Margin Trading Protocol
We will provide more details once we have a draft design.

## Implementation 
We have been R&D our protocol on Ethereum, where the network is highly secure with valuable assets as basis for trading. There are also existing DeFi community and DeFi building blocks such as stablecoin. However for our target protocol participants - traders and liquidity providers, a high performance and low cost specialized trading blockchain is required to deliver the intended experience. For instance, the platform needs to be capable of handling large trading volume and frequent price fluctuations. Hence we extend our R&D to Polkadot and substrate, to develop the Flowchain parachain.

### Flow Protocol Smart Contracts on Ethereum
Simple Proof of Concept Flow Synthetic Asset Protocol on Koven. The codes in the repo are the actual protocols and have not been deployed yet.

| Contracts           | Address                                      |
| ------------------- | -------------------------------------------- | 
| fEUR                | ['0x492D4a6EDf35Ad778cCC16007709DCe72522e98E'](https://kovan.etherscan.io/address/0x492D4a6EDf35Ad778cCC16007709DCe72522e98E) | 
| USD (DAI equivalent)| ['0x04aECEd61E92BE42e326e5Fd34e5D611cF71f5E2'](https://kovan.etherscan.io/address/0x04aECEd61E92BE42e326e5Fd34e5D611cF71f5E2) | 
| Factory             | ['0x67e2C2F010086CA7e202e7cA319391eb52358582'](https://kovan.etherscan.io/address/0x67e2C2F010086CA7e202e7cA319391eb52358582) |
| Liquidity Pool      | ['0x11cC6E95ba25aDfDF3549e6D70e8dA42718A82bC'](https://kovan.etherscan.io/address/0x11cC6E95ba25aDfDF3549e6D70e8dA42718A82bC) |
| Price Oracle        | ['0xD738B76DbC00B79bb14C7E4B485c4592D83Ca17B'](https://kovan.etherscan.io/address/0xD738B76DbC00B79bb14C7E4B485c4592D83Ca17B) |


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
fn get_additoinal_collateral_ratio(FlowTokenId fToken)
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

