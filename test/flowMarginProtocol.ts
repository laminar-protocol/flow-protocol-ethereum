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
  TestFlowMarginProtocol0Instance,
  TestFlowMarginProtocol1Instance,
  TestFlowMarginProtocolInstance,
  LiquidityPoolInstance,
  TestTokenInstance,
  MarginTradingPairInstance,
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
  fromPip,
  dollar,
  euro,
  bn,
  messages,
} from './helpers';

const Proxy = artifacts.require('Proxy');
const TestFlowMarginProtocol0 = artifacts.require('TestFlowMarginProtocol0');
const TestFlowMarginProtocol1 = artifacts.require('TestFlowMarginProtocol1');
const TestFlowMarginProtocol = artifacts.require('TestFlowMarginProtocol');
const FlowMarginProtocolNewVersion = artifacts.require(
  'FlowMarginProtocolNewVersion',
);
const LiquidityPool = artifacts.require('LiquidityPool');
const SimplePriceOracle = artifacts.require('SimplePriceOracle');
const MarginTradingPair = artifacts.require('MarginTradingPair');

contract('FlowMarginProtocol', accounts => {
  const owner = accounts[0];
  const liquidityProvider = accounts[1];
  const alice = accounts[2];
  const bob = accounts[3];
  const eur = accounts[4];
  const jpy = accounts[5];
  const newPool = accounts[6];

  let oracle: SimplePriceOracleInstance;
  let protocol0: TestFlowMarginProtocol0Instance;
  let protocol1: TestFlowMarginProtocol1Instance;
  let protocol2: TestFlowMarginProtocolInstance;
  let protocols: [
    TestFlowMarginProtocol0Instance,
    TestFlowMarginProtocol1Instance,
    TestFlowMarginProtocolInstance,
  ];
  let liquidityPool: LiquidityPoolInstance;
  let usd: TestTokenInstance;
  let iUsd: IERC20Instance; // eslint-disable-line
  let pair: MarginTradingPairInstance;
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
    protocols = [protocol0, protocol1, protocol2];
    const contracts = [
      TestFlowMarginProtocol0,
      TestFlowMarginProtocol1,
      TestFlowMarginProtocol,
    ];

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

    for (let index = 0; index < protocols.length; index += 1) {
      const flowMarginProtocolImpl = await contracts[index].new();
      const flowMarginProtocolProxy = await Proxy.new();
      await flowMarginProtocolProxy.upgradeTo(flowMarginProtocolImpl.address);
      protocols[index] = await contracts[index].at(
        flowMarginProtocolProxy.address,
      );
      await (protocols[index] as any).initialize( // eslint-disable-line
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

      await usd.approve(protocols[index].address, constants.MAX_UINT256, {
        from: alice,
      });
      await usd.approve(protocols[index].address, constants.MAX_UINT256, {
        from: bob,
      });
    }

    await usd.approve(moneyMarket.address, constants.MAX_UINT256, {
      from: liquidityProvider,
    });

    const liquidityPoolImpl = await LiquidityPool.new();
    const liquidityPoolProxy = await Proxy.new();
    await liquidityPoolProxy.upgradeTo(liquidityPoolImpl.address);
    liquidityPool = await LiquidityPool.at(liquidityPoolProxy.address);
    await (liquidityPool as any).initialize(
      moneyMarket.address,
      protocols[0].address, // need 3 pools or only use first one for withdraw tests
      initialSpread,
    );

    for (let index = 0; index < protocols.length; index += 1) {
      await liquidityPool.approve(
        protocols[index].address,
        constants.MAX_UINT256,
      );
    }
    await usd.approve(liquidityPool.address, constants.MAX_UINT256);
    await liquidityPool.enableToken(eur);
    await liquidityPool.enableToken(jpy);

    await usd.approve(liquidityPool.address, dollar(20000), {
      from: liquidityProvider,
    });
    await liquidityPool.depositLiquidity(dollar(20000), {
      from: liquidityProvider,
    });

    const feeSum = (await protocols[1].LIQUIDITY_POOL_LIQUIDATION_FEE()).add(
      await protocols[1].LIQUIDITY_POOL_MARGIN_CALL_FEE(),
    );
    for (let index = 0; index < protocols.length; index += 1) {
      await usd.approve(protocols[index].address, feeSum, {
        from: liquidityProvider,
      });
      await protocols[index].registerPool(liquidityPool.address, {
        from: liquidityProvider,
      });
      await protocols[index].verifyPool(liquidityPool.address);
      await protocols[index].addTradingPair(jpy, eur);
      await protocols[index].addTradingPair(usd.address, eur);
    }

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

  const getLastPositionByPool = async ({
    protocol,
    pool,
  }: {
    protocol: TestFlowMarginProtocol0Instance;
    pool: string;
  }) => {
    const positionByPoolPart1 = await protocol.getLastPositionByPoolPart1(pool);
    const positionByPoolPart2 = await protocol.getLastPositionByPoolPart2(pool);

    // eslint-disable-next-line array-callback-return
    Object.keys(positionByPoolPart2).map((key: string) => {
      const keyNumber = parseInt(key, 10);
      positionByPoolPart2[keyNumber + 6] = positionByPoolPart2[keyNumber];
      delete positionByPoolPart2[keyNumber];
    });

    return {
      ...positionByPoolPart1,
      ...positionByPoolPart2,
    };
  };

  const getLastPositionByPoolAndTrader = async ({
    protocol,
    pool,
    trader,
  }: {
    protocol: TestFlowMarginProtocol0Instance;
    pool: string;
    trader: string;
  }) => {
    const positionByPoolAndTraderPart1 = await protocol.getLastPositionByPoolAndTraderPart1(
      pool,
      trader,
    );
    const positionByPoolAndTraderPart2 = await protocol.getLastPositionByPoolAndTraderPart2(
      pool,
      trader,
    );

    // eslint-disable-next-line array-callback-return
    Object.keys(positionByPoolAndTraderPart2).map((key: string) => {
      const keyNumber = parseInt(key, 10);
      positionByPoolAndTraderPart2[keyNumber + 6] =
        positionByPoolAndTraderPart2[keyNumber];
      delete positionByPoolAndTraderPart2[keyNumber];
    });

    return {
      ...positionByPoolAndTraderPart1,
      ...positionByPoolAndTraderPart2,
    };
  };

  describe('when adding a trading pair', () => {
    it('sets new parameter', async () => {
      await protocols[0].addTradingPair(eur, jpy);

      expect(await protocols[0].tradingPairWhitelist(eur, jpy)).to.be.true;
    });

    it('reverts when trading pair already whitelisted', async () => {
      await protocols[0].addTradingPair(eur, jpy);

      await expectRevert(
        protocols[0].addTradingPair(eur, jpy),
        messages.tradingPairAlreadyWhitelisted,
      );
    });

    it('reverts when trading pair tokens are identical', async () => {
      await expectRevert(
        protocols[0].addTradingPair(eur, eur),
        messages.tradingPairTokensMustBeDifferent,
      );
    });

    it('allows only owner to add a trading pair', async () => {
      await expectRevert(
        protocols[0].addTradingPair(eur, jpy, { from: alice }),
        messages.onlyOwner,
      );
    });
  });

  describe('when setting new parameters', () => {
    for (const setFunction of [
      'setCurrentSwapRate',
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
          await (protocols[0] as any)[setFunction](newParameter);

          const setParameter = setFunction
            .slice(3)
            .replace(/^\w/, c => c.toLowerCase());
          const newStoredParameter = await (protocols[0] as any)[
            setParameter
          ]();

          expect(newStoredParameter).to.be.bignumber.equals(newParameter);
        });

        it('allows only owner to set parameters', async () => {
          await expectRevert(
            (protocols[0] as any)[setFunction](newParameter, { from: alice }),
            messages.onlyOwner,
          );
        });

        it('does not allow zero values', async () => {
          await expectRevert(
            (protocols[0] as any)[setFunction](0),
            messages.settingZeroValueNotAllowed,
          );
        });
      });
    }
  });

  describe('when managing pools', () => {
    describe('when registering new pools', () => {
      let poolOwnerBalanceBefore: BN;

      beforeEach(async () => {
        poolOwnerBalanceBefore = await usd.balanceOf(alice);
        await protocols[0].registerPool(newPool, { from: alice });
      });

      it('sets pool as registered', async () => {
        expect(await protocols[0].poolHasPaidFees(newPool)).to.be.true;
      });

      it('transfers the feeSum', async () => {
        const LIQUIDITY_POOL_MARGIN_CALL_FEE = await protocols[0].LIQUIDITY_POOL_MARGIN_CALL_FEE();
        const LIQUIDITY_POOL_LIQUIDATION_FEE = await protocols[0].LIQUIDITY_POOL_LIQUIDATION_FEE();

        const poolOwnerBalanceAfter = await usd.balanceOf(alice);
        expect(poolOwnerBalanceAfter).to.be.bignumber.equals(
          poolOwnerBalanceBefore
            .sub(LIQUIDITY_POOL_MARGIN_CALL_FEE)
            .sub(LIQUIDITY_POOL_LIQUIDATION_FEE),
        );
      });

      it('allows only owner to verify pools', async () => {
        await expectRevert(
          protocols[0].registerPool(newPool, { from: alice }),
          messages.poolAlreadyPaidFees,
        );
      });
    });

    describe('when verifying pools', () => {
      it('sets pool as verified', async () => {
        await protocols[0].registerPool(newPool, { from: alice });
        await protocols[0].verifyPool(newPool);
        expect(await protocols[0].isVerifiedPool(newPool)).to.be.true;
      });

      it('requires that pool has paid fees', async () => {
        await expectRevert(
          protocols[0].verifyPool(newPool),
          messages.poolHasNotPaidFees,
        );
      });

      it('allows only owner to verify pools', async () => {
        await expectRevert(
          protocols[0].verifyPool(newPool, { from: alice }),
          messages.onlyOwner,
        );
      });

      it('allows only owner to verify pools', async () => {
        await protocols[0].registerPool(newPool, { from: alice });
        await protocols[0].verifyPool(newPool);

        await expectRevert(
          protocols[0].verifyPool(newPool),
          messages.poolAlreadyVerified,
        );
      });
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

      traderBalanceProtocolBefore = await protocols[0].balances(
        liquidityPool.address,
        alice,
      );
      traderBalanceUsdBefore = await usd.balanceOf(alice);
      moneyMarketBalanceBefore = await usd.balanceOf(moneyMarket.address);
      protocolBalanceBefore = await iUsd.balanceOf(protocols[0].address);
    });

    describe('when depositing funds', () => {
      beforeEach(async () => {
        depositInUsd = dollar(80);

        receipt = await protocols[0].deposit(
          liquidityPool.address,
          depositInUsd,
          {
            from: alice,
          },
        );
      });

      it('updates USD and iUSD balances correctly', async () => {
        const traderBalanceProtocolAfter = await protocols[0].balances(
          liquidityPool.address,
          alice,
        );
        const traderBalanceUsdAfter = await usd.balanceOf(alice);
        const moneyMarketBalanceAfter = await usd.balanceOf(
          moneyMarket.address,
        );
        const protocolBalanceAfter = await iUsd.balanceOf(protocols[0].address);

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

        await protocols[0].deposit(liquidityPool.address, depositInUsd, {
          from: alice,
        });
        receipt = await protocols[0].withdraw(
          liquidityPool.address,
          withdrawInUsd,
          {
            from: alice,
          },
        );
      });

      it('updates USD and iUSD balances correctly', async () => {
        const traderBalanceProtocolAfter = await protocols[0].balances(
          liquidityPool.address,
          alice,
        );
        const traderBalanceUsdAfter = await usd.balanceOf(alice);
        const moneyMarketBalanceAfter = await usd.balanceOf(
          moneyMarket.address,
        );
        const protocolBalanceAfter = await iUsd.balanceOf(protocols[0].address);

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
    const position = await protocols[0].getPositionById(id);
    const positionId = position['0'];
    const positionOwner = position['1'];
    const pool = position['2'];
    const base = position['3'];
    const quote = position['4'];
    const leverage = position['5'];
    const leveragedHeld = position['6'];
    const leveragedDebits = position['7'];
    const leveragedDebitsInUsd = position['8'];
    const marginHeld = position['9'];
    const swapRate = position['10'];
    const timeWhenOpened = position['11'];

    const tokenToInitialPrice: { [key: string]: BN } = {};
    tokenToInitialPrice[usd.address] = initialUsdPrice;
    tokenToInitialPrice[eur] = initialEurPrice;
    tokenToInitialPrice[jpy] = initialJpyPrice;

    const basePrice = await oracle.getPrice.call(baseToken);
    const quotePrice = await oracle.getPrice.call(quoteToken);
    const expectedPrice = quotePrice.mul(bn(1e18)).div(basePrice);

    const askPrice = expectedPrice.add(
      fromEth(expectedPrice.mul(initialSpread)),
    );
    const bidPrice = expectedPrice.sub(
      fromEth(expectedPrice.mul(initialSpread)),
    );

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
      sender: expectedOwner,
      liquidityPool: expectedPool,
      baseToken,
      quoteToken,
      leverage: expectedLeverage,
      amount: leveragedHeldInQuote,
      price: leverage.isNeg() ? bidPrice : askPrice,
    });

    const positionByPool = await getLastPositionByPool({
      protocol: protocols[0],
      pool: expectedPool,
    });
    const positionByPoolAndTrader = await getLastPositionByPoolAndTrader({
      protocol: protocols[0],
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

      await protocols[0].deposit(liquidityPool.address, depositInUsd, {
        from: alice,
      });
    });

    it('opens new position correctly', async () => {
      const receipt = await protocols[0].openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage,
        leveragedHeldInEuro,
        price,
        { from: alice },
      );
      const expectedTimeWhenOpened = await time.latest();
      const positionId = (await protocols[0].nextPositionId()).sub(bn(1));

      await expectCorrectlyOpenedPosition({
        id: positionId,
        expectedOwner: alice,
        expectedPool: liquidityPool.address,
        expectedLeverage: leverage,
        leveragedHeldInQuote: leveragedHeldInEuro,
        expectedSwapRate: initialSwapRate,
        expectedTimeWhenOpened,
        receipt,
      });
    });

    describe('when the leverage is 1', () => {
      beforeEach(() => {
        leverage = bn(1);
        leveragedHeldInEuro = euro(10);
      });

      it('opens new position correctly', async () => {
        const receipt = await protocols[0].openPosition(
          liquidityPool.address,
          usd.address,
          eur,
          leverage,
          leveragedHeldInEuro,
          price,
          { from: alice },
        );
        const expectedTimeWhenOpened = await time.latest();
        const positionId = (await protocols[0].nextPositionId()).sub(bn(1));

        await expectCorrectlyOpenedPosition({
          id: positionId,
          expectedOwner: alice,
          expectedPool: liquidityPool.address,
          expectedLeverage: leverage,
          leveragedHeldInQuote: leveragedHeldInEuro,
          expectedSwapRate: initialSwapRate,
          expectedTimeWhenOpened,
          receipt,
        });
      });
    });

    describe('when the leverage is -50', () => {
      beforeEach(() => {
        leverage = bn(-50);
        leveragedHeldInEuro = euro(1000);
      });

      it('opens new position correctly', async () => {
        const receipt = await protocols[0].openPosition(
          liquidityPool.address,
          usd.address,
          eur,
          leverage,
          leveragedHeldInEuro,
          price,
          { from: alice },
        );
        const expectedTimeWhenOpened = await time.latest();
        const positionId = (await protocols[0].nextPositionId()).sub(bn(1));

        await expectCorrectlyOpenedPosition({
          id: positionId,
          expectedOwner: alice,
          expectedPool: liquidityPool.address,
          expectedLeverage: leverage,
          leveragedHeldInQuote: leveragedHeldInEuro,
          expectedSwapRate: initialSwapRate,
          expectedTimeWhenOpened,
          receipt,
        });
      });
    });

    describe('when the trading pair has no USD', () => {
      beforeEach(() => {
        leverage = bn(1);
        leveragedHeldInEuro = euro(10);
      });

      it('opens new position correctly', async () => {
        const receipt = await protocols[0].openPosition(
          liquidityPool.address,
          jpy,
          eur,
          leverage,
          leveragedHeldInEuro,
          price,
          { from: alice },
        );
        const expectedTimeWhenOpened = await time.latest();
        const positionId = (await protocols[0].nextPositionId()).sub(bn(1));

        await expectCorrectlyOpenedPosition({
          id: positionId,
          expectedOwner: alice,
          expectedPool: liquidityPool.address,
          expectedLeverage: leverage,
          leveragedHeldInQuote: leveragedHeldInEuro,
          expectedSwapRate: initialSwapRate,
          expectedTimeWhenOpened,
          receipt,
          baseToken: jpy,
          quoteToken: eur,
        });
      });
    });

    describe('when there is not enough free margin left', () => {
      beforeEach(async () => {
        await protocols[0].withdraw(
          liquidityPool.address,
          depositInUsd.sub(dollar(1)),
          {
            from: alice,
          },
        );
      });

      it('reverts the transaction', async () => {
        await expectRevert(
          protocols[0].openPosition(
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

    describe('when passing a max price that is too high', () => {
      beforeEach(() => {
        price = initialEurPrice;
      });

      it('reverts the transaction', async () => {
        await expectRevert(
          protocols[0].openPosition(
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
          protocols[0].openPosition(
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
    initialAskPrice: BN;
    initialBidPrice: BN;
    receipt: Truffle.TransactionResponse;
    baseToken?: string;
    quoteToken?: string;
    useMaxRealizable?: boolean;
  }) => {
    const position = await protocols[0].getPositionById(id);

    const tokenToInitialPrice: { [key: string]: BN } = {};
    tokenToInitialPrice[usd.address] = initialUsdPrice;
    tokenToInitialPrice[eur] = initialEurPrice;
    tokenToInitialPrice[jpy] = initialJpyPrice;

    const basePrice = await oracle.getPrice.call(baseToken);
    const quotePrice = await oracle.getPrice.call(quoteToken);
    const expectedPrice = quotePrice.mul(bn(1e18)).div(basePrice);

    const askPrice = expectedPrice.add(
      fromEth(expectedPrice.mul(initialSpread)),
    );
    const bidPrice = expectedPrice.sub(
      fromEth(expectedPrice.mul(initialSpread)),
    );

    const traderBalanceAfter = await protocols[0].balances(
      liquidityPool.address,
      alice,
    );
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

    const poolLiquidityAfter = await liquidityPool.getLiquidity.call();
    const poolLiquidityDifference = poolLiquidityAfter.sub(poolLiquidityBefore);
    const expectedPoolLiquidityDifference = convertFromBaseToken(
      expectedPl.mul(bn(-1)),
    );

    expect(poolLiquidityDifference).to.be.bignumber.equal(
      useMaxRealizable
        ? maxRealizable.mul(bn(-1))
        : expectedPoolLiquidityDifference,
    );

    await expectEvent(receipt, 'PositionClosed', {
      sender: expectedOwner,
      liquidityPool: expectedPool,
      baseToken,
      quoteToken,
      price: expectedLeverage.isNeg() ? askPrice : bidPrice,
    });

    if (!useMaxRealizable) {
      // two positions opened in max realizable test
      await expectRevert.unspecified(
        getLastPositionByPool({
          protocol: protocols[0],
          pool: expectedPool,
        }),
      );
      await expectRevert.unspecified(
        getLastPositionByPoolAndTrader({
          protocol: protocols[0],
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
    let receipt: Truffle.TransactionResponse;

    beforeEach(async () => {
      leverage = bn(20);
      depositInUsd = dollar(80);
      leveragedHeldInEuro = euro(100);
      price = bn(0); // accept all

      await protocols[0].deposit(liquidityPool.address, depositInUsd, {
        from: alice,
      });

      traderBalanceBefore = await protocols[0].balances(
        liquidityPool.address,
        alice,
      );
      poolLiquidityBefore = await liquidityPool.getLiquidity.call();

      const basePrice = await oracle.getPrice.call(usd.address);
      const quotePrice = await oracle.getPrice.call(eur);
      const expectedPrice = quotePrice.mul(bn(1e18)).div(basePrice);
      initialAskPrice = expectedPrice.add(
        fromEth(expectedPrice.mul(initialSpread)),
      );
      initialBidPrice = expectedPrice.sub(
        fromEth(expectedPrice.mul(initialSpread)),
      );
    });

    describe('when USD is the base pair', () => {
      beforeEach(async () => {
        await protocols[0].openPosition(
          liquidityPool.address,
          usd.address,
          eur,
          leverage,
          leveragedHeldInEuro,
          price,
          { from: alice },
        );
        positionId = (await protocols[0].nextPositionId()).sub(bn(1));
      });

      it('computes new balance correctly when immediately closing', async () => {
        receipt = await protocols[0].closePosition(positionId, price, {
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
          initialAskPrice,
          initialBidPrice,
          receipt,
        });
      });

      it('computes new balance correctly after a price drop', async () => {
        await oracle.feedPrice(eur, fromPercent(100), { from: owner });
        receipt = await protocols[0].closePosition(positionId, price, {
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
          initialAskPrice,
          initialBidPrice,
          receipt,
        });
      });

      it('computes new balance correctly after a price increase', async () => {
        await oracle.feedPrice(eur, fromPercent(200), { from: owner });
        receipt = await protocols[0].closePosition(positionId, price, {
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
          initialAskPrice,
          initialBidPrice,
          receipt,
        });
      });
    });

    describe('when the trading pair has no USD', () => {
      beforeEach(async () => {
        const basePrice = await oracle.getPrice.call(jpy);
        const quotePrice = await oracle.getPrice.call(eur);
        const expectedPrice = quotePrice.mul(bn(1e18)).div(basePrice);
        initialAskPrice = expectedPrice.add(
          fromEth(expectedPrice.mul(initialSpread)),
        );
        initialBidPrice = expectedPrice.sub(
          fromEth(expectedPrice.mul(initialSpread)),
        );

        await protocols[0].openPosition(
          liquidityPool.address,
          jpy,
          eur,
          leverage,
          leveragedHeldInEuro,
          price,
          { from: alice },
        );
        positionId = (await protocols[0].nextPositionId()).sub(bn(1));
      });

      it('computes new balance correctly when immediately closing', async () => {
        await oracle.feedPrice(eur, fromPercent(100), { from: owner });
        receipt = await protocols[0].closePosition(positionId, price, {
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
          initialAskPrice,
          initialBidPrice,
          baseToken: jpy,
          quoteToken: eur,
          receipt,
        });
      });

      it('computes new balance correctly after a price drop', async () => {
        await oracle.feedPrice(eur, fromPercent(100), { from: owner });
        receipt = await protocols[0].closePosition(positionId, price, {
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
          initialAskPrice,
          initialBidPrice,
          baseToken: jpy,
          quoteToken: eur,
          receipt,
        });
      });

      it('computes new balance correctly after a price increase', async () => {
        await oracle.feedPrice(eur, fromPercent(200), { from: owner });
        receipt = await protocols[0].closePosition(positionId, price, {
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
          initialAskPrice,
          initialBidPrice,
          baseToken: jpy,
          quoteToken: eur,
          receipt,
        });
      });
    });

    describe('when the trader has a loss', () => {
      beforeEach(async () => {
        await protocols[0].openPosition(
          liquidityPool.address,
          usd.address,
          eur,
          leverage,
          leveragedHeldInEuro,
          price,
          { from: alice },
        );
        await protocols[0].openPosition(
          liquidityPool.address,
          usd.address,
          eur,
          leverage,
          leveragedHeldInEuro,
          price,
          { from: alice },
        );
        positionId = (await protocols[0].nextPositionId()).sub(bn(1));
      });

      describe("when the loss is greater that trader's whole equity", () => {
        beforeEach(async () => {
          await oracle.feedPrice(eur, fromPercent(10), { from: owner });
        });

        it('does not send money to the pool', async () => {
          await protocols[0].closePosition(positionId, price, {
            from: alice,
          });

          const poolLiquidityAfter = await liquidityPool.getLiquidity.call();
          const traderBalanceAfter = await protocols[0].balances(
            liquidityPool.address,
            alice,
          );

          expect(poolLiquidityAfter).to.be.bignumber.equal(poolLiquidityBefore);
          expect(traderBalanceAfter).to.be.bignumber.equal(traderBalanceBefore);
        });
      });

      describe("when the loss is greater than trader's whole equity", () => {
        beforeEach(async () => {
          await oracle.feedPrice(eur, fromPercent(50), { from: owner });
        });

        it('does not send money to the pool', async () => {
          receipt = await protocols[0].closePosition(positionId, price, {
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
            initialAskPrice,
            initialBidPrice,
            receipt,
            useMaxRealizable: true,
          });
        });
      });

      describe('when the loss covered by another position', () => {
        beforeEach(async () => {
          await protocols[0].openPosition(
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
          await protocols[0].closePosition(positionId, price, {
            from: alice,
          });
          await protocols[0].closePosition(positionId.sub(bn(1)), price, {
            from: alice,
          });

          const traderBalanceAfter = await protocols[0].balances(
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

        await protocols[0].openPosition(
          liquidityPool.address,
          usd.address,
          eur,
          leverage,
          leveragedHeldInEuro,
          price,
          { from: alice },
        );
        positionId = (await protocols[0].nextPositionId()).sub(bn(1));

        await liquidityPool.withdrawLiquidityOwner(
          convertFromBaseToken(dollar(19000)),
        );
        poolLiquidityBefore = await liquidityPool.getLiquidity.call();
      });

      it("only increases trader's balance by the pool's available liquidity", async () => {
        await oracle.feedPrice(eur, fromPercent(300), { from: owner });
        receipt = await protocols[0].closePosition(positionId, price, {
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
          initialAskPrice,
          initialBidPrice,
          receipt,
          useMaxRealizable: true,
        });
      });
    });

    describe('when the sender is not the owner of the position', () => {
      beforeEach(async () => {
        await protocols[0].openPosition(
          liquidityPool.address,
          usd.address,
          eur,
          leverage,
          leveragedHeldInEuro,
          0,
          { from: alice },
        );
        positionId = (await protocols[0].nextPositionId()).sub(bn(1));
      });

      it('reverts the transaction', async () => {
        await expectRevert(
          protocols[0].closePosition(positionId, price, {
            from: bob,
          }),
          messages.incorrectOwnerClosePosition,
        );
      });
    });

    describe('when passing a max price that is too high', () => {
      beforeEach(async () => {
        price = initialEurPrice;

        await protocols[0].openPosition(
          liquidityPool.address,
          usd.address,
          eur,
          leverage,
          leveragedHeldInEuro,
          0,
          { from: alice },
        );
        positionId = (await protocols[0].nextPositionId()).sub(bn(1));
      });

      it('reverts the transaction', async () => {
        await expectRevert(
          protocols[0].closePosition(positionId, price, {
            from: alice,
          }),
          messages.marginBidPriceTooLow,
        );
      });
    });

    describe('when passing a min price that is too low', () => {
      beforeEach(async () => {
        price = initialEurPrice;

        await protocols[0].openPosition(
          liquidityPool.address,
          usd.address,
          eur,
          leverage.mul(bn(-1)),
          leveragedHeldInEuro,
          0,
          { from: alice },
        );
        positionId = (await protocols[0].nextPositionId()).sub(bn(1));
      });

      it('reverts the transaction', async () => {
        await expectRevert(
          protocols[0].closePosition(positionId, price, {
            from: alice,
          }),
          messages.marginAskPriceTooHigh,
        );
      });
    });

    describe('when the leverage is 1', () => {
      beforeEach(async () => {
        leverage = bn(1);
        leveragedHeldInEuro = euro(10);

        await protocols[0].openPosition(
          liquidityPool.address,
          usd.address,
          eur,
          leverage,
          leveragedHeldInEuro,
          0,
          { from: alice },
        );
        positionId = (await protocols[0].nextPositionId()).sub(bn(1));
      });

      it('opens new position correctly', async () => {
        receipt = await protocols[0].closePosition(positionId, price, {
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
          initialAskPrice,
          initialBidPrice,
          receipt,
        });
      });
    });

    describe('when the leverage is -50', () => {
      beforeEach(async () => {
        leverage = bn(-50);
        leveragedHeldInEuro = euro(1000);

        await protocols[0].openPosition(
          liquidityPool.address,
          usd.address,
          eur,
          leverage,
          leveragedHeldInEuro,
          0,
          { from: alice },
        );
        positionId = (await protocols[0].nextPositionId()).sub(bn(1));
      });

      it('opens new position correctly', async () => {
        receipt = await protocols[0].closePosition(positionId, price, {
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
          initialAskPrice,
          initialBidPrice,
          receipt,
        });
      });
    });
  });

  describe('when there are some positions in the pool', () => {
    let leveragedHeld1: BN;
    let leveragedHeld2: BN;
    let leveragedHeld3: BN;
    let leveragedHeld4: BN;
    let leverage1: BN;
    let leverage2: BN;
    let leverage3: BN;
    let leverage4: BN;
    let initialAskPrice: BN;
    let initialBidPrice: BN;

    beforeEach(async () => {
      await protocols[1].deposit(liquidityPool.address, dollar(1000), {
        from: alice,
      });
      await protocols[1].deposit(liquidityPool.address, dollar(1000), {
        from: bob,
      });

      initialAskPrice = await protocols[1].getAskPrice.call(
        liquidityPool.address,
        usd.address,
        eur,
        0,
      );

      initialBidPrice = await protocols[1].getBidPrice.call(
        liquidityPool.address,
        usd.address,
        eur,
        0,
      );

      leveragedHeld1 = euro(10);
      leveragedHeld2 = euro(5);
      leveragedHeld3 = euro(4);
      leveragedHeld4 = euro(2);
      leverage1 = bn(20);
      leverage2 = bn(-20);
      leverage3 = bn(-5);
      leverage4 = bn(20);

      await protocols[1].openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage1,
        leveragedHeld1,
        0,
        { from: alice },
      );
      await protocols[1].openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage2,
        leveragedHeld2,
        0,
        { from: alice },
      );
      await protocols[1].openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage3,
        leveragedHeld3,
        0,
        { from: alice },
      );
      await protocols[1].openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage4,
        leveragedHeld4,
        0,
        { from: bob },
      );
    });

    describe('when getting accumulated margin held of a trader', () => {
      it('should return the correct value', async () => {
        const marginHeldAlice = await protocols[1].getMarginHeld(
          liquidityPool.address,
          alice,
        );
        const marginHeldBob = await protocols[1].getMarginHeld(
          liquidityPool.address,
          bob,
        );

        const prices = { askPrice: initialAskPrice, bidPrice: initialBidPrice };

        const leveragedDebitAlice1 = getLeveragedDebits({
          leveragedHeld: leveragedHeld1,
          leverage: leverage1,
          ...prices,
        });
        const leveragedDebitAlice2 = getLeveragedDebits({
          leveragedHeld: leveragedHeld2,
          leverage: leverage2,
          ...prices,
        });
        const leveragedDebitAlice3 = getLeveragedDebits({
          leveragedHeld: leveragedHeld3,
          leverage: leverage3,
          ...prices,
        });
        const leveragedDebitBob = getLeveragedDebits({
          leveragedHeld: leveragedHeld4,
          leverage: leverage4,
          ...prices,
        });

        const expectedMarginHeldAlice = leveragedDebitAlice1
          .div(leverage1)
          .abs()
          .add(leveragedDebitAlice2.div(leverage2).abs())
          .add(leveragedDebitAlice3.div(leverage3).abs());

        const expectedMarginHeldBob = leveragedDebitBob.div(leverage4).abs();

        expect(marginHeldAlice).to.be.bignumber.equal(expectedMarginHeldAlice);
        expect(marginHeldBob).to.be.bignumber.equal(expectedMarginHeldBob);
      });
    });

    describe('when getting the free margin of a trader', () => {
      it('should return the correct value', async () => {
        const freeMarginAlice = await protocols[1].getFreeMargin.call(
          liquidityPool.address,
          alice,
        );
        const freeMarginBob = await protocols[1].getFreeMargin.call(
          liquidityPool.address,
          bob,
        );

        const marginHeldAlice = await protocols[1].getMarginHeld(
          liquidityPool.address,
          alice,
        );
        const marginHeldBob = await protocols[1].getMarginHeld(
          liquidityPool.address,
          bob,
        );
        const equityAlice = await protocols[1].getEquityOfTrader.call(
          liquidityPool.address,
          alice,
        );
        const equityBob = await protocols[1].getEquityOfTrader.call(
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
          await protocols[1].openPosition(
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
          const freeMarginAlice = await protocols[1].getFreeMargin.call(
            liquidityPool.address,
            alice,
          );

          expect(freeMarginAlice).to.be.bignumber.equal(bn(0));
        });
      });
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
      TRADER_MARGIN_CALL_FEE = await protocols[1].TRADER_MARGIN_CALL_FEE();

      await protocols[1].deposit(liquidityPool.address, depositInUsd, {
        from: alice,
      });

      await protocols[1].openPosition(
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
          await protocols[1].marginCallTrader(liquidityPool.address, alice, {
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
        await protocols[1].marginCallTrader(liquidityPool.address, alice, {
          from: bob,
        });
        const balanceAfter = await usd.balanceOf(bob);

        expect(balanceAfter).to.be.bignumber.equal(
          balanceBefore.add(TRADER_MARGIN_CALL_FEE),
        );
      });

      it('does not allow margin calling twice', async () => {
        await protocols[1].marginCallTrader(liquidityPool.address, alice, {
          from: bob,
        });

        await expectRevert(
          protocols[1].marginCallTrader(liquidityPool.address, alice, {
            from: bob,
          }),
          messages.traderAlreadyMarginCalled,
        );
      });

      it('does not allow making safe calls', async () => {
        await protocols[1].marginCallTrader(liquidityPool.address, alice, {
          from: bob,
        });

        await expectRevert(
          protocols[1].makeTraderSafe(liquidityPool.address, alice, {
            from: alice,
          }),
          messages.traderCannotBeMadeSafe,
        );
      });

      describe('when margin called trader becomes safe again', () => {
        beforeEach(async () => {
          await protocols[1].marginCallTrader(liquidityPool.address, alice, {
            from: bob,
          });
          await oracle.feedPrice(eur, fromPercent(120), { from: owner });
        });

        it('allows making trader safe again', async () => {
          try {
            await protocols[1].makeTraderSafe(liquidityPool.address, alice, {
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
          await protocols[1].makeTraderSafe(liquidityPool.address, alice, {
            from: alice,
          });
          const balanceAfter = await usd.balanceOf(alice);

          expect(balanceAfter).to.be.bignumber.equal(
            balanceBefore.sub(TRADER_MARGIN_CALL_FEE),
          );
        });

        it('does not allow making safe calls twice', async () => {
          await protocols[1].makeTraderSafe(liquidityPool.address, alice, {
            from: alice,
          });

          await expectRevert(
            protocols[1].makeTraderSafe(liquidityPool.address, alice, {
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
          protocols[1].marginCallTrader(liquidityPool.address, alice, {
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
      LIQUIDITY_POOL_MARGIN_CALL_FEE = await protocols[1].LIQUIDITY_POOL_MARGIN_CALL_FEE();

      await protocols[1].deposit(liquidityPool.address, depositInUsd, {
        from: alice,
      });

      await protocols[1].openPosition(
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
        await liquidityPool.withdrawLiquidityOwner(dollar(99500));
      });

      it('allows margin calling of pool', async () => {
        try {
          await protocols[1].marginCallLiquidityPool(liquidityPool.address, {
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
        await protocols[1].marginCallLiquidityPool(liquidityPool.address, {
          from: bob,
        });
        const balanceAfter = await usd.balanceOf(bob);

        expect(balanceAfter).to.be.bignumber.equal(
          balanceBefore.add(LIQUIDITY_POOL_MARGIN_CALL_FEE),
        );
      });

      it('does not allow margin calling twice', async () => {
        await protocols[1].marginCallLiquidityPool(liquidityPool.address, {
          from: bob,
        });

        await expectRevert(
          protocols[1].marginCallLiquidityPool(liquidityPool.address, {
            from: bob,
          }),
          messages.poolAlreadyMarginCalled,
        );
      });

      it('does not allow making safe calls', async () => {
        await protocols[1].marginCallLiquidityPool(liquidityPool.address, {
          from: bob,
        });

        await expectRevert(
          protocols[1].makeLiquidityPoolSafe(liquidityPool.address, {
            from: alice,
          }),
          messages.poolCannotBeMadeSafe,
        );
      });

      describe('when margin called pool becomes safe again', () => {
        beforeEach(async () => {
          await protocols[1].marginCallLiquidityPool(liquidityPool.address, {
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
            await protocols[1].makeLiquidityPoolSafe(liquidityPool.address, {
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
          await protocols[1].makeLiquidityPoolSafe(liquidityPool.address, {
            from: alice,
          });
          const balanceAfter = await usd.balanceOf(alice);

          expect(balanceAfter).to.be.bignumber.equal(
            balanceBefore.sub(LIQUIDITY_POOL_MARGIN_CALL_FEE),
          );
        });

        it('does not allow making safe calls twice', async () => {
          await protocols[1].makeLiquidityPoolSafe(liquidityPool.address, {
            from: alice,
          });

          await expectRevert(
            protocols[1].makeLiquidityPoolSafe(liquidityPool.address, {
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
          protocols[1].marginCallLiquidityPool(liquidityPool.address, {
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
      await protocols[1].openPosition(
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

  describe.skip('when checking the trader safety', () => {
    beforeEach(async () => {
      await protocols[1].deposit(liquidityPool.address, dollar(1000), {
        from: alice,
      });
      await protocols[1].deposit(liquidityPool.address, dollar(1000), {
        from: bob,
      });
    });

    describe('when the trader has 5 positions', () => {
      beforeEach(async function testSetup() {
        await insertPositions(5, alice);
      });

      it('returns if trader is safe', async () => {
        const isSafe = await protocols[1].getIsPoolSafe.call(
          liquidityPool.address,
        );
        await protocols[1].getIsTraderSafe(liquidityPool.address, alice);

        expect(isSafe).to.be.true;
      });
    });

    describe('when the trader has 25 positions', () => {
      beforeEach(async function testSetup() {
        this.timeout(0);

        await insertPositions(25, alice);
      });

      it.skip('returns if trader is safe', async () => {
        const isSafe = await protocols[1].getIsPoolSafe.call(
          liquidityPool.address,
        );
        await protocols[1].getIsTraderSafe(liquidityPool.address, alice);

        expect(isSafe).to.be.true;
      }).timeout(0);
    });

    describe('when the trader has 50 positions', () => {
      beforeEach(async function testSetup() {
        this.timeout(0);

        await insertPositions(50, alice);
      });

      it.skip('returns if pool is safe', async () => {
        const isSafe = await protocols[1].getIsPoolSafe.call(
          liquidityPool.address,
        );
        await protocols[1].getIsTraderSafe(liquidityPool.address, alice);

        expect(isSafe).to.be.true;
      }).timeout(0);
    });
  });

  describe.skip('when checking the pool safety', () => {
    beforeEach(async () => {
      await protocols[1].deposit(liquidityPool.address, dollar(1000), {
        from: alice,
      });
      await protocols[1].deposit(liquidityPool.address, dollar(1000), {
        from: bob,
      });
    });

    describe('when the pool has 10 positions', () => {
      beforeEach(async function testSetup() {
        await insertPositions(5, alice);
        await insertPositions(5, bob);
      });

      it('returns if pool is safe', async () => {
        const isSafe = await protocols[1].getIsPoolSafe.call(
          liquidityPool.address,
        );
        await protocols[1].getIsPoolSafe(liquidityPool.address);

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
        const isSafe = await protocols[1].getIsPoolSafe.call(
          liquidityPool.address,
        );
        await protocols[1].getIsPoolSafe(liquidityPool.address);

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
        const isSafe = await protocols[1].getIsPoolSafe.call(
          liquidityPool.address,
        );
        await protocols[1].getIsPoolSafe(liquidityPool.address);

        expect(isSafe).to.be.true;
      }).timeout(0);
    });
  });

  describe.only('when computing unrealized profit loss along with market price', () => {
    const itComputesPlWithLeverageCorrectly = (leverage: BN) => {
      let askPrice: BN;
      let bidPrice: BN;
      let leveragedHeldInEuro: BN;
      let leveragedDebits: BN;
      let maxPrice: BN;

      beforeEach(async () => {
        askPrice = await protocols[1].getAskPrice.call(
          liquidityPool.address,
          usd.address,
          eur,
          0,
        );

        bidPrice = await protocols[1].getBidPrice.call(
          liquidityPool.address,
          usd.address,
          eur,
          0,
        );

        leveragedHeldInEuro = euro(100).mul(!leverage.isNeg() ? bn(1) : bn(-1));
        leveragedDebits = fromEth(
          leveragedHeldInEuro.mul(!leverage.isNeg() ? askPrice : bidPrice),
        ).mul(bn(-1));
        maxPrice = bn(0);
      });

      it('should return correct unrealized PL at the beginning of a new position', async () => {
        const unrealizedPl = await protocols[1].getUnrealizedPlAndMarketPriceOfPosition.call(
          liquidityPool.address,
          usd.address,
          eur,
          leverage,
          leveragedHeldInEuro,
          leveragedDebits,
          maxPrice,
        );
        const currentPrice = !leverage.isNeg() ? bidPrice : askPrice;
        const openPrice = leveragedDebits
          .mul(bn(1e18))
          .div(leveragedHeldInEuro)
          .abs();
        // unrealizedPlOfPosition = (currentPrice - openPrice) * leveragedHeld * to_usd_price
        const expectedPl = fromEth(
          currentPrice.sub(openPrice).mul(leveragedHeldInEuro),
        );

        expect(unrealizedPl['0']).to.be.bignumber.equal(expectedPl);
        expect(unrealizedPl['1']).to.be.bignumber.equal(currentPrice);
      });

      it('should return correct unrealized PL after a profit', async () => {
        await oracle.feedPrice(eur, fromPercent(240), { from: owner });

        const newPrice: BN = await protocols[1][
          !leverage.isNeg() ? 'getBidPrice' : 'getAskPrice'
        ].call(liquidityPool.address, usd.address, eur, 0);

        const unrealizedPl = await protocols[1].getUnrealizedPlAndMarketPriceOfPosition.call(
          liquidityPool.address,
          usd.address,
          eur,
          leverage,
          leveragedHeldInEuro,
          leveragedDebits,
          maxPrice,
        );
        const openPrice = leveragedDebits
          .mul(bn(1e18))
          .div(leveragedHeldInEuro)
          .abs();
        // unrealizedPlOfPosition = (currentPrice - openPrice) * leveragedHeld * to_usd_price
        const expectedPl = fromEth(
          newPrice.sub(openPrice).mul(leveragedHeldInEuro),
        );

        expect(unrealizedPl['0']).to.be.bignumber.equal(expectedPl);
        expect(unrealizedPl['1']).to.be.bignumber.equal(newPrice);
      });

      it('should return correct unrealized PL after a loss', async () => {
        await oracle.feedPrice(eur, fromPercent(60), { from: owner });

        const newPrice: BN = await protocols[1][
          !leverage.isNeg() ? 'getBidPrice' : 'getAskPrice'
        ].call(liquidityPool.address, usd.address, eur, 0);

        const unrealizedPl = await protocols[1].getUnrealizedPlAndMarketPriceOfPosition.call(
          liquidityPool.address,
          usd.address,
          eur,
          leverage,
          leveragedHeldInEuro,
          leveragedDebits,
          maxPrice,
        );
        const openPrice = leveragedDebits
          .mul(bn(1e18))
          .div(leveragedHeldInEuro)
          .abs();
        // unrealizedPlOfPosition = (currentPrice - openPrice) * leveragedHeld * to_usd_price
        const expectedPl = fromEth(
          newPrice.sub(openPrice).mul(leveragedHeldInEuro),
        );

        expect(unrealizedPl['0']).to.be.bignumber.equal(expectedPl);
        expect(unrealizedPl['1']).to.be.bignumber.equal(newPrice);
      });
    };

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
      askPrice = await protocols[1].getAskPrice.call(
        liquidityPool.address,
        usd.address,
        eur,
        0,
      );

      bidPrice = await protocols[1].getBidPrice.call(
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

      await protocols[1].deposit(liquidityPool.address, dollar(1000), {
        from: alice,
      });

      await protocols[1].openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage1,
        leveragedHeldInEuro1,
        0,
        { from: alice },
      );
      await protocols[1].openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage2,
        leveragedHeldInEuro2,
        0,
        { from: alice },
      );
    });

    it('should return correct unrealized PL at the beginning of a new position', async () => {
      const unrealizedPl = await protocols[1].getUnrealizedPlOfTrader.call(
        liquidityPool.address,
        alice,
      );
      const currentPrice1 = !leverage1.isNeg() ? bidPrice : askPrice;
      const currentPrice2 = !leverage2.isNeg() ? bidPrice : askPrice;
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

      expect(unrealizedPl).to.be.bignumber.equal(expectedPl1.add(expectedPl2));
    });

    it('should return correct unrealized PL after a profit', async () => {
      await oracle.feedPrice(eur, fromPercent(240), { from: owner });

      const unrealizedPl = await protocols[1].getUnrealizedPlOfTrader.call(
        liquidityPool.address,
        alice,
      );
      const newPrice1: BN = await protocols[1][
        !leverage1.isNeg() ? 'getBidPrice' : 'getAskPrice'
      ].call(liquidityPool.address, usd.address, eur, 0);
      const newPrice2: BN = await protocols[1][
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
        ? newPrice1.sub(openPrice1)
        : openPrice1.sub(newPrice1);
      const priceDelta2 = !leverage2.isNeg()
        ? newPrice2.sub(openPrice2)
        : openPrice2.sub(newPrice2);
      const expectedPl1 = fromEth(priceDelta1.mul(leveragedHeldInEuro1));
      const expectedPl2 = fromEth(priceDelta2.mul(leveragedHeldInEuro2));

      expect(unrealizedPl).to.be.bignumber.equal(expectedPl1.add(expectedPl2));
    });

    it('should return correct unrealized PL after a loss', async () => {
      await oracle.feedPrice(eur, fromPercent(60), { from: owner });

      const unrealizedPl = await protocols[1].getUnrealizedPlOfTrader.call(
        liquidityPool.address,
        alice,
      );
      const newPrice1: BN = await protocols[1][
        !leverage1.isNeg() ? 'getBidPrice' : 'getAskPrice'
      ].call(liquidityPool.address, usd.address, eur, 0);
      const newPrice2: BN = await protocols[1][
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
        ? newPrice1.sub(openPrice1)
        : openPrice1.sub(newPrice1);
      const priceDelta2 = !leverage2.isNeg()
        ? newPrice2.sub(openPrice2)
        : openPrice2.sub(newPrice2);
      const expectedPl1 = fromEth(priceDelta1.mul(leveragedHeldInEuro1));
      const expectedPl2 = fromEth(priceDelta2.mul(leveragedHeldInEuro2));

      expect(unrealizedPl).to.be.bignumber.equal(expectedPl1.add(expectedPl2));
    });
  });

  describe('when computing the accumulated swap rate', () => {
    it('should return the correct accumulated swap rate', async () => {
      const leveragedDebitsInUsd = dollar(5000);
      const daysOfPosition = 20;
      const ageOfPosition = time.duration.days(daysOfPosition);
      const swapRate = bn(5);
      const timeWhenOpened = (await time.latest()).sub(ageOfPosition);
      const accSwapRate = await protocols[1].getAccumulatedSwapRateOfPosition(
        leveragedDebitsInUsd,
        swapRate,
        timeWhenOpened,
      );

      const expectedAccSwapRate = fromEth(
        swapRate.mul(bn(daysOfPosition)).mul(leveragedDebitsInUsd),
      );

      expect(accSwapRate).to.be.bignumber.equal(expectedAccSwapRate);
    });

    it('counts only full days', async () => {
      const leveragedDebitsInUsd = dollar(5000);
      const daysOfPosition = 20;
      const ageOfPosition = time.duration
        .days(daysOfPosition)
        .sub(time.duration.seconds(5));
      const swapRate = bn(5);
      const timeWhenOpened = (await time.latest()).sub(ageOfPosition);
      const accSwapRate = await protocols[1].getAccumulatedSwapRateOfPosition(
        leveragedDebitsInUsd,
        swapRate,
        timeWhenOpened,
      );

      const expectedAccSwapRate = swapRate
        .mul(bn(daysOfPosition - 1))
        .mul(leveragedDebitsInUsd)
        .div(bn(1e18));
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
      await protocols[2].deposit(liquidityPool.address, dollar(1000), {
        from: alice,
      });
      await protocols[2].deposit(liquidityPool.address, dollar(1000), {
        from: bob,
      });

      initialAskPrice = await protocols[1].getAskPrice.call(
        liquidityPool.address,
        usd.address,
        eur,
        0,
      );

      initialBidPrice = await protocols[1].getBidPrice.call(
        liquidityPool.address,
        usd.address,
        eur,
        0,
      );

      leveragedHeld1 = euro(10);
      leveragedHeld2 = euro(5);
      leverage1 = bn(20);
      leverage2 = bn(-20);

      await protocols[2].openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage1,
        leveragedHeld1,
        0,
        { from: alice },
      );
      await protocols[2].openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        leverage2,
        leveragedHeld2,
        0,
        { from: alice },
      );
      await protocols[2].openPosition(
        liquidityPool.address,
        usd.address,
        eur,
        20,
        euro(2),
        0,
        { from: bob },
      );
    });

    describe('when computing equity of trader', () => {
      it('should return the correct equity', async () => {
        const aliceEquity = await protocols[2].getEquityOfTrader.call(
          liquidityPool.address,
          alice,
        );
        const bobEquity = await protocols[2].getEquityOfTrader.call(
          liquidityPool.address,
          bob,
        );

        // equityOfTrader = balance + unrealizedPl - accumulatedSwapRate

        const aliceBalance = convertToBaseToken(
          await protocols[2].balances(liquidityPool.address, alice),
        );
        const aliceUnrealized = await protocols[2].getUnrealizedPlOfTrader.call(
          liquidityPool.address,
          alice,
        );
        const aliceSwapRates = await protocols[2].getSwapRatesOfTrader(
          liquidityPool.address,
          alice,
        );
        const aliceExpectedEquity = aliceBalance
          .add(aliceUnrealized)
          .sub(aliceSwapRates);

        const bobBalance = convertToBaseToken(
          await protocols[2].balances(liquidityPool.address, bob),
        );
        const bobUnrealized = await protocols[2].getUnrealizedPlOfTrader.call(
          liquidityPool.address,
          bob,
        );
        const bobSwapRates = await protocols[2].getSwapRatesOfTrader(
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
          await protocols[2].openPosition(
            liquidityPool.address,
            usd.address,
            eur,
            20,
            dollar(8000),
            0,
            { from: bob },
          );
          await protocols[2].openPosition(
            liquidityPool.address,
            usd.address,
            eur,
            -20,
            dollar(8000),
            0,
            { from: bob },
          );

          await oracle.feedPrice(eur, fromPercent(100), { from: owner });
          await protocols[2].closePosition(3, 0, { from: bob }); // close bob' loss position
        });

        it('should return the correct equity', async () => {
          const bobEquity = await protocols[2].getEquityOfTrader.call(
            liquidityPool.address,
            bob,
          );

          const bobBalance = convertToBaseToken(
            await protocols[2].balances(liquidityPool.address, bob),
          );
          const bobUnrealized = await protocols[2].getUnrealizedPlOfTrader.call(
            liquidityPool.address,
            bob,
          );
          const bobSwapRates = await protocols[2].getSwapRatesOfTrader(
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
        const positionsByPoolBefore = await protocols[2].getPositionsByPool(
          liquidityPool.address,
          constants.ZERO_ADDRESS,
        );
        const positionsByAliceBefore = await protocols[2].getPositionsByPool(
          liquidityPool.address,
          alice,
        );
        const positionsByBobBefore = await protocols[2].getPositionsByPool(
          liquidityPool.address,
          bob,
        );

        await protocols[2].removePositionFromPoolList(
          liquidityPool.address,
          1,
          {
            from: alice,
          },
        );

        const positionsByPoolAfter = await protocols[2].getPositionsByPool(
          liquidityPool.address,
          constants.ZERO_ADDRESS,
        );
        const positionsByAliceAfter = await protocols[2].getPositionsByPool(
          liquidityPool.address,
          alice,
        );
        const positionsByBobAfter = await protocols[2].getPositionsByPool(
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
        const leveragedDebits = await protocols[2].getLeveragedDebitsOfTrader(
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
        const daysOfPosition = 5;
        await time.increase(time.duration.days(daysOfPosition));

        const accSwapRates = await protocols[2].getSwapRatesOfTrader(
          liquidityPool.address,
          alice,
        );

        const position1SwapRate = await protocols[2].getAccumulatedSwapRateOfPosition(
          0,
        );
        const position2SwapRate = await protocols[2].getAccumulatedSwapRateOfPosition(
          1,
        );

        expect(accSwapRates).to.be.bignumber.equal(
          position1SwapRate.add(position2SwapRate),
        );
      });
    });
  });

  describe('when getting the latest price', () => {
    it('should return the correct latest price', async () => {
      const price1 = await protocols[2].getPrice.call(usd.address, eur);
      const price2 = await protocols[2].getPrice.call(eur, usd.address);

      expect(price1).to.be.bignumber.equal(fromPercent(120));
      expect(price2).to.be.bignumber.equal(bn('833333333333333333'));
    });
  });

  describe('when getting the value in USD', () => {
    it('should return the correct USD value', async () => {
      const value = bn(120);
      const usdValue = await protocols[1].getUsdValue.call(eur, value);

      expect(usdValue).to.be.bignumber.equal(bn(120 * 1.2));
    });

    it('should be identical when passing USD', async () => {
      const value = bn(120);
      const usdValue = await protocols[1].getUsdValue.call(usd.address, value);

      expect(usdValue).to.be.bignumber.equal(value);
    });
  });

  describe('when getting the ask price', () => {
    it('should return the correct ask price', async () => {
      const askPrice = await protocols[1].getAskPrice.call(
        liquidityPool.address,
        usd.address,
        eur,
        0,
      );

      // askPrice = price + (price * spread)
      const expectedAskPrice = initialEurPrice.add(
        fromEth(initialEurPrice.mul(initialSpread)),
      );

      expect(askPrice).to.be.bignumber.equal(expectedAskPrice);
    });

    it('reverts when passed max price is too low', async () => {
      const expectedAskPrice = initialEurPrice.add(
        fromEth(initialEurPrice.mul(initialSpread)),
      );

      const maxPrice = expectedAskPrice.sub(bn(1));

      await expectRevert(
        protocols[1].getAskPrice.call(
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
      const bidPrice = await protocols[1].getBidPrice.call(
        liquidityPool.address,
        usd.address,
        eur,
        0,
      );

      // bidPrice = price - (price * spread)
      const expectedBidPrice = initialEurPrice.sub(
        fromEth(initialEurPrice.mul(initialSpread)),
      );

      expect(bidPrice).to.be.bignumber.equal(expectedBidPrice);
    });

    it('reverts when passed min price is too high', async () => {
      const expectedBidPrice = initialEurPrice.sub(
        fromEth(initialEurPrice.mul(initialSpread)),
      );

      const minPrice = expectedBidPrice.add(bn(1));

      await expectRevert(
        protocols[1].getBidPrice.call(
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
      const flowMarginProtocolProxy = await Proxy.at(protocols[0].address);
      const newFlowMarginProtocolImpl = await FlowMarginProtocolNewVersion.new();
      await flowMarginProtocolProxy.upgradeTo(
        newFlowMarginProtocolImpl.address,
      );
      const newFlowMarginProtocol = await FlowMarginProtocolNewVersion.at(
        protocols[0].address,
      );
      const value = bn(345);
      const firstBytes32 =
        '0x18e5f16b91bbe0defc5ee6bc25b514b030126541a8ed2fc0b69402452465cc00';
      const secondBytes32 =
        '0x18e5f16b91bbe0defc5ee6bc25b514b030126541a8ed2fc0b69402452465cc99';

      const newValueBefore = await newFlowMarginProtocol.newStorageUint();
      await newFlowMarginProtocol.addNewStorageBytes32(firstBytes32);
      await newFlowMarginProtocol.setNewStorageUint(value);
      await newFlowMarginProtocol.addNewStorageBytes32(secondBytes32);
      const newValueAfter = await newFlowMarginProtocol.newStorageUint();
      const newStorageByte1 = await newFlowMarginProtocol.newStorageBytes32(0);
      const newStorageByte2 = await newFlowMarginProtocol.newStorageBytes32(1);

      expect(newValueBefore).to.be.bignumber.equal(bn(0));
      expect(newValueAfter).to.be.bignumber.equal(value);
      expect(newStorageByte1).to.be.equal(firstBytes32);
      expect(newStorageByte2).to.be.equal(secondBytes32);
    });

    it('works with old and new data', async () => {
      const maxSpread = await protocols[0].maxSpread();

      const flowMarginProtocolProxy = await Proxy.at(protocols[0].address);
      const newFlowMarginProtocolImpl = await FlowMarginProtocolNewVersion.new();
      await flowMarginProtocolProxy.upgradeTo(
        newFlowMarginProtocolImpl.address,
      );
      const newFlowMarginProtocol = await FlowMarginProtocolNewVersion.at(
        protocols[0].address,
      );
      const value = bn(345);
      await newFlowMarginProtocol.setNewStorageUint(value);
      const maxSpreadPlusNewValue = await newFlowMarginProtocol.getNewValuePlusMaxSpread();

      expect(maxSpreadPlusNewValue).to.be.bignumber.equal(value.add(maxSpread));
    });
  });
});
