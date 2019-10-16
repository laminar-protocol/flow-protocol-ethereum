/* eslint-disable */

require('ts-node').register({
  files: true,
});

const HDWalletProvider = require('truffle-hdwallet-provider');

require('dotenv').config();

const isProd = process.env.ENV === 'PROD';

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 9545,
      network_id: '*', // Match any network id,
    },
    ropsten: {
      provider: () => new HDWalletProvider(process.env.MNEMONIC, `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`),
      network_id: 3,
    },
    kovan: {
      provider: () => new HDWalletProvider(process.env.MNEMONIC, `https://kovan.infura.io/v3/${process.env.INFURA_API_KEY}`),
      network_id: 42,
    },
  },
  compilers: {
    solc: {
      version: '0.5.12',
      settings: {
        optimizer: {
          enabled: isProd,
          runs: 200,
        },
      },
    },
  },
  plugins: [
    'truffle-contract-size',
    'truffle-plugin-verify',
  ],
  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY,
  },
};
