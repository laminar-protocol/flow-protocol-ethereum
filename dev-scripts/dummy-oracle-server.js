module.exports = async (callback) => {
  const SimplePriceOracle = artifacts.require('SimplePriceOracle');
  // console.log(1, SimplePriceOracle)
  const oracle = await SimplePriceOracle.deployed();
  console.log(oracle.address);
  callback();

  // web3.eth.getBlock('latest').then(function(b) {
  //     console.log(b.transactions[0]);
  //     callback();
  // });
};
