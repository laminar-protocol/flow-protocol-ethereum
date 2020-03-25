usePlugin('@nomiclabs/buidler-truffle5'); // eslint-disable-line

module.exports = {
  defaultNetwork: 'buidlerevm',
  networks: {
    buidlerevm: {
      gas: 4712388,
    },
  },
  solc: { version: '0.6.4', optimizer: { enabled: true, runs: 200 } },
};
