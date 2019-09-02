const BN = require('bn.js');
const TestToken = artifacts.require("TestToken");

exports.ZERO = new BN(0);

exports.createTestToken = async (...args) => {
    const token = await TestToken.new();
    for (const [acc, amount] of args) {
        await token.transfer(acc, amount);
    }
    return token;
};

exports.fromPip = val => web3.utils.toWei(new BN(val)).div(new BN(10000));
exports.fromPercent = val => web3.utils.toWei(new BN(val)).div(new BN(100));
exports.bn = val => new BN(val);

exports.messages = {
    onlyOwner: 'Ownable: caller is not the owner',
    onlyPriceFeeder: 'PriceFeederRole: caller does not have the PriceFeeder role'
};
