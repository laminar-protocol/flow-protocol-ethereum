import BN from 'bn.js';
import { expectRevert } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import {
  TestTokenInstance,
  MoneyMarketInstance,
  IERC20Instance,
  TestCTokenInstance,
} from 'types/truffle-contracts';
import {
  createTestToken,
  createMoneyMarket,
  fromPercent,
  messages,
  bn,
  dollar,
} from './helpers';

contract('MoneyMarket', accounts => {
  const alice = accounts[1];
  const bob = accounts[2];
  const badAddress = accounts[3];
  let usd: TestTokenInstance;
  let iToken: IERC20Instance;
  let cToken: TestCTokenInstance;
  let moneyMarket: MoneyMarketInstance;

  beforeEach(async () => {
    usd = await createTestToken([alice, dollar(10000)], [bob, dollar(10000)]);
    ({ moneyMarket, iToken, cToken } = await createMoneyMarket(
      usd.address,
      fromPercent(100),
    ));
    usd.approve(moneyMarket.address, dollar(10000), { from: alice });
    usd.approve(moneyMarket.address, dollar(10000), { from: bob });
    usd.approve(cToken.address, dollar(10000));
  });

  const expectBalances = async (
    token: IERC20Instance | TestCTokenInstance | TestTokenInstance,
    address: string | { address: string },
    value: number | string,
  ) =>
    expect(
      await token.balanceOf(
        typeof address === 'string' ? address : address.address,
      ),
    ).bignumber.equal(bn(value));

  it('should be able to mint', async () => {
    await moneyMarket.mint(dollar(1000), { from: alice });
    await expectBalances(usd, alice, dollar(9000));
    await expectBalances(usd, moneyMarket, dollar(1000));
    await expectBalances(iToken, alice, dollar(10000));
  });

  it('should be able to mintTo', async () => {
    await moneyMarket.mintTo(bob, dollar(1000), { from: alice });
    await expectBalances(usd, alice, dollar(9000));
    await expectBalances(usd, moneyMarket, dollar(1000));
    await expectBalances(iToken, alice, 0);
    await expectBalances(iToken, bob, dollar(10000));
  });

  describe('with iToken', () => {
    beforeEach(async () => {
      await moneyMarket.mint(dollar(1000), { from: alice });
    });

    it('should be able to redeem', async () => {
      await moneyMarket.redeem(dollar(8000), { from: alice });
      await expectBalances(usd, alice, dollar(9800));
      await expectBalances(usd, moneyMarket, dollar(200));
      await expectBalances(iToken, alice, dollar(2000));
    });

    it('should be able to redeemTo', async () => {
      await moneyMarket.redeemTo(bob, dollar(8000), { from: alice });
      await expectBalances(usd, alice, dollar(9000));
      await expectBalances(usd, bob, dollar(10800));
      await expectBalances(usd, moneyMarket, dollar(200));
      await expectBalances(iToken, alice, dollar(2000));
    });

    it('should be able to redeemBaseToken', async () => {
      await moneyMarket.redeemBaseToken(dollar(800), { from: alice });
      await expectBalances(usd, alice, dollar(9800));
      await expectBalances(usd, moneyMarket, dollar(200));
      await expectBalances(iToken, alice, dollar(2000));
    });

    it('should be able to redeemBaseTokenTo', async () => {
      await moneyMarket.redeemBaseTokenTo(bob, dollar(800), { from: alice });
      await expectBalances(usd, alice, dollar(9000));
      await expectBalances(usd, bob, dollar(10800));
      await expectBalances(usd, moneyMarket, dollar(200));
      await expectBalances(iToken, alice, dollar(2000));
    });

    describe('setMinLiquidity', () => {
      it('should be able to setMinLiquidity and rebalance', async () => {
        await cToken.mint(dollar(10000));
        await cToken.borrow(alice, dollar(8000));

        await moneyMarket.setMinLiquidity(fromPercent(50));
        expect(await moneyMarket.minLiquidity()).bignumber.equal(
          fromPercent(50),
        );
        await expectBalances(usd, moneyMarket, '333333333333333333334');
        await expectBalances(usd, cToken, '2666666666666666666666');

        await moneyMarket.setMinLiquidity(fromPercent(100));
        expect(await moneyMarket.minLiquidity()).bignumber.equal(
          fromPercent(100),
        );
        await expectBalances(usd, moneyMarket, dollar(1000));
        await expectBalances(usd, cToken, dollar(2000));

        await moneyMarket.setMinLiquidity(fromPercent(80));
        expect(await moneyMarket.minLiquidity()).bignumber.equal(
          fromPercent(80),
        );
        await expectBalances(usd, moneyMarket, '743589743589743589744');
        await expectBalances(usd, cToken, '2256410256410256410256');
      });

      it('should not be able to setMinLiquidity by others', async () => {
        await expectRevert(
          moneyMarket.setMinLiquidity(fromPercent(10), { from: badAddress }),
          messages.onlyOwner,
        );
      });
    });
  });

  function _calculateInvestAmount(
    cTokenCash: bigint,
    cTokenBorrow: bigint,
    totalValue: bigint,
    minLiquidity: number,
  ) {
    if (cTokenBorrow === 0n) {
      return 0;
    }
    const targetLiquidityAmount = (totalValue * BigInt(minLiquidity)) / 100n;
    const a = cTokenBorrow + targetLiquidityAmount;
    if (a <= totalValue) {
      return totalValue;
    }

    const invest =
      ((totalValue - targetLiquidityAmount) * (cTokenCash + cTokenBorrow)) /
      (a - totalValue);

    if (totalValue < invest) {
      return totalValue;
    }

    return invest;
  }

  function calculateInvestAmount(
    cTokenCash: BN,
    cTokenBorrow: BN,
    totalValue: BN,
    minLiquidity: number,
  ) {
    return bn(
      _calculateInvestAmount(
        BigInt(cTokenCash),
        BigInt(cTokenBorrow),
        BigInt(totalValue),
        minLiquidity,
      ),
    );
  }

  for (const minLiquidity of [0, 40, 100]) {
    describe(`with ${minLiquidity}% min liquidity`, () => {
      beforeEach(async () => {
        await moneyMarket.setMinLiquidity(fromPercent(minLiquidity));
      });

      const data = [
        // [cTokenBorrow, cTokenTotal, moneyMarketTotalValue]
        [0, 10000, 1000],
        [2900, 10000, 1000],
        [3000, 10000, 1000],
        [3000, 10000, 1050],
        [4000, 10000, 1000],
        [7000, 10000, 1000],
        [10000, 10000, 1000],
      ];

      for (const [cTokenBorrow, cTokenTotal, totalValue] of data) {
        it(`should deposit usd to cToken: ${JSON.stringify({
          cTokenBorrow,
          cTokenTotal,
          totalValue,
        })}`, async () => {
          const cTokenBorrowBN = dollar(cTokenBorrow);
          const cTokenTotalBN = dollar(cTokenTotal);
          const cTokenCashBN = cTokenTotalBN.sub(cTokenBorrowBN);

          const totalValueBN = dollar(totalValue);

          await cToken.mint(cTokenTotalBN);
          await cToken.borrow(alice, cTokenBorrowBN);

          const invest = calculateInvestAmount(
            cTokenCashBN,
            cTokenBorrowBN,
            totalValueBN,
            minLiquidity,
          );
          const cash = totalValueBN.sub(invest);

          await moneyMarket.mint(totalValueBN, { from: alice });
          await expectBalances(usd, moneyMarket, cash);
          await expectBalances(usd, cToken, cTokenCashBN.add(invest));

          // TODO: check calculated liquidity matches to minLiquidity
        });
      }

      // TODO: more tests with redeem and cToken accrue interests
    });
  }
});
