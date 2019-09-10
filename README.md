# flow-protocol

## Introduction
Laminar aims to be the bridge of on-and-off chain players via arena of DeFi - on one hand, increase on-chain liquidity, exposure and variety, on the other hand, tap into the off-chain mature markets like Forex which has $5 trillion daily trading volume, and bring transparency of pricing and counter-party actions to traders, and new revenue opportunity to off-chain players.  

This document serves as a general overview of the Flow protocol - a generalized synthetic asset and margin trading protocol, and brief introduction to its reference implementation on Ethereum as Smart Contracts and on Polkadot as parachain. We will add more details for developers to build on top of the protocol as it evolves further.

## Overview 
Flow protocol is generalized for any type of synthetic assets and trading, the first version will focus on synthesizing EUR and JPY as crypto assets, and Forex as margin trading market, due to market demand and validation from both traders and liquidity providers. 

Flow protocol has the following properties
- **Instant Liquidity**: traders trade against smart contract (or runtime module in Polkadot/Substrate terms) not order book, hence there's instant and infinite liquidity provided that the collateral ratio doesn't fall below threshold.

- **Asset Efficiency for traders**: while all positions are over-collateralized, traders only put up 100% of the collateral, the rest of the risk is taken on by liquidity providers. In return liquidity providers earn a fee e.g. in the form of spread in Forex case. Savvy liquidity providers would have means to hedge their risks on or off chain depending on the asset type.

- **Better trading experience**: traders in current off-chain market e.g. Forex are challenged by opaque pricing and price manipulation. Flow protocol enables transparent pricing and transparent counter-party actions governed by the protocol and the community, while providing the trading experience comparable to the off-chain ones. 

- **Integrated money market**: assets deposited into the protocols both from the traders and liquidity providers will earn interest to further increase on-chain liquidity. We look to work with DeFi partners such as Compound.Finance to enable such service via a general interface from multiple providers.  

- **Tokenized positions**: synthetic stable fiat assets are tokenized as flow Tokens e.g. fEUR. Margin positions that allows traders to leverage long or short an asset are tokenized as margin Tokens e.g. sEURUSD.20x. Tokenized positions enables fluidity of the assets e.g. easily trading ERC20 flow tokens and margin tokens in open market, or as building blocks of other financial services, and also other programmable use cases that we can't wait for programmers and the community to explore. 

## Collateralized Synthetic Asset Protocol

### Collateral

### Liquidity Pool

### Liquidation Incentive

### Money Market

### fToken

#### Mint

#### Withdraw

#### Liquidate

#### Exchange Rate

### Money Market

## Collateralized Margin Trading Protocol

## Price Oracle

## Implementation 

### Smart Contracts on Ethereum

### Parachian on Polkadot 