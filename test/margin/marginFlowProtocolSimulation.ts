import BN from 'bn.js';
import Web3 from 'web3';

import {time} from 'openzeppelin-test-helpers';

import {
  SimplePriceOracleInstance,
  TestMarginFlowProtocolInstance,
  MarginFlowProtocolSafetyInstance,
  MarginFlowProtocolLiquidatedInstance,
  MarginFlowProtocolAccPositionsInstance,
  MarginFlowProtocolConfigInstance,
  MarginLiquidityPoolInstance,
  MarginLiquidityPoolRegistryInstance,
  TestTokenInstance,
  MoneyMarketInstance,
  Ierc20Instance,
} from 'types/truffle-contracts';

import {
  createTestToken,
  createMoneyMarket,
  fromPercent,
  dollar,
  bn,
  createMarginProtocol,
} from '../helpers';

const web3 = new Web3('http://localhost:8545');

const Proxy = artifacts.require('Proxy');
const MarginMarketLib = (artifacts as any).require('MarginMarketLib');
const TestMarginFlowProtocol = artifacts.require('TestMarginFlowProtocol');
const MarginFlowProtocolSafety = artifacts.require('MarginFlowProtocolSafety');
const MarginFlowProtocolLiquidated = artifacts.require(
  'MarginFlowProtocolLiquidated',
);
const MarginFlowProtocolAccPositions = artifacts.require(
  'MarginFlowProtocolAccPositions',
);
const SimplePriceOracle = artifacts.require('SimplePriceOracle');

