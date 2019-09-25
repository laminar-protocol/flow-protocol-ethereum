import BN from 'bn.js';

const TestToken = artifacts.require("TestToken");

export const ZERO = new BN(0);

export async function createTestToken(...args: [string, number][]) {
    const token = await TestToken.new();
    for (const [acc, amount] of args) {
        await token.transfer(acc, amount);
    }
    return token;
};

export const fromPip = (val: number | string): any => web3.utils.toWei(new BN(val)).div(new BN(10000));
export const fromPercent = (val: number | string): any => web3.utils.toWei(new BN(val)).div(new BN(100));
export const bn = (val: number | string): any => new BN(val);

export const messages = {
    onlyOwner: 'Ownable: caller is not the owner',
    onlyPriceFeeder: 'PriceFeederRole: caller does not have the PriceFeeder role',
    stillSafe: 'Still in a safe position'
};
