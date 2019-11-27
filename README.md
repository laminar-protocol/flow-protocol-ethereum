Table of Contents
<!-- TOC -->

- [1. Introduction](#1-introduction)
- [2. Implementation](#2-implementation)
    - [2.1. Flow Protocol Smart Contracts on Ethereum](#21-flow-protocol-smart-contracts-on-ethereum)
    - [2.2. Substrate implementation - Flowchain as parachain on Polkadot](#22-substrate-implementation---flowchain-as-parachain-on-polkadot)

<!-- /TOC -->

# 1. Introduction
Laminar aims to create an open finance platform along with financial assets to serve traders from both the crypto and mainstream finance worlds. Please find details of Laminar and its Flow Protocols for synthetic asset and margin trading [here](https://github.com/laminar-protocol/flowchain).

# 2. Implementation 
We have been R&D our protocol on Ethereum, where the network is highly secure with valuable assets as basis for trading. There are also existing DeFi community and DeFi building blocks such as stablecoin. The Ethereum implementation will be the value gateway, and our Substrate implementation - the Flowchain which will later connect to Polkadot will be the specialized high performance financial service chain. We can best serve both mainstream finance and crypto traders and service providers by leveraging the best of both worlds. 

### 2.1. Flow Protocol Smart Contracts on Ethereum
A reference implementation of the Flow Margin Trading Protocol, Synthetic Asset Protocol and Money Market Protocol smart contracts are deployed on Ethereum Kovan test net. 

[The Flow Exchange Web App](https://flow.laminar.one/) gives people a friendly and easy way to test the functionalities of the protocols. It is still work in progress, so please kindly excuse bugs and provide feedback to help us improve.

[The Laminar Flow Protocol Subgraph](https://thegraph.com/explorer/subgraph/laminar-protocol/flow-protocol-subgraph) provides an easy way to query the synthetic assets, margin positions, liquidity pools, and other useful information off the blockchain.

We will continue to develop and improve the protocols, and new contracts would be deployed as we progress. Find the latest deployed contracts [here](https://github.com/laminar-protocol/flow-protocol-ethereum/blob/master/artifacts/deployment.json).

Please refer to [the Wiki Guide](https://github.com/laminar-protocol/flow-protocol-ethereum/wiki) for using and developing on top of these contracts.

Please refer to [Testing Laminar Flow Synthetic Assets & Margin Trading Protocols](https://medium.com/laminar/testing-laminar-flow-synthetic-assets-margin-trading-protocols-130c5826cf4d?source=collection_home---6------1-----------------------) for exploring our contracts and dApp.

### 2.2. Substrate implementation - Flowchain as parachain on Polkadot
See more details [here](https://github.com/laminar-protocol/flowchain)