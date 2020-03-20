import BN from 'bn.js';
import chai from 'chai';
import chaiBN from 'chai-bn';
import web3 from 'web3';

chai.use(chaiBN(BN));

const TestToken = artifacts.require('TestToken');
const TestCToken = artifacts.require('TestCToken');
const MoneyMarket = artifacts.require('MoneyMarket');
const Proxy = artifacts.require('Proxy');
const IERC20 = artifacts.require('IERC20');

export const fromPip = (val: number | string): any =>
  web3.utils.toWei(new BN(val)).div(new BN(10000));
export const fromPercent = (val: number | string): any =>
  web3.utils.toWei(new BN(val)).div(new BN(100));
export const dollar = (val: number | string): any => {
  if (typeof val === 'string') {
    return web3.utils.toWei(val);
  }
  return web3.utils.toWei(new BN(val));
};
export const euro = (val: number | string): any => dollar(val);
export const bn = (val: number | string | bigint): any =>
  new BN(val.toString());

export const ZERO = new BN(0);

export async function createTestToken(...args: [string, number][]) {
  const token = await TestToken.new();
  for (const [acc, amount] of args) {
    await token.transfer(acc, amount);
  }
  return token;
}

export async function createMoneyMarket(
  testTokenAddress: string,
  liquidity = fromPercent(100),
) {
  const cToken = await TestCToken.new(testTokenAddress);
  const moneyMarketProxy = await Proxy.new();
  const moneyMarketImpl = await MoneyMarket.new();
  moneyMarketProxy.upgradeTo(moneyMarketImpl.address);
  const moneyMarket = await MoneyMarket.at(moneyMarketProxy.address);
  await (moneyMarket as any).initialize(
    // workaround since init is overloaded function which isnt supported by typechain yet
    cToken.address,
    'Test iToken',
    'iTEST',
    liquidity,
  );

  return {
    moneyMarket,
    cToken,
    iToken: await IERC20.at(await moneyMarket.iToken()),
  };
}

export const messages = {
  onlyOwner: 'Ownable: caller is not the owner',
  onlyPriceFeeder: 'PriceFeederRole: caller does not have the PriceFeeder role',
  stillSafe: 'Still in a safe position',
  notEnoughLiquidationFee: 'Not enough to pay for liquidation fee',
  onlyOwnerCanClosePosition: 'Only position owner can close a safe position',
  onlyOwnerOrLiquidityPoolCanClosePosition:
    'Only position owner or liquidity pool can close a open position',
  askPriceTooHigh: 'Ask price too high',
  bidPriceTooLow: 'Bid price too low',
};
