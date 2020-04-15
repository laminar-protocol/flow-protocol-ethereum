/* eslint-disable */

require('ts-node').register({
  files: true
});

const HDWalletProvider = require('truffle-hdwallet-provider');

require('dotenv').config();

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
      gas: 9500000
    },
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // Match any network id,
      gas: 9500000
    }
  },
  compilers: {
    solc: {
      version: '0.6.4',
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
        'FlowMarginProtocolNewVersion',
        'FlowProtocolNewVersion',
        'FlowTokenNewVersion',
        'LiquidityPoolNewVersion',
        'MarginTradingPairNewVersion',
        'MoneyMarketNewVersion',
        'QuickImpl',
        'SimplePriceOracleNewVersion',
        'TestCToken',
        'TestToken',
      ]
    }
  }
};
