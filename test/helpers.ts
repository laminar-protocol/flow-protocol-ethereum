import BN from 'bn.js';
import chai from 'chai';
import chaiBN from 'chai-bn';
import web3 from 'web3';

chai.use(chaiBN(BN));

const TestToken = artifacts.require('TestToken');
const TestCToken = artifacts.require('TestCToken');
const LaminarStorage = artifacts.require('LaminarStorage');
const LaminarUpgrade = artifacts.require('LaminarUpgrade');
const MoneyMarketFactory = artifacts.require('MoneyMarketFactory');
const MoneyMarket = artifacts.require('MoneyMarket');
const IERC20 = artifacts.require('IERC20');

export const asciiToHex = (ascii: string) => web3.utils.asciiToHex(ascii);
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

export function createLaminarStorage() {
  return LaminarStorage.new();
}

export async function createMoneyMarket(
  testTokenAddress: string,
  liquidity = fromPercent(100),
) {
  const laminarStorage = await createLaminarStorage();
  const laminarUpgrade = await LaminarUpgrade.new(laminarStorage.address);
  const contractKey = web3.utils.soliditySha3(
    'contract.address',
    laminarUpgrade.address,
  );
  laminarStorage.setAddress(contractKey as string, laminarUpgrade.address);

  const cToken = await TestCToken.new(testTokenAddress);

  const moneyMarketFactory = await MoneyMarketFactory.new(
    laminarStorage.address,
    laminarUpgrade.address,
  );

  await laminarUpgrade.addContract(
    'MoneyMarketFactory',
    moneyMarketFactory.address,
  );

  await moneyMarketFactory.deployMoneyMarket(
    cToken.address,
    liquidity,
    'Test iToken',
    'iTEST',
  );

  const moneyMarket = await MoneyMarket.at(
    await moneyMarketFactory.moneyMarkets(0),
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
};
