import BN from 'bn.js';
import { expectRevert, constants } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import {
  SimplePriceOracleInstance, FlowMarginProtocolInstance, LiquidityPoolInstance, TestTokenInstance,
  MarginTradingPairInstance, MoneyMarketInstance, IERC20Instance
} from 'types/truffle-contracts';
import { createTestToken, createMoneyMarket, fromPercent, messages, fromPip, dollar, bn } from './helpers';

const FlowMarginProtocol = artifacts.require('FlowMarginProtocol');
const LiquidityPool = artifacts.require('LiquidityPool');
const SimplePriceOracle = artifacts.require('SimplePriceOracle');
const MarginTradingPair = artifacts.require('MarginTradingPair');

contract('FlowMarginProtocol', (accounts) => {
  const owner = accounts[0];
  const liquidityProvider = accounts[1];
  const alice = accounts[2];
  const bob = accounts[3];
  const eur = accounts[4];
  const badAddress = accounts[5];

  let oracle: SimplePriceOracleInstance;
  let protocol: FlowMarginProtocolInstance;
  let liquidityPool: LiquidityPoolInstance;
  let usd: TestTokenInstance;
  let iUsd: IERC20Instance;
  let pair: MarginTradingPairInstance;
  let moneyMarket: MoneyMarketInstance;

  before(async () => {
    oracle = await SimplePriceOracle.new([owner]);
    await oracle.setOracleDeltaLastLimit(fromPercent(100));
    await oracle.setOracleDeltaSnapshotLimit(fromPercent(100));
  });

  beforeEach(async () => {
    usd = await createTestToken([liquidityProvider, dollar(20000)], [alice, dollar(10000)], [bob, dollar(10000)]);
    ({ moneyMarket, iToken: iUsd } = await createMoneyMarket(usd.address, fromPercent(100)));
    protocol = await FlowMarginProtocol.new(oracle.address, moneyMarket.address);
    pair = await MarginTradingPair.new(protocol.address, moneyMarket.address, eur, 10, fromPercent(80), dollar(5));
    await protocol.addTradingPair(pair.address);

    await usd.approve(protocol.address, constants.MAX_UINT256, { from: alice });
    await usd.approve(protocol.address, constants.MAX_UINT256, { from: bob });
    await usd.approve(moneyMarket.address, constants.MAX_UINT256, { from: liquidityProvider });

    liquidityPool = await LiquidityPool.new(moneyMarket.address, fromPip(10));

    await liquidityPool.approve(protocol.address, constants.MAX_UINT256);
    await liquidityPool.enableToken(eur);

    await moneyMarket.mintTo(liquidityPool.address, dollar(10000), { from: liquidityProvider });

    await oracle.setPrice(eur, fromPercent(100));
  });

  it('requires owner to add new trading pair', async () => {
    await expectRevert(protocol.addTradingPair(eur, { from: badAddress }), messages.onlyOwner);
  });

  it('able to open and close position', async () => {
    await protocol.openPosition(pair.address, liquidityPool.address, dollar(105), { from: alice });

    const positon = await pair.positions(0);
    [alice, liquidityPool.address, dollar(105), fromPip(10010), dollar(5), fromPip(10)].forEach((x, i) => {
      if (BN.isBN(x)) {
        expect(positon[i]).bignumber.equal(x);
      } else {
        expect(positon[i]).equal(x);
      }
    });

    expect(await usd.balanceOf(alice)).bignumber.equal(dollar(10000 - 105));
    expect(await iUsd.balanceOf(liquidityPool.address)).bignumber.equal(dollar(10000 - 105));
    expect(await iUsd.balanceOf(pair.address)).bignumber.equal(dollar(210));

    await protocol.closePosition(pair.address, 0, { from: alice });

    const price = 1;
    const spread = 0.001;
    const openPrice = price + spread;
    const closePrice = price - spread;
    const diff = (closePrice - openPrice) / price;
    const leverage = 10;
    const leveragedDiff = diff * leverage;
    const principal = 100;
    const expectedProfit = principal * leveragedDiff;

    const bal: BN = await usd.balanceOf(alice) as any;
    const profit = bal.sub(dollar(10000)).mul(bn(10000)).div(dollar(1)).toNumber() / 10000;

    expect(profit).closeTo(expectedProfit, 0.0001);

    expect(await iUsd.balanceOf(liquidityPool.address)).bignumber.equal(dollar(10002));
  });
});
