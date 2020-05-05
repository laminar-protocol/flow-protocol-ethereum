usePlugin('@nomiclabs/buidler-truffle5'); // eslint-disable-line

module.exports = {
  defaultNetwork: 'buidlerevm',
  networks: {
    buidlerevm: {
      gas: 9500000,
      allowUnlimitedContractSize: true,
    },
  },
  solc: {
    version: '0.6.4',
    // optimizer: { enabled: false, runs: 200 },
  },
};
