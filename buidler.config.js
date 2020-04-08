usePlugin('@nomiclabs/buidler-truffle5'); // eslint-disable-line

module.exports = {
  defaultNetwork: 'buidlerevm',
  networks: {
    buidlerevm: {
      gas: 9500000,
    },
  },
  solc: { version: '0.6.4', optimizer: { enabled: true, runs: 200 } },
  allowUnlimitedContractSize: true,
};
