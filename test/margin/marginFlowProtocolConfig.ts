import { expectRevert } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import BN from 'bn.js';

import {
  SimplePriceOracleInstance,
  TestMarginFlowProtocolInstance,
  MarginFlowProtocolSafetyInstance,
  MarginFlowProtocolConfigInstance,
  MarginLiquidityPoolInstance,
  MarginLiquidityPoolRegistryInstance,
  TestTokenInstance,
  MoneyMarketInstance,
} from 'types/truffle-contracts';

import {
  createTestToken,
  createMoneyMarket,
  fromPercent,
  dollar,
  bn,
  messages,
} from '../helpers';

const Proxy = artifacts.require('Proxy');
const MarginMarketLib = (artifacts as any).require('MarginMarketLib');
const TestMarginFlowProtocol = artifacts.require('TestMarginFlowProtocol');
const MarginFlowProtocolConfig = artifacts.require('MarginFlowProtocolConfig');
const MarginFlowProtocolSafety = artifacts.require('MarginFlowProtocolSafety');
const MarginLiquidityPool = artifacts.require('MarginLiquidityPool');
const MarginLiquidityPoolRegistry = artifacts.require(
  'MarginLiquidityPoolRegistry',
);
const SimplePriceOracle = artifacts.require('SimplePriceOracle');

