import { expectRevert, constants, time } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import BN from 'bn.js';

import {
  SimplePriceOracleInstance,
  TestMarginFlowProtocolInstance,
  MarginFlowProtocolSafetyInstance,
  MarginFlowProtocolLiquidatedInstance,
  MarginFlowProtocolConfigInstance,
  MarginLiquidityPoolInstance,
  MarginLiquidityPoolRegistryInstance,
  TestTokenInstance,
  MoneyMarketInstance,
  Ierc20Instance,
} from 'types/truffle-contracts';

import {
  convertToBaseToken,
  createTestToken,
  createMoneyMarket,
  fromEth,
  fromPercent,
  dollar,
  yen,
  euro,
  bn,
  messages,
  convertFromBaseToken,
} from '../helpers';

const Proxy = artifacts.require('Proxy');
const TestMarginFlowProtocol = artifacts.require('TestMarginFlowProtocol');
const MarginMarketLib = (artifacts as any).require('MarginMarketLib');
const MarginFlowProtocolSafety = artifacts.require('MarginFlowProtocolSafety');
const MarginFlowProtocolLiquidated = artifacts.require(
  'MarginFlowProtocolLiquidated',
);
const MarginFlowProtocolConfig = artifacts.require('MarginFlowProtocolConfig');
const MarginLiquidityPool = artifacts.require('MarginLiquidityPool');
const MarginLiquidityPoolRegistry = artifacts.require(
  'MarginLiquidityPoolRegistry',
);
const SimplePriceOracle = artifacts.require('SimplePriceOracle');

