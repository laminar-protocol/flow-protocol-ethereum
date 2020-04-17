import { expectRevert, constants } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import BN from 'bn.js';

import {
  SimplePriceOracleInstance,
  TestFlowMarginProtocolInstance,
  TestFlowMarginProtocolSafetyInstance,
  LiquidityPoolInstance,
  LiquidityPoolRegistryInstance,
  TestTokenInstance,
  MoneyMarketInstance,
  IERC20Instance,
} from 'types/truffle-contracts';

import {
  convertToBaseToken,
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
const TestFlowMarginProtocol = artifacts.require('TestFlowMarginProtocol');
const TestFlowMarginProtocolSafety = artifacts.require(
  'TestFlowMarginProtocolSafety',
);
const FlowMarginProtocolSafetyNewVersion = artifacts.require(
  'FlowMarginProtocolSafetyNewVersion',
);
const LiquidityPool = artifacts.require('LiquidityPool');
const LiquidityPoolRegistry = artifacts.require('LiquidityPoolRegistry');
const SimplePriceOracle = artifacts.require('SimplePriceOracle');

contract('FlowMarginProtocol', accounts => {
  const owner = accounts[0];
  const liquidityProvider = accounts[1];
  const alice = accounts[2];
  const bob = accounts[3];
  const eur = accounts[4];
  const jpy = accounts[5];

  let oracle: SimplePriceOracleInstance;
  let protocol: TestFlowMarginProtocolInstance;
  let protocolSafety: TestFlowMarginProtocolSafetyInstance;
  let liquidityPoolRegistry: LiquidityPoolRegistryInstance;
  let liquidityPool: LiquidityPoolInstance;
  let usd: TestTokenInstance;
  let iUsd: IERC20Instance; // eslint-disable-line
  let moneyMarket: MoneyMarketInstance;

  let initialSpread: BN;
  let initialUsdPrice: BN;
  let initialEurPrice: BN;
  let initialJpyPrice: BN;

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

    initialSpread = fromPip(10);
    initialUsdPrice = fromPercent(100);
    initialEurPrice = fromPercent(120);
    initialJpyPrice = fromPercent(200);

    initialSwapRate = fromPercent(2);
    initialTraderRiskMarginCallThreshold = fromPercent(5);
    initialTraderRiskLiquidateThreshold = fromPercent(2);
    initialLiquidityPoolENPMarginThreshold = fromPercent(50);
    initialLiquidityPoolELLMarginThreshold = fromPercent(10);
    initialLiquidityPoolENPLiquidateThreshold = fromPercent(20);
    initialLiquidityPoolELLLiquidateThreshold = fromPercent(2);

    usd = await createTestToken(
      [liquidityProvider, dollar(50000)],
      [alice, dollar(10000)],
      [bob, dollar(10000)],
    );
    ({ moneyMarket, iToken: iUsd } = await createMoneyMarket(
      usd.address,
      fromPercent(100),
    ));

    const flowMarginProtocolImpl = await TestFlowMarginProtocol.new();
    const flowMarginProtocolProxy = await Proxy.new();
    await flowMarginProtocolProxy.upgradeTo(flowMarginProtocolImpl.address);
    protocol = await TestFlowMarginProtocol.at(flowMarginProtocolProxy.address);

    const flowMarginProtocolSafetyImpl = await TestFlowMarginProtocolSafety.new();
    const flowMarginProtocolSafetyProxy = await Proxy.new();
    await flowMarginProtocolSafetyProxy.upgradeTo(
      flowMarginProtocolSafetyImpl.address,
    );
    protocolSafety = await TestFlowMarginProtocolSafety.at(
      flowMarginProtocolSafetyProxy.address,
    );

    const liquidityPoolRegistryImpl = await LiquidityPoolRegistry.new();
    const liquidityPoolRegistryProxy = await Proxy.new();
    await liquidityPoolRegistryProxy.upgradeTo(
      liquidityPoolRegistryImpl.address,
    );
    liquidityPoolRegistry = await LiquidityPoolRegistry.at(
      liquidityPoolRegistryProxy.address,
    );

    await (protocol as any).initialize( // eslint-disable-line
      oracle.address,
      moneyMarket.address,
      protocolSafety.address,
      liquidityPoolRegistry.address,
      initialSwapRate,
    );

    await (protocolSafety as any).initialize(
      protocol.address,
      initialTraderRiskMarginCallThreshold,
      initialTraderRiskLiquidateThreshold,
      initialLiquidityPoolENPMarginThreshold,
      initialLiquidityPoolELLMarginThreshold,
      initialLiquidityPoolENPLiquidateThreshold,
      initialLiquidityPoolELLLiquidateThreshold,
    );

    await liquidityPoolRegistry.initialize(
      moneyMarket.address,
      protocolSafety.address,
    );

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

    const liquidityPoolImpl = await LiquidityPool.new();
    const liquidityPoolProxy = await Proxy.new();
    await liquidityPoolProxy.upgradeTo(liquidityPoolImpl.address);
    liquidityPool = await LiquidityPool.at(liquidityPoolProxy.address);
    await (liquidityPool as any).initialize(
      moneyMarket.address,
      protocol.address, // need 3 pools or only use first one for withdraw tests
      initialSpread,
    );

    await liquidityPool.approve(protocol.address, constants.MAX_UINT256);
    await usd.approve(liquidityPool.address, constants.MAX_UINT256);
    await liquidityPool.enableToken(eur);
    await liquidityPool.enableToken(jpy);

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
    await protocol.addTradingPair(jpy, eur);
    await protocol.addTradingPair(usd.address, eur);

    await oracle.feedPrice(usd.address, initialUsdPrice, {
      from: owner,
    });
    await oracle.feedPrice(eur, initialEurPrice, { from: owner });
    await oracle.feedPrice(jpy, initialJpyPrice, { from: owner });
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
          await (protocolSafety as any)[setFunction](newParameter);

          const setParameter = setFunction
            .slice(3)
            .replace(/^\w/, c => c.toLowerCase());
          const newStoredParameter = await (protocolSafety as any)[
            setParameter
          ]();

          expect(newStoredParameter).to.be.bignumber.equals(newParameter);
        });

        it('allows only owner to set parameters', async () => {
          await expectRevert(
            (protocolSafety as any)[setFunction](newParameter, { from: alice }),
            messages.onlyOwner,
          );
        });

        it('does not allow zero values', async () => {
          await expectRevert(
            (protocolSafety as any)[setFunction](0),
            messages.settingZeroValueNotAllowed,
          );
        });
      });
    }
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
      TRADER_MARGIN_CALL_FEE = await protocol.TRADER_MARGIN_CALL_FEE();

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
        await oracle.feedPrice(eur, fromPercent(30), { from: owner });
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
      LIQUIDITY_POOL_MARGIN_CALL_FEE = await liquidityPoolRegistry.LIQUIDITY_POOL_MARGIN_CALL_FEE();

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
        await oracle.feedPrice(eur, fromPercent(130), { from: owner });
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
          await protocolSafety.getIsTraderSafe.call(
            liquidityPool.address,
            alice,
          ),
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
          await protocolSafety.getIsTraderSafe.call(
            liquidityPool.address,
            alice,
          ),
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

  describe('when using internal helper functions', () => {
    let leveragedHeld1: BN;
    let leveragedHeld2: BN;
    let leveragedHeld3: BN;
    let leverage1: BN;
    let leverage2: BN;
    let leverage3: BN;
    let initialAskPrice: BN;
    let initialBidPrice: BN;

    beforeEach(async () => {
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

      leveragedHeld1 = euro(10);
      leveragedHeld2 = euro(5);
      leveragedHeld3 = euro(2);
      leverage1 = bn(20);
      leverage2 = bn(-20);
      leverage3 = bn(20);

      await protocol.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage1,
        leveragedHeld1,
        0,
        { from: alice },
      );
      await protocol.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage2,
        leveragedHeld2,
        0,
        { from: alice },
      );
      await protocol.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage3,
        leveragedHeld3,
        0,
        { from: bob },
      );
    });

    describe('when computing equity of pool', () => {
      it('should return the correct equity', async () => {
        const poolEquity = await protocolSafety.getEquityOfPool.call(
          liquidityPool.address,
        );

        const liquidity = convertToBaseToken(
          await liquidityPool.getLiquidity.call(),
        );
        let allUnrealizedPl = bn(0);
        let allAccumulatedSwapRate = bn(0);

        const positionCount = 3;

        for (let positionId = 0; positionId < positionCount; positionId += 1) {
          allUnrealizedPl = allUnrealizedPl.add(
            await protocol.getUnrealizedPlOfPosition.call(positionId),
          );
          allAccumulatedSwapRate = allAccumulatedSwapRate.add(
            await (protocol as any).getAccumulatedSwapRateOfPosition(
              bn(positionId),
            ),
          );
        }

        // equityOfPool = liquidity - (allUnrealizedPl + allAccumulatedSwapRate);
        const expectedPoolEquity = liquidity.sub(
          allUnrealizedPl.add(allAccumulatedSwapRate),
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

        const positionCount = 3;

        for (let positionId = 0; positionId < positionCount; positionId += 1) {
          const leveragedDebits = (await protocol.positionsById(positionId))[
            '8'
          ];
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

        const netAbs = net.abs(); // TODO test netAbs = 0
        const expectedPoolENP = equity.mul(bn(1e18)).div(netAbs);

        expect(enp).to.be.bignumber.equal(expectedPoolENP);
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
      it('should return the correct ENP', async () => {
        // ELL - Equity to Longest Leg ratio of a liquidity pool.
        const ell = (
          await protocolSafety.getEnpAndEll.call(liquidityPool.address)
        )['1'];

        let net = bn(0);
        let positive = bn(0);
        let negative = bn(0);

        const positionCount = 3;

        for (let positionId = 0; positionId < positionCount; positionId += 1) {
          const leveragedDebits = (await protocol.positionsById(positionId))[
            '8'
          ];
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

        const longestLeg = BN.max(positive, negative.abs()); // TODO longestLeg = 0
        const expectedPoolELL = equity.mul(bn(1e18)).div(longestLeg);

        expect(ell).to.be.bignumber.equal(expectedPoolELL);
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
        const leveragedDebits = await protocolSafety.getLeveragedDebitsOfTrader(
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
  });

  describe('when upgrading the contract', () => {
    it('upgrades the contract', async () => {
      const flowMarginProtocolSafetyProxy = await Proxy.at(protocol.address);
      const newFlowMarginProtocolSafetyImpl = await FlowMarginProtocolSafetyNewVersion.new();
      await flowMarginProtocolSafetyProxy.upgradeTo(
        newFlowMarginProtocolSafetyImpl.address,
      );
      const newFlowMarginProtocolSafety = await FlowMarginProtocolSafetyNewVersion.at(
        protocol.address,
      );
      const value = bn(345);
      const firstBytes32 =
        '0x18e5f16b91bbe0defc5ee6bc25b514b030126541a8ed2fc0b69402452465cc00';
      const secondBytes32 =
        '0x18e5f16b91bbe0defc5ee6bc25b514b030126541a8ed2fc0b69402452465cc99';

      const newValueBefore = await newFlowMarginProtocolSafety.newStorageUint();
      await newFlowMarginProtocolSafety.addNewStorageBytes32(firstBytes32);
      await newFlowMarginProtocolSafety.setNewStorageUint(value);
      await newFlowMarginProtocolSafety.addNewStorageBytes32(secondBytes32);
      const newValueAfter = await newFlowMarginProtocolSafety.newStorageUint();
      const newStorageByte1 = await newFlowMarginProtocolSafety.newStorageBytes32(
        0,
      );
      const newStorageByte2 = await newFlowMarginProtocolSafety.newStorageBytes32(
        1,
      );

      expect(newValueBefore).to.be.bignumber.equal(bn(0));
      expect(newValueAfter).to.be.bignumber.equal(value);
      expect(newStorageByte1).to.be.equal(firstBytes32);
      expect(newStorageByte2).to.be.equal(secondBytes32);
    });
  });
});
