module.exports = function(callback) {
    web3.eth.getBlock('latest').then(function(b) {
        console.log(b.transactions[0]);
        callback();
    });
}