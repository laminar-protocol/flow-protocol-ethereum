import { constants } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import BN from 'bn.js';

import {
  SimplePriceOracleInstance,
  TestFlowMarginProtocol2Instance,
  LiquidityPoolInstance,
  TestTokenInstance,
  MarginTradingPairInstance,
  MoneyMarketInstance,
  IERC20Instance,
} from 'types/truffle-contracts';
import {
  createTestToken,
  createMoneyMarket,
  fromPercent,
  fromPip,
  dollar,
  euro,
} from './helpers';

const Proxy = artifacts.require('Proxy');
const TestFlowMarginProtocol2 = artifacts.require('TestFlowMarginProtocol2');
const Leverage = artifacts.require('Leverage');
const LiquidityPool = artifacts.require('LiquidityPool');
const SimplePriceOracle = artifacts.require('SimplePriceOracle');
const MarginTradingPair = artifacts.require('MarginTradingPair');

contract('FlowMarginProtocol2', accounts => {
  const owner = accounts[0];
  const liquidityProvider = accounts[1];
  const alice = accounts[2];
  const bob = accounts[3];
  const eur = accounts[4];

  let oracle: SimplePriceOracleInstance;
  let protocol: TestFlowMarginProtocol2Instance;
  let liquidityPool: LiquidityPoolInstance;
  let usd: TestTokenInstance;
  let iUsd: IERC20Instance; // eslint-disable-line
  let pair: MarginTradingPairInstance;
  let moneyMarket: MoneyMarketInstance;

  before(async () => {
    const oracleImpl = await SimplePriceOracle.new();
    const oracleProxy = await Proxy.new();
    oracleProxy.upgradeTo(oracleImpl.address);

    oracle = await SimplePriceOracle.at(oracleProxy.address);
    await oracle.initialize();

    oracle.addPriceFeeder(owner);
    await oracle.setOracleDeltaLastLimit(fromPercent(100));
    await oracle.setOracleDeltaSnapshotLimit(fromPercent(100));
  });

  beforeEach(async () => {
    usd = await createTestToken(
      [liquidityProvider, dollar(20000)],
      [alice, dollar(10000)],
      [bob, dollar(10000)],
    );
    ({ moneyMarket, iToken: iUsd } = await createMoneyMarket(
      usd.address,
      fromPercent(100),
    ));

    const flowMarginProtocolImpl = await TestFlowMarginProtocol2.new();
    const flowMarginProtocolProxy = await Proxy.new();

    await flowMarginProtocolProxy.upgradeTo(flowMarginProtocolImpl.address);
    protocol = await TestFlowMarginProtocol2.at(
      flowMarginProtocolProxy.address,
    );
    await protocol.initialize(oracle.address, moneyMarket.address);

    await usd.approve(protocol.address, constants.MAX_UINT256, { from: alice });
    await usd.approve(protocol.address, constants.MAX_UINT256, { from: bob });
    await usd.approve(moneyMarket.address, constants.MAX_UINT256, {
      from: liquidityProvider,
    });

    const liquidityPoolImpl = await LiquidityPool.new();
    const liquidityPoolProxy = await Proxy.new();
    await liquidityPoolProxy.upgradeTo(liquidityPoolImpl.address);
    liquidityPool = await LiquidityPool.at(liquidityPoolProxy.address);
    await liquidityPool.initialize(moneyMarket.address, fromPip(10));

    await liquidityPool.approve(protocol.address, constants.MAX_UINT256);
    await liquidityPool.enableToken(eur);

    await moneyMarket.mintTo(liquidityPool.address, dollar(10000), {
      from: liquidityProvider,
    });

    await oracle.feedPrice(usd.address, fromPercent(100), { from: owner });
    await oracle.feedPrice(eur, fromPercent(120), { from: owner });
  });

  // eslint-disable-next-line
  const removeLastZeroes = (stringWithZeroes: string) => {
    let newString = stringWithZeroes;

    while (newString.endsWith('0')) {
      newString = newString.slice(0, -1);
    }

    return newString;
  };

  describe('unrealized profit loss', () => {
    beforeEach(async () => {
      const marginPairImpl = await MarginTradingPair.new();
      const marginPairProxy = await Proxy.new();
      await marginPairProxy.upgradeTo(marginPairImpl.address);
      pair = await MarginTradingPair.at(marginPairProxy.address);
      pair.initialize(
        protocol.address,
        moneyMarket.address,
        eur,
        10,
        fromPercent(70),
        dollar(5),
      );
    });

    it('should return correct unrealized PL at the beginning of a new position', async () => {
      const leverage = await Leverage.new();

      const askPrice = await protocol.getAskPrice.call(
        liquidityPool.address,
        usd.address,
        eur,
        0,
      );

      const bidPrice: BN = (await protocol.getBidPrice.call(
        liquidityPool.address,
        usd.address,
        eur,
        0,
      )) as any;

      const leveragedHeldInEuro = euro(100);
      const leveragedDebitsInWei = leveragedHeldInEuro.mul(askPrice);

      const unrealizedPl = await protocol.testUnrealizedPl.call(
        liquidityPool.address,
        usd.address,
        eur,
        leverage.address,
        leveragedHeldInEuro,
        leveragedDebitsInWei,
      );

      const expectedPl = leveragedHeldInEuro.mul(
        bidPrice.sub(leveragedDebitsInWei.div(leveragedHeldInEuro)),
      );

      expect(unrealizedPl).to.be.bignumber.equal(expectedPl);
    });

    it('should return correct unrealized PL after a profit', async () => {
      const leverage = await Leverage.new();

      const askPrice = await protocol.getAskPrice.call(
        liquidityPool.address,
        usd.address,
        eur,
        0,
      );

      const leveragedHeldInEuro = euro(100);
      const leveragedDebitsInWei = leveragedHeldInEuro.mul(askPrice);

      await oracle.feedPrice(eur, fromPercent(240), { from: owner });

      const newBidPrice: BN = (await protocol.getBidPrice.call(
        liquidityPool.address,
        usd.address,
        eur,
        0,
      )) as any;

      const unrealizedPl = await protocol.testUnrealizedPl.call(
        liquidityPool.address,
        usd.address,
        eur,
        leverage.address,
        leveragedHeldInEuro,
        leveragedDebitsInWei,
      );

      const expectedPl = leveragedHeldInEuro.mul(
        newBidPrice.sub(leveragedDebitsInWei.div(leveragedHeldInEuro)),
      );

      expect(unrealizedPl).to.be.bignumber.equal(expectedPl);
    });

    it('should return correct unrealized PL after a loss', async () => {
      const leverage = await Leverage.new();

      const askPrice = await protocol.getAskPrice.call(
        liquidityPool.address,
        usd.address,
        eur,
        0,
      );

      const leveragedHeldInEuro = euro(100);
      const leveragedDebitsInWei = leveragedHeldInEuro.mul(askPrice);

      await oracle.feedPrice(eur, fromPercent(60), { from: owner });

      const newBidPrice: BN = (await protocol.getBidPrice.call(
        liquidityPool.address,
        usd.address,
        eur,
        0,
      )) as any;

      const unrealizedPl = await protocol.testUnrealizedPl.call(
        liquidityPool.address,
        usd.address,
        eur,
        leverage.address,
        leveragedHeldInEuro,
        leveragedDebitsInWei,
      );

      const expectedPl = leveragedHeldInEuro.mul(
        newBidPrice.sub(leveragedDebitsInWei.div(leveragedHeldInEuro)),
      );

      expect(unrealizedPl).to.be.bignumber.equal(expectedPl);
    });
  });
});
