import BN from 'bn.js';
import { expectRevert, constants } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import {
  SimplePriceOracleInstance, FlowMarginProtocolInstance, LiquidityPoolInstance, TestTokenInstance,
  MarginTradingPairInstance, MoneyMarketInstance, IERC20Instance,
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

    await usd.approve(protocol.address, constants.MAX_UINT256, { from: alice });
    await usd.approve(protocol.address, constants.MAX_UINT256, { from: bob });
    await usd.approve(moneyMarket.address, constants.MAX_UINT256, { from: liquidityProvider });

    liquidityPool = await LiquidityPool.new(moneyMarket.address, fromPip(10));

    await liquidityPool.approve(protocol.address, constants.MAX_UINT256);
    await liquidityPool.enableToken(eur);

    await moneyMarket.mintTo(liquidityPool.address, dollar(10000), { from: liquidityProvider });

    await oracle.setPrice(eur, fromPercent(100));
  });

  const run = async (...actions: Array<() => any>) => {
    for (const act of actions) {
      await act();
    }
  };

  const openPosition = (from: string, amount: any) => () =>
    protocol.openPosition(pair.address, liquidityPool.address, amount, { from });
  const closePositon = (from: string, id: number) => () =>
    protocol.closePosition(pair.address, id, { from });
  const liquidityPoolClosePosition = (id: number) => () =>
    liquidityPool.closeMarginPosition(protocol.address, pair.address, id);

  const position = (id: number, from: string, amount: any, openPrice: any) => async () => {
    const positon = await pair.positions(id);
    [from, liquidityPool.address, amount, openPrice, dollar(50), fromPip(10)].forEach((x, i) => {
      if (BN.isBN(positon[i])) {
        expect(positon[i]).bignumber.equal(bn(x));
      } else {
        expect(positon[i]).equal(x);
      }
    });
  };
  const balance = (token: IERC20Instance, addr: string, amount: any) => async () =>
    expect(await token.balanceOf(addr)).bignumber.equal(bn(amount));
  const setPrice = (price: number) => () => oracle.setPrice(eur, price);
  const profit = (user: string, positions: Array<[number, number, number]>) => async () => {
    let totalProfit = 0;
    for (const [startPrice, endPrice, principal] of positions) {
      const spread = 0.001;
      const openPrice = startPrice * (1 + spread);
      const closePrice = endPrice * (1 - spread);
      const diff = (closePrice - openPrice) / openPrice;
      const leverage = await pair.leverage();
      const leveragedDiff = diff * leverage.toNumber();
      const expectedProfit = principal * leveragedDiff;
      totalProfit += expectedProfit;
    }

    const bal: BN = await usd.balanceOf(user) as any;
    const profitVal = bal.sub(dollar(10000)).mul(bn(10000)).div(dollar(1)).toNumber() / 10000;

    expect(profitVal).closeTo(totalProfit, 0.0001);
  };
  const revert = (fn: () => Promise<any>, msg: string) => () => expectRevert(fn(), msg);

  it('requires owner to add new trading pair', async () => {
    await expectRevert(protocol.addTradingPair(eur, { from: badAddress }), messages.onlyOwner);
  });

  describe('with 10x long leverage', () => {
    beforeEach(async () => {
      pair = await MarginTradingPair.new(protocol.address, moneyMarket.address, eur, 10, fromPercent(70), dollar(5));
      await protocol.addTradingPair(pair.address);
    });

    it('should be able to make profit on price increase', async () => {
      await run(
        openPosition(alice, dollar(105)),
        position(0, alice, dollar(1050), fromPip(10010)),
        setPrice(fromPercent(101)),
        closePositon(alice, 0),
        profit(alice, [[1, 1.01, 100]]),
        balance(iUsd, liquidityPool.address, '99920179820179820180000')
      );
    });

    it('should be able to take lost on price decrease', async () => {
      await run(
        openPosition(alice, dollar(105)),
        position(0, alice, dollar(1050), fromPip(10010)),
        setPrice(fromPercent(99)),
        closePositon(alice, 0),
        profit(alice, [[1, 0.99, 100]]),
        balance(iUsd, liquidityPool.address, '100119780219780219782000')
      );
    });

    it('should be able to have multiple positions', async () => {
      await run(
        openPosition(alice, dollar(105)),
        openPosition(bob, dollar(65)),
        position(0, alice, dollar(1050), fromPip(10010)),
        position(1, bob, dollar(650), fromPip(10010)),
        setPrice(fromPercent(101)),
        openPosition(bob, dollar(55)),
        position(2, bob, dollar(550), '1011010000000000000'),
        setPrice(fromPercent(102)),
        closePositon(alice, 0),
        closePositon(bob, 2),
        setPrice(fromPercent(99)),
        closePositon(bob, 1),
        profit(alice, [[1, 1.02, 100]]),
        profit(bob, [[1, 0.99, 60], [1.01, 1.02, 50]]),
        balance(iUsd, liquidityPool.address, '99852831722732712833200')
      );
    });

    describe('liquidation', () => {
      it('should not open position without enough liquidation fee', async () => {
        await run(
          revert(openPosition(alice, dollar(5)), messages.notEnoughLiquidationFee),
          revert(openPosition(alice, dollar(1)), messages.notEnoughLiquidationFee),
        );
      });

      describe('with a safe open position', () => {
        beforeEach(async () => {
          await openPosition(alice, dollar(105))();
        });

        it('should allow owner to close it', async () => {
          await run(
            position(0, alice, dollar(1050), fromPip(10010)),
            closePositon(alice, 0),
            profit(alice, [[1, 1, 100]]),
            balance(iUsd, liquidityPool.address, '100019980019980019982000')
          );
        });

        it('should not allow liquidity pool to close it', async () => {
          await revert(liquidityPoolClosePosition(0), messages.onlyOwnerCanClosePosition)();
        });

        it('should not allow others to close it', async () => {
          await revert(closePositon(bob, 0), messages.onlyOwnerOrLiquidityPoolCanClosePosition)();
        });
      });

      describe('with an unsafe open position with increased price', () => {
        beforeEach(async () => {
          await run(
            openPosition(alice, dollar(105)),
            setPrice(fromPercent(108)),
          );
        });

        it('should allow owner to close it', async () => {
          await run(
            closePositon(alice, 0),
            profit(alice, [[1, 1.08, 100]]),
          );
        });

        it('should  allow liquidity pool to close it', async () => {
          await run(
            liquidityPoolClosePosition(0),
            profit(alice, [[1, 1.08, 100]]),
          );
        });

        it('should not allow others to close it', async () => {
          await revert(closePositon(bob, 0), messages.onlyOwnerOrLiquidityPoolCanClosePosition)();
        });
      });

      describe('with an unsafe open position with decreased price', () => {
        beforeEach(async () => {
          await run(
            openPosition(alice, dollar(105)),
            setPrice(fromPercent(92)),
          );
        });

        it('should allow owner to close it', async () => {
          await run(
            closePositon(alice, 0),
            profit(alice, [[1, 0.92, 100]]),
          );
        });

        it('should  allow liquidity pool to close it', async () => {
          await run(
            liquidityPoolClosePosition(0),
            profit(alice, [[1, 0.92, 100]]),
          );
        });

        it('should not allow others to close it', async () => {
          await revert(closePositon(bob, 0), messages.onlyOwnerOrLiquidityPoolCanClosePosition)();
        });
      });

      describe('with an closed position with increased price', () => {
        beforeEach(async () => {
          await run(
            openPosition(alice, dollar(105)),
            setPrice(fromPercent(111)),
          );
        });

        it('should allow owner to close it', async () => {
          await run(
            closePositon(alice, 0),
            balance(usd, alice, dollar(10000 + 100 + 5)),
            balance(iUsd, liquidityPool.address, dollar((10000 - 100 - 5) * 10)),
          );
        });

        it('should  allow liquidity pool to close it', async () => {
          await run(
            liquidityPoolClosePosition(0),
            balance(usd, alice, dollar(10000 + 100 - 5)),
            balance(iUsd, liquidityPool.address, dollar((10000 - 100 + 5) * 10)),
          );
        });

        it('should allow others to close it and take liquidation fee', async () => {
          await run(
            closePositon(bob, 0),
            balance(usd, alice, dollar(10000 + 100 - 5)),
            balance(iUsd, liquidityPool.address, dollar((10000 - 100 - 5) * 10)),
            balance(usd, bob, dollar(10000 + 5 + 5)),
          );
        });
      });

      describe('with an closed position with decreased price', () => {
        beforeEach(async () => {
          await run(
            openPosition(alice, dollar(105)),
            setPrice(fromPercent(89)),
          );
        });

        it('should allow owner to close it', async () => {
          await run(
            closePositon(alice, 0),
            balance(usd, alice, dollar(10000 - 100 + 5)),
            balance(iUsd, liquidityPool.address, dollar((10000 + 100 - 5) * 10)),
          );
        });

        it('should  allow liquidity pool to close it', async () => {
          await run(
            liquidityPoolClosePosition(0),
            balance(usd, alice, dollar(10000 - 100 - 5)),
            balance(iUsd, liquidityPool.address, dollar((10000 + 100 + 5) * 10)),
          );
        });

        it('should allow others to close it and take liquidation fee', async () => {
          await run(
            closePositon(bob, 0),
            balance(usd, alice, dollar(10000 - 100 - 5)),
            balance(iUsd, liquidityPool.address, dollar((10000 + 100 - 5) * 10)),
            balance(usd, bob, dollar(10000 + 5 + 5)),
          );
        });
      });
    });
  });

  describe('with 5x short leverage', () => {
    beforeEach(async () => {
      pair = await MarginTradingPair.new(protocol.address, moneyMarket.address, eur, -5, fromPercent(70), dollar(5));
      await protocol.addTradingPair(pair.address);
    });

    it('should be able to take lost on price increase', async () => {
      await run(
        openPosition(alice, dollar(105)),
        position(0, alice, dollar(1050), fromPip(10010)),
        setPrice(fromPercent(101)),
        closePositon(alice, 0),
        profit(alice, [[1, 1.01, 100]]),
        balance(iUsd, liquidityPool.address, '100039910089910089910000')
      );
    });

    it('should be able to make profit on price decrease', async () => {
      await run(
        openPosition(alice, dollar(105)),
        position(0, alice, dollar(1050), fromPip(10010)),
        setPrice(fromPercent(99)),
        closePositon(alice, 0),
        profit(alice, [[1, 0.99, 100]]),
        balance(iUsd, liquidityPool.address, '99940109890109890108000')
      );
    });

    it('should be able to have multiple positions', async () => {
      await run(
        openPosition(alice, dollar(105)),
        openPosition(bob, dollar(65)),
        position(0, alice, dollar(1050), fromPip(10010)),
        position(1, bob, dollar(650), fromPip(10010)),
        setPrice(fromPercent(101)),
        openPosition(bob, dollar(55)),
        position(2, bob, dollar(550), '1011010000000000000'),
        setPrice(fromPercent(102)),
        closePositon(alice, 0),
        closePositon(bob, 2),
        setPrice(fromPercent(99)),
        closePositon(bob, 1),
        profit(alice, [[1, 1.02, 100]]),
        profit(bob, [[1, 0.99, 60], [1.01, 1.02, 50]]),
        balance(iUsd, liquidityPool.address, '100073584138633643582800')
      );
    });
  });

  // TODO: more tests with interests i.e. when iToken rate changed
});
