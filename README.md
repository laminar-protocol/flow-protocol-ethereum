# flow-protocol

## Introduction
Laminar aims to be the bridge of on-and-off chain players via arena of DeFi - on one hand, increase on-chain liquidity, exposure and variety, on the other hand, tap into the off-chain mature markets like Forex which has $5 trillion daily trading volume, and bring transparency of pricing and counter-party actions to traders, and new revenue opportunity to off-chain players.  

This document serves as a general overview of the Flow protocol - a generalized synthetic asset and margin trading protocol, and brief introduction to its reference implementation on Ethereum as Smart Contracts and on Polkadot as parachain. We will add more details for developers to build on top of the protocol as it evolves further.

## Overview 
Flow protocol is generalized for any type of synthetic assets and trading, the first version will focus on synthesizing EUR and JPY as crypto assets, and Forex as margin trading market, due to market demand and validation from both traders and liquidity providers. 

Flow protocol has the following properties：

- **Instant Liquidity**: traders trade against smart contract (or runtime module in Polkadot/Substrate terms) not order book, hence there's instant and infinite liquidity provided that the collateral ratio doesn't fall below threshold.

- **Asset Efficiency for traders**: while all positions are over-collateralized, traders only put up collateral for the position value , the rest of the risk is taken on by liquidity providers. In return liquidity providers earn a fee e.g. in the form of spread in Forex case. Savvy liquidity providers would have means to hedge their risks on or off chain depending on the asset type.

- **Better trading experience**: traders in current off-chain market e.g. Forex are challenged by opaque pricing and price manipulation. Flow protocol enables transparent pricing and transparent counter-party actions governed by the protocol and the community, while providing the trading experience comparable to the off-chain ones. 

- **Integrated money market**: assets deposited into the protocols both from the traders and liquidity providers will earn interest to further increase on-chain liquidity. We look to work with DeFi partners such as Compound.Finance to enable such service via a general interface from multiple providers.  

- **Tokenized positions**: synthetic stable fiat assets are tokenized as flow Tokens e.g. fEUR. Margin positions that allows traders to leverage long or short an asset are tokenized as margin Tokens e.g. sEURUSD.20x. Tokenized positions enables fluidity of the assets e.g. easily trading ERC20 flow tokens and margin tokens in open market, or as building blocks of other financial services, and also other programmable use cases that we can't wait for programmers and the community to explore. 

## Collateralized Synthetic Asset Protocol
The collateralized synthetic asset protocol allows user to mint non-USD stable-coin Flow token e.g. fEUR or fJPY with USD stable-coin e.g. DAI or equivalent as collateral. 

### Collateral
The position is always over-collateralized for risk management purposes. The `collateral ratio` is defined per Flow token. For example, to mint $100 worth of fEUR, while 110% collateral is required, user only needs to lock in $100 as collateral, the additional collateral will come out of the liquidity pool provided by the liquidity provider.

### Liquidation Incentive
The current collateral ratio is re-calculated at every deposit/withdraw action with exchange rate at time for the liquidity pool in trade. If the current collateral ratio is below the `minimum collateral ratio` which is defined per Flow token, then liquidity pool is open for liquidation incentivized by a monetary reward. The incentive formula will optimize for risk to the pool and profit for the liquidator.

[TODO] optimal liquidation reward point for best profit

### Liquidity Pool
Liquidity pool is set up by liquidity providers for a particular fToken, where a certain amount of funds e.g. USD stable-coins are locked in to serve as collateral, and the spread (bid and ask price for a given Forex symbol e.g. EURUSD) is set up as fees to the liquidity provider. An efficient market with multiple liquidity provider will trend towards competitive spread.

### fToken via Flow Protocol

#### Deposit/Mint
Deposit USD stable-coin and mint EUR stable-coin Flow token fEUR. The number of flow tokens minted is the amount of underlying asset being provided divided by the ask price of the current exchange rate in the selected liquidity pool.

For liquidity provider, the additional collateral required for a mint action is the flow token minted timmultiplied by the exchange rate (mid price), then multiplied by the collateral ratio.

pseudo formula:
```
flowTokenAmount = baseTokenAmount / askPrice
additionalCollateralFromPool = flowTokenAmount * midPrice * collateralRatio

```

#### Withdraw
The amount of underlying asset withdrawn is the number of Flow tokens multiplied by the bid price from the current exchange rate. The amount withdrawn must be less than the user's account balance, and the liquidity pool available balance. The collateral required will be re-calculated after the withdrawn amount; if the collateral required is less than the current collateral, then the liquidity pool can be refunded after deducting the withdrawn amount from the difference between current and required collateral. 

pseudo formula:
```
baseTokenAmount = flowTokenAmount * bidPrice

if (requiredCollaterals <= collaterals) {
    collateralsToRemove = collaterals - requiredCollaterals;
    refundToPool = collateralsToRemove - withdrawnAmount;
}

```

#### Liquidation
If a liquidity pool has negative liquidity i.e. below required minimum collateral ratio, then it is subject to liquidation by others to bring the liquidity back to required level. When a liquidation happens, a liquidator deposits some or all minted Flow token on behalf of the liquidity provider, and in return receive a reward from the outstanding collateral. 

#### Exchange Rate
The exchange rate for a Forex pair is provided by a price oracle from reputable sources like Bloomberg. Each liquidity provider has freedom to apply a spread on top of this price for its own liquidity pool to provide traders/users a bid and ask price for each Forex pair. 

```
bidPrice = price - spread;
askPrice = price + spread;
```

### Money Market

## Collateralized Margin Trading Protocol

## Price Oracle

## Implementation 

### Smart Contracts on Ethereum

### Parachian on Polkadot 