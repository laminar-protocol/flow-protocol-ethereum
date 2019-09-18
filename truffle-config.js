require("ts-node/register");

const HDWalletProvider = require("truffle-hdwallet-provider");

require('dotenv').config();

const isProd = process.env.ENV === 'PROD';

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 9545,
      network_id: "*" // Match any network id,
    },
    ropsten: {
      provider: () =>
        new HDWalletProvider(process.env.MNEMONIC, "https://ropsten.infura.io/v3/" + process.env.INFURA_API_KEY),
      network_id: 3
    },
    kovan: {
      provider: () =>
        new HDWalletProvider(process.env.MNEMONIC, "https://kovan.infura.io/v3/" + process.env.INFURA_API_KEY),
      network_id: 42
    }
  },
  compilers: {
    solc: {
      settings: {
        optimizer: {
          enabled: isProd,
          runs: 200
        },
      }
    }
  },
  plugins: [
    'truffle-contract-size'
  ]
};