contract('MarginFlowProtocol', (accounts) => {
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
  let protocolLiquidated: MarginFlowProtocolLiquidatedInstance;
  let protocolAccPositions: MarginFlowProtocolAccPositionsInstance;
  let protocolConfig: MarginFlowProtocolConfigInstance;
  let liquidityPoolRegistry: MarginLiquidityPoolRegistryInstance;
  let liquidityPool: MarginLiquidityPoolInstance;
  let usd: TestTokenInstance;
  let iUsd: Ierc20Instance; // eslint-disable-line
  let moneyMarket: MoneyMarketInstance;

  let initialSpread: BN;
  let initialUsdPrice: BN;
  let initialEurPrice: BN;
  let initialJpyPrice: BN;

  let initialSwapRateLong: BN;
  let initialSwapRateShort: BN;

  let maxGasUsedOpenPosition = 0;
  let maxGasUsedIsTraderSafe = 0;

  before(async () => {
    const marketLib = await MarginMarketLib.new();

    try {
      TestMarginFlowProtocol.link(MarginMarketLib);
      MarginFlowProtocolAccPositions.link(MarginMarketLib);
      MarginFlowProtocolLiquidated.link(MarginMarketLib);
      MarginFlowProtocolSafety.link(MarginMarketLib);
    } catch (error) {
      // running in buidler, use instance
      TestMarginFlowProtocol.link(marketLib);
      MarginFlowProtocolAccPositions.link(marketLib);
      MarginFlowProtocolLiquidated.link(marketLib);
      MarginFlowProtocolSafety.link(marketLib);
    }
  });

  beforeEach(async () => {
    const oracleImpl = await SimplePriceOracle.new();
    const oracleProxy = await Proxy.new();
    await oracleProxy.upgradeTo(oracleImpl.address);

    oracle = await SimplePriceOracle.at(oracleProxy.address);
    await (oracle as any).initialize();

    await oracle.addPriceFeeder(owner);

    await oracle.setOracleDeltaLastLimit(fromPercent(10000));
    await oracle.setOracleDeltaSnapshotLimit(fromPercent(10000));
    await oracle.setExpireIn(time.duration.days(1));

    initialSpread = bn(28152000000000);
    initialUsdPrice = fromPercent(100);
    initialEurPrice = fromPercent(120);
    initialJpyPrice = fromPercent(200);
    initialSwapRateLong = fromPercent(-2);
    initialSwapRateShort = fromPercent(-2);

    usd = await createTestToken(
      [owner, dollar(1000000)],
      [liquidityProvider, dollar(50000)],
      [alice, dollar(10000)],
      [bob, dollar(10000)],
    );
    ({moneyMarket, iToken: iUsd} = await createMoneyMarket(
      usd.address,
      fromPercent(100),
    ));

    const marginProtocolContract = await createMarginProtocol(
      TestMarginFlowProtocol,
      MarginFlowProtocolAccPositions,
      MarginFlowProtocolLiquidated,
      MarginFlowProtocolSafety,
      oracle,
      moneyMarket,
      laminarTreasury,
      usd,
      liquidityProvider,
      alice,
      bob,
      eur,
      jpy,
      initialSpread,
      initialSwapRateLong,
      initialSwapRateShort,
    );

    protocol = marginProtocolContract.protocol;
    protocolConfig = marginProtocolContract.protocolConfig;
    protocolLiquidated = marginProtocolContract.protocolLiquidated;
    protocolSafety = marginProtocolContract.protocolSafety;
    protocolAccPositions = marginProtocolContract.protocolAccPositions;
    liquidityPoolRegistry = marginProtocolContract.liquidityPoolRegistry;
    liquidityPool = marginProtocolContract.liquidityPool;

    await oracle.feedPrice(usd.address, initialUsdPrice, {
      from: owner,
    });
    await oracle.feedPrice(eur, initialEurPrice, {from: owner});
    await oracle.feedPrice(jpy, initialJpyPrice, {from: owner});
  });

  const setupTradingPairs = async (tradingPairCount: number) => {
    const tradingPairs = [];

    for (let i = 0; i < tradingPairCount; i += 1) {
      const base = web3.eth.accounts.create(Date.now().toString()).address;
      const quote = web3.eth.accounts.create((Date.now() + 1).toString())
        .address;

      await protocolConfig.addTradingPair(
        base,
        quote,
        60 * 60 * 8, // 8 hours
        fromPercent(1),
        fromPercent(-1),
      );

      await liquidityPool.enableToken(base, quote, initialSpread, 0);
      await oracle.feedPrice(base, fromPercent(150), {from: owner});
      await oracle.feedPrice(quote, fromPercent(80), {from: owner});

      tradingPairs.push({base, quote});
    }

    return tradingPairs;
  };

  const openPositions = async ({
    tradingPair,
    traders,
    leverages,
    leveragedHelds,
  }: {
    tradingPair: {base: string; quote: string};
    traders: string[];
    leverages: BN[];
    leveragedHelds: BN[];
  }) => {
    for (const [i, trader] of traders.entries()) {
      const totalDeposit = (await protocolConfig.poolLiquidationDeposit())
        .add(await protocolConfig.poolMarginCallDeposit())
        .add(dollar(10000));
      await usd.transfer(trader, totalDeposit);
      await usd.approve(protocol.address, totalDeposit, {
        from: trader,
      });
      await protocol.deposit(liquidityPool.address, dollar(10000), {
        from: trader,
      });

      for (let j = 0; j < 1; j += 1) {
        const receipt = await protocol.openPosition(
          liquidityPool.address,
          tradingPair.base,
          tradingPair.quote,
          leverages[i],
          leveragedHelds[i],
          0,
          {from: trader},
        );

        if (receipt.receipt.gasUsed > maxGasUsedOpenPosition)
          maxGasUsedOpenPosition = receipt.receipt.gasUsed;
      }
    }
  };

  describe('margin trading simulation', () => {
    it.skip('simulates the margin trading', async function test() {
      this.timeout(5000000);

      const tradingPairsCount = 25;
      const traderCount = 2;

      const tradingPairs = await setupTradingPairs(tradingPairsCount);
      const traders = accounts.slice(10, 10 + traderCount);
      const leverages = Array(traderCount).fill(bn(20));
      const leveragedHelds = Array(traderCount).fill(dollar(2000));

      for (const tradingPair of tradingPairs) {
        await openPositions({
          tradingPair,
          traders,
          leverages,
          leveragedHelds,
        });
      }

      for (const trader of traders) {
        const receipt = await protocolSafety.isTraderSafe(
          liquidityPool.address,
          trader,
        );
        if (receipt.receipt.gasUsed > maxGasUsedIsTraderSafe)
          maxGasUsedIsTraderSafe = receipt.receipt.gasUsed;
      }

      const closePositionGasUsed = (
        await protocol.closePosition(3, 3, 3, 0, {
          from: traders[1],
        })
      ).receipt.gasUsed;

      const gasUsedIsPoolSafe = (
        await protocolSafety.isPoolSafe(liquidityPool.address)
      ).receipt.gasUsed;

      await protocolConfig.setTraderRiskMarginCallThreshold(dollar(10000));
      const marginCallTraderGasUsed = (
        await protocolSafety.marginCallTrader(liquidityPool.address, traders[0])
      ).receipt.gasUsed;

      await protocolConfig.setTraderRiskLiquidateThreshold(dollar(10000));
      const liquidateTraderGasUsed = (
        await protocolSafety.liquidateTrader(liquidityPool.address, traders[0])
      ).receipt.gasUsed;

      /* const positionsByPool = await protocol.getPositionsByPool(
        liquidityPool.address,
      );
      const positionsByTrader = await protocol.getPositionsByPoolAndTrader(
        liquidityPool.address,
        alice,
      );
      const estimatedIndexPool = positionsByPool.findIndex(
        (position) => position.id.toString() === (0).toString(),
      );
      const estimatedIndexTrader = positionsByTrader.findIndex(
        (position) => position.id.toString() === (0).toString(),
      ); */

      const forceCloseLiquidatedTraderGasUsed = (
        await protocolLiquidated.closePositionForLiquidatedTrader(0, 0, 0, {
          from: traders[0],
        })
      ).receipt.gasUsed;

      await protocolConfig.setLiquidityPoolELLMarginThreshold(dollar(10000));
      const marginCallPoolGasUsed = (
        await protocolSafety.marginCallLiquidityPool(liquidityPool.address)
      ).receipt.gasUsed;

      await protocolConfig.setLiquidityPoolELLLiquidateThreshold(dollar(10000));
      const liquidatePoolGasUsed = (
        await protocolSafety.liquidateLiquidityPool(liquidityPool.address)
      ).receipt.gasUsed;

      const forceCloseLiquidatedPoolGasUsed = (
        await protocolLiquidated.closePositionForLiquidatedPool(1, 0, 0, {
          from: traders[1],
        })
      ).receipt.gasUsed;

      console.log({
        maxGasUsedOpenPosition,
        closePositionGasUsed,
        maxGasUsedIsTraderSafe,
        gasUsedIsPoolSafe,
        marginCallTraderGasUsed,
        liquidateTraderGasUsed,
        marginCallPoolGasUsed,
        liquidatePoolGasUsed,
        forceCloseLiquidatedTraderGasUsed,
        forceCloseLiquidatedPoolGasUsed,
      });
    });
  });
});
