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
    version: '0.6.10',
    optimizer: { enabled: true, runs: 200 },
  },
};