contract('MarginFlowProtocolSafety', accounts => {
  const owner = accounts[0];
  const liquidityProvider = accounts[1];
  const alice = accounts[2];
  const bob = accounts[3];
  const charlie = accounts[4];
  const eur = accounts[5];
  const jpy = accounts[6];
  const laminarTreasury = accounts[7];

  let oracle: SimplePriceOracleInstance;
  let protocol: TestMarginFlowProtocolInstance;
  let protocolSafety: MarginFlowProtocolSafetyInstance;
  let protocolLiquidated: MarginFlowProtocolLiquidatedInstance;
  let protocolConfig: MarginFlowProtocolConfigInstance;
  let liquidityPoolRegistry: MarginLiquidityPoolRegistryInstance;
  let liquidityPool: MarginLiquidityPoolInstance;
  let usd: TestTokenInstance;
  let iUsd: Ierc20Instance; // eslint-disable-line
  let moneyMarket: MoneyMarketInstance;

  let initialSpread: BN;
  let initialUsdPrice: BN;
  let initialEurPrice: BN;

  let initialTraderRiskMarginCallThreshold: BN;
  let initialTraderRiskLiquidateThreshold: BN;
  let initialLiquidityPoolENPMarginThreshold: BN;
  let initialLiquidityPoolELLMarginThreshold: BN;
  let initialLiquidityPoolENPLiquidateThreshold: BN;
  let initialLiquidityPoolELLLiquidateThreshold: BN;

  let leveragedHeldsEur: [BN, BN, BN, BN];
  let leveragesEur: [BN, BN, BN, BN];
  let leveragedHeldsJpy: [BN, BN, BN, BN];
  let leveragesJpy: [BN, BN, BN, BN];
  let leveragedHeldBob: BN;
  let leverageBob: BN;
  let initialAskPrice: BN;
  let initialBidPrice: BN;
  let initialAskPriceJpy: BN;
  let initialBidPriceJpy: BN;

  before(async () => {
    const marketLib = await MarginMarketLib.new();

    try {
      TestMarginFlowProtocol.link(MarginMarketLib);
      MarginFlowProtocolLiquidated.link(MarginMarketLib);
      MarginFlowProtocolSafety.link(MarginMarketLib);
    } catch (error) {
      // running in buidler, use instance
      TestMarginFlowProtocol.link(marketLib);
      MarginFlowProtocolLiquidated.link(marketLib);
      MarginFlowProtocolSafety.link(marketLib);
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

    initialSpread = bn(28152000000000);
    initialUsdPrice = fromPercent(100);
    initialEurPrice = fromPercent(120);

    initialTraderRiskMarginCallThreshold = fromPercent(3);
    initialTraderRiskLiquidateThreshold = fromPercent(1);
    initialLiquidityPoolENPMarginThreshold = fromPercent(30);
    initialLiquidityPoolELLMarginThreshold = fromPercent(10);
    initialLiquidityPoolENPLiquidateThreshold = fromPercent(30);
    initialLiquidityPoolELLLiquidateThreshold = fromPercent(1);

    usd = await createTestToken(
      [liquidityProvider, dollar(50000)],
      [alice, dollar(10000)],
      [bob, dollar(10000)],
      [charlie, dollar(10000)],
    );
    ({ moneyMarket, iToken: iUsd } = await createMoneyMarket(
      usd.address,
      fromPercent(100),
    ));

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

    const flowMarginProtocolLiquidatedImpl = await MarginFlowProtocolLiquidated.new();
    const flowMarginProtocolLiquidatedProxy = await Proxy.new();
    await flowMarginProtocolLiquidatedProxy.upgradeTo(
      flowMarginProtocolLiquidatedImpl.address,
    );
    protocolLiquidated = await MarginFlowProtocolLiquidated.at(
      flowMarginProtocolLiquidatedProxy.address,
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
      protocolLiquidated.address,
      liquidityPoolRegistry.address,
    );
    const market = await protocol.market();
    await (protocolSafety as any).initialize(market, laminarTreasury);
    await (protocolConfig as any).initialize(
      dollar('0.1'),
      initialTraderRiskMarginCallThreshold,
      initialTraderRiskLiquidateThreshold,
      initialLiquidityPoolENPMarginThreshold,
      initialLiquidityPoolELLMarginThreshold,
      initialLiquidityPoolENPLiquidateThreshold,
      initialLiquidityPoolELLLiquidateThreshold,
    );

    await (protocolLiquidated as any).methods[
      'initialize((address,address,address,address,address,address,address,address))'
    ](market);
    await (liquidityPoolRegistry as any).methods[
      'initialize((address,address,address,address,address,address,address,address))'
    ](market);

    await usd.approve(protocol.address, constants.MAX_UINT256, {
      from: alice,
    });
    await usd.approve(protocol.address, constants.MAX_UINT256, {
      from: bob,
    });
    await usd.approve(protocolSafety.address, constants.MAX_UINT256, {
      from: alice,
    });
    await usd.approve(protocolSafety.address, constants.MAX_UINT256, {
      from: bob,
    });
    await usd.approve(moneyMarket.address, constants.MAX_UINT256, {
      from: liquidityProvider,
    });

    const liquidityPoolImpl = await MarginLiquidityPool.new();
    const liquidityPoolProxy = await Proxy.new();
    await liquidityPoolProxy.upgradeTo(liquidityPoolImpl.address);
    liquidityPool = await MarginLiquidityPool.at(liquidityPoolProxy.address);
    await (liquidityPool as any).initialize(
      moneyMarket.address,
      protocol.address, // need 3 pools or only use first one for withdraw tests
      1,
      50,
      2,
    );

    await liquidityPool.approveToProtocol(constants.MAX_UINT256);
    await usd.approve(liquidityPool.address, constants.MAX_UINT256);
    await liquidityPool.enableToken(usd.address, eur, initialSpread, 0);
    await liquidityPool.enableToken(eur, usd.address, initialSpread, 0);

    await usd.approve(liquidityPool.address, dollar(20000), {
      from: liquidityProvider,
    });
    await liquidityPool.depositLiquidity(dollar(20000), {
      from: liquidityProvider,
    });

    const feeSum = (await protocolConfig.poolLiquidationDeposit()).add(
      await protocolConfig.poolMarginCallDeposit(),
    );
    await usd.approve(liquidityPoolRegistry.address, feeSum, {
      from: liquidityProvider,
    });
    await liquidityPoolRegistry.registerPool(liquidityPool.address, {
      from: liquidityProvider,
    });
    await liquidityPoolRegistry.verifyPool(liquidityPool.address);
    await protocolConfig.addTradingPair(
      usd.address,
      eur,
      60 * 60 * 8, // 8 hours
      fromPercent(-2),
      fromPercent(-2),
    );

    await protocolSafety.payTraderDeposits(liquidityPool.address, {
      from: alice,
    });
    await protocolSafety.payTraderDeposits(liquidityPool.address, {
      from: bob,
    });

    await oracle.feedPrice(usd.address, initialUsdPrice, {
      from: owner,
    });
    await oracle.feedPrice(eur, initialEurPrice, { from: owner });
  });

  const setUpMultipleTradingPairPositions = async () => {
    await liquidityPool.enableToken(eur, jpy, initialSpread, 0);
    await liquidityPool.enableToken(jpy, eur, initialSpread, 0);
    await oracle.feedPrice(jpy, fromPercent(200), { from: owner });

    await protocolConfig.addTradingPair(
      eur,
      jpy,
      60 * 60 * 8, // 8 hours
      fromPercent(1),
      fromPercent(-1),
    );

    await protocol.deposit(liquidityPool.address, dollar(1000), {
      from: alice,
    });
    await protocol.deposit(liquidityPool.address, dollar(1000), {
      from: bob,
    });

    initialAskPrice = await protocol.getAskPrice.call(
      liquidityPool.address,
      usd.address,
      eur,
      0,
    );
    initialBidPrice = await protocol.getBidPrice.call(
      liquidityPool.address,
      usd.address,
      eur,
      0,
    );
    initialAskPriceJpy = await protocol.getAskPrice.call(
      liquidityPool.address,
      eur,
      jpy,
      0,
    );
    initialBidPriceJpy = await protocol.getBidPrice.call(
      liquidityPool.address,
      eur,
      jpy,
      0,
    );

    leveragedHeldsEur = [euro(10), euro(5), euro(2), euro(20)];
    leveragesEur = [bn(20), bn(-20), bn(20), bn(5)];
    leveragedHeldsJpy = [yen(10), yen(1), yen(2), yen(20)];
    leveragesJpy = [bn(20), bn(-50), bn(1), bn(5)];
    leveragedHeldBob = euro(30);
    leverageBob = bn(30);

    for (let i = 0; i < leveragedHeldsEur.length; i += 1) {
      await protocol.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leveragesEur[i],
        leveragedHeldsEur[i],
        0,
        { from: alice },
      );
      await protocol.openPosition(
        liquidityPool.address,
        eur,
        jpy,
        leveragesJpy[i],
        leveragedHeldsJpy[i],
        0,
        { from: alice },
      );
    }
    await protocol.openPosition(
      liquidityPool.address,
      usd.address,
      eur,
      leverageBob,
      leveragedHeldBob,
      0,
      { from: bob },
    );

    await oracle.feedPrice(jpy, fromPercent(150), { from: owner });
    await oracle.feedPrice(eur, fromPercent(140), { from: owner });
  };

  describe('when trader pays the fees', () => {
    it('transfers fees to the protocol', async () => {
      const marginCallFee = await protocolConfig.traderMarginCallDeposit();
      const liquidationFee = await protocolConfig.traderLiquidationDeposit();

      const traderBalanceBefore = await usd.balanceOf(charlie);

      await usd.approve(
        protocolSafety.address,
        marginCallFee.add(liquidationFee),
        { from: charlie },
      );
      await protocolSafety.payTraderDeposits(liquidityPool.address, {
        from: charlie,
      });

      const traderBalanceAfter = await usd.balanceOf(charlie);

      expect(
        await protocolSafety.traderHasPaidDeposits(
          liquidityPool.address,
          charlie,
        ),
      ).to.be.true;
      expect(traderBalanceAfter).to.be.bignumber.equal(
        traderBalanceBefore.sub(marginCallFee).sub(liquidationFee),
      );
    });
  });

  describe('when trader withdraws the fees', () => {
    it('transfers fees back to trader', async () => {
      const marginCallFee = await protocolConfig.traderMarginCallDeposit();
      const liquidationFee = await protocolConfig.traderLiquidationDeposit();

      const traderBalanceBefore = await usd.balanceOf(alice);

      await protocolSafety.withdrawTraderDeposits(liquidityPool.address, {
        from: alice,
      });

      const traderBalanceAfter = await usd.balanceOf(alice);

      expect(
        await protocolSafety.traderHasPaidDeposits(
          liquidityPool.address,
          alice,
        ),
      ).to.be.false;
      expect(traderBalanceAfter).to.be.bignumber.equal(
        traderBalanceBefore.add(marginCallFee).add(liquidationFee),
      );
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
      TRADER_MARGIN_CALL_FEE = await protocolConfig.traderMarginCallDeposit();

      await protocol.deposit(liquidityPool.address, depositInUsd, {
        from: alice,
      });

      await protocol.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage,
        leveragedHeldInEuro,
        price,
        { from: alice },
      );
    });

    describe('when trader is below margin call threshold', () => {
      beforeEach(async () => {
        await oracle.setOracleDeltaLastLimit(dollar(1000000));
        await oracle.setOracleDeltaSnapshotLimit(dollar(1000000));
        await oracle.feedPrice(eur, fromPercent(10000), { from: owner });
      });

      it('allows margin calling of trader', async () => {
        try {
          await protocolSafety.marginCallTrader(liquidityPool.address, alice, {
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
        await protocolSafety.marginCallTrader(liquidityPool.address, alice, {
          from: bob,
        });
        const balanceAfter = await usd.balanceOf(bob);

        expect(balanceAfter).to.be.bignumber.equal(
          balanceBefore.add(TRADER_MARGIN_CALL_FEE),
        );
      });

      it('does not allow margin calling twice', async () => {
        await protocolSafety.marginCallTrader(liquidityPool.address, alice, {
          from: bob,
        });

        await expectRevert(
          protocolSafety.marginCallTrader(liquidityPool.address, alice, {
            from: bob,
          }),
          messages.traderAlreadyMarginCalled,
        );
      });

      it('does not allow making safe calls', async () => {
        await protocolSafety.marginCallTrader(liquidityPool.address, alice, {
          from: bob,
        });

        await expectRevert(
          protocolSafety.makeTraderSafe(liquidityPool.address, alice, {
            from: alice,
          }),
          messages.traderCannotBeMadeSafe,
        );
      });

      describe('when margin called trader wants to open new position', () => {
        beforeEach(async () => {
          await protocolSafety.marginCallTrader(liquidityPool.address, alice, {
            from: bob,
          });
        });

        it('reverts the transaction', async () => {
          await expectRevert(
            protocol.openPosition(
              liquidityPool.address,
              usd.address,
              eur,
              20,
              euro(5),
              0,
              { from: alice },
            ),
            messages.traderIsMarginCalled,
          );
        });
      });

      describe('when margin called trader becomes safe again', () => {
        beforeEach(async () => {
          await protocolSafety.marginCallTrader(liquidityPool.address, alice, {
            from: bob,
          });
          await oracle.feedPrice(eur, fromPercent(120), { from: owner });
        });

        it('allows making trader safe again', async () => {
          try {
            await protocolSafety.makeTraderSafe(liquidityPool.address, alice, {
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
          await protocolSafety.makeTraderSafe(liquidityPool.address, alice, {
            from: alice,
          });
          const balanceAfter = await usd.balanceOf(alice);

          expect(balanceAfter).to.be.bignumber.equal(
            balanceBefore.sub(TRADER_MARGIN_CALL_FEE),
          );
        });

        it('does not allow making safe calls twice', async () => {
          await protocolSafety.makeTraderSafe(liquidityPool.address, alice, {
            from: alice,
          });

          await expectRevert(
            protocolSafety.makeTraderSafe(liquidityPool.address, alice, {
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
          protocolSafety.marginCallTrader(liquidityPool.address, alice, {
            from: bob,
          }),
          messages.traderCannotBeMarginCalled,
        );
      });
    });
  });

  describe('when liquidating a trader', () => {
    let leverage: BN;
    let depositInUsd: BN;
    let leveragedHeldInEuro: BN;
    let price: BN;
    let TRADER_LIQUIDATION_FEE: BN;

    beforeEach(async () => {
      leverage = bn(20);
      depositInUsd = dollar(80);
      leveragedHeldInEuro = euro(100);
      price = bn(0); // accept all
      TRADER_LIQUIDATION_FEE = await protocolConfig.traderLiquidationDeposit();

      await protocol.deposit(liquidityPool.address, depositInUsd, {
        from: alice,
      });

      await protocol.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage,
        leveragedHeldInEuro,
        price,
        { from: alice },
      );
    });

    describe('when trader is below liquidation threshold', () => {
      beforeEach(async () => {
        await oracle.setOracleDeltaLastLimit(dollar(1000000));
        await oracle.setOracleDeltaSnapshotLimit(dollar(1000000));
        await oracle.feedPrice(eur, fromPercent(10000), { from: owner });
      });

      it('allows liquidating of trader', async () => {
        try {
          await protocolSafety.liquidateTrader(liquidityPool.address, alice, {
            from: bob,
          });
        } catch (error) {
          console.log({ error });
          expect.fail(
            `Liquidation transaction should not have been reverted: ${error}`,
          );
        }
      });

      it('sends fee back to caller', async () => {
        const balanceBefore = await usd.balanceOf(bob);
        await protocolSafety.liquidateTrader(liquidityPool.address, alice, {
          from: bob,
        });
        const balanceAfter = await usd.balanceOf(bob);

        expect(balanceAfter).to.be.bignumber.equal(
          balanceBefore.add(TRADER_LIQUIDATION_FEE),
        );
      });

      it('does not allow liquidating twice', async () => {
        await protocolSafety.liquidateTrader(liquidityPool.address, alice, {
          from: bob,
        });

        await expectRevert(
          protocolSafety.liquidateTrader(liquidityPool.address, alice, {
            from: bob,
          }),
          messages.traderAlreadyLiquidated,
        );
      });

      it('stops trader from opening positions', async () => {
        await protocolSafety.liquidateTrader(liquidityPool.address, alice, {
          from: bob,
        });
        await protocol.deposit(liquidityPool.address, 1000, {
          from: alice,
        });

        await expectRevert(
          protocol.openPosition(
            liquidityPool.address,
            usd.address,
            eur,
            1,
            100,
            price,
            { from: alice },
          ),
          messages.traderLiquidated,
        );
      });
    });

    describe('when trader is above liquidation threshold', () => {
      it('does not allow liquidating of trader', async () => {
        await expectRevert(
          protocolSafety.liquidateTrader(liquidityPool.address, alice, {
            from: bob,
          }),
          messages.traderCannotBeLiquidated,
        );
      });

      it('does not allow calling force close position', async () => {
        await expectRevert(
          protocolLiquidated.closePositionForLiquidatedTrader(9, {
            from: bob,
          }),
          messages.onlyForLiquidatedPoolsOrTraders,
        );
      });
    });

    describe('when trader is liquidated', () => {
      let unrealizedAlice: BN[];
      let swapRatesAlice: BN[];
      let orderedPositonsProfitFirst: number[];

      beforeEach(async () => {
        await setUpMultipleTradingPairPositions();
        await oracle.setOracleDeltaLastLimit(dollar(1000000));
        await oracle.setOracleDeltaSnapshotLimit(dollar(1000000));
        await time.increase(time.duration.days(5));
        await oracle.feedPrice(eur, fromPercent(10000), { from: owner });

        await protocolSafety.liquidateTrader(liquidityPool.address, alice, {
          from: bob,
        });

        orderedPositonsProfitFirst = [2, 3, 6, 8, 0, 1, 4, 5, 7];
        unrealizedAlice = Array(8).fill(bn(0));
        swapRatesAlice = Array(8).fill(bn(0));

        for (let i = 0; i < 9; i += 1) {
          unrealizedAlice[i] = await protocol.getUnrealizedPlOfPosition.call(i);
          swapRatesAlice[
            i
          ] = await (protocol as any).getAccumulatedSwapRateOfPosition.call(i);
        }

        await time.increase(time.duration.days(8));
        await oracle.feedPrice(eur, fromPercent(180), { from: owner });
        await oracle.feedPrice(jpy, fromPercent(150), { from: owner });
        await oracle.feedPrice(usd.address, fromPercent(50), {
          from: owner,
        });
      });

      it.only('allows trader to close positions after liquidation', async () => {
        const poolLiquidityBefore = await liquidityPool.getLiquidity();
        const poolBalanceBefore = await protocol.balances(
          liquidityPool.address,
          liquidityPool.address,
        );
        const aliceBalanceBefore = await protocol.balances(
          liquidityPool.address,
          alice,
        );
        let expectedAliceBalanceDiff = bn(0);

        for (let i = 0; i < 9; i += 1) {
          const positionIndex = orderedPositonsProfitFirst[i];
          await protocolLiquidated.closePositionForLiquidatedTrader(
            positionIndex,
            {
              from: alice,
            },
          );
          expectedAliceBalanceDiff = expectedAliceBalanceDiff
            .add(unrealizedAlice[positionIndex])
            .add(swapRatesAlice[positionIndex]);

          if (i > 3)
            expect(
              await protocol.balances(liquidityPool.address, alice),
            ).to.be.bignumber.equals(bn(0));
          else
            expect(
              (await protocol.balances(liquidityPool.address, alice)).sub(
                aliceBalanceBefore,
              ),
            ).to.be.bignumber.equals(expectedAliceBalanceDiff);
        }

        const poolLiquidityDiff = poolLiquidityBefore.sub(
          await liquidityPool.getLiquidity(),
        );
        const poolBalanceDiff = (
          await protocol.balances(liquidityPool.address, liquidityPool.address)
        ).sub(poolBalanceBefore);
        const poolTotalDiff = poolLiquidityDiff.sub(poolBalanceDiff);
        expect(poolTotalDiff).to.be.bignumber.equals(
          aliceBalanceBefore.mul(bn(-1)),
        );
      });

      it('limits profit when closed in wrong order', async () => {
        for (let i = 0; i < 9; i += 1) {
          await protocolLiquidated.closePositionForLiquidatedTrader(i, {
            from: alice,
          });
        }

        expect(
          await protocol.balances(liquidityPool.address, alice),
        ).to.be.bignumber.equals(bn(0));
      });

      it('allows to withdraw after closing', async () => {
        await protocol.withdraw(
          liquidityPool.address,
          await protocol.getExactFreeMargin.call(liquidityPool.address, bob),
          {
            from: bob,
          },
        );
        await oracle.feedPrice(eur, fromPercent(300), { from: owner });
        await protocolSafety.liquidateTrader(liquidityPool.address, bob, {
          from: alice,
        });
        await protocolLiquidated.closePositionForLiquidatedTrader(9, {
          from: bob,
        });

        const bobBalance = await protocol.balances(liquidityPool.address, bob);
        const bobUsdBefore = await usd.balanceOf(bob);

        await protocol.withdraw(liquidityPool.address, bobBalance, {
          from: bob,
        });

        expect(await usd.balanceOf(bob)).to.be.bignumber.equals(
          bobUsdBefore.add(convertToBaseToken(bobBalance)),
        );
      });

      it('reverts the withdraw when positions still open', async () => {
        await expectRevert(
          protocol.withdraw(liquidityPool.address, 1, {
            from: alice,
          }),
          messages.mustCloseAllPositionsForLiquidatedPoolOrTrader,
        );
      });
    });
  });

  describe('when margin calling a pool', () => {
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
      LIQUIDITY_POOL_MARGIN_CALL_FEE = await protocolConfig.poolMarginCallDeposit();

      await protocol.deposit(liquidityPool.address, depositInUsd, {
        from: alice,
      });

      await protocol.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage,
        leveragedHeldInEuro,
        price,
        { from: alice },
      );
    });

    describe('when pool is below margin call threshold', () => {
      beforeEach(async () => {
        await liquidityPool.withdrawLiquidityOwner(dollar(199400));
        await oracle.feedPrice(eur, fromPercent(30), { from: owner });
      });

      it('allows margin calling of pool', async () => {
        expect(
          await liquidityPoolRegistry.isMarginCalled(liquidityPool.address),
        ).to.be.false;
        try {
          await protocolSafety.marginCallLiquidityPool(liquidityPool.address, {
            from: bob,
          });
        } catch (error) {
          console.log(error);
          expect.fail(
            `Margin call transaction should not have been reverted: ${error}`,
          );
        }
        expect(
          await liquidityPoolRegistry.isMarginCalled(liquidityPool.address),
        ).to.be.true;
      });

      it('sends fee back to caller', async () => {
        const balanceBefore = await usd.balanceOf(bob);
        await protocolSafety.marginCallLiquidityPool(liquidityPool.address, {
          from: bob,
        });
        const balanceAfter = await usd.balanceOf(bob);

        expect(balanceAfter).to.be.bignumber.equal(
          balanceBefore.add(LIQUIDITY_POOL_MARGIN_CALL_FEE),
        );
      });

      it('does not allow margin calling twice', async () => {
        await protocolSafety.marginCallLiquidityPool(liquidityPool.address, {
          from: bob,
        });

        await expectRevert(
          protocolSafety.marginCallLiquidityPool(liquidityPool.address, {
            from: bob,
          }),
          messages.poolAlreadyMarginCalled,
        );
      });

      it('does not allow making safe calls', async () => {
        await protocolSafety.marginCallLiquidityPool(liquidityPool.address, {
          from: bob,
        });

        await expectRevert(
          protocolSafety.makeLiquidityPoolSafe(liquidityPool.address, {
            from: alice,
          }),
          messages.poolCannotBeMadeSafe,
        );
      });

      describe('when margin called pool has new new position opened', () => {
        beforeEach(async () => {
          await protocolSafety.marginCallLiquidityPool(liquidityPool.address, {
            from: bob,
          });
        });

        it('reverts the transaction', async () => {
          await expectRevert(
            protocol.openPosition(
              liquidityPool.address,
              usd.address,
              eur,
              20,
              euro(5),
              0,
              { from: alice },
            ),
            messages.poolIsMarginCalled,
          );
        });
      });

      describe('when margin called pool becomes safe again', () => {
        beforeEach(async () => {
          await protocolSafety.marginCallLiquidityPool(liquidityPool.address, {
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
            await protocolSafety.makeLiquidityPoolSafe(liquidityPool.address, {
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
          await protocolSafety.makeLiquidityPoolSafe(liquidityPool.address, {
            from: alice,
          });
          const balanceAfter = await usd.balanceOf(alice);

          expect(balanceAfter).to.be.bignumber.equal(
            balanceBefore.sub(LIQUIDITY_POOL_MARGIN_CALL_FEE),
          );
        });

        it('does not allow making safe calls twice', async () => {
          await protocolSafety.makeLiquidityPoolSafe(liquidityPool.address, {
            from: alice,
          });

          await expectRevert(
            protocolSafety.makeLiquidityPoolSafe(liquidityPool.address, {
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
          protocolSafety.marginCallLiquidityPool(liquidityPool.address, {
            from: bob,
          }),
          messages.poolCannotBeMarginCalled,
        );
      });
    });
  });

  describe('when liquidating a pool', () => {
    let leverage: BN;
    let depositInUsd: BN;
    let leveragedHeldInEuro: BN;
    let price: BN;
    let LIQUIDITY_POOL_LIQUIDATION_FEE: BN;

    beforeEach(async () => {
      leverage = bn(20);
      depositInUsd = dollar(340);
      leveragedHeldInEuro = euro(200);
      price = bn(0); // accept all
      LIQUIDITY_POOL_LIQUIDATION_FEE = await protocolConfig.poolLiquidationDeposit();

      await protocol.deposit(liquidityPool.address, depositInUsd, {
        from: alice,
      });

      await protocol.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage,
        leveragedHeldInEuro,
        price,
        { from: alice },
      );
    });

    describe('when there are multiple positions and trading pairs', () => {
      beforeEach(async () => {
        await setUpMultipleTradingPairPositions();
      });

      describe('when there is not enough liquidity left', () => {
        beforeEach(async () => {
          await protocolConfig.setLiquidityPoolELLMarginThreshold(
            fromPercent(2),
          );
          await protocolConfig.setLiquidityPoolENPMarginThreshold(
            fromPercent(2),
          );
          await protocolConfig.setLiquidityPoolELLLiquidateThreshold(
            fromPercent(1),
          );
          await protocolConfig.setLiquidityPoolENPLiquidateThreshold(
            fromPercent(1),
          );
          await liquidityPool.withdrawLiquidityOwner(dollar(199990));
          await protocolConfig.setLiquidityPoolELLMarginThreshold(
            fromPercent(100),
          );
          await protocolConfig.setLiquidityPoolENPMarginThreshold(
            fromPercent(100),
          );
          await protocolConfig.setLiquidityPoolELLLiquidateThreshold(
            fromPercent(99),
          );
          await protocolConfig.setLiquidityPoolENPLiquidateThreshold(
            fromPercent(99),
          );

          await oracle.feedPrice(eur, fromPercent(230), { from: owner });
          await protocolSafety.marginCallLiquidityPool(liquidityPool.address, {
            from: bob,
          });
          await protocolSafety.liquidateLiquidityPool(liquidityPool.address, {
            from: bob,
          });
        });

        it('sends leftover liquidity to trader', async () => {
          const poolLiquidityBefore = await liquidityPool.getLiquidity();
          const aliceBalanceBefore = await protocol.balances(
            liquidityPool.address,
            alice,
          );
          await protocolLiquidated.closePositionForLiquidatedPool(2, {
            from: alice,
          });
          const poolLiquidityAfter = await liquidityPool.getLiquidity();
          const aliceBalanceAfter = await protocol.balances(
            liquidityPool.address,
            alice,
          );
          expect(poolLiquidityAfter).to.be.bignumber.equals(bn(0));
          expect(aliceBalanceAfter).to.be.bignumber.equals(
            aliceBalanceBefore.add(poolLiquidityBefore),
          );
        });

        describe('when there is 0 liquidity left', () => {
          beforeEach(async () => {
            await protocolLiquidated.closePositionForLiquidatedPool(2, {
              from: alice,
            });
          });

          it('allows anyone to close and moves funds into protocol pool balance', async () => {
            const aliceBalanceBefore = await protocol.balances(
              liquidityPool.address,
              alice,
            );
            await protocolLiquidated.closePositionForLiquidatedPool(1);
            const poolLiquidityAfter = await liquidityPool.getLiquidity();
            const poolBalanceAfter = await protocol.balances(
              liquidityPool.address,
              liquidityPool.address,
            );
            const aliceBalanceAfter = await protocol.balances(
              liquidityPool.address,
              alice,
            );

            expect(poolLiquidityAfter).to.be.bignumber.equals(bn(0));
            expect(aliceBalanceAfter).to.be.bignumber.equals(
              aliceBalanceBefore.sub(poolBalanceAfter),
            );
          });

          it('reverts the close position transaction with profit for anyone but owner', async () => {
            await expectRevert(
              protocolLiquidated.closePositionForLiquidatedPool(3),
              messages.onlyOwnerCanCloseProfitPosition,
            );
          });
        });
      });

      describe('when pool liquidity is not sufficient for penalties', () => {
        let poolLiquidity: BN;

        beforeEach(async () => {
          await liquidityPool.withdrawLiquidityOwner(dollar(198990));
          await oracle.setOracleDeltaLastLimit(dollar(1000000));
          await oracle.setOracleDeltaSnapshotLimit(dollar(1000000));
          await oracle.feedPrice(usd.address, fromPercent(1000000), {
            from: owner,
          });
          await oracle.feedPrice(eur, fromPercent(230), { from: owner });
          await protocolSafety.marginCallLiquidityPool(liquidityPool.address, {
            from: bob,
          });
          poolLiquidity = await liquidityPool.getLiquidity();
          await protocolSafety.liquidateLiquidityPool(liquidityPool.address, {
            from: bob,
          });
        });

        it('moves all leftover liquidity', async () => {
          const treasuryBalance = await iUsd.balanceOf(laminarTreasury);
          expect(treasuryBalance).to.be.bignumber.equals(poolLiquidity);
          expect(await liquidityPool.getLiquidity()).to.be.bignumber.equals(
            bn(0),
          );
        });
      });

      describe('when pool is below liquidation threshold', () => {
        beforeEach(async () => {
          await liquidityPool.withdrawLiquidityOwner(dollar(193400));
          await protocolConfig.setLiquidityPoolELLMarginThreshold(
            fromPercent(1000),
          );
          await protocolConfig.setLiquidityPoolENPMarginThreshold(
            fromPercent(1000),
          );
          await protocolConfig.setLiquidityPoolELLLiquidateThreshold(
            fromPercent(999),
          );
          await protocolConfig.setLiquidityPoolENPLiquidateThreshold(
            fromPercent(999),
          );
          await oracle.feedPrice(eur, fromPercent(230), { from: owner });
          await protocolSafety.marginCallLiquidityPool(liquidityPool.address, {
            from: bob,
          });
        });

        it('allows liquidating of pool', async () => {
          try {
            await time.increase(time.duration.days(8));
            await protocolSafety.liquidateLiquidityPool(liquidityPool.address, {
              from: bob,
            });
          } catch (error) {
            console.log({ error });
            expect.fail(
              `Pool liquidation transaction should not have been reverted: ${error}`,
            );
          }
        });

        it('stops traders from opening positions in pool', async () => {
          await time.increase(time.duration.days(8));
          await protocolSafety.liquidateLiquidityPool(liquidityPool.address, {
            from: alice,
          });

          await expectRevert(
            protocol.openPosition(
              liquidityPool.address,
              usd.address,
              eur,
              1,
              100,
              price,
              { from: alice },
            ),
            messages.poolLiquidated,
          );
        });

        describe('before pool is liquidated', () => {
          it('reverts the close position transaction', async () => {
            await expectRevert(
              protocolLiquidated.closePositionForLiquidatedPool(0, {
                from: alice,
              }),
              messages.onlyForLiquidatedPoolsOrTraders,
            );
          });
        });

        describe('when pool is liquidated', () => {
          let unrealizedAlice: BN[];
          let swapRatesAlice: BN[];
          let unrealizedBob: BN;
          let swapRateBob: BN;

          let bidSpreadUsdEur: BN;
          let askSpreadUsdEur: BN;
          let bidSpreadEurJpy: BN;
          let askSpreadEurJpy: BN;

          beforeEach(async () => {
            await time.increase(time.duration.days(5));
            await protocolSafety.liquidateLiquidityPool(liquidityPool.address, {
              from: bob,
            });

            bidSpreadUsdEur = await liquidityPool.getBidSpread(
              usd.address,
              eur,
            );
            bidSpreadEurJpy = await liquidityPool.getBidSpread(eur, jpy);
            askSpreadUsdEur = await liquidityPool.getAskSpread(
              usd.address,
              eur,
            );
            askSpreadEurJpy = await liquidityPool.getAskSpread(eur, jpy);

            unrealizedAlice = Array(8).fill(bn(0));
            swapRatesAlice = Array(8).fill(bn(0));

            for (let i = 0; i < 9; i += 1) {
              unrealizedAlice[
                i
              ] = await protocol.getUnrealizedPlOfPosition.call(i);
              swapRatesAlice[
                i
              ] = await (protocol as any).getAccumulatedSwapRateOfPosition.call(
                i,
              );
            }
            unrealizedBob = await protocol.getUnrealizedPlOfPosition.call(9);
            swapRateBob = await (protocol as any).getAccumulatedSwapRateOfPosition.call(
              9,
            );

            await time.increase(time.duration.days(8));
            await oracle.feedPrice(eur, fromPercent(180), { from: owner });
            await oracle.feedPrice(jpy, fromPercent(150), { from: owner });
            await oracle.feedPrice(usd.address, fromPercent(50), {
              from: owner,
            });
          });

          it('allows traders to close positions on stopped pool', async () => {
            const poolLiquidityBefore = await liquidityPool.getLiquidity();
            const poolBalanceBefore = await protocol.balances(
              liquidityPool.address,
              liquidityPool.address,
            );
            const aliceBalanceBefore = await protocol.balances(
              liquidityPool.address,
              alice,
            );
            const bobBalanceBefore = await protocol.balances(
              liquidityPool.address,
              bob,
            );
            let expectedAliceBalanceDiff = bn(0);

            for (let i = 0; i < 9; i += 1) {
              await protocolLiquidated.closePositionForLiquidatedPool(i, {
                from: alice,
              });
              expectedAliceBalanceDiff = expectedAliceBalanceDiff
                .add(unrealizedAlice[i])
                .add(swapRatesAlice[i]);
            }
            await protocolLiquidated.closePositionForLiquidatedPool(9, {
              from: bob,
            });
            const poolLiquidityDiff = poolLiquidityBefore.sub(
              await liquidityPool.getLiquidity(),
            );

            const aliceBalanceDiff = (
              await protocol.balances(liquidityPool.address, alice)
            ).sub(aliceBalanceBefore);
            const bobBalanceDiff = (
              await protocol.balances(liquidityPool.address, bob)
            ).sub(bobBalanceBefore);
            const poolBalanceDiff = (
              await protocol.balances(
                liquidityPool.address,
                liquidityPool.address,
              )
            ).sub(poolBalanceBefore);
            expect(aliceBalanceDiff).to.be.bignumber.equals(
              expectedAliceBalanceDiff,
            );
            expect(bobBalanceDiff).to.be.bignumber.equals(
              unrealizedBob.add(swapRateBob),
            );

            const poolTotalDiff = poolLiquidityDiff.sub(poolBalanceDiff);
            expect(poolTotalDiff).to.be.bignumber.equals(
              expectedAliceBalanceDiff.add(bobBalanceDiff),
            );
          });

          it('allows to withdraw after closing', async () => {
            for (let i = 0; i < 9; i += 1) {
              await protocolLiquidated.closePositionForLiquidatedPool(i, {
                from: alice,
              });
            }
            await protocolLiquidated.closePositionForLiquidatedPool(9, {
              from: bob,
            });

            const aliceBalance = await protocol.balances(
              liquidityPool.address,
              alice,
            );
            const bobBalance = await protocol.balances(
              liquidityPool.address,
              bob,
            );
            const aliceUsdBefore = await usd.balanceOf(alice);
            const bobUsdBefore = await usd.balanceOf(bob);

            await protocol.withdraw(liquidityPool.address, aliceBalance, {
              from: alice,
            });
            await protocol.withdraw(liquidityPool.address, bobBalance, {
              from: bob,
            });

            expect(await usd.balanceOf(alice)).to.be.bignumber.equals(
              aliceUsdBefore.add(convertToBaseToken(aliceBalance)),
            );
            expect(await usd.balanceOf(bob)).to.be.bignumber.equals(
              bobUsdBefore.add(convertToBaseToken(bobBalance)),
            );
          });

          it('reverts the withdraw when positions still open', async () => {
            await expectRevert(
              protocol.withdraw(liquidityPool.address, 1, {
                from: alice,
              }),
              messages.mustCloseAllPositionsForLiquidatedPoolOrTrader,
            );
          });

          it('moves closing penalties to treasury', async () => {
            const treasuryBalance = await iUsd.balanceOf(laminarTreasury);

            let totalPenalty = bn(0);
            let leveragedLongUsdEur = bn(0);
            let leveragedShortUsdEur = bn(0);
            let leveragedLongEurJpy = bn(0);
            let leveragedShortEurJpy = bn(0);

            for (let i = 0; i < 10; i += 1) {
              const position = await protocol.getPositionById(i);
              const leveragePos = bn(position.leverage.toString());
              const leveragedHeld = bn(position.leveragedHeld.toString());

              const spreads =
                i % 2 === 1 || i === 0
                  ? { ask: askSpreadUsdEur, bid: bidSpreadUsdEur }
                  : { ask: askSpreadEurJpy, bid: bidSpreadEurJpy };

              if (i % 2 === 1 || i === 0) {
                if (!leveragePos.isNeg()) {
                  leveragedLongUsdEur = leveragedLongUsdEur.add(
                    leveragedHeld.abs(),
                  );
                } else {
                  leveragedShortUsdEur = leveragedShortUsdEur.add(
                    leveragedHeld.abs(),
                  );
                }
              } else if (!leveragePos.isNeg()) {
                leveragedLongEurJpy = leveragedLongEurJpy.add(
                  leveragedHeld.abs(),
                );
              } else {
                leveragedShortEurJpy = leveragedShortEurJpy.add(
                  leveragedHeld.abs(),
                );
              }

              const spread = leveragePos.isNeg() ? spreads.ask : spreads.bid;
              const penalty = leveragedHeld
                .abs()
                .mul(spread)
                .div(bn(1e18));
              const penaltyUsd = penalty.mul(initialUsdPrice).div(bn(1e18));
              totalPenalty = totalPenalty.add(penaltyUsd);
            }

            const penaltyUsdLong = leveragedLongUsdEur
              .mul(bidSpreadUsdEur)
              .div(bn(1e18));
            const penaltyUsdShort = leveragedShortUsdEur
              .mul(askSpreadUsdEur)
              .div(bn(1e18));
            const penaltyUsd = penaltyUsdLong.add(penaltyUsdShort);
            const penaltyJpyLong = leveragedLongEurJpy
              .mul(bidSpreadEurJpy)
              .div(bn(1e18));
            const penaltyJpyShort = leveragedShortEurJpy
              .mul(askSpreadEurJpy)
              .div(bn(1e18));
            const penaltyJpy = penaltyJpyLong.add(penaltyJpyShort);

            expect(
              penaltyUsd.add(penaltyJpy).mul(bn(2)),
            ).to.be.bignumber.equals(convertToBaseToken(treasuryBalance));
            expect(
              parseInt(totalPenalty.mul(bn(2)).toString(), 10),
            ).to.be.approximately(
              parseInt(convertToBaseToken(treasuryBalance).toString(), 10),
              20,
            );
          });
        });
      });
    });

    describe('when pool is below liquidation threshold', () => {
      beforeEach(async () => {
        await liquidityPool.withdrawLiquidityOwner(dollar(199400));
        await protocolConfig.setLiquidityPoolELLMarginThreshold(
          fromPercent(1000),
        );
        await protocolConfig.setLiquidityPoolENPMarginThreshold(
          fromPercent(1000),
        );
        await protocolConfig.setLiquidityPoolELLLiquidateThreshold(
          fromPercent(999),
        );
        await protocolConfig.setLiquidityPoolENPLiquidateThreshold(
          fromPercent(999),
        );
        await oracle.feedPrice(eur, fromPercent(230), { from: owner });
        await protocolSafety.marginCallLiquidityPool(liquidityPool.address, {
          from: bob,
        });
      });

      it('allows liquidating of pool', async () => {
        try {
          await protocolSafety.liquidateLiquidityPool(liquidityPool.address, {
            from: bob,
          });
        } catch (error) {
          console.log({ error });
          expect.fail(
            `Pool liquidation transaction should not have been reverted: ${error}`,
          );
        }
      });

      it('sends fee back to caller', async () => {
        const balanceBefore = await usd.balanceOf(bob);
        await protocolSafety.liquidateLiquidityPool(liquidityPool.address, {
          from: bob,
        });
        const balanceAfter = await usd.balanceOf(bob);

        expect(balanceAfter).to.be.bignumber.equal(
          balanceBefore.add(LIQUIDITY_POOL_LIQUIDATION_FEE),
        );
      });

      it('does not allow liquidating twice', async () => {
        await protocolSafety.liquidateLiquidityPool(liquidityPool.address, {
          from: bob,
        });

        await expectRevert(
          protocolSafety.liquidateLiquidityPool(liquidityPool.address, {
            from: bob,
          }),
          messages.poolAlreadyMarginCalled,
        );
      });
    });

    describe('when pool is above liquidation threshold', () => {
      it('does not allow liquidating of pool', async () => {
        await expectRevert(
          protocolSafety.liquidateLiquidityPool(liquidityPool.address, {
            from: bob,
          }),
          messages.poolCannotBeLiquidated,
        );
      });
    });
  });

  const insertPositions = async (positionCount: number, trader: string) => {
    for (let i = 0; i < positionCount / 2; i += 1) {
      // console.log(`Open Position ${i}`);
      const leverage = bn(20).mul(i % 2 === 0 ? bn(1) : bn(-1));
      const leveragedHeldInEuro = euro(2);
      await protocol.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage,
        leveragedHeldInEuro,
        0,
        { from: trader },
      );
    }
  };

  describe('when checking the trader safety', () => {
    beforeEach(async () => {
      await protocol.deposit(liquidityPool.address, dollar(1000), {
        from: alice,
      });
      await protocol.deposit(liquidityPool.address, dollar(1000), {
        from: bob,
      });
    });

    describe('when the trader has 5 positions', () => {
      beforeEach(async function testSetup() {
        await insertPositions(5, alice);
      });

      it('returns if trader is safe', async () => {
        expect(
          await protocolSafety.isTraderSafe.call(liquidityPool.address, alice),
        ).to.be.true;
      });
    });

    describe.skip('when the trader has 50 positions', () => {
      beforeEach(async function testSetup() {
        this.timeout(0);

        await insertPositions(50, alice);
      });

      it('returns if trader is safe', async () => {
        expect(
          await protocolSafety.isTraderSafe.call(liquidityPool.address, alice),
        ).to.be.true;
      }).timeout(0);
    });
  });

  describe('when checking the pool safety', () => {
    beforeEach(async () => {
      await protocol.deposit(liquidityPool.address, dollar(1000), {
        from: alice,
      });
      await protocol.deposit(liquidityPool.address, dollar(1000), {
        from: bob,
      });
    });

    describe('when the pool has 10 positions', () => {
      beforeEach(async function testSetup() {
        await insertPositions(5, alice);
        await insertPositions(5, bob);
      });

      it('returns if pool is safe', async () => {
        const isSafe = await protocolSafety.isPoolSafe.call(
          liquidityPool.address,
        );
        expect(isSafe).to.be.true;
      });
    });

    describe.skip('when the pool has 100 positions', () => {
      beforeEach(async function testSetup() {
        this.timeout(0);

        await insertPositions(50, alice);
        await insertPositions(50, bob);
      });

      it('returns if pool is safe', async () => {
        const isSafe = await protocolSafety.isPoolSafe.call(
          liquidityPool.address,
        );
        expect(isSafe).to.be.true;
      }).timeout(0);
    });
  });

  describe('when using helper functions', () => {
    beforeEach(async () => {
      await setUpMultipleTradingPairPositions();
    });

    describe('when computing equity of pool', () => {
      it('should return the correct equity', async () => {
        const poolEquity = await protocolSafety.getEquityOfPool.call(
          liquidityPool.address,
        );

        const liquidity = await liquidityPool.getLiquidity();
        let allUnrealizedPl = bn(0);
        // let allAccumulatedSwapRate = bn(0);

        const positionCount = 9;

        for (let positionId = 0; positionId < positionCount; positionId += 1) {
          allUnrealizedPl = allUnrealizedPl.add(
            await protocol.getUnrealizedPlOfPosition.call(positionId),
          );
          /* allAccumulatedSwapRate = allAccumulatedSwapRate.add(
            await (protocol as any).getAccumulatedSwapRateOfPosition(
              bn(positionId),
            ),
          ); */
        }

        // equityOfPool = liquidity - (allUnrealizedPl + (allAccumulatedSwapRate left out));
        const expectedPoolEquity = liquidity.sub(
          allUnrealizedPl, // .add(allAccumulatedSwapRate),
        );

        expect(poolEquity).to.be.bignumber.equal(expectedPoolEquity);
      });
    });

    describe('when computing ENP of pool', () => {
      it('should return the correct ENP', async () => {
        // ENP - Equity to Net Position ratio of a liquidity pool.
        const enp = (
          await protocolSafety.getEnpAndEll.call(liquidityPool.address)
        )['0'];

        let net = bn(0);
        let positive = bn(0);
        let negative = bn(0);

        const positionCount = 9;

        for (let positionId = 0; positionId < positionCount; positionId += 1) {
          const leveragedDebits = convertFromBaseToken(
            (await protocol.getPositionById(positionId)).leveragedDebitsInUsd,
          );
          net = net.add(leveragedDebits);

          if (leveragedDebits.isNeg()) {
            negative = negative.add(leveragedDebits);
          } else {
            positive = positive.add(leveragedDebits);
          }
        }

        const equity = await protocolSafety.getEquityOfPool.call(
          liquidityPool.address,
        );
        const netAbs = net.abs();
        const expectedPoolENP = equity.mul(bn(1e18)).div(netAbs);

        expect(enp.value).to.be.bignumber.equal(expectedPoolENP);
      });

      // very difficult and unlikely to get exactly net of 0
      // code is straight forward just in case, test not really required
      /* describe('when net positions equals 0', () => {
        it('should return the correct ENP', async () => {
          const enp = (await protocol.getEnpAndEll.call(liquidityPool.address))[
            '0'
          ];
          expect(enp).to.be.bignumber.equal(constants.MAX_UINT256);
        });
      }); */
    });

    describe('when computing ELL of pool', () => {
      it('should return the correct ELL', async () => {
        // ELL - Equity to Longest Leg ratio of a liquidity pool.
        const ell = (
          await protocolSafety.getEnpAndEll.call(liquidityPool.address)
        )['1'];

        let net = bn(0);
        let positive = bn(0);
        let negative = bn(0);

        const positionCount = 9;

        for (let positionId = 0; positionId < positionCount; positionId += 1) {
          const leveragedDebits = convertFromBaseToken(
            (await protocol.getPositionById(positionId)).leveragedDebitsInUsd,
          );
          net = net.add(leveragedDebits);

          if (leveragedDebits.isNeg()) {
            negative = negative.add(leveragedDebits);
          } else {
            positive = positive.add(leveragedDebits);
          }
        }

        const equity = await protocolSafety.getEquityOfPool.call(
          liquidityPool.address,
        );

        const longestLeg = BN.max(positive, negative.abs());
        const expectedPoolELL = equity.mul(bn(1e18)).div(longestLeg);

        expect(ell.value).to.be.bignumber.equal(expectedPoolELL);
      });

      // very difficult and unlikely to get exactly longest leg of 0
      // code is straight forward just in case, test not really required
      /* describe('when longest leg equals 0', () => {
        it('should return the correct ELL', async () => {
          const ell = (await protocol.getEnpAndEll.call(liquidityPool.address))[
            '0'
          ];
          expect(ell).to.be.bignumber.equal(constants.MAX_UINT256);
        });
      }); */
    });

    describe('when getting accumulated leveraged debits of a trader', () => {
      it('should return the correct value', async () => {
        const eurToUsd = ({
          amount,
          leverage,
          basePrice,
          quotePrice,
        }: {
          amount: BN;
          leverage: BN;
          basePrice: BN;
          quotePrice: BN;
        }): BN => {
          const leveragedDebits = fromEth(
            amount.mul(leverage.isNeg() ? initialBidPrice : initialAskPrice),
          );
          const leveragedDebitsInUsd = leveragedDebits
            .mul(quotePrice)
            .div(basePrice);

          return leveragedDebitsInUsd;
        };

        const jpyToUsd = ({
          amount,
          leverage,
          basePrice,
          quotePrice,
        }: {
          amount: BN;
          leverage: BN;
          basePrice: BN;
          quotePrice: BN;
        }): BN => {
          const leveragedDebits = fromEth(
            amount.mul(
              leverage.isNeg() ? initialBidPriceJpy : initialAskPriceJpy,
            ),
          );
          const leveragedDebitsInUsd = leveragedDebits
            .mul(quotePrice)
            .div(basePrice);

          return leveragedDebitsInUsd;
        };

        const leveragedDebits = await protocolSafety.getLeveragedDebitsOfTrader(
          liquidityPool.address,
          alice,
        );

        const leveragedDebitsEur = leveragedHeldsEur.reduce(
          (acc, leveragedHeld, i) =>
            acc.add(
              eurToUsd({
                basePrice: initialUsdPrice,
                quotePrice: initialEurPrice,
                amount: leveragedHeld,
                leverage: leveragesEur[i],
              }),
            ),
          bn(0),
        );
        const leveragedDebitsJpy = leveragedHeldsJpy.reduce(
          (acc, leveragedHeld, i) =>
            acc.add(
              jpyToUsd({
                basePrice: initialUsdPrice,
                quotePrice: fromPercent(200),
                amount: leveragedHeld,
                leverage: leveragesJpy[i],
              }),
            ),
          bn(0),
        );

        expect(leveragedDebits).to.be.bignumber.equal(
          leveragedDebitsEur.add(leveragedDebitsJpy),
        );
      });
    });
  });
});
