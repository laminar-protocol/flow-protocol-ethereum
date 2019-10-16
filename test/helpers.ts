import BN from 'bn.js';

const TestToken = artifacts.require('TestToken');
const TestCToken = artifacts.require('TestCToken');
const MoneyMarket = artifacts.require('MoneyMarket');
const IERC20 = artifacts.require('IERC20');

export const fromPip = (val: number | string): any => web3.utils.toWei(new BN(val)).div(new BN(10000));
export const fromPercent = (val: number | string): any => web3.utils.toWei(new BN(val)).div(new BN(100));
export const dollar = (val: number | string): any => web3.utils.toWei(new BN(val));
export const bn = (val: number | string | bigint): any => new BN(val.toString());

export const ZERO = new BN(0);

export async function createTestToken(...args: [string, number][]) {
  const token = await TestToken.new();
  for (const [acc, amount] of args) {
    await token.transfer(acc, amount);
  }
  return token;
}

export async function createMoneyMarket(testTokenAddress: string, liquidity = fromPercent(100)) {
  const cToken = await TestCToken.new(testTokenAddress);
  const moneyMarket = await MoneyMarket.new(cToken.address, liquidity, 'Test iToken', 'iTEST');
  return { moneyMarket, cToken, iToken: await IERC20.at(await moneyMarket.iToken()) };
}

export const messages = {
  onlyOwner: 'Ownable: caller is not the owner',
  onlyPriceFeeder: 'PriceFeederRole: caller does not have the PriceFeeder role',
  stillSafe: 'Still in a safe position',
  notEnoughLiquidationFee: 'Not enough to pay for liquidation fee',
  onlyOwnerCanClosePosition: 'Only position owner can close a safe position',
  onlyOwnerOrLiquidityPoolCanClosePosition: 'Only position owner or liquidity pool can close a open position',
};
