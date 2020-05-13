import {
  expectEvent,
  expectRevert,
  constants,
  time,
} from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import BN from 'bn.js';

import {
  SimplePriceOracleInstance,
  TestMarginFlowProtocolInstance,
  MarginFlowProtocolSafetyInstance,
  MarginLiquidityPoolInstance,
  MarginLiquidityPoolRegistryInstance,
  TestTokenInstance,
  MoneyMarketInstance,
  IERC20Instance,
} from 'types/truffle-contracts';

import {
  convertFromBaseToken,
  convertToBaseToken,
  createTestToken,
  createMoneyMarket,
  fromEth,
  fromPercent,
  dollar,
  euro,
  bn,
  messages,
} from '../helpers';

const Proxy = artifacts.require('Proxy');
const TestMarginFlowProtocol = artifacts.require('TestMarginFlowProtocol');
const MarginFlowProtocolSafety = artifacts.require('MarginFlowProtocolSafety');
const MarginFlowProtocolNewVersion = artifacts.require(
  'MarginFlowProtocolNewVersion',
);
const MarginLiquidityPool = artifacts.require('MarginLiquidityPool');
const MarginLiquidityPoolRegistry = artifacts.require(
  'MarginLiquidityPoolRegistry',
);
const SimplePriceOracle = artifacts.require('SimplePriceOracle');

