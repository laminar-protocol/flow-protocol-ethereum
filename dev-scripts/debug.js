module.exports = (callback) => {
  web3.eth.getBlock('latest').then((b) => {
    console.log(b.transactions[0]);
    callback();
  });
};
