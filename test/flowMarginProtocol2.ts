import { expectRevert, constants, time } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import BN from 'bn.js';

import {
  SimplePriceOracleInstance,
  TestFlowMarginProtocol1Instance,
  TestFlowMarginProtocol2Instance,
  LiquidityPoolInstance,
  TestTokenInstance,
  MarginTradingPairInstance,
  MoneyMarketInstance,
  IERC20Instance,
} from 'types/truffle-contracts';
import {
  convertFromBaseToken,
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
const TestFlowMarginProtocol1 = artifacts.require('TestFlowMarginProtocol1');
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
  let protocol1: TestFlowMarginProtocol1Instance;
  let protocol2: TestFlowMarginProtocol2Instance;
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
    initialLiquidityPoolENPMarginThreshold = fromPercent(50);
    initialLiquidityPoolELLMarginThreshold = fromPercent(10);
    initialLiquidityPoolENPLiquidateThreshold = fromPercent(20);
    initialLiquidityPoolELLLiquidateThreshold = fromPercent(2);

    usd = await createTestToken(
      [liquidityProvider, dollar(20000)],
      [alice, dollar(10000)],
      [bob, dollar(10000)],
    );
    ({ moneyMarket, iToken: iUsd } = await createMoneyMarket(
      usd.address,
      fromPercent(100),
    ));

    const flowMarginProtocolImpl1 = await TestFlowMarginProtocol1.new();
    const flowMarginProtocolImpl2 = await TestFlowMarginProtocol2.new();
    const flowMarginProtocolProxy1 = await Proxy.new();
    const flowMarginProtocolProxy2 = await Proxy.new();

    await flowMarginProtocolProxy1.upgradeTo(flowMarginProtocolImpl1.address);
    await flowMarginProtocolProxy2.upgradeTo(flowMarginProtocolImpl2.address);
    protocol1 = await TestFlowMarginProtocol1.at(
      flowMarginProtocolProxy1.address,
    );
    await (protocol1 as any).initialize(
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

    protocol2 = await TestFlowMarginProtocol2.at(
      flowMarginProtocolProxy2.address,
    );
    await (protocol2 as any).initialize(
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

    await usd.approve(protocol1.address, constants.MAX_UINT256, {
      from: alice,
    });
    await usd.approve(protocol1.address, constants.MAX_UINT256, { from: bob });
    await usd.approve(protocol2.address, constants.MAX_UINT256, {
      from: alice,
    });
    await usd.approve(protocol2.address, constants.MAX_UINT256, { from: bob });
    await usd.approve(moneyMarket.address, constants.MAX_UINT256, {
      from: liquidityProvider,
    });

    const liquidityPoolImpl = await LiquidityPool.new();
    const liquidityPoolProxy = await Proxy.new();
    await liquidityPoolProxy.upgradeTo(liquidityPoolImpl.address);
    liquidityPool = await LiquidityPool.at(liquidityPoolProxy.address);
    await (liquidityPool as any).initialize(
      moneyMarket.address,
      protocol1.address,
      fromPip(10),
    );

    await liquidityPool.approve(protocol1.address, constants.MAX_UINT256);
    await usd.approve(liquidityPool.address, constants.MAX_UINT256);
    await liquidityPool.enableToken(eur);

    await usd.approve(liquidityPool.address, dollar(10000), {
      from: liquidityProvider,
    });
    await liquidityPool.depositLiquidity(dollar(10000), {
      from: liquidityProvider,
    });

    const feeSum = ((await protocol1.LIQUIDITY_POOL_LIQUIDATION_FEE()) as any).add(
      await protocol1.LIQUIDITY_POOL_MARGIN_CALL_FEE(),
    );
    await usd.approve(protocol1.address, feeSum, {
      from: liquidityProvider,
    });
    await usd.approve(protocol2.address, feeSum, {
      from: liquidityProvider,
    });
    await protocol1.registerPool(liquidityPool.address, {
      from: liquidityProvider,
    });
    await protocol1.verifyPool(liquidityPool.address);
    await protocol2.registerPool(liquidityPool.address, {
      from: liquidityProvider,
    });
    await protocol2.verifyPool(liquidityPool.address);

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

      await protocol1.deposit(liquidityPool.address, depositInUsd.toString(), {
        from: alice,
      });

      traderBalanceBefore = (await protocol1.balances(
        liquidityPool.address,
        alice,
      )) as any;

      await protocol1.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage.toString(),
        leveragedHeldInEuro.toString(),
        price.toString(),
        { from: alice },
      );

      positionId = ((await protocol1.nextPositionId()) as any).sub(bn(1));
    });

    it('computes new balance correctly when immediately closing', async () => {
      const unrealizedPl = await protocol1.getUnrealizedPlOfTrader.call(
        liquidityPool.address,
        alice,
      );
      await protocol1.closePosition(positionId.toString(), price.toString(), {
        from: alice,
      });

      const traderBalanceAfter = await protocol1.balances(
        liquidityPool.address,
        alice,
      );
      const traderBalanceDifference = (traderBalanceAfter as any).sub(
        traderBalanceBefore,
      );

      expect(traderBalanceDifference).to.be.bignumber.equal(
        convertFromBaseToken(unrealizedPl.toString()),
      );
    });

    it('computes new balance correctly after a price drop', async () => {
      await oracle.feedPrice(eur, fromPercent(100), { from: owner });

      const unrealizedPl = await protocol1.getUnrealizedPlOfTrader.call(
        liquidityPool.address,
        alice,
      );

      await protocol1.closePosition(positionId.toString(), price.toString(), {
        from: alice,
      });

      const traderBalanceAfter = await protocol1.balances(
        liquidityPool.address,
        alice,
      );
      const traderBalanceDifference = (traderBalanceAfter as any).sub(
        traderBalanceBefore,
      );

      expect(traderBalanceDifference).to.be.bignumber.equal(
        convertFromBaseToken(unrealizedPl.toString()),
      );
    });

    it('computes new balance correctly after a price increase', async () => {
      await oracle.feedPrice(eur, fromPercent(200), { from: owner });

      const unrealizedPl = await protocol1.getUnrealizedPlOfTrader.call(
        liquidityPool.address,
        alice,
      );
      await protocol1.closePosition(positionId.toString(), price.toString(), {
        from: alice,
      });

      const traderBalanceAfter = await protocol1.balances(
        liquidityPool.address,
        alice,
      );
      const traderBalanceDifference = (traderBalanceAfter as any).sub(
        traderBalanceBefore,
      );

      expect(traderBalanceDifference).to.be.bignumber.equal(
        convertFromBaseToken(unrealizedPl.toString()),
      );
    });
  });

  describe.skip('when margin calling a trader', () => {
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
      TRADER_MARGIN_CALL_FEE = (await protocol1.TRADER_MARGIN_CALL_FEE()) as any;

      await protocol1.deposit(liquidityPool.address, depositInUsd.toString(), {
        from: alice,
      });

      await protocol1.openPosition(
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
          await protocol1.marginCallTrader(liquidityPool.address, alice, {
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
        await protocol1.marginCallTrader(liquidityPool.address, alice, {
          from: bob,
        });
        const balanceAfter = await usd.balanceOf(bob);

        expect(balanceAfter).to.be.bignumber.equal(
          (balanceBefore as any).add(TRADER_MARGIN_CALL_FEE),
        );
      });

      it('does not allow margin calling twice', async () => {
        await protocol1.marginCallTrader(liquidityPool.address, alice, {
          from: bob,
        });

        await expectRevert(
          protocol1.marginCallTrader(liquidityPool.address, alice, {
            from: bob,
          }),
          messages.traderAlreadyMarginCalled,
        );
      });

      it('does not allow making safe calls', async () => {
        await protocol1.marginCallTrader(liquidityPool.address, alice, {
          from: bob,
        });

        await expectRevert(
          protocol1.makeTraderSafe(liquidityPool.address, alice, {
            from: alice,
          }),
          messages.traderCannotBeMadeSafe,
        );
      });

      describe('when margin called trader becomes safe again', () => {
        beforeEach(async () => {
          await protocol1.marginCallTrader(liquidityPool.address, alice, {
            from: bob,
          });
          await oracle.feedPrice(eur, fromPercent(120), { from: owner });
        });

        it('allows making trader safe again', async () => {
          try {
            await protocol1.makeTraderSafe(liquidityPool.address, alice, {
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
          await protocol1.makeTraderSafe(liquidityPool.address, alice, {
            from: alice,
          });
          const balanceAfter = await usd.balanceOf(alice);

          expect(balanceAfter).to.be.bignumber.equal(
            (balanceBefore as any).sub(TRADER_MARGIN_CALL_FEE),
          );
        });

        it('does not allow making safe calls twice', async () => {
          await protocol1.makeTraderSafe(liquidityPool.address, alice, {
            from: alice,
          });

          await expectRevert(
            protocol1.makeTraderSafe(liquidityPool.address, alice, {
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
          protocol1.marginCallTrader(liquidityPool.address, alice, {
            from: bob,
          }),
          messages.traderCannotBeMarginCalled,
        );
      });
    });
  });

  describe.skip('when margin calling a pool', () => {
    let leverage: BN;
    let depositInUsd: BN;
    let leveragedHeldInEuro: BN;
    let price: BN;
    let LIQUIDITY_POOL_MARGIN_CALL_FEE: BN;

    beforeEach(async () => {
      leverage = bn(20);
      depositInUsd = dollar(80);
      leveragedHeldInEuro = euro(100);
      price = bn(0); // accept all
      LIQUIDITY_POOL_MARGIN_CALL_FEE = (await protocol1.LIQUIDITY_POOL_MARGIN_CALL_FEE()) as any;

      await protocol1.deposit(liquidityPool.address, depositInUsd.toString(), {
        from: alice,
      });

      await protocol1.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage.toString(),
        leveragedHeldInEuro.toString(),
        price.toString(),
        { from: alice },
      );
    });

    describe('when pool is below margin call threshold', () => {
      beforeEach(async () => {
        await liquidityPool.withdrawLiquidityOwner(dollar(99500));
      });

      it('allows margin calling of pool', async () => {
        try {
          await protocol1.marginCallLiquidityPool(liquidityPool.address, {
            from: bob,
          });
        } catch (error) {
          console.log(error);
          expect.fail(
            `Margin call transaction should not have been reverted: ${error}`,
          );
        }
      });

      it('sends fee back to caller', async () => {
        const balanceBefore = await usd.balanceOf(bob);
        await protocol1.marginCallLiquidityPool(liquidityPool.address, {
          from: bob,
        });
        const balanceAfter = await usd.balanceOf(bob);

        expect(balanceAfter).to.be.bignumber.equal(
          (balanceBefore as any).add(LIQUIDITY_POOL_MARGIN_CALL_FEE),
        );
      });

      it('does not allow margin calling twice', async () => {
        await protocol1.marginCallLiquidityPool(liquidityPool.address, {
          from: bob,
        });

        await expectRevert(
          protocol1.marginCallLiquidityPool(liquidityPool.address, {
            from: bob,
          }),
          messages.poolAlreadyMarginCalled,
        );
      });

      it('does not allow making safe calls', async () => {
        await protocol1.marginCallLiquidityPool(liquidityPool.address, {
          from: bob,
        });

        await expectRevert(
          protocol1.makeLiquidityPoolSafe(liquidityPool.address, {
            from: alice,
          }),
          messages.poolCannotBeMadeSafe,
        );
      });

      describe('when margin called pool becomes safe again', () => {
        beforeEach(async () => {
          await protocol1.marginCallLiquidityPool(liquidityPool.address, {
            from: bob,
          });

          await usd.approve(liquidityPool.address, dollar(5000), {
            from: liquidityProvider,
          });
          await liquidityPool.depositLiquidity(dollar(5000), {
            from: liquidityProvider,
          });
        });

        it('allows making pool safe again', async () => {
          try {
            await protocol1.makeLiquidityPoolSafe(liquidityPool.address, {
              from: bob,
            });
          } catch (error) {
            expect.fail(
              `Making safe transaction should not have been reverted: ${error}`,
            );
          }
        });

        it('requires to send back the LIQUIDITY_POOL_MARGIN_CALL_FEE', async () => {
          const balanceBefore = await usd.balanceOf(alice);
          await protocol1.makeLiquidityPoolSafe(liquidityPool.address, {
            from: alice,
          });
          const balanceAfter = await usd.balanceOf(alice);

          expect(balanceAfter).to.be.bignumber.equal(
            (balanceBefore as any).sub(LIQUIDITY_POOL_MARGIN_CALL_FEE),
          );
        });

        it('does not allow making safe calls twice', async () => {
          await protocol1.makeLiquidityPoolSafe(liquidityPool.address, {
            from: alice,
          });

          await expectRevert(
            protocol1.makeLiquidityPoolSafe(liquidityPool.address, {
              from: alice,
            }),
            messages.poolNotMarginCalled,
          );
        });
      });
    });

    describe('when pool is above margin call threshold', () => {
      it('does not allow margin calling of pool', async () => {
        await expectRevert(
          protocol1.marginCallLiquidityPool(liquidityPool.address, {
            from: bob,
          }),
          messages.poolCannotBeMarginCalled,
        );
      });
    });
  });

  const insertPositions = async (positionCount: number, trader: string) => {
    for (let i = 0; i < positionCount / 2; i += 1) {
      // console.log(`Open Position ${i}`);
      const leverage = bn(20).mul(i % 2 === 0 ? bn(1) : bn(-1));
      const leveragedHeldInEuro = euro(2);
      await protocol1.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage.toString(),
        leveragedHeldInEuro.toString(),
        0,
        { from: trader },
      );
    }
  };

  describe.skip('when checking the trader safety', () => {
    beforeEach(async () => {
      await protocol1.deposit(liquidityPool.address, dollar(1000).toString(), {
        from: alice,
      });
      await protocol1.deposit(liquidityPool.address, dollar(1000).toString(), {
        from: bob,
      });
    });

    describe('when the trader has 5 positions', () => {
      beforeEach(async function testSetup() {
        await insertPositions(5, alice);
      });

      it('returns if trader is safe', async () => {
        const isSafe = await protocol1.getIsPoolSafe.call(
          liquidityPool.address,
        );
        await protocol1.getIsTraderSafe(liquidityPool.address, alice);

        expect(isSafe).to.be.true;
      });
    });

    describe('when the trader has 25 positions', () => {
      beforeEach(async function testSetup() {
        this.timeout(0);

        await insertPositions(25, alice);
      });

      it.skip('returns if trader is safe', async () => {
        const isSafe = await protocol1.getIsPoolSafe.call(
          liquidityPool.address,
        );
        await protocol1.getIsTraderSafe(liquidityPool.address, alice);

        expect(isSafe).to.be.true;
      }).timeout(0);
    });

    describe('when the trader has 50 positions', () => {
      beforeEach(async function testSetup() {
        this.timeout(0);

        await insertPositions(50, alice);
      });

      it.skip('returns if pool is safe', async () => {
        const isSafe = await protocol1.getIsPoolSafe.call(
          liquidityPool.address,
        );
        await protocol1.getIsTraderSafe(liquidityPool.address, alice);

        expect(isSafe).to.be.true;
      }).timeout(0);
    });
  });

  describe.skip('when checking the pool safety', () => {
    beforeEach(async () => {
      await protocol1.deposit(liquidityPool.address, dollar(1000).toString(), {
        from: alice,
      });
      await protocol1.deposit(liquidityPool.address, dollar(1000).toString(), {
        from: bob,
      });
    });

    describe('when the pool has 10 positions', () => {
      beforeEach(async function testSetup() {
        await insertPositions(5, alice);
        await insertPositions(5, bob);
      });

      it('returns if pool is safe', async () => {
        const isSafe = await protocol1.getIsPoolSafe.call(
          liquidityPool.address,
        );
        await protocol1.getIsPoolSafe(liquidityPool.address);

        expect(isSafe).to.be.true;
      });
    });

    describe('when the pool has 50 positions', () => {
      beforeEach(async function testSetup() {
        this.timeout(0);

        await insertPositions(25, alice);
        await insertPositions(25, bob);
      });

      it.skip('returns if pool is safe', async () => {
        const isSafe = await protocol1.getIsPoolSafe.call(
          liquidityPool.address,
        );
        await protocol1.getIsPoolSafe(liquidityPool.address);

        expect(isSafe).to.be.true;
      }).timeout(0);
    });

    describe('when the pool has 100 positions', () => {
      beforeEach(async function testSetup() {
        this.timeout(0);

        await insertPositions(50, alice);
        await insertPositions(50, bob);
      });

      it.skip('returns if pool is safe', async () => {
        const isSafe = await protocol1.getIsPoolSafe.call(
          liquidityPool.address,
        );
        await protocol1.getIsPoolSafe(liquidityPool.address);

        expect(isSafe).to.be.true;
      }).timeout(0);
    });
  });

  describe('when computing unrealized profit loss along with market price', () => {
    const itComputesPlWithLeverageCorrectly = (leverage: BN) => {
      let askPrice: BN;
      let bidPrice: BN;
      let leveragedHeldInEuro: BN;
      let leveragedDebits: BN;
      let maxPrice: BN;

      beforeEach(async () => {
        askPrice = (await protocol1.getAskPrice.call(
          liquidityPool.address,
          usd.address,
          eur,
          0,
        )) as any;

        bidPrice = (await protocol1.getBidPrice.call(
          liquidityPool.address,
          usd.address,
          eur,
          0,
        )) as any;

        leveragedHeldInEuro = euro(100);
        leveragedDebits = fromEth(
          leveragedHeldInEuro.mul(leverage.gte(bn(0)) ? askPrice : bidPrice),
        );
        maxPrice = bn(0);
      });

      it('should return correct unrealized PL at the beginning of a new position', async () => {
        const unrealizedPl = await protocol1.getUnrealizedPlAndMarketPriceOfPosition.call(
          liquidityPool.address,
          usd.address,
          eur,
          leverage.toString(),
          leveragedHeldInEuro.toString(),
          leveragedDebits.toString(),
          maxPrice.toString(),
        );
        const currentPrice = leverage.gte(bn(0)) ? bidPrice : askPrice;
        const openPrice = leveragedDebits
          .mul(bn(1e18))
          .div(leveragedHeldInEuro);
        // unrealizedPlOfPosition = (currentPrice - openPrice) * leveragedHeld * to_usd_price
        const expectedPl = fromEth(
          currentPrice.sub(openPrice).mul(leveragedHeldInEuro),
        );

        expect(unrealizedPl['0']).to.be.bignumber.equal(expectedPl);
        expect(unrealizedPl['1']).to.be.bignumber.equal(currentPrice);
      });

      it('should return correct unrealized PL after a profit', async () => {
        await oracle.feedPrice(eur, fromPercent(240), { from: owner });

        const newPrice: BN = (await protocol1[
          leverage.gte(bn(0)) ? 'getBidPrice' : 'getAskPrice'
        ].call(liquidityPool.address, usd.address, eur, 0)) as any;

        const unrealizedPl = await protocol1.getUnrealizedPlAndMarketPriceOfPosition.call(
          liquidityPool.address,
          usd.address,
          eur,
          leverage.toString(),
          leveragedHeldInEuro.toString(),
          leveragedDebits.toString(),
          maxPrice.toString(),
        );
        const openPrice = leveragedDebits
          .mul(bn(1e18))
          .div(leveragedHeldInEuro);
        // unrealizedPlOfPosition = (currentPrice - openPrice) * leveragedHeld * to_usd_price
        const expectedPl = fromEth(
          newPrice.sub(openPrice).mul(leveragedHeldInEuro),
        );

        expect(unrealizedPl['0']).to.be.bignumber.equal(expectedPl);
        expect(unrealizedPl['1']).to.be.bignumber.equal(newPrice);
      });

      it('should return correct unrealized PL after a loss', async () => {
        await oracle.feedPrice(eur, fromPercent(60), { from: owner });

        const newPrice: BN = (await protocol1[
          leverage.gte(bn(0)) ? 'getBidPrice' : 'getAskPrice'
        ].call(liquidityPool.address, usd.address, eur, 0)) as any;

        const unrealizedPl = await protocol1.getUnrealizedPlAndMarketPriceOfPosition.call(
          liquidityPool.address,
          usd.address,
          eur,
          leverage.toString(),
          leveragedHeldInEuro.toString(),
          leveragedDebits.toString(),
          maxPrice.toString(),
        );
        const openPrice = leveragedDebits
          .mul(bn(1e18))
          .div(leveragedHeldInEuro);
        // unrealizedPlOfPosition = (currentPrice - openPrice) * leveragedHeld * to_usd_price
        const expectedPl = fromEth(
          newPrice.sub(openPrice).mul(leveragedHeldInEuro),
        );

        expect(unrealizedPl['0']).to.be.bignumber.equal(expectedPl);
        expect(unrealizedPl['1']).to.be.bignumber.equal(newPrice);
      });
    };

    beforeEach(async () => {
      const marginPairImpl = await MarginTradingPair.new();
      const marginPairProxy = await Proxy.new();
      await marginPairProxy.upgradeTo(marginPairImpl.address);
      pair = await MarginTradingPair.at(marginPairProxy.address);
      pair.initialize(
        protocol1.address,
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

  describe('when computing unrealized profit loss of trader', () => {
    let askPrice: BN;
    let bidPrice: BN;
    let leveragedHeldInEuro1: BN;
    let leveragedHeldInEuro2: BN;
    let leveragedDebits1: BN;
    let leveragedDebits2: BN;
    let leverage1: BN;
    let leverage2: BN;

    beforeEach(async () => {
      const marginPairImpl = await MarginTradingPair.new();
      const marginPairProxy = await Proxy.new();
      await marginPairProxy.upgradeTo(marginPairImpl.address);
      pair = await MarginTradingPair.at(marginPairProxy.address);
      pair.initialize(
        protocol1.address,
        moneyMarket.address,
        eur,
        10,
        fromPercent(70),
        dollar(5),
      );

      askPrice = (await protocol1.getAskPrice.call(
        liquidityPool.address,
        usd.address,
        eur,
        0,
      )) as any;

      bidPrice = (await protocol1.getBidPrice.call(
        liquidityPool.address,
        usd.address,
        eur,
        0,
      )) as any;

      leveragedHeldInEuro1 = euro(100);
      leveragedHeldInEuro2 = euro(100);
      leverage1 = bn(20);
      leverage2 = bn(-20);
      leveragedDebits1 = fromEth(
        leveragedHeldInEuro1.mul(leverage1.gte(bn(0)) ? askPrice : bidPrice),
      );
      leveragedDebits2 = fromEth(
        leveragedHeldInEuro2.mul(leverage2.gte(bn(0)) ? askPrice : bidPrice),
      );

      await protocol1.deposit(liquidityPool.address, dollar(1000), {
        from: alice,
      });

      await protocol1.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage1.toString(),
        leveragedHeldInEuro1.toString(),
        0,
        { from: alice },
      );
      await protocol1.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage2.toString(),
        leveragedHeldInEuro2.toString(),
        0,
        { from: alice },
      );
    });

    it('should return correct unrealized PL at the beginning of a new position', async () => {
      const unrealizedPl = await protocol1.getUnrealizedPlOfTrader.call(
        liquidityPool.address,
        alice,
      );
      const currentPrice1 = leverage1.gte(bn(0)) ? bidPrice : askPrice;
      const currentPrice2 = leverage2.gte(bn(0)) ? bidPrice : askPrice;
      const openPrice1 = leveragedDebits1
        .mul(bn(1e18))
        .div(leveragedHeldInEuro1);
      const openPrice2 = leveragedDebits2
        .mul(bn(1e18))
        .div(leveragedHeldInEuro2);
      // unrealizedPlOfPosition = (currentPrice - openPrice) * leveragedHeld * to_usd_price
      const priceDelta1 = leverage1.gte(bn(0))
        ? currentPrice1.sub(openPrice1)
        : openPrice1.sub(currentPrice1);
      const priceDelta2 = leverage2.gte(bn(0))
        ? currentPrice2.sub(openPrice2)
        : openPrice2.sub(currentPrice2);
      const expectedPl1 = fromEth(priceDelta1.mul(leveragedHeldInEuro1));
      const expectedPl2 = fromEth(priceDelta2.mul(leveragedHeldInEuro2));

      expect(unrealizedPl).to.be.bignumber.equal(expectedPl1.add(expectedPl2));
    });

    it('should return correct unrealized PL after a profit', async () => {
      await oracle.feedPrice(eur, fromPercent(240), { from: owner });

      const unrealizedPl = await protocol1.getUnrealizedPlOfTrader.call(
        liquidityPool.address,
        alice,
      );
      const newPrice1: BN = (await protocol1[
        leverage1.gte(bn(0)) ? 'getBidPrice' : 'getAskPrice'
      ].call(liquidityPool.address, usd.address, eur, 0)) as any;
      const newPrice2: BN = (await protocol1[
        leverage2.gte(bn(0)) ? 'getBidPrice' : 'getAskPrice'
      ].call(liquidityPool.address, usd.address, eur, 0)) as any;
      const openPrice1 = leveragedDebits1
        .mul(bn(1e18))
        .div(leveragedHeldInEuro1);
      const openPrice2 = leveragedDebits2
        .mul(bn(1e18))
        .div(leveragedHeldInEuro2);
      // unrealizedPlOfPosition = (currentPrice - openPrice) * leveragedHeld * to_usd_price
      const priceDelta1 = leverage1.gte(bn(0))
        ? newPrice1.sub(openPrice1)
        : openPrice1.sub(newPrice1);
      const priceDelta2 = leverage2.gte(bn(0))
        ? newPrice2.sub(openPrice2)
        : openPrice2.sub(newPrice2);
      const expectedPl1 = fromEth(priceDelta1.mul(leveragedHeldInEuro1));
      const expectedPl2 = fromEth(priceDelta2.mul(leveragedHeldInEuro2));

      expect(unrealizedPl).to.be.bignumber.equal(expectedPl1.add(expectedPl2));
    });

    it('should return correct unrealized PL after a loss', async () => {
      await oracle.feedPrice(eur, fromPercent(60), { from: owner });

      const unrealizedPl = await protocol1.getUnrealizedPlOfTrader.call(
        liquidityPool.address,
        alice,
      );
      const newPrice1: BN = (await protocol1[
        leverage1.gte(bn(0)) ? 'getBidPrice' : 'getAskPrice'
      ].call(liquidityPool.address, usd.address, eur, 0)) as any;
      const newPrice2: BN = (await protocol1[
        leverage2.gte(bn(0)) ? 'getBidPrice' : 'getAskPrice'
      ].call(liquidityPool.address, usd.address, eur, 0)) as any;
      const openPrice1 = leveragedDebits1
        .mul(bn(1e18))
        .div(leveragedHeldInEuro1);
      const openPrice2 = leveragedDebits2
        .mul(bn(1e18))
        .div(leveragedHeldInEuro2);
      // unrealizedPlOfPosition = (currentPrice - openPrice) * leveragedHeld * to_usd_price
      const priceDelta1 = leverage1.gte(bn(0))
        ? newPrice1.sub(openPrice1)
        : openPrice1.sub(newPrice1);
      const priceDelta2 = leverage2.gte(bn(0))
        ? newPrice2.sub(openPrice2)
        : openPrice2.sub(newPrice2);
      const expectedPl1 = fromEth(priceDelta1.mul(leveragedHeldInEuro1));
      const expectedPl2 = fromEth(priceDelta2.mul(leveragedHeldInEuro2));

      expect(unrealizedPl).to.be.bignumber.equal(expectedPl1.add(expectedPl2));
    });
  });

  describe('when computing the accumulated swap rate', () => {
    it('should return the correct accumulated swap rate', async () => {
      const daysOfPosition = 20;
      const ageOfPosition = time.duration.days(daysOfPosition);
      const swapRate = bn(5);
      const timeWhenOpened = (await time.latest()).sub(ageOfPosition);
      const accSwapRate = await protocol1.getAccumulatedSwapRateOfPosition(
        swapRate,
        timeWhenOpened,
      );

      const expectedAccSwapRate = swapRate.mul(bn(daysOfPosition));

      expect(accSwapRate).to.be.bignumber.equal(expectedAccSwapRate);
    });

    it('counts only full days', async () => {
      const daysOfPosition = 20;
      const ageOfPosition = time.duration
        .days(daysOfPosition)
        .sub(time.duration.seconds(5));
      const swapRate = bn(5);
      const timeWhenOpened = (await time.latest()).sub(ageOfPosition);
      const accSwapRate = await protocol1.getAccumulatedSwapRateOfPosition(
        swapRate,
        timeWhenOpened,
      );

      const expectedAccSwapRate = swapRate.mul(bn(daysOfPosition - 1));
      expect(accSwapRate).to.be.bignumber.equal(expectedAccSwapRate);
    });
  });

  describe('when using internal helper functions', () => {
    let leveragedHeld1: BN;
    let leveragedHeld2: BN;
    let leverage1: BN;
    let leverage2: BN;
    let initialAskPrice: BN;
    let initialBidPrice: BN;

    beforeEach(async () => {
      await protocol2.deposit(liquidityPool.address, dollar(1000), {
        from: alice,
      });
      await protocol2.deposit(liquidityPool.address, dollar(1000), {
        from: bob,
      });

      initialAskPrice = (await protocol1.getAskPrice.call(
        liquidityPool.address,
        usd.address,
        eur,
        0,
      )) as any;

      initialBidPrice = (await protocol1.getBidPrice.call(
        liquidityPool.address,
        usd.address,
        eur,
        0,
      )) as any;

      leveragedHeld1 = euro(10);
      leveragedHeld2 = euro(5);
      leverage1 = bn(20);
      leverage2 = bn(-20);

      await protocol2.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage1.toString(),
        leveragedHeld1.toString(),
        0,
        { from: alice },
      );
      await protocol2.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage2.toString(),
        leveragedHeld2.toString(),
        0,
        { from: alice },
      );
      await protocol2.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        20,
        euro(2),
        0,
        { from: bob },
      );
    });

    describe('when removing a position from the lists', () => {
      it('should remove the correct position from all lists', async () => {
        const positionsByPoolBefore = await protocol2.getPositionsByPool(
          liquidityPool.address,
          constants.ZERO_ADDRESS,
        );
        const positionsByAliceBefore = await protocol2.getPositionsByPool(
          liquidityPool.address,
          alice,
        );
        const positionsByBobBefore = await protocol2.getPositionsByPool(
          liquidityPool.address,
          bob,
        );

        await protocol2.removePositionFromPoolList(liquidityPool.address, 1, {
          from: alice,
        });

        const positionsByPoolAfter = await protocol2.getPositionsByPool(
          liquidityPool.address,
          constants.ZERO_ADDRESS,
        );
        const positionsByAliceAfter = await protocol2.getPositionsByPool(
          liquidityPool.address,
          alice,
        );
        const positionsByBobAfter = await protocol2.getPositionsByPool(
          liquidityPool.address,
          bob,
        );

        positionsByPoolBefore.splice(1, 1);
        positionsByAliceBefore.splice(1, 1);

        expect(positionsByPoolAfter).to.eql(positionsByPoolBefore);
        expect(positionsByAliceAfter).to.eql(positionsByAliceBefore);
        expect(positionsByBobAfter).to.eql(positionsByBobBefore);
      });
    });

    describe('when getting accumulated leveraged debits of a trader', () => {
      it('should return the correct value', async () => {
        const leveragedDebits = await protocol2.getLeveragedDebitsOfTrader(
          liquidityPool.address,
          alice,
        );

        const leveragedDebit1 = fromEth(
          leveragedHeld1.mul(
            leverage1.isNeg() ? initialBidPrice : initialAskPrice,
          ),
        );
        const leveragedDebit2 = fromEth(
          leveragedHeld2.mul(
            leverage2.isNeg() ? initialBidPrice : initialAskPrice,
          ),
        );
        const expectedLeveragedDebits = leveragedDebit1.add(leveragedDebit2);

        expect(leveragedDebits).to.be.bignumber.equal(expectedLeveragedDebits);
      });
    });

    describe('when getting accumulated swap rates of all positions from a trader', () => {
      it('should return the correct value', async () => {
        const alicePositionCount = bn(2);
        const daysOfPosition = 5;
        await time.increase(time.duration.days(daysOfPosition));

        const accSwapRates = await protocol2.getSwapRatesOfTrader(
          liquidityPool.address,
          alice,
        );

        const expectedAccSwapRate = initialSwapRate
          .mul(bn(daysOfPosition))
          .mul(alicePositionCount);

        expect(accSwapRates).to.be.bignumber.equal(expectedAccSwapRate);
      });
    });
  });

  describe('when getting the latest price', () => {
    it('should return the correct latest price', async () => {
      const price1 = await protocol2.getPrice.call(usd.address, eur);
      const price2 = await protocol2.getPrice.call(eur, usd.address);

      expect(price1).to.be.bignumber.equal(fromPercent(120));
      expect(price2).to.be.bignumber.equal(bn('833333333333333333'));
    });
  });

  describe('when getting the value in USD', () => {
    it('should return the correct USD value', async () => {
      const value = bn(120);
      const usdValue = await protocol1.getUsdValue.call(eur, value);

      expect(usdValue).to.be.bignumber.equal(bn(120 * 1.2));
    });

    it('should be identical when passing USD', async () => {
      const value = bn(120);
      const usdValue = await protocol1.getUsdValue.call(usd.address, value);

      expect(usdValue).to.be.bignumber.equal(value);
    });
  });
});