contract('MarginFlowProtocolConfig', accounts => {
  const owner = accounts[0];
  const liquidityProvider = accounts[1];
  const alice = accounts[2];
  const bob = accounts[3];
  const eur = accounts[4];
  const jpy = accounts[5];
  const laminarTreasury = accounts[6];

  let oracle: SimplePriceOracleInstance;
  let protocol: TestMarginFlowProtocolInstance;
  let protocolSafety: MarginFlowProtocolSafetyInstance;
  let protocolConfig: MarginFlowProtocolConfigInstance;
  let liquidityPoolRegistry: MarginLiquidityPoolRegistryInstance;
  let liquidityPool: MarginLiquidityPoolInstance;
  let usd: TestTokenInstance;
  let moneyMarket: MoneyMarketInstance;

  let initialSwapRateLong: BN;
  let initialSwapRateShort: BN;

  before(async () => {
    const marketLib = await MarginMarketLib.new();

    try {
      TestMarginFlowProtocol.link(MarginMarketLib);
    } catch (error) {
      // running in buidler, use instance
      TestMarginFlowProtocol.link(marketLib);
    }
  });

  beforeEach(async () => {
    const oracleImpl = await SimplePriceOracle.new();
    const oracleProxy = await Proxy.new();
    oracleProxy.upgradeTo(oracleImpl.address);

    oracle = await SimplePriceOracle.at(oracleProxy.address);
    await (oracle as any).initialize();

    oracle.addPriceFeeder(owner);
    await oracle.setOracleDeltaLastLimit(fromPercent(100));
    await oracle.setOracleDeltaSnapshotLimit(fromPercent(100));

    initialSwapRateLong = fromPercent(-2);
    initialSwapRateShort = fromPercent(-2);

    usd = await createTestToken(
      [liquidityProvider, dollar(50000)],
      [alice, dollar(10000)],
      [bob, dollar(10000)],
    );
    ({ moneyMarket } = await createMoneyMarket(usd.address, fromPercent(100)));

    const flowMarginProtocolImpl = await TestMarginFlowProtocol.new();
    const flowMarginProtocolProxy = await Proxy.new();
    await flowMarginProtocolProxy.upgradeTo(flowMarginProtocolImpl.address);
    protocol = await TestMarginFlowProtocol.at(flowMarginProtocolProxy.address);

    const flowMarginProtocolSafetyImpl = await MarginFlowProtocolSafety.new();
    const flowMarginProtocolSafetyProxy = await Proxy.new();
    await flowMarginProtocolSafetyProxy.upgradeTo(
      flowMarginProtocolSafetyImpl.address,
    );
    protocolSafety = await MarginFlowProtocolSafety.at(
      flowMarginProtocolSafetyProxy.address,
    );

    const flowMarginProtocolConfigImpl = await MarginFlowProtocolConfig.new();
    const flowMarginProtocolConfigProxy = await Proxy.new();
    await flowMarginProtocolConfigProxy.upgradeTo(
      flowMarginProtocolConfigImpl.address,
    );
    protocolConfig = await MarginFlowProtocolConfig.at(
      flowMarginProtocolConfigProxy.address,
    );

    const liquidityPoolRegistryImpl = await MarginLiquidityPoolRegistry.new();
    const liquidityPoolRegistryProxy = await Proxy.new();
    await liquidityPoolRegistryProxy.upgradeTo(
      liquidityPoolRegistryImpl.address,
    );
    liquidityPoolRegistry = await MarginLiquidityPoolRegistry.at(
      liquidityPoolRegistryProxy.address,
    );

    await (protocol as any).initialize( // eslint-disable-line
      oracle.address,
      moneyMarket.address,
      protocolConfig.address,
      protocolSafety.address,
      liquidityPoolRegistry.address,
    );
    await (protocolSafety as any).initialize(protocol.address, laminarTreasury);
    await (protocolConfig as any).initialize(
      dollar('0.1'),
      1,
      50,
      2,
      60 * 60 * 8, // 8 hours
      fromPercent(5),
      fromPercent(2),
      fromPercent(50),
      fromPercent(10),
      fromPercent(20),
      fromPercent(2),
    );

    await (liquidityPoolRegistry as any).initialize(
      moneyMarket.address,
      protocol.address,
    );

    const liquidityPoolImpl = await MarginLiquidityPool.new();
    const liquidityPoolProxy = await Proxy.new();
    await liquidityPoolProxy.upgradeTo(liquidityPoolImpl.address);
    liquidityPool = await MarginLiquidityPool.at(liquidityPoolProxy.address);
    await (liquidityPool as any).initialize(
      moneyMarket.address,
      protocol.address,
    );

    await usd.approve(liquidityPool.address, dollar(20000), {
      from: liquidityProvider,
    });
    await liquidityPool.depositLiquidity(dollar(20000), {
      from: liquidityProvider,
    });

    const feeSum = (
      await liquidityPoolRegistry.LIQUIDITY_POOL_LIQUIDATION_FEE()
    ).add(await liquidityPoolRegistry.LIQUIDITY_POOL_MARGIN_CALL_FEE());
    await usd.approve(liquidityPoolRegistry.address, feeSum, {
      from: liquidityProvider,
    });
    await liquidityPoolRegistry.registerPool(liquidityPool.address, {
      from: liquidityProvider,
    });
    await liquidityPoolRegistry.verifyPool(liquidityPool.address);
  });

  describe('when setting new parameters', () => {
    for (const setFunction of [
      'setTraderRiskMarginCallThreshold',
      'setTraderRiskLiquidateThreshold',
      'setLiquidityPoolENPMarginThreshold',
      'setLiquidityPoolELLMarginThreshold',
      'setLiquidityPoolENPLiquidateThreshold',
      'setLiquidityPoolELLLiquidateThreshold',
    ]) {
      describe(`when using ${setFunction}`, () => {
        let newParameter: BN;

        beforeEach(() => {
          newParameter = bn(123);
        });

        it('sets new parameter', async () => {
          await (protocolConfig as any)[setFunction](newParameter);

          const setParameter = setFunction
            .slice(3)
            .replace(/^\w/, c => c.toLowerCase());
          const newStoredParameter = await (protocolConfig as any)[
            setParameter
          ]();

          expect(newStoredParameter).to.be.bignumber.equals(newParameter);
        });

        it('allows only owner to set parameters', async () => {
          await expectRevert(
            (protocolConfig as any)[setFunction](newParameter, { from: alice }),
            messages.onlyOwner,
          );
        });

        it('does not allow zero values', async () => {
          await expectRevert(
            (protocolConfig as any)[setFunction](0),
            messages.settingZeroValueNotAllowed,
          );
        });
      });
    }
  });

  describe('when adding a trading pair', () => {
    it('sets trading pair as whitelisted', async () => {
      await protocolConfig.addTradingPair(
        eur,
        jpy,
        initialSwapRateLong,
        initialSwapRateShort,
      );

      expect(await protocolConfig.tradingPairWhitelist(eur, jpy)).to.be.true;
    });

    it('reverts when trading pair already whitelisted', async () => {
      await protocolConfig.addTradingPair(
        eur,
        jpy,
        initialSwapRateLong,
        initialSwapRateShort,
      );

      await expectRevert(
        protocolConfig.addTradingPair(
          eur,
          jpy,
          initialSwapRateLong,
          initialSwapRateShort,
        ),
        messages.tradingPairAlreadyWhitelisted,
      );
    });

    it('reverts when trading pair tokens are identical', async () => {
      await expectRevert(
        protocolConfig.addTradingPair(
          eur,
          eur,
          initialSwapRateLong,
          initialSwapRateShort,
        ),
        messages.tradingPairTokensMustBeDifferent,
      );
    });

    it('allows only owner to add a trading pair', async () => {
      await expectRevert(
        protocolConfig.addTradingPair(
          eur,
          jpy,
          initialSwapRateLong,
          initialSwapRateShort,
          {
            from: alice,
          },
        ),
        messages.onlyOwner,
      );
    });
  });

  describe('when using setCurrentSwapRate', () => {
    const LONG = '0';
    const SHORT = '1';
    let newSwapRateLong: BN;
    let newSwapRateShort: BN;

    beforeEach(() => {
      newSwapRateLong = bn(123);
      newSwapRateShort = bn(456);
    });

    it('sets new currentSwapRate', async () => {
      await protocolConfig.setCurrentSwapRateForPair(
        usd.address,
        eur,
        newSwapRateLong,
        newSwapRateShort,
      );
      const newStoredSwapRateLong = await protocolConfig.currentSwapRates(
        usd.address,
        eur,
        LONG,
      );
      const newStoredSwapRateShort = await protocolConfig.currentSwapRates(
        usd.address,
        eur,
        SHORT,
      );
      expect(newStoredSwapRateLong).to.be.bignumber.equals(newSwapRateLong);
      expect(newStoredSwapRateShort).to.be.bignumber.equals(newSwapRateShort);
    });

    it('allows only owner to set parameters', async () => {
      await expectRevert(
        protocolConfig.setCurrentSwapRateForPair(
          usd.address,
          eur,
          newSwapRateLong,
          newSwapRateShort,
          { from: alice },
        ),
        messages.onlyOwner,
      );
    });

    it('does not allow zero values', async () => {
      await expectRevert(
        protocolConfig.setCurrentSwapRateForPair(
          usd.address,
          eur,
          0,
          newSwapRateShort,
        ),
        messages.settingZeroValueNotAllowed,
      );

      await expectRevert(
        protocolConfig.setCurrentSwapRateForPair(
          usd.address,
          eur,
          newSwapRateLong,
          0,
        ),
        messages.settingZeroValueNotAllowed,
      );
    });
  });
});