contract('MarginFlowProtocol', accounts => {
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
  let liquidityPoolRegistry: MarginLiquidityPoolRegistryInstance;
  let liquidityPool: MarginLiquidityPoolInstance;
  let usd: TestTokenInstance;
  let iUsd: IERC20Instance; // eslint-disable-line
  let moneyMarket: MoneyMarketInstance;

  let initialSpread: BN;
  let initialUsdPrice: BN;
  let initialEurPrice: BN;
  let initialJpyPrice: BN;

  let initialSwapRateLong: BN;
  let initialSwapRateShort: BN;

  beforeEach(async () => {
    const oracleImpl = await SimplePriceOracle.new();
    const oracleProxy = await Proxy.new();
    oracleProxy.upgradeTo(oracleImpl.address);

    oracle = await SimplePriceOracle.at(oracleProxy.address);
    await oracle.initialize();

    oracle.addPriceFeeder(owner);
    await oracle.setOracleDeltaLastLimit(fromPercent(100));
    await oracle.setOracleDeltaSnapshotLimit(fromPercent(100));

    initialSpread = bn(28152000000000);
    initialUsdPrice = fromPercent(100);
    initialEurPrice = fromPercent(120);
    initialJpyPrice = fromPercent(200);
    initialSwapRateLong = fromPercent(2);
    initialSwapRateShort = fromPercent(2);

    usd = await createTestToken(
      [liquidityProvider, dollar(50000)],
      [alice, dollar(10000)],
      [bob, dollar(10000)],
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
      protocolSafety.address,
      liquidityPoolRegistry.address,
      1,
      50,
      2,
      60 * 60 * 8, // 8 hours
    );

    await (protocolSafety as any).initialize(
      protocol.address,
      laminarTreasury,
      fromPercent(5),
      fromPercent(2),
      fromPercent(50),
      fromPercent(10),
      fromPercent(20),
      fromPercent(2),
    );

    await liquidityPoolRegistry.initialize(
      moneyMarket.address,
      protocol.address,
    );

    await usd.approve(protocol.address, constants.MAX_UINT256, {
      from: alice,
    });
    await usd.approve(protocol.address, constants.MAX_UINT256, {
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
    );

    await liquidityPool.approveToProtocol(constants.MAX_UINT256);
    await usd.approve(liquidityPool.address, constants.MAX_UINT256);
    await liquidityPool.enableToken(usd.address, eur, initialSpread);
    await liquidityPool.enableToken(eur, usd.address, initialSpread);
    await liquidityPool.enableToken(eur, jpy, initialSpread);
    await liquidityPool.enableToken(jpy, eur, initialSpread);

    await usd.approve(liquidityPool.address, dollar(20000), {
      from: liquidityProvider,
    });
    await liquidityPool.depositLiquidity(dollar(20000), {
      from: liquidityProvider,
    });

    await usd.approve(protocolSafety.address, constants.MAX_UINT256, {
      from: alice,
    });
    await usd.approve(protocolSafety.address, constants.MAX_UINT256, {
      from: bob,
    });
    await protocolSafety.payTraderDeposits(liquidityPool.address, {
      from: alice,
    });
    await protocolSafety.payTraderDeposits(liquidityPool.address, {
      from: bob,
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
    await protocol.addTradingPair(
      jpy,
      eur,
      initialSwapRateLong,
      initialSwapRateShort,
    );
    await protocol.addTradingPair(
      usd.address,
      eur,
      initialSwapRateLong,
      initialSwapRateShort,
    );

    await oracle.feedPrice(usd.address, initialUsdPrice, {
      from: owner,
    });
    await oracle.feedPrice(eur, initialEurPrice, { from: owner });
    await oracle.feedPrice(jpy, initialJpyPrice, { from: owner });
  });

  const getLeveragedDebits = ({
    leveragedHeld,
    leverage,
    askPrice,
    bidPrice,
  }: {
    leveragedHeld: BN;
    leverage: BN;
    askPrice: BN;
    bidPrice: BN;
  }) => fromEth(leveragedHeld.mul(leverage.isNeg() ? bidPrice : askPrice));

  const getLastPositionByPool = async (pool: string) => {
    const positionsLength = await protocol.getPositionsByPoolLength(pool);
    return protocol.positionsByPool(pool, positionsLength.sub(bn(1)));
  };

  const getLastPositionByPoolAndTrader = async ({
    pool,
    trader,
  }: {
    pool: string;
    trader: string;
  }) => {
    const positionsLength = await protocol.getPositionsByPoolAndTraderLength(
      pool,
      trader,
    );
    return protocol.positionsByPoolAndTrader(
      pool,
      trader,
      positionsLength.sub(bn(1)),
    );
  };

  describe('when adding a trading pair', () => {
    it('sets new parameter', async () => {
      await protocol.addTradingPair(
        eur,
        jpy,
        initialSwapRateLong,
        initialSwapRateShort,
      );

      expect(await protocol.tradingPairWhitelist(eur, jpy)).to.be.true;
    });

    it('reverts when trading pair already whitelisted', async () => {
      await protocol.addTradingPair(
        eur,
        jpy,
        initialSwapRateLong,
        initialSwapRateShort,
      );

      await expectRevert(
        protocol.addTradingPair(
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
        protocol.addTradingPair(
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
        protocol.addTradingPair(
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
    const LONG = true;
    const SHORT = false;
    let newSwapRateLong: BN;
    let newSwapRateShort: BN;

    beforeEach(() => {
      newSwapRateLong = bn(123);
      newSwapRateShort = bn(456);
    });

    it('sets new currentSwapRate', async () => {
      await protocol.setCurrentSwapRateForPair(
        usd.address,
        eur,
        newSwapRateLong,
        newSwapRateShort,
      );
      const newStoredSwapRateLong = await protocol.currentSwapRates(
        usd.address,
        eur,
        LONG,
      );
      const newStoredSwapRateShort = await protocol.currentSwapRates(
        usd.address,
        eur,
        SHORT,
      );
      expect(newStoredSwapRateLong).to.be.bignumber.equals(newSwapRateLong);
      expect(newStoredSwapRateShort).to.be.bignumber.equals(newSwapRateShort);
    });

    it('allows only owner to set parameters', async () => {
      await expectRevert(
        protocol.setCurrentSwapRateForPair(
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
        protocol.setCurrentSwapRateForPair(
          usd.address,
          eur,
          0,
          newSwapRateShort,
        ),
        messages.settingZeroValueNotAllowed,
      );

      await expectRevert(
        protocol.setCurrentSwapRateForPair(
          usd.address,
          eur,
          newSwapRateLong,
          0,
        ),
        messages.settingZeroValueNotAllowed,
      );
    });
  });

  describe('when handling funds', () => {
    let depositInUsd: BN;
    let depositInIUsd: BN;
    let traderBalanceProtocolBefore: BN;
    let traderBalanceUsdBefore: BN;
    let moneyMarketBalanceBefore: BN;
    let protocolBalanceBefore: BN;
    let receipt: Truffle.TransactionResponse;

    beforeEach(async () => {
      depositInUsd = dollar(80);
      depositInIUsd = convertFromBaseToken(depositInUsd);

      traderBalanceProtocolBefore = await protocol.balances(
        liquidityPool.address,
        alice,
      );
      traderBalanceUsdBefore = await usd.balanceOf(alice);
      moneyMarketBalanceBefore = await usd.balanceOf(moneyMarket.address);
      protocolBalanceBefore = await iUsd.balanceOf(protocol.address);
    });

    describe('when depositing funds', () => {
      beforeEach(async () => {
        depositInUsd = dollar(80);

        receipt = await protocol.deposit(liquidityPool.address, depositInUsd, {
          from: alice,
        });
      });

      it('updates USD and iUSD balances correctly', async () => {
        const traderBalanceProtocolAfter = await protocol.balances(
          liquidityPool.address,
          alice,
        );
        const traderBalanceUsdAfter = await usd.balanceOf(alice);
        const moneyMarketBalanceAfter = await usd.balanceOf(
          moneyMarket.address,
        );
        const protocolBalanceAfter = await iUsd.balanceOf(protocol.address);

        expect(moneyMarketBalanceAfter).to.be.bignumber.equals(
          moneyMarketBalanceBefore.add(depositInUsd),
        );
        expect(traderBalanceUsdAfter).to.be.bignumber.equals(
          traderBalanceUsdBefore.sub(depositInUsd),
        );
        expect(traderBalanceProtocolAfter).to.be.bignumber.equals(
          traderBalanceProtocolBefore.add(depositInIUsd),
        );
        expect(protocolBalanceAfter).to.be.bignumber.equals(
          protocolBalanceBefore.add(depositInIUsd),
        );
      });

      it('emits Deposited event', async () => {
        await expectEvent(receipt, 'Deposited', {
          pool: liquidityPool.address,
          sender: alice,
          amount: depositInUsd,
        });
      });
    });

    describe('when withdrawing funds', () => {
      let withdrawInUsd: BN;
      let withdrawInIUsd: BN;

      beforeEach(async () => {
        depositInUsd = dollar(80);
        withdrawInUsd = dollar(40);
        withdrawInIUsd = convertFromBaseToken(withdrawInUsd);

        await protocol.deposit(liquidityPool.address, depositInUsd, {
          from: alice,
        });
        receipt = await protocol.withdraw(
          liquidityPool.address,
          withdrawInIUsd,
          {
            from: alice,
          },
        );
      });

      it('updates USD and iUSD balances correctly', async () => {
        const traderBalanceProtocolAfter = await protocol.balances(
          liquidityPool.address,
          alice,
        );
        const traderBalanceUsdAfter = await usd.balanceOf(alice);
        const moneyMarketBalanceAfter = await usd.balanceOf(
          moneyMarket.address,
        );
        const protocolBalanceAfter = await iUsd.balanceOf(protocol.address);

        expect(moneyMarketBalanceAfter).to.be.bignumber.equals(
          moneyMarketBalanceBefore.add(depositInUsd).sub(withdrawInUsd),
        );
        expect(traderBalanceUsdAfter).to.be.bignumber.equals(
          traderBalanceUsdBefore.sub(depositInUsd).add(withdrawInUsd),
        );
        expect(traderBalanceProtocolAfter).to.be.bignumber.equals(
          traderBalanceProtocolBefore.add(depositInIUsd).sub(withdrawInIUsd),
        );
        expect(protocolBalanceAfter).to.be.bignumber.equals(
          protocolBalanceBefore.add(depositInIUsd).sub(withdrawInIUsd),
        );
      });

      it('emits Withdrew event', async () => {
        await expectEvent(receipt, 'Withdrew', {
          sender: alice,
          amount: withdrawInUsd,
        });
      });
    });
  });

  const expectCorrectlyOpenedPosition = async ({
    id,
    expectedOwner,
    expectedPool,
    expectedLeverage,
    leveragedHeldInQuote,
    expectedSwapRate,
    expectedTimeWhenOpened,
    baseToken = usd.address,
    quoteToken = eur,
    receipt,
  }: {
    id: BN;
    expectedPool: string;
    expectedOwner: string;
    expectedLeverage: BN;
    leveragedHeldInQuote: BN;
    expectedSwapRate: BN;
    expectedTimeWhenOpened: BN;
    baseToken?: string;
    quoteToken?: string;
    receipt: Truffle.TransactionResponse;
  }) => {
    const position = await protocol.positionsById(id);
    const positionId = position['0'];
    const positionOwner = position['1'];
    const pool = position['2'];
    const { base } = position['3'];
    const { quote } = position['3'];
    const leverage = position['4'];
    const leveragedHeld = position['5'];
    const leveragedDebits = position['6'];
    const leveragedDebitsInUsd = position['7'];
    const marginHeld = position['8'];
    const swapRate = position['9'].value;
    const timeWhenOpened = position['10'];

    const tokenToInitialPrice: { [key: string]: BN } = {};
    tokenToInitialPrice[usd.address] = initialUsdPrice;
    tokenToInitialPrice[eur] = initialEurPrice;
    tokenToInitialPrice[jpy] = initialJpyPrice;

    const basePrice = await oracle.getPrice.call(baseToken);
    const quotePrice = await oracle.getPrice.call(quoteToken);
    const expectedPrice = quotePrice.mul(bn(1e18)).div(basePrice);

    const askPrice = expectedPrice.add(initialSpread);
    const bidPrice = expectedPrice.sub(initialSpread);

    const expectedLeveragedHeld = expectedLeverage.isNeg()
      ? leveragedHeldInQuote.mul(bn(-1))
      : leveragedHeldInQuote;
    const expectedLeveragedDebits = leveragedHeldInQuote.mul(
      leverage.isNeg() ? bidPrice : askPrice.mul(bn(-1)),
    );

    const usdPrice = await oracle.getPrice.call(usd.address);
    const baseInUsdPrice = basePrice.mul(bn(1e18)).div(usdPrice);

    const expectedLeveragedDebitsInUsd = expectedLeveragedDebits
      .mul(baseInUsdPrice)
      .div(bn(1e18));

    const expectedMarginHeld = expectedLeveragedDebitsInUsd.div(leverage).abs();

    expect(positionId).to.be.bignumber.equal(id);
    expect(positionOwner).to.be.bignumber.equal(expectedOwner);
    expect(pool).to.be.bignumber.equal(expectedPool);
    expect(base).to.be.bignumber.equal(baseToken);
    expect(quote).to.be.bignumber.equal(quoteToken);
    expect(leverage).to.be.bignumber.equal(expectedLeverage);
    expect(leveragedHeld).to.be.bignumber.equal(expectedLeveragedHeld);
    expect(leveragedDebits).to.be.bignumber.equal(
      fromEth(expectedLeveragedDebits),
    );

    expect(leveragedDebitsInUsd).to.be.bignumber.equal(
      fromEth(expectedLeveragedDebitsInUsd),
    );
    expect(marginHeld).to.be.bignumber.equal(fromEth(expectedMarginHeld));
    expect(swapRate).to.be.bignumber.equal(expectedSwapRate);
    expect(timeWhenOpened).to.be.bignumber.equal(expectedTimeWhenOpened);

    await expectEvent(receipt, 'PositionOpened', {
      positionId,
      sender: expectedOwner,
      liquidityPool: expectedPool,
      baseToken,
      quoteToken,
      leverage: expectedLeverage,
      leveragedDebitsInUsd,
      price: leverage.isNeg() ? bidPrice : askPrice,
    });

    expect(
      await protocolSafety.traderHasPaidDeposits(expectedPool, expectedOwner),
    ).to.be.true;

    const positionByPool = await getLastPositionByPool(expectedPool);
    const positionByPoolAndTrader = await getLastPositionByPoolAndTrader({
      pool: expectedPool,
      trader: expectedOwner,
    });

    expect(positionByPool).to.eql(position);
    expect(positionByPoolAndTrader).to.eql(position);
  };

  describe('when opening a position', () => {
    let leverage: BN;
    let depositInUsd: BN;
    let leveragedHeldInEuro: BN;
    let price: BN;

    beforeEach(async () => {
      leverage = bn(20);
      depositInUsd = dollar(80);
      leveragedHeldInEuro = euro(100);
      price = bn(0); // accept all

      await protocol.deposit(liquidityPool.address, depositInUsd, {
        from: alice,
      });
    });

    it('opens new position correctly', async () => {
      const receipt = await protocol.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage,
        leveragedHeldInEuro,
        price,
        { from: alice },
      );
      const expectedTimeWhenOpened = await time.latest();
      const positionId = (await protocol.nextPositionId()).sub(bn(1));

      await expectCorrectlyOpenedPosition({
        id: positionId,
        expectedOwner: alice,
        expectedPool: liquidityPool.address,
        expectedLeverage: leverage,
        leveragedHeldInQuote: leveragedHeldInEuro,
        expectedSwapRate: leverage.isNeg()
          ? initialSwapRateShort
          : initialSwapRateLong,
        expectedTimeWhenOpened,
        receipt,
      });
    });

    describe('when it is the first position for the trader', () => {
      beforeEach(async () => {
        await protocolSafety.withdrawTraderDeposits(liquidityPool.address, {
          from: alice,
        });
      });

      it('reverts the transaction', async () => {
        await expectRevert(
          protocol.openPosition(
            liquidityPool.address,
            usd.address,
            eur,
            leverage,
            leveragedHeldInEuro,
            price,
            { from: alice },
          ),
          messages.traderNotPaidDeposits,
        );
      });
    });

    for (const leverageValue of [1, -50]) {
      describe(`with ${leverageValue}x leverage`, () => {
        beforeEach(() => {
          leverage = bn(leverageValue);
          leveragedHeldInEuro = leverageValue === 1 ? euro(50) : euro(1000);
        });

        it('opens new position correctly', async () => {
          const receipt = await protocol.openPosition(
            liquidityPool.address,
            usd.address,
            eur,
            leverage,
            leveragedHeldInEuro,
            price,
            { from: alice },
          );
          const expectedTimeWhenOpened = await time.latest();
          const positionId = (await protocol.nextPositionId()).sub(bn(1));

          await expectCorrectlyOpenedPosition({
            id: positionId,
            expectedOwner: alice,
            expectedPool: liquidityPool.address,
            expectedLeverage: leverage,
            leveragedHeldInQuote: leveragedHeldInEuro,
            expectedSwapRate: leverage.isNeg()
              ? initialSwapRateShort
              : initialSwapRateLong,
            expectedTimeWhenOpened,
            receipt,
          });
        });
      });
    }

    describe('when the trading pair has no USD', () => {
      beforeEach(() => {
        leverage = bn(1);
        leveragedHeldInEuro = euro(10);
      });

      it('opens new position correctly', async () => {
        const receipt = await protocol.openPosition(
          liquidityPool.address,
          jpy,
          eur,
          leverage,
          leveragedHeldInEuro,
          price,
          { from: alice },
        );
        const expectedTimeWhenOpened = await time.latest();
        const positionId = (await protocol.nextPositionId()).sub(bn(1));

        await expectCorrectlyOpenedPosition({
          id: positionId,
          expectedOwner: alice,
          expectedPool: liquidityPool.address,
          expectedLeverage: leverage,
          leveragedHeldInQuote: leveragedHeldInEuro,
          expectedSwapRate: leverage.isNeg()
            ? initialSwapRateShort
            : initialSwapRateLong,
          expectedTimeWhenOpened,
          receipt,
          baseToken: jpy,
          quoteToken: eur,
        });
      });
    });

    describe('when there are multiple pools', () => {
      let liquidityPool2: MarginLiquidityPoolInstance;

      beforeEach(async () => {
        liquidityPool2 = await MarginLiquidityPool.new();
        await (liquidityPool2 as any).initialize(
          moneyMarket.address,
          protocol.address,
        );
        await liquidityPool2.approveToProtocol(constants.MAX_UINT256);
        await usd.approve(liquidityPool2.address, constants.MAX_UINT256);
        await liquidityPool2.enableToken(usd.address, eur, initialSpread);
        await liquidityPool2.enableToken(eur, usd.address, initialSpread);
        await liquidityPool2.enableToken(eur, jpy, initialSpread);
        await liquidityPool2.enableToken(jpy, eur, initialSpread);

        const feeSum = (
          await liquidityPoolRegistry.LIQUIDITY_POOL_LIQUIDATION_FEE()
        ).add(await liquidityPoolRegistry.LIQUIDITY_POOL_MARGIN_CALL_FEE());
        await usd.approve(liquidityPoolRegistry.address, feeSum, {
          from: liquidityProvider,
        });
        await liquidityPoolRegistry.registerPool(liquidityPool2.address, {
          from: liquidityProvider,
        });
        await liquidityPoolRegistry.verifyPool(liquidityPool2.address);

        await protocol.deposit(liquidityPool2.address, depositInUsd, {
          from: alice,
        });

        await protocolSafety.payTraderDeposits(liquidityPool2.address, {
          from: alice,
        });
        await protocolSafety.payTraderDeposits(liquidityPool2.address, {
          from: bob,
        });
      });

      it('opens new position correctly in both pools', async () => {
        const receipt1 = await protocol.openPosition(
          liquidityPool.address,
          jpy,
          eur,
          leverage,
          leveragedHeldInEuro,
          price,
          { from: alice },
        );
        const expectedTimeWhenOpened1 = await time.latest();
        const positionId1 = (await protocol.nextPositionId()).sub(bn(1));
        const receipt2 = await protocol.openPosition(
          liquidityPool2.address,
          jpy,
          eur,
          leverage,
          leveragedHeldInEuro,
          price,
          { from: alice },
        );
        const expectedTimeWhenOpened2 = await time.latest();
        const positionId2 = (await protocol.nextPositionId()).sub(bn(1));

        await expectCorrectlyOpenedPosition({
          id: positionId1,
          expectedOwner: alice,
          expectedPool: liquidityPool.address,
          expectedLeverage: leverage,
          leveragedHeldInQuote: leveragedHeldInEuro,
          expectedSwapRate: leverage.isNeg()
            ? initialSwapRateShort
            : initialSwapRateLong,
          expectedTimeWhenOpened: expectedTimeWhenOpened1,
          receipt: receipt1,
          baseToken: jpy,
          quoteToken: eur,
        });

        await expectCorrectlyOpenedPosition({
          id: positionId2,
          expectedOwner: alice,
          expectedPool: liquidityPool2.address,
          expectedLeverage: leverage,
          leveragedHeldInQuote: leveragedHeldInEuro,
          expectedSwapRate: leverage.isNeg()
            ? initialSwapRateShort
            : initialSwapRateLong,
          expectedTimeWhenOpened: expectedTimeWhenOpened2,
          receipt: receipt2,
          baseToken: jpy,
          quoteToken: eur,
        });
      });
    });

    describe('when there is not enough free margin left', () => {
      beforeEach(async () => {
        await protocol.withdraw(
          liquidityPool.address,
          convertFromBaseToken(depositInUsd.sub(dollar(1))),
          {
            from: alice,
          },
        );
      });

      it('reverts the transaction', async () => {
        await expectRevert(
          protocol.openPosition(
            liquidityPool.address,
            usd.address,
            eur,
            leverage,
            leveragedHeldInEuro,
            price,
            { from: alice },
          ),
          messages.notEnoughFreeMarginOpenPosition,
        );
      });
    });

    describe('when the leverage is too small', () => {
      beforeEach(async () => {
        leveragedHeldInEuro = bn(100);
        await protocol.setMinLeverage(5);
      });

      describe('when given a short', () => {
        beforeEach(() => {
          leverage = bn(-3);
        });

        it('reverts the transaction', async () => {
          await expectRevert(
            protocol.openPosition(
              liquidityPool.address,
              usd.address,
              eur,
              leverage,
              leveragedHeldInEuro,
              price,
              { from: alice },
            ),
            messages.leverageTooSmall,
          );
        });
      });

      describe('when given a long', () => {
        beforeEach(() => {
          leverage = bn(3);
        });

        it('reverts the transaction', async () => {
          await expectRevert(
            protocol.openPosition(
              liquidityPool.address,
              usd.address,
              eur,
              leverage,
              leveragedHeldInEuro,
              price,
              { from: alice },
            ),
            messages.leverageTooSmall,
          );
        });
      });
    });

    describe('when the leverage is too big', () => {
      beforeEach(async () => {
        leveragedHeldInEuro = bn(100);
        await protocol.setMaxLeverage(10);
      });

      describe('when given a short', () => {
        beforeEach(() => {
          leverage = bn(-11);
        });

        it('reverts the transaction', async () => {
          await expectRevert(
            protocol.openPosition(
              liquidityPool.address,
              usd.address,
              eur,
              leverage,
              leveragedHeldInEuro,
              price,
              { from: alice },
            ),
            messages.leverageTooBig,
          );
        });
      });

      describe('when given a long', () => {
        beforeEach(() => {
          leverage = bn(11);
        });

        it('reverts the transaction', async () => {
          await expectRevert(
            protocol.openPosition(
              liquidityPool.address,
              usd.address,
              eur,
              leverage,
              leveragedHeldInEuro,
              price,
              { from: alice },
            ),
            messages.leverageTooBig,
          );
        });
      });
    });

    describe('when the leverage amount is too small', () => {
      beforeEach(() => {
        leveragedHeldInEuro = bn(1);
      });

      it('reverts the transaction', async () => {
        await expectRevert(
          protocol.openPosition(
            liquidityPool.address,
            usd.address,
            eur,
            leverage,
            leveragedHeldInEuro,
            price,
            { from: alice },
          ),
          messages.leverageAmountTooSmall,
        );
      });
    });

    describe('when passing a max price that is too high', () => {
      beforeEach(() => {
        price = initialEurPrice;
      });

      it('reverts the transaction', async () => {
        await expectRevert(
          protocol.openPosition(
            liquidityPool.address,
            usd.address,
            eur,
            leverage,
            leveragedHeldInEuro,
            price,
            { from: alice },
          ),
          messages.marginAskPriceTooHigh,
        );
      });
    });

    describe('when passing a min price that is too low', () => {
      beforeEach(() => {
        price = initialEurPrice;
      });

      it('reverts the transaction', async () => {
        await expectRevert(
          protocol.openPosition(
            liquidityPool.address,
            usd.address,
            eur,
            leverage.mul(bn(-1)),
            leveragedHeldInEuro,
            price,
            { from: alice },
          ),
          messages.marginBidPriceTooLow,
        );
      });
    });
  });

  const expectCorrectlyClosedPosition = async ({
    id,
    expectedOwner,
    expectedPool,
    expectedLeverage,
    traderBalanceBefore,
    poolLiquidityBefore,
    poolBalanceBefore,
    leveragedHeldInQuote,
    initialAskPrice,
    initialBidPrice,
    receipt,
    baseToken = usd.address,
    quoteToken = eur,
    useMaxRealizable = false,
  }: {
    id: BN;
    expectedPool: string;
    expectedOwner: string;
    expectedLeverage: BN;
    leveragedHeldInQuote: BN;
    traderBalanceBefore: BN;
    poolLiquidityBefore: BN;
    poolBalanceBefore: BN;
    initialAskPrice: BN;
    initialBidPrice: BN;
    receipt: Truffle.TransactionResponse;
    baseToken?: string;
    quoteToken?: string;
    useMaxRealizable?: boolean;
  }) => {
    const position = await protocol.positionsById(id);

    const tokenToInitialPrice: { [key: string]: BN } = {};
    tokenToInitialPrice[usd.address] = initialUsdPrice;
    tokenToInitialPrice[eur] = initialEurPrice;
    tokenToInitialPrice[jpy] = initialJpyPrice;

    const basePrice = await oracle.getPrice.call(baseToken);
    const quotePrice = await oracle.getPrice.call(quoteToken);
    const expectedPrice = quotePrice.mul(bn(1e18)).div(basePrice);

    const askPrice = expectedPrice.add(initialSpread);
    const bidPrice = expectedPrice.sub(initialSpread);

    const traderBalanceAfter = await protocol.balances(expectedPool, alice);
    const traderBalanceDifference = traderBalanceAfter.sub(traderBalanceBefore);

    const leveragedDebits = fromEth(
      leveragedHeldInQuote.mul(
        !expectedLeverage.isNeg() ? initialAskPrice : initialBidPrice,
      ),
    );
    const currentPrice = !expectedLeverage.isNeg() ? bidPrice : askPrice;
    const openPrice = leveragedDebits.mul(bn(1e18)).div(leveragedHeldInQuote);
    const usdPrice = await oracle.getPrice.call(usd.address);
    const baseInUsdPrice = basePrice.mul(bn(1e18)).div(usdPrice);

    // unrealizedPlOfPosition = (currentPrice - openPrice) * leveragedHeld * to_usd_price
    const expectedPl = fromEth(
      currentPrice
        .sub(openPrice)
        .mul(leveragedHeldInQuote)
        .mul(baseInUsdPrice)
        .div(bn(1e18))
        .mul(expectedLeverage.isNeg() ? bn(-1) : bn(1)),
    );

    const unrealized = expectedPl.mul(bn(2));
    const equity = convertToBaseToken(traderBalanceBefore).add(unrealized);
    const maxRealizableLoss = convertFromBaseToken(
      equity.sub(expectedPl).mul(bn(-1)),
    );
    const maxRealizableProfit = poolLiquidityBefore;
    const maxRealizable = expectedPl.isNeg()
      ? maxRealizableLoss
      : maxRealizableProfit;

    expect(traderBalanceDifference).to.be.bignumber.equal(
      useMaxRealizable ? maxRealizable : convertFromBaseToken(expectedPl),
    );

    const usedLiquidtyPool = await MarginLiquidityPool.at(expectedPool);
    const poolBalanceAfter = await protocol.balances(
      expectedPool,
      expectedPool,
    );
    const poolBalanceDifference = poolBalanceAfter.sub(poolBalanceBefore);
    const expectedPoolBalanceDifference = convertFromBaseToken(
      expectedPl.mul(bn(-1)),
    );

    if (expectedPl.isNeg())
      expect(poolBalanceDifference).to.be.bignumber.equal(
        useMaxRealizable
          ? maxRealizable.mul(bn(-1))
          : expectedPoolBalanceDifference,
      );
    else {
      const poolLiquidityAfter = await usedLiquidtyPool.getLiquidity.call();
      const poolLiquidityDifference = poolLiquidityAfter.sub(
        poolLiquidityBefore,
      );

      expect(poolBalanceAfter).to.be.bignumber.equal(bn(0));
      expect(poolLiquidityDifference).to.be.bignumber.equal(
        useMaxRealizable
          ? maxRealizable.mul(bn(-1))
          : expectedPoolBalanceDifference,
      );
    }

    await expectEvent(receipt, 'PositionClosed', {
      positionId: id,
      sender: expectedOwner,
      liquidityPool: expectedPool,
      baseToken,
      quoteToken,
      realizedPl: expectedPl,
      price: expectedLeverage.isNeg() ? askPrice : bidPrice,
    });

    if (!useMaxRealizable) {
      // two positions opened in max realizable test
      await expectRevert.unspecified(getLastPositionByPool(expectedPool));
      await expectRevert.unspecified(
        getLastPositionByPoolAndTrader({
          pool: expectedPool,
          trader: expectedOwner,
        }),
      );
    }

    expect(position['0']).to.be.bignumber.equal(bn(0));
  };

  describe('when closing a position', () => {
    let leverage: BN;
    let depositInUsd: BN;
    let leveragedHeldInEuro: BN;
    let price: BN;
    let initialAskPrice: BN;
    let initialBidPrice: BN;
    let positionId: BN;
    let traderBalanceBefore: BN;
    let poolLiquidityBefore: BN;
    let poolBalanceBefore: BN;
    let receipt: Truffle.TransactionResponse;

    beforeEach(async () => {
      leverage = bn(20);
      depositInUsd = dollar(80);
      leveragedHeldInEuro = euro(100);
      price = bn(0); // accept all

      await protocol.deposit(liquidityPool.address, depositInUsd, {
        from: alice,
      });

      traderBalanceBefore = await protocol.balances(
        liquidityPool.address,
        alice,
      );
      poolLiquidityBefore = await liquidityPool.getLiquidity.call();
      poolBalanceBefore = await protocol.balances(
        liquidityPool.address,
        liquidityPool.address,
      );

      const basePrice = await oracle.getPrice.call(usd.address);
      const quotePrice = await oracle.getPrice.call(eur);
      const expectedPrice = quotePrice.mul(bn(1e18)).div(basePrice);
      initialAskPrice = expectedPrice.add(initialSpread);
      initialBidPrice = expectedPrice.sub(initialSpread);
    });

    describe('when USD is the base pair', () => {
      beforeEach(async () => {
        await protocol.openPosition(
          liquidityPool.address,
          usd.address,
          eur,
          leverage,
          leveragedHeldInEuro,
          price,
          { from: alice },
        );
        positionId = (await protocol.nextPositionId()).sub(bn(1));
      });

      it('computes new balance correctly when immediately closing', async () => {
        receipt = await protocol.closePosition(positionId, price, {
          from: alice,
        });

        await expectCorrectlyClosedPosition({
          id: positionId,
          expectedOwner: alice,
          expectedPool: liquidityPool.address,
          expectedLeverage: leverage,
          leveragedHeldInQuote: leveragedHeldInEuro,
          traderBalanceBefore,
          poolLiquidityBefore,
          poolBalanceBefore,
          initialAskPrice,
          initialBidPrice,
          receipt,
        });
      });

      it('computes new balance correctly after a price drop', async () => {
        await oracle.feedPrice(eur, fromPercent(100), { from: owner });
        receipt = await protocol.closePosition(positionId, price, {
          from: alice,
        });

        await expectCorrectlyClosedPosition({
          id: positionId,
          expectedOwner: alice,
          expectedPool: liquidityPool.address,
          expectedLeverage: leverage,
          leveragedHeldInQuote: leveragedHeldInEuro,
          traderBalanceBefore,
          poolLiquidityBefore,
          poolBalanceBefore,
          initialAskPrice,
          initialBidPrice,
          receipt,
        });
      });

      describe('when the price increases', () => {
        beforeEach(async () => {
          await oracle.feedPrice(eur, fromPercent(200), { from: owner });
          receipt = await protocol.closePosition(positionId, price, {
            from: alice,
          });
        });

        it('computes new balance correctly', async () => {
          await expectCorrectlyClosedPosition({
            id: positionId,
            expectedOwner: alice,
            expectedPool: liquidityPool.address,
            expectedLeverage: leverage,
            leveragedHeldInQuote: leveragedHeldInEuro,
            traderBalanceBefore,
            poolLiquidityBefore,
            poolBalanceBefore,
            initialAskPrice,
            initialBidPrice,
            receipt,
          });
        });

        it('allows to withdraw all profits', async () => {
          const usdBalanceAliceBefore = await usd.balanceOf(alice);
          const baseTokenBalanceAlice = convertToBaseToken(
            await protocol.balances(liquidityPool.address, alice),
          );

          await protocol.withdraw(
            liquidityPool.address,
            convertFromBaseToken(baseTokenBalanceAlice),
            { from: alice },
          );

          const usdBalanceAliceAfter = await usd.balanceOf(alice);

          expect(usdBalanceAliceAfter).to.be.bignumber.equal(
            usdBalanceAliceBefore.add(baseTokenBalanceAlice),
          );
        });
      });
    });

    describe('when the trading pair has no USD', () => {
      beforeEach(async () => {
        const basePrice = await oracle.getPrice.call(jpy);
        const quotePrice = await oracle.getPrice.call(eur);
        const expectedPrice = quotePrice.mul(bn(1e18)).div(basePrice);
        initialAskPrice = expectedPrice.add(initialSpread);
        initialBidPrice = expectedPrice.sub(initialSpread);

        await protocol.openPosition(
          liquidityPool.address,
          jpy,
          eur,
          leverage,
          leveragedHeldInEuro,
          price,
          { from: alice },
        );
        positionId = (await protocol.nextPositionId()).sub(bn(1));
      });

      it('computes new balance correctly when immediately closing', async () => {
        await oracle.feedPrice(eur, fromPercent(100), { from: owner });
        receipt = await protocol.closePosition(positionId, price, {
          from: alice,
        });

        await expectCorrectlyClosedPosition({
          id: positionId,
          expectedOwner: alice,
          expectedPool: liquidityPool.address,
          expectedLeverage: leverage,
          leveragedHeldInQuote: leveragedHeldInEuro,
          traderBalanceBefore,
          poolLiquidityBefore,
          poolBalanceBefore,
          initialAskPrice,
          initialBidPrice,
          baseToken: jpy,
          quoteToken: eur,
          receipt,
        });
      });

      it('computes new balance correctly after a price drop', async () => {
        await oracle.feedPrice(eur, fromPercent(100), { from: owner });
        receipt = await protocol.closePosition(positionId, price, {
          from: alice,
        });

        await expectCorrectlyClosedPosition({
          id: positionId,
          expectedOwner: alice,
          expectedPool: liquidityPool.address,
          expectedLeverage: leverage,
          leveragedHeldInQuote: leveragedHeldInEuro,
          traderBalanceBefore,
          poolLiquidityBefore,
          poolBalanceBefore,
          initialAskPrice,
          initialBidPrice,
          baseToken: jpy,
          quoteToken: eur,
          receipt,
        });
      });

      it('computes new balance correctly after a price increase', async () => {
        await oracle.feedPrice(eur, fromPercent(200), { from: owner });
        receipt = await protocol.closePosition(positionId, price, {
          from: alice,
        });

        await expectCorrectlyClosedPosition({
          id: positionId,
          expectedOwner: alice,
          expectedPool: liquidityPool.address,
          expectedLeverage: leverage,
          leveragedHeldInQuote: leveragedHeldInEuro,
          traderBalanceBefore,
          poolLiquidityBefore,
          poolBalanceBefore,
          initialAskPrice,
          initialBidPrice,
          baseToken: jpy,
          quoteToken: eur,
          receipt,
        });
      });
    });

    describe('when there are multiple pools', () => {
      let liquidityPool2: MarginLiquidityPoolInstance;
      let poolLiquidityBefore2: BN;
      let positionId1: BN;
      let positionId2: BN;

      beforeEach(async () => {
        liquidityPool2 = await MarginLiquidityPool.new();
        await (liquidityPool2 as any).initialize(
          moneyMarket.address,
          protocol.address,
        );
        await liquidityPool2.approveToProtocol(constants.MAX_UINT256);
        await usd.approve(liquidityPool2.address, constants.MAX_UINT256);
        await liquidityPool2.enableToken(usd.address, eur, initialSpread);
        await liquidityPool2.enableToken(eur, usd.address, initialSpread);
        await liquidityPool2.enableToken(eur, jpy, initialSpread);
        await liquidityPool2.enableToken(jpy, eur, initialSpread);

        const feeSum = (
          await liquidityPoolRegistry.LIQUIDITY_POOL_LIQUIDATION_FEE()
        ).add(await liquidityPoolRegistry.LIQUIDITY_POOL_MARGIN_CALL_FEE());
        await usd.approve(liquidityPoolRegistry.address, feeSum, {
          from: liquidityProvider,
        });
        await liquidityPoolRegistry.registerPool(liquidityPool2.address, {
          from: liquidityProvider,
        });
        await liquidityPoolRegistry.verifyPool(liquidityPool2.address);

        await protocol.deposit(liquidityPool2.address, depositInUsd, {
          from: alice,
        });
        await protocolSafety.payTraderDeposits(liquidityPool2.address, {
          from: alice,
        });

        const basePrice = await oracle.getPrice.call(jpy);
        const quotePrice = await oracle.getPrice.call(eur);
        const expectedPrice = quotePrice.mul(bn(1e18)).div(basePrice);
        initialAskPrice = expectedPrice.add(initialSpread);
        initialBidPrice = expectedPrice.sub(initialSpread);

        poolLiquidityBefore2 = await liquidityPool2.getLiquidity.call();

        await protocol.openPosition(
          liquidityPool.address,
          jpy,
          eur,
          leverage,
          leveragedHeldInEuro,
          price,
          { from: alice },
        );
        positionId1 = (await protocol.nextPositionId()).sub(bn(1));
        await protocol.openPosition(
          liquidityPool2.address,
          jpy,
          eur,
          leverage,
          leveragedHeldInEuro,
          price,
          { from: alice },
        );
        positionId2 = (await protocol.nextPositionId()).sub(bn(1));
      });

      it('closes position correctly in both pools', async () => {
        const receipt1 = await protocol.closePosition(positionId1, price, {
          from: alice,
        });
        await expectCorrectlyClosedPosition({
          id: positionId1,
          expectedOwner: alice,
          expectedPool: liquidityPool.address,
          expectedLeverage: leverage,
          leveragedHeldInQuote: leveragedHeldInEuro,
          traderBalanceBefore,
          poolLiquidityBefore,
          poolBalanceBefore,
          initialAskPrice,
          initialBidPrice,
          baseToken: jpy,
          quoteToken: eur,
          receipt: receipt1,
        });

        const receipt2 = await protocol.closePosition(positionId2, price, {
          from: alice,
        });

        await expectCorrectlyClosedPosition({
          id: positionId2,
          expectedOwner: alice,
          expectedPool: liquidityPool2.address,
          expectedLeverage: leverage,
          leveragedHeldInQuote: leveragedHeldInEuro,
          traderBalanceBefore,
          poolLiquidityBefore: poolLiquidityBefore2,
          poolBalanceBefore,
          initialAskPrice,
          initialBidPrice,
          baseToken: jpy,
          quoteToken: eur,
          receipt: receipt2,
        });
      });
    });

    describe('when the trader has a loss', () => {
      beforeEach(async () => {
        await protocol.openPosition(
          liquidityPool.address,
          usd.address,
          eur,
          leverage,
          leveragedHeldInEuro,
          price,
          { from: alice },
        );
        await protocol.openPosition(
          liquidityPool.address,
          usd.address,
          eur,
          leverage,
          leveragedHeldInEuro,
          price,
          { from: alice },
        );
        positionId = (await protocol.nextPositionId()).sub(bn(1));
      });

      describe("when the loss is greater than trader's whole equity", () => {
        beforeEach(async () => {
          await oracle.feedPrice(eur, fromPercent(50), { from: owner });
        });

        it('does not send money to the pool', async () => {
          receipt = await protocol.closePosition(positionId, price, {
            from: alice,
          });

          await expectCorrectlyClosedPosition({
            id: positionId,
            expectedOwner: alice,
            expectedPool: liquidityPool.address,
            expectedLeverage: leverage,
            leveragedHeldInQuote: leveragedHeldInEuro,
            traderBalanceBefore,
            poolLiquidityBefore,
            poolBalanceBefore,
            initialAskPrice,
            initialBidPrice,
            receipt,
            useMaxRealizable: true,
          });
        });
      });

      describe('when the loss covered by another position', () => {
        beforeEach(async () => {
          await protocol.setMaxLeverage(leverage.mul(bn(4)));
          await protocol.openPosition(
            liquidityPool.address,
            usd.address,
            eur,
            leverage.mul(bn(-4)),
            leveragedHeldInEuro,
            price,
            { from: alice },
          );

          await oracle.feedPrice(eur, fromPercent(10), { from: owner });
        });

        it('results in a negative trader balance', async () => {
          await protocol.closePosition(positionId, price, {
            from: alice,
          });
          await protocol.closePosition(positionId.sub(bn(1)), price, {
            from: alice,
          });

          const traderBalanceAfter = await protocol.balances(
            liquidityPool.address,
            alice,
          );
          expect(traderBalanceAfter).to.be.bignumber.below(bn(0));
        });
      });
    });

    describe('when the trader has a profit and the pool has not enough liquidity', () => {
      beforeEach(async () => {
        leverage = bn(20);
        leveragedHeldInEuro = euro(1000);

        await protocol.openPosition(
          liquidityPool.address,
          usd.address,
          eur,
          leverage,
          leveragedHeldInEuro,
          price,
          { from: alice },
        );
        positionId = (await protocol.nextPositionId()).sub(bn(1));

        await liquidityPool.withdrawLiquidityOwner(
          convertFromBaseToken(dollar(19000)),
        );
        poolLiquidityBefore = await liquidityPool.getLiquidity.call();
      });

      it("only increases trader's balance by the pool's available liquidity", async () => {
        await oracle.feedPrice(eur, fromPercent(300), { from: owner });
        receipt = await protocol.closePosition(positionId, price, {
          from: alice,
        });

        await expectCorrectlyClosedPosition({
          id: positionId,
          expectedOwner: alice,
          expectedPool: liquidityPool.address,
          expectedLeverage: leverage,
          leveragedHeldInQuote: leveragedHeldInEuro,
          traderBalanceBefore,
          poolLiquidityBefore,
          poolBalanceBefore,
          initialAskPrice,
          initialBidPrice,
          receipt,
          useMaxRealizable: true,
        });
      });
    });

    describe('when the sender is not the owner of the position', () => {
      beforeEach(async () => {
        await protocol.openPosition(
          liquidityPool.address,
          usd.address,
          eur,
          leverage,
          leveragedHeldInEuro,
          0,
          { from: alice },
        );
        positionId = (await protocol.nextPositionId()).sub(bn(1));
      });

      it('reverts the transaction', async () => {
        await expectRevert(
          protocol.closePosition(positionId, price, {
            from: bob,
          }),
          messages.incorrectOwnerClosePosition,
        );
      });
    });

    describe('when passing a max price that is too high', () => {
      beforeEach(async () => {
        price = initialEurPrice;

        await protocol.openPosition(
          liquidityPool.address,
          usd.address,
          eur,
          leverage,
          leveragedHeldInEuro,
          0,
          { from: alice },
        );
        positionId = (await protocol.nextPositionId()).sub(bn(1));
      });

      it('reverts the transaction', async () => {
        await expectRevert(
          protocol.closePosition(positionId, price, {
            from: alice,
          }),
          messages.marginBidPriceTooLow,
        );
      });
    });

    describe('when passing a min price that is too low', () => {
      beforeEach(async () => {
        price = initialEurPrice;

        await protocol.openPosition(
          liquidityPool.address,
          usd.address,
          eur,
          leverage.mul(bn(-1)),
          leveragedHeldInEuro,
          0,
          { from: alice },
        );
        positionId = (await protocol.nextPositionId()).sub(bn(1));
      });

      it('reverts the transaction', async () => {
        await expectRevert(
          protocol.closePosition(positionId, price, {
            from: alice,
          }),
          messages.marginAskPriceTooHigh,
        );
      });
    });

    for (const leverageValue of [1, -50]) {
      describe(`with ${leverageValue}x leverage`, () => {
        beforeEach(async () => {
          leverage = bn(leverageValue);
          leveragedHeldInEuro = leverageValue === 1 ? euro(50) : euro(1000);

          await protocol.openPosition(
            liquidityPool.address,
            usd.address,
            eur,
            leverage,
            leveragedHeldInEuro,
            0,
            { from: alice },
          );
          positionId = (await protocol.nextPositionId()).sub(bn(1));
        });

        it('closes new position correctly', async () => {
          receipt = await protocol.closePosition(positionId, price, {
            from: alice,
          });

          await expectCorrectlyClosedPosition({
            id: positionId,
            expectedOwner: alice,
            expectedPool: liquidityPool.address,
            expectedLeverage: leverage,
            leveragedHeldInQuote: leveragedHeldInEuro,
            traderBalanceBefore,
            poolLiquidityBefore,
            poolBalanceBefore,
            initialAskPrice,
            initialBidPrice,
            receipt,
          });
        });
      });
    }
  });

  describe('when there are some positions in the pool', () => {
    let leveragedHelds: [BN, BN, BN, BN];
    let leverages: [BN, BN, BN, BN];
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

      leveragedHelds = [euro(10), euro(5), euro(4), euro(2)];
      leverages = [bn(20), bn(-20), bn(-5), bn(20)];

      for (let i = 0; i < leverages.length; i += 1) {
        const leverage = leverages[i];
        const leveragedHeld = leveragedHelds[i];

        await protocol.openPosition(
          liquidityPool.address,
          usd.address,
          eur,
          leverage,
          leveragedHeld,
          0,
          { from: i === 3 ? bob : alice },
        );
      }
    });

    describe('when getting accumulated margin held of a trader', () => {
      it('should return the correct value', async () => {
        const marginHeldAlice = await protocol.getMarginHeld(
          liquidityPool.address,
          alice,
        );
        const marginHeldBob = await protocol.getMarginHeld(
          liquidityPool.address,
          bob,
        );

        const prices = { askPrice: initialAskPrice, bidPrice: initialBidPrice };

        const expectedMarginHeldAlice = leverages
          .slice(0, -1)
          .reduce((accValue, leverage, i) => {
            const leveragedHeld = leveragedHelds[i];
            const leveragedDebitAlice = getLeveragedDebits({
              leveragedHeld,
              leverage,
              ...prices,
            });

            return accValue.add(leveragedDebitAlice.div(leverage).abs());
          }, bn(0));
        const leveragedDebitBob = getLeveragedDebits({
          leveragedHeld: leveragedHelds[3],
          leverage: leverages[3],
          ...prices,
        });
        const expectedMarginHeldBob = leveragedDebitBob.div(leverages[3]).abs();

        expect(marginHeldAlice).to.be.bignumber.equal(expectedMarginHeldAlice);
        expect(marginHeldBob).to.be.bignumber.equal(expectedMarginHeldBob);
      });
    });

    describe('when getting the free margin of a trader', () => {
      it('should return the correct value', async () => {
        const freeMarginAlice = await protocol.getFreeMargin.call(
          liquidityPool.address,
          alice,
        );
        const freeMarginBob = await protocol.getFreeMargin.call(
          liquidityPool.address,
          bob,
        );

        const marginHeldAlice = await protocol.getMarginHeld(
          liquidityPool.address,
          alice,
        );
        const marginHeldBob = await protocol.getMarginHeld(
          liquidityPool.address,
          bob,
        );
        const equityAlice = await protocol.getEquityOfTrader.call(
          liquidityPool.address,
          alice,
        );
        const equityBob = await protocol.getEquityOfTrader.call(
          liquidityPool.address,
          bob,
        );

        const expectedFreeMarginAlice = equityAlice.sub(marginHeldAlice);
        const expectedFreeMarginBob = equityBob.sub(marginHeldBob);

        expect(freeMarginAlice).to.be.bignumber.equal(expectedFreeMarginAlice);
        expect(freeMarginBob).to.be.bignumber.equal(expectedFreeMarginBob);
      });

      describe('when the equity is less that the margin held', () => {
        beforeEach(async () => {
          await protocol.openPosition(
            liquidityPool.address,
            usd.address,
            eur,
            1,
            euro(800),
            0,
            { from: alice },
          );

          await oracle.feedPrice(eur, fromPercent(100), { from: owner });
        });

        it('should return 0', async () => {
          const freeMarginAlice = await protocol.getFreeMargin.call(
            liquidityPool.address,
            alice,
          );

          expect(freeMarginAlice).to.be.bignumber.equal(bn(0));
        });
      });
    });
  });

  describe('when computing unrealized profit loss along with market price', () => {
    for (const leverage of [bn(1), bn(20), bn(-50)]) {
      let askPrice: BN;
      let bidPrice: BN;
      let leveragedHeldInEuro: BN;
      let leveragedDebits: BN;
      let maxPrice: BN;

      const getExpectedPlAndCurrentPrice = async () => {
        const currentPrice = await protocol[
          !leverage.isNeg() ? 'getBidPrice' : 'getAskPrice'
        ].call(liquidityPool.address, usd.address, eur, 0);
        const openPrice = leveragedDebits
          .mul(bn(1e18))
          .div(leveragedHeldInEuro)
          .abs();
        // unrealizedPlOfPosition = (currentPrice - openPrice) * leveragedHeld * to_usd_price
        const expectedPl = fromEth(
          currentPrice.sub(openPrice).mul(leveragedHeldInEuro),
        );

        return { expectedPl, currentPrice };
      };

      describe(`when leverage is ${leverage.toString()}`, () => {
        beforeEach(async () => {
          askPrice = await protocol.getAskPrice.call(
            liquidityPool.address,
            usd.address,
            eur,
            0,
          );

          bidPrice = await protocol.getBidPrice.call(
            liquidityPool.address,
            usd.address,
            eur,
            0,
          );

          leveragedHeldInEuro = euro(100).mul(
            !leverage.isNeg() ? bn(1) : bn(-1),
          );
          leveragedDebits = fromEth(
            leveragedHeldInEuro.mul(!leverage.isNeg() ? askPrice : bidPrice),
          ).mul(bn(-1));
          maxPrice = bn(0);
        });

        it('should return correct unrealized PL at the beginning of a new position', async () => {
          const unrealizedPl = await protocol.getUnrealizedPlAndMarketPriceOfPosition.call(
            liquidityPool.address,
            usd.address,
            eur,
            leverage,
            leveragedHeldInEuro,
            leveragedDebits,
            maxPrice,
          );
          const {
            currentPrice,
            expectedPl,
          } = await getExpectedPlAndCurrentPrice();

          expect(unrealizedPl['0']).to.be.bignumber.equal(expectedPl);
          expect(unrealizedPl['1']).to.be.bignumber.equal(currentPrice);
        });

        it('should return correct unrealized PL after a profit', async () => {
          await oracle.feedPrice(eur, fromPercent(240), { from: owner });

          const newPrice: BN = await protocol[
            !leverage.isNeg() ? 'getBidPrice' : 'getAskPrice'
          ].call(liquidityPool.address, usd.address, eur, 0);

          const unrealizedPl = await protocol.getUnrealizedPlAndMarketPriceOfPosition.call(
            liquidityPool.address,
            usd.address,
            eur,
            leverage,
            leveragedHeldInEuro,
            leveragedDebits,
            maxPrice,
          );
          const { expectedPl } = await getExpectedPlAndCurrentPrice();

          expect(unrealizedPl['0']).to.be.bignumber.equal(expectedPl);
          expect(unrealizedPl['1']).to.be.bignumber.equal(newPrice);
        });

        it('should return correct unrealized PL after a loss', async () => {
          await oracle.feedPrice(eur, fromPercent(60), { from: owner });

          const newPrice: BN = await protocol[
            !leverage.isNeg() ? 'getBidPrice' : 'getAskPrice'
          ].call(liquidityPool.address, usd.address, eur, 0);

          const unrealizedPl = await protocol.getUnrealizedPlAndMarketPriceOfPosition.call(
            liquidityPool.address,
            usd.address,
            eur,
            leverage,
            leveragedHeldInEuro,
            leveragedDebits,
            maxPrice,
          );
          const { expectedPl } = await getExpectedPlAndCurrentPrice();

          expect(unrealizedPl['0']).to.be.bignumber.equal(expectedPl);
          expect(unrealizedPl['1']).to.be.bignumber.equal(newPrice);
        });
      });
    }
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
      askPrice = await protocol.getAskPrice.call(
        liquidityPool.address,
        usd.address,
        eur,
        0,
      );

      bidPrice = await protocol.getBidPrice.call(
        liquidityPool.address,
        usd.address,
        eur,
        0,
      );

      leveragedHeldInEuro1 = euro(100);
      leveragedHeldInEuro2 = euro(100);
      leverage1 = bn(20);
      leverage2 = bn(-20);
      leveragedDebits1 = fromEth(
        leveragedHeldInEuro1.mul(!leverage1.isNeg() ? askPrice : bidPrice),
      );
      leveragedDebits2 = fromEth(
        leveragedHeldInEuro2.mul(!leverage2.isNeg() ? askPrice : bidPrice),
      );

      await protocol.deposit(liquidityPool.address, dollar(1000), {
        from: alice,
      });

      await protocol.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage1,
        leveragedHeldInEuro1,
        0,
        { from: alice },
      );
      await protocol.openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage2,
        leveragedHeldInEuro2,
        0,
        { from: alice },
      );
    });

    const getExpectedTraderPl = async () => {
      const currentPrice1: BN = await protocol[
        !leverage1.isNeg() ? 'getBidPrice' : 'getAskPrice'
      ].call(liquidityPool.address, usd.address, eur, 0);
      const currentPrice2: BN = await protocol[
        !leverage2.isNeg() ? 'getBidPrice' : 'getAskPrice'
      ].call(liquidityPool.address, usd.address, eur, 0);
      const openPrice1 = leveragedDebits1
        .mul(bn(1e18))
        .div(leveragedHeldInEuro1);
      const openPrice2 = leveragedDebits2
        .mul(bn(1e18))
        .div(leveragedHeldInEuro2);
      // unrealizedPlOfPosition = (currentPrice - openPrice) * leveragedHeld * to_usd_price
      const priceDelta1 = !leverage1.isNeg()
        ? currentPrice1.sub(openPrice1)
        : openPrice1.sub(currentPrice1);
      const priceDelta2 = !leverage2.isNeg()
        ? currentPrice2.sub(openPrice2)
        : openPrice2.sub(currentPrice2);
      const expectedPl1 = fromEth(priceDelta1.mul(leveragedHeldInEuro1));
      const expectedPl2 = fromEth(priceDelta2.mul(leveragedHeldInEuro2));

      return expectedPl1.add(expectedPl2);
    };

    it('should return correct unrealized PL at the beginning of a new position', async () => {
      const unrealizedPl = await protocol.getUnrealizedPlOfTrader.call(
        liquidityPool.address,
        alice,
      );
      expect(unrealizedPl).to.be.bignumber.equal(await getExpectedTraderPl());
    });

    it('should return correct unrealized PL after a profit', async () => {
      await oracle.feedPrice(eur, fromPercent(240), { from: owner });
      const unrealizedPl = await protocol.getUnrealizedPlOfTrader.call(
        liquidityPool.address,
        alice,
      );
      expect(unrealizedPl).to.be.bignumber.equal(await getExpectedTraderPl());
    });

    it('should return correct unrealized PL after a loss', async () => {
      await oracle.feedPrice(eur, fromPercent(60), { from: owner });
      const unrealizedPl = await protocol.getUnrealizedPlOfTrader.call(
        liquidityPool.address,
        alice,
      );
      expect(unrealizedPl).to.be.bignumber.equal(await getExpectedTraderPl());
    });
  });

  describe('when computing the accumulated swap rate', () => {
    it('should return the correct accumulated swap rate', async () => {
      const leveragedDebitsInUsd = dollar(5000);
      const daysOfPosition = 20;
      const ageOfPosition = time.duration.days(daysOfPosition);
      const swapRate = bn(5);
      const timeWhenOpened = (await time.latest()).sub(ageOfPosition);
      const accSwapRate = await protocol.getAccumulatedSwapRateFromParameters.call(
        leveragedDebitsInUsd,
        swapRate,
        timeWhenOpened,
      );

      const expectedAccSwapRate = fromEth(
        swapRate
          .mul(bn(daysOfPosition))
          .mul(bn(3)) // 3x 8 hours per day
          .mul(leveragedDebitsInUsd),
      );

      expect(accSwapRate).to.be.bignumber.equal(expectedAccSwapRate);
    });

    it('counts only full rate units', async () => {
      const leveragedDebitsInUsd = dollar(5000);
      const daysOfPosition = 20;
      const ageOfPosition = time.duration
        .days(daysOfPosition)
        .sub(time.duration.seconds(5));
      const swapRate = bn(5);
      const timeWhenOpened = (await time.latest()).sub(ageOfPosition);
      const accSwapRate = await protocol.getAccumulatedSwapRateFromParameters.call(
        leveragedDebitsInUsd,
        swapRate,
        timeWhenOpened,
      );

      const expectedAccSwapRate = swapRate
        .mul(bn(daysOfPosition))
        .mul(bn(3)) // 3x 8 hours per day
        .sub(bn(5))
        .mul(leveragedDebitsInUsd)
        .div(bn(1e18));
      expect(accSwapRate).to.be.bignumber.equal(expectedAccSwapRate);
    });
  });

  describe('when using internal helper functions', () => {
    let leveragedHeld1: BN;
    let leveragedHeld2: BN;
    let leveragedHeld3: BN;
    let leverage1: BN;
    let leverage2: BN;
    let leverage3: BN;

    beforeEach(async () => {
      await protocol.deposit(liquidityPool.address, dollar(1000), {
        from: alice,
      });
      await protocol.deposit(liquidityPool.address, dollar(1000), {
        from: bob,
      });

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

    describe('when computing equity of trader', () => {
      it('should return the correct equity', async () => {
        const aliceEquity = await protocol.getEquityOfTrader.call(
          liquidityPool.address,
          alice,
        );
        const bobEquity = await protocol.getEquityOfTrader.call(
          liquidityPool.address,
          bob,
        );

        // equityOfTrader = balance + unrealizedPl - accumulatedSwapRate
        const aliceBalance = convertToBaseToken(
          await protocol.balances(liquidityPool.address, alice),
        );
        const aliceUnrealized = await protocol.getUnrealizedPlOfTrader.call(
          liquidityPool.address,
          alice,
        );
        const aliceSwapRates = await protocol.getSwapRatesOfTrader(
          liquidityPool.address,
          alice,
        );
        const aliceExpectedEquity = aliceBalance
          .add(aliceUnrealized)
          .sub(aliceSwapRates);

        const bobBalance = convertToBaseToken(
          await protocol.balances(liquidityPool.address, bob),
        );
        const bobUnrealized = await protocol.getUnrealizedPlOfTrader.call(
          liquidityPool.address,
          bob,
        );
        const bobSwapRates = await protocol.getSwapRatesOfTrader(
          liquidityPool.address,
          bob,
        );
        const bobExpectedEquity = bobBalance
          .add(bobUnrealized)
          .sub(bobSwapRates);

        expect(aliceEquity).to.be.bignumber.equal(aliceExpectedEquity);
        expect(bobEquity).to.be.bignumber.equal(bobExpectedEquity);
      });

      describe('when trader has negative balance', () => {
        beforeEach(async () => {
          await protocol.openPosition(
            liquidityPool.address,
            usd.address,
            eur,
            20,
            dollar(8000),
            0,
            { from: bob },
          );
          await protocol.openPosition(
            liquidityPool.address,
            usd.address,
            eur,
            -20,
            dollar(8000),
            0,
            { from: bob },
          );

          await oracle.feedPrice(eur, fromPercent(100), { from: owner });
          await protocol.closePosition(3, 0, { from: bob }); // close bob' loss position
        });

        it('should return the correct equity', async () => {
          const bobEquity = await protocol.getEquityOfTrader.call(
            liquidityPool.address,
            bob,
          );

          const bobBalance = convertToBaseToken(
            await protocol.balances(liquidityPool.address, bob),
          );
          const bobUnrealized = await protocol.getUnrealizedPlOfTrader.call(
            liquidityPool.address,
            bob,
          );
          const bobSwapRates = await protocol.getSwapRatesOfTrader(
            liquidityPool.address,
            bob,
          );
          const bobExpectedEquity = bobBalance
            .add(bobUnrealized)
            .sub(bobSwapRates);

          expect(bobEquity).to.be.bignumber.equal(bobExpectedEquity);
        });
      });
    });

    describe('when removing a position from the lists', () => {
      it('should remove the correct position from all lists', async () => {
        const positionsByPoolBefore = await protocol.getPositionsByPool(
          liquidityPool.address,
          constants.ZERO_ADDRESS,
        );
        const positionsByAliceBefore = await protocol.getPositionsByPool(
          liquidityPool.address,
          alice,
        );
        const positionsByBobBefore = await protocol.getPositionsByPool(
          liquidityPool.address,
          bob,
        );

        await protocol.removePositionFromPoolList(liquidityPool.address, 1, {
          from: alice,
        });

        const positionsByPoolAfter = await protocol.getPositionsByPool(
          liquidityPool.address,
          constants.ZERO_ADDRESS,
        );
        const positionsByAliceAfter = await protocol.getPositionsByPool(
          liquidityPool.address,
          alice,
        );
        const positionsByBobAfter = await protocol.getPositionsByPool(
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

    describe('when getting accumulated swap rates of all positions from a trader', () => {
      it('should return the correct value', async () => {
        const daysOfPosition = 5;
        await time.increase(time.duration.days(daysOfPosition));

        const accSwapRates = await protocol.getSwapRatesOfTrader(
          liquidityPool.address,
          alice,
        );

        const position1SwapRate = await (protocol as any).getAccumulatedSwapRateOfPosition(
          bn(0),
        );
        const position2SwapRate = await (protocol as any).getAccumulatedSwapRateOfPosition(
          bn(1),
        );

        expect(accSwapRates).to.be.bignumber.equal(
          position1SwapRate.add(position2SwapRate),
        );
      });
    });
  });

  describe('when getting the latest price', () => {
    it('should return the correct latest price', async () => {
      const price1 = await protocol.getPrice.call(usd.address, eur);
      const price2 = await protocol.getPrice.call(eur, usd.address);

      expect(price1.value).to.be.bignumber.equal(fromPercent(120));
      expect(price2.value).to.be.bignumber.equal(bn('833333333333333333'));
    });
  });

  describe('when getting the value in USD', () => {
    it('should return the correct USD value', async () => {
      const value = bn(120);
      const usdValue = await protocol.getUsdValue.call(eur, value);

      expect(usdValue).to.be.bignumber.equal(bn(120 * 1.2));
    });

    it('should be identical when passing USD', async () => {
      const value = bn(120);
      const usdValue = await protocol.getUsdValue.call(usd.address, value);

      expect(usdValue).to.be.bignumber.equal(value);
    });
  });

  describe('when getting the ask price', () => {
    it('should return the correct ask price', async () => {
      const askPrice = await protocol.getAskPrice.call(
        liquidityPool.address,
        usd.address,
        eur,
        0,
      );

      // askPrice = price + spread
      const expectedAskPrice = initialEurPrice.add(initialSpread);

      expect(askPrice).to.be.bignumber.equal(expectedAskPrice);
    });

    it('reverts when passed max price is too low', async () => {
      const expectedAskPrice = initialEurPrice.add(initialSpread);

      const maxPrice = expectedAskPrice.sub(bn(1));

      await expectRevert(
        protocol.getAskPrice.call(
          liquidityPool.address,
          usd.address,
          eur,
          maxPrice,
        ),
        messages.marginAskPriceTooHigh,
      );
    });
  });

  describe('when getting the bid price', () => {
    it('should return the correct ask price', async () => {
      const bidPrice = await protocol.getBidPrice.call(
        liquidityPool.address,
        usd.address,
        eur,
        0,
      );

      // bidPrice = price - spread
      const expectedBidPrice = initialEurPrice.sub(initialSpread);

      expect(bidPrice).to.be.bignumber.equal(expectedBidPrice);
    });

    it('reverts when passed min price is too high', async () => {
      const expectedBidPrice = initialEurPrice.sub(initialSpread);
      const minPrice = expectedBidPrice.add(bn(1));

      await expectRevert(
        protocol.getBidPrice.call(
          liquidityPool.address,
          usd.address,
          eur,
          minPrice,
        ),
        messages.marginBidPriceTooLow,
      );
    });
  });

  describe('when upgrading the contract', () => {
    it('upgrades the contract', async () => {
      const flowMarginProtocolProxy = await Proxy.at(protocol.address);
      const newMarginFlowProtocolImpl = await MarginFlowProtocolNewVersion.new();
      await flowMarginProtocolProxy.upgradeTo(
        newMarginFlowProtocolImpl.address,
      );
      const newMarginFlowProtocol = await MarginFlowProtocolNewVersion.at(
        protocol.address,
      );
      const value = bn(345);
      const firstBytes32 =
        '0x18e5f16b91bbe0defc5ee6bc25b514b030126541a8ed2fc0b69402452465cc00';
      const secondBytes32 =
        '0x18e5f16b91bbe0defc5ee6bc25b514b030126541a8ed2fc0b69402452465cc99';

      const newValueBefore = await newMarginFlowProtocol.newStorageUint();
      await newMarginFlowProtocol.addNewStorageBytes32(firstBytes32);
      await newMarginFlowProtocol.setNewStorageUint(value);
      await newMarginFlowProtocol.addNewStorageBytes32(secondBytes32);
      const newValueAfter = await newMarginFlowProtocol.newStorageUint();
      const newStorageByte1 = await newMarginFlowProtocol.newStorageBytes32(0);
      const newStorageByte2 = await newMarginFlowProtocol.newStorageBytes32(1);

      expect(newValueBefore).to.be.bignumber.equal(bn(0));
      expect(newValueAfter).to.be.bignumber.equal(value);
      expect(newStorageByte1).to.be.equal(firstBytes32);
      expect(newStorageByte2).to.be.equal(secondBytes32);
    });

    it('works with old and new data', async () => {
      const maxSpread = await protocol.maxSpread();

      const flowMarginProtocolProxy = await Proxy.at(protocol.address);
      const newMarginFlowProtocolImpl = await MarginFlowProtocolNewVersion.new();
      await flowMarginProtocolProxy.upgradeTo(
        newMarginFlowProtocolImpl.address,
      );
      const newMarginFlowProtocol = await MarginFlowProtocolNewVersion.at(
        protocol.address,
      );
      const value = bn(345);
      await newMarginFlowProtocol.setNewStorageUint(value);
      const maxSpreadPlusNewValue = await newMarginFlowProtocol.getNewValuePlusMaxSpread();

      expect(maxSpreadPlusNewValue).to.be.bignumber.equal(value.add(maxSpread));
    });
  });
});
