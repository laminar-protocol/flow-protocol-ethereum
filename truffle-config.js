/* eslint-disable */

require('ts-node').register({
  files: true
});

const HDWalletProvider = require('@truffle/hdwallet-provider');
const Subprovider = require('@trufflesuite/web3-provider-engine/subproviders/subprovider');

require('dotenv').config();

class ChainIdProvider extends Subprovider {
  constructor(chainId){
    super();
    this.chainId = '0x'+ Number(chainId).toString(16);
  }

  handleRequest(payload, next, end) {
    delete payload['skipCache'];
    if (payload.method === 'eth_sendTransaction') {
      // append chain_id
      payload.params[0]['chainId'] = this.chainId;
    }
    next();
  }
}

class FrontierProvider extends HDWalletProvider {
  constructor(chainId, ...args) {
    super(...args);
    this.engine.addProvider(new ChainIdProvider(chainId), 0);
  }
}

module.exports = {
  networks: {
    mainnet: {
      provider: () =>
        new HDWalletProvider(
          process.env.MNEMONIC,
          `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`
        ),
      network_id: 1
    },
    ropsten: {
      provider: () =>
        new HDWalletProvider(
          process.env.MNEMONIC,
          `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`
        ),
      network_id: 3
    },
    kovan: {
      provider: () =>
        new HDWalletProvider(
          process.env.MNEMONIC,
          `https://kovan.infura.io/v3/${process.env.INFURA_API_KEY}`
        ),
      network_id: 42,
      gasPrice: '1000000000',
      gas: 9500000,
      networkCheckTimeout: 1000000000,
    },
    development: {
      provider: () => new FrontierProvider(42, "barrel photo axis offer lunch mountain advice empty kidney poem shop object", "http://localhost:8545"),
      network_id: '*', // Match any network id,
      gas: 9500000
    }
  },
  compilers: {
    solc: {
      version: '0.6.10',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  },
  plugins: ['truffle-contract-size', 'truffle-plugin-verify', 'truffle-contract-size'],
  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY
  },
  mocha: {
    reporter: 'eth-gas-reporter',
    reporterOptions : {
      currency: 'USD',
      coinmarketcap: process.env.COINMARKETCAP_API_KEY,
      excludeContracts: [
        'Migrations',
        'Proxy',
        'ArraysImpl',
        'MarginFlowProtocolNewVersion',
        'SyntheticFlowProtocolNewVersion',
        'SyntheticFlowTokenNewVersion',
        'MarginFlowProtocolSafetyNewVersion',
        'MarginLiquidityPoolNewVersion',
        'MarginLiquidityPoolRegistryNewVersion',
        'SyntheticLiquidityPoolNewVersion',
        'MockPoolIsSafeMarginProtocol',
        'MockPoolIsNotSafeMarginProtocol',
        'MoneyMarketNewVersion',
        'QuickImpl',
        'SimplePriceOracleNewVersion',
        'TestCToken',
        'TestToken',
        'TestMarginFlowProtocol'
      ]
    }
  }
};
