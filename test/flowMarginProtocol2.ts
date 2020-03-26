import { expectRevert, constants } from 'openzeppelin-test-helpers';
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
  fromEth,
  fromPercent,
  fromPip,
  dollar,
  euro,
  bn,
  messages,
} from './helpers';

const Proxy = artifacts.require('Proxy');
const TestFlowMarginProtocol2 = artifacts.require('TestFlowMarginProtocol2');
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

  let initialSwapRate: BN;
  let initialTraderRiskMarginCallThreshold: BN;
  let initialTraderRiskLiquidateThreshold: BN;
  let initialLiquidityPoolENPMarginThreshold: BN;
  let initialLiquidityPoolELLMarginThreshold: BN;
  let initialLiquidityPoolENPLiquidateThreshold: BN;
  let initialLiquidityPoolELLLiquidateThreshold: BN;

  beforeEach(async () => {
    const oracleImpl = await SimplePriceOracle.new();
    const oracleProxy = await Proxy.new();
    oracleProxy.upgradeTo(oracleImpl.address);

    oracle = await SimplePriceOracle.at(oracleProxy.address);
    await oracle.initialize();

    oracle.addPriceFeeder(owner);
    await oracle.setOracleDeltaLastLimit(fromPercent(100));
    await oracle.setOracleDeltaSnapshotLimit(fromPercent(100));

    initialSwapRate = bn(2);
    initialTraderRiskMarginCallThreshold = fromPercent(5);
    initialTraderRiskLiquidateThreshold = fromPercent(2);
    initialLiquidityPoolENPMarginThreshold = bn(4);
    initialLiquidityPoolELLMarginThreshold = bn(3);
    initialLiquidityPoolENPLiquidateThreshold = bn(2);
    initialLiquidityPoolELLLiquidateThreshold = bn(1);

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
    await (protocol as any).initialize(
      oracle.address,
      moneyMarket.address,
      initialSwapRate,
      initialTraderRiskMarginCallThreshold,
      initialTraderRiskLiquidateThreshold,
      initialLiquidityPoolENPMarginThreshold,
      initialLiquidityPoolELLMarginThreshold,
      initialLiquidityPoolENPLiquidateThreshold,
      initialLiquidityPoolELLLiquidateThreshold,
    );

    await usd.approve(protocol.address, constants.MAX_UINT256, { from: alice });
    await usd.approve(protocol.address, constants.MAX_UINT256, { from: bob });
    await usd.approve(moneyMarket.address, constants.MAX_UINT256, {
      from: liquidityProvider,
    });

    const liquidityPoolImpl = await LiquidityPool.new();
    const liquidityPoolProxy = await Proxy.new();
    await liquidityPoolProxy.upgradeTo(liquidityPoolImpl.address);
    liquidityPool = await LiquidityPool.at(liquidityPoolProxy.address);
    await (liquidityPool as any).initialize(
      moneyMarket.address,
      protocol.address,
      fromPip(10),
    );

    await liquidityPool.approve(protocol.address, constants.MAX_UINT256);
    await usd.approve(liquidityPool.address, constants.MAX_UINT256);
    await liquidityPool.enableToken(eur);
    await liquidityPool.depositLiquidity(dollar(10000));

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

  describe('when opening/closing a position', () => {
    let leverage: BN;
    let depositInUsd: BN;
    let leveragedHeldInEuro: BN;
    let price: BN;
    let traderBalanceBefore: BN;
    let positionId: BN;

    beforeEach(async () => {
      leverage = bn(20);
      depositInUsd = dollar(80);
      leveragedHeldInEuro = euro(100);
      price = bn(0); // accept all

      await protocol.deposit(liquidityPool.address, depositInUsd.toString(), {
        from: alice,
      });

      traderBalanceBefore = (await protocol.balances(
        liquidityPool.address,
        alice,
      )) as any;

      await protocol.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage.toString(),
        leveragedHeldInEuro.toString(),
        price.toString(),
        { from: alice },
      );

      positionId = ((await protocol.nextPositionId()) as any).sub(bn(1));
    });

    it('computes new balance correctly when immediately closing', async () => {
      const unrealizedPl = await protocol.getUnrealizedPlOfTrader.call(
        liquidityPool.address,
        alice,
      );
      await protocol.closePosition(positionId.toString(), price.toString(), {
        from: alice,
      });

      const traderBalanceAfter = await protocol.balances(
        liquidityPool.address,
        alice,
      );
      const traderBalanceDifference = (traderBalanceAfter as any).sub(
        traderBalanceBefore,
      );

      expect(traderBalanceDifference).to.be.bignumber.equal(unrealizedPl);
    });

    it('computes new balance correctly after a price drop', async () => {
      await oracle.feedPrice(eur, fromPercent(100), { from: owner });

      const unrealizedPl = await protocol.getUnrealizedPlOfTrader.call(
        liquidityPool.address,
        alice,
      );

      await protocol.closePosition(positionId.toString(), price.toString(), {
        from: alice,
      });

      const traderBalanceAfter = await protocol.balances(
        liquidityPool.address,
        alice,
      );
      const traderBalanceDifference = (traderBalanceAfter as any).sub(
        traderBalanceBefore,
      );

      expect(traderBalanceDifference).to.be.bignumber.equal(unrealizedPl);
    });

    it('computes new balance correctly after a price increase', async () => {
      await oracle.feedPrice(eur, fromPercent(200), { from: owner });

      const unrealizedPl = await protocol.getUnrealizedPlOfTrader.call(
        liquidityPool.address,
        alice,
      );
      await protocol.closePosition(positionId.toString(), price.toString(), {
        from: alice,
      });

      const traderBalanceAfter = await protocol.balances(
        liquidityPool.address,
        alice,
      );
      const traderBalanceDifference = (traderBalanceAfter as any).sub(
        traderBalanceBefore,
      );

      expect(traderBalanceDifference).to.be.bignumber.equal(unrealizedPl);
    });
  });

  describe('when margin calling a trader', () => {
    let leverage: BN;
    let depositInUsd: BN;
    let leveragedHeldInEuro: BN;
    let price: BN;
    let TRADER_MARGIN_CALL_FEE: BN;

    beforeEach(async () => {
      leverage = bn(20);
      depositInUsd = dollar(80);
      leveragedHeldInEuro = euro(100);
      price = bn(0); // accept all
      TRADER_MARGIN_CALL_FEE = (await protocol.TRADER_MARGIN_CALL_FEE()) as any;

      await protocol.deposit(liquidityPool.address, depositInUsd.toString(), {
        from: alice,
      });

      await protocol.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage.toString(),
        leveragedHeldInEuro.toString(),
        price.toString(),
        { from: alice },
      );
    });

    describe('when trader is below margin call threshold', () => {
      beforeEach(async () => {
        await oracle.feedPrice(eur, fromPercent(30), { from: owner });
      });

      it('allows margin calling of trader', async () => {
        try {
          await protocol.marginCallTrader(liquidityPool.address, alice, {
            from: bob,
          });
        } catch (error) {
          expect.fail(
            `Margin call transaction should not have been reverted: ${error}`,
          );
        }
      });

      it('sends fee back to caller', async () => {
        const balanceBefore = await usd.balanceOf(bob);
        await protocol.marginCallTrader(liquidityPool.address, alice, {
          from: bob,
        });
        const balanceAfter = await usd.balanceOf(bob);

        expect(balanceAfter).to.be.bignumber.equal(
          (balanceBefore as any).add(TRADER_MARGIN_CALL_FEE),
        );
      });

      it('does not allow margin calling twice', async () => {
        await protocol.marginCallTrader(liquidityPool.address, alice, {
          from: bob,
        });

        await expectRevert(
          protocol.marginCallTrader(liquidityPool.address, alice, {
            from: bob,
          }),
          messages.traderAlreadyMarginCalled,
        );
      });

      it('does not allow making safe calls', async () => {
        await protocol.marginCallTrader(liquidityPool.address, alice, {
          from: bob,
        });

        await expectRevert(
          protocol.makeTraderSafe(liquidityPool.address, alice, {
            from: alice,
          }),
          messages.traderCannotBeMadeSafe,
        );
      });

      describe('when margin called trader becomes safe again', () => {
        beforeEach(async () => {
          await protocol.marginCallTrader(liquidityPool.address, alice, {
            from: bob,
          });
          await oracle.feedPrice(eur, fromPercent(120), { from: owner });
        });

        it('allows making trader safe again', async () => {
          try {
            await protocol.makeTraderSafe(liquidityPool.address, alice, {
              from: bob,
            });
          } catch (error) {
            expect.fail(
              `Making safe transaction should not have been reverted: ${error}`,
            );
          }
        });

        it('requires to send back the TRADER_MARGIN_CALL_FEE', async () => {
          const balanceBefore = await usd.balanceOf(alice);
          await protocol.makeTraderSafe(liquidityPool.address, alice, {
            from: alice,
          });
          const balanceAfter = await usd.balanceOf(alice);

          expect(balanceAfter).to.be.bignumber.equal(
            (balanceBefore as any).sub(TRADER_MARGIN_CALL_FEE),
          );
        });

        it('does not allow making safe calls twice', async () => {
          await protocol.makeTraderSafe(liquidityPool.address, alice, {
            from: alice,
          });

          await expectRevert(
            protocol.makeTraderSafe(liquidityPool.address, alice, {
              from: alice,
            }),
            messages.traderNotMarginCalled,
          );
        });
      });
    });

    describe('when trader is above margin call threshold', () => {
      it('does not allow margin calling of trader', async () => {
        await expectRevert(
          protocol.marginCallTrader(liquidityPool.address, alice, {
            from: bob,
          }),
          messages.traderCannotBeMarginCalled,
        );
      });
    });
  });

  describe('when computing unrealized profit loss', () => {
    const itComputesPlWithLeverageCorrectly = (leverage: BN) => {
      let askPrice: BN;
      let bidPrice: BN;
      let leveragedHeldInEuro: BN;
      let leveragedDebits: BN;

      beforeEach(async () => {
        askPrice = (await protocol.getAskPrice.call(
          liquidityPool.address,
          usd.address,
          eur,
          0,
        )) as any;

        bidPrice = (await protocol.getBidPrice.call(
          liquidityPool.address,
          usd.address,
          eur,
          0,
        )) as any;

        leveragedHeldInEuro = euro(100);
        leveragedDebits = fromEth(
          leveragedHeldInEuro.mul(leverage.gte(bn(0)) ? askPrice : bidPrice),
        );
      });

      it('should return correct unrealized PL at the beginning of a new position', async () => {
        const unrealizedPl = await protocol.testUnrealizedPl.call(
          liquidityPool.address,
          usd.address,
          eur,
          leverage.toString(),
          leveragedHeldInEuro.toString(),
          leveragedDebits.toString(),
        );
        const currentPrice = leverage.gte(bn(0)) ? bidPrice : askPrice;
        const openPrice = leveragedDebits
          .mul(bn(1e18))
          .div(leveragedHeldInEuro);
        // unrealizedPlOfPosition = (currentPrice - openPrice) * leveragedHeld * to_usd_price
        const expectedPl = fromEth(
          currentPrice.sub(openPrice).mul(leveragedHeldInEuro),
        );

        expect(unrealizedPl).to.be.bignumber.equal(expectedPl);
      });

      it('should return correct unrealized PL after a profit', async () => {
        await oracle.feedPrice(eur, fromPercent(240), { from: owner });

        const newPrice: BN = (await protocol[
          leverage.gte(bn(0)) ? 'getBidPrice' : 'getAskPrice'
        ].call(liquidityPool.address, usd.address, eur, 0)) as any;

        const unrealizedPl = await protocol.testUnrealizedPl.call(
          liquidityPool.address,
          usd.address,
          eur,
          leverage.toString(),
          leveragedHeldInEuro.toString(),
          leveragedDebits.toString(),
        );
        const openPrice = leveragedDebits
          .mul(bn(1e18))
          .div(leveragedHeldInEuro);
        // unrealizedPlOfPosition = (currentPrice - openPrice) * leveragedHeld * to_usd_price
        const expectedPl = fromEth(
          newPrice.sub(openPrice).mul(leveragedHeldInEuro),
        );

        expect(unrealizedPl).to.be.bignumber.equal(expectedPl);
      });

      it('should return correct unrealized PL after a loss', async () => {
        await oracle.feedPrice(eur, fromPercent(60), { from: owner });

        const newPrice: BN = (await protocol[
          leverage.gte(bn(0)) ? 'getBidPrice' : 'getAskPrice'
        ].call(liquidityPool.address, usd.address, eur, 0)) as any;

        const unrealizedPl = await protocol.testUnrealizedPl.call(
          liquidityPool.address,
          usd.address,
          eur,
          leverage.toString(),
          leveragedHeldInEuro.toString(),
          leveragedDebits.toString(),
        );
        const openPrice = leveragedDebits
          .mul(bn(1e18))
          .div(leveragedHeldInEuro);
        // unrealizedPlOfPosition = (currentPrice - openPrice) * leveragedHeld * to_usd_price
        const expectedPl = fromEth(
          newPrice.sub(openPrice).mul(leveragedHeldInEuro),
        );

        expect(unrealizedPl).to.be.bignumber.equal(expectedPl);
      });
    };

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

    describe('when given a long position', () => {
      itComputesPlWithLeverageCorrectly(bn(20));
    });

    describe('when given a short position', () => {
      itComputesPlWithLeverageCorrectly(bn(-20));
    });
  });
});
