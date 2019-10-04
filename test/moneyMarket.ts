import { expectRevert } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import { TestTokenInstance, MoneyMarketInstance, IERC20Instance, TestCTokenInstance } from 'types/truffle-contracts';
import { createTestToken, createMoneyMarket, fromPercent, messages, bn, dollar } from './helpers';

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
        ({ moneyMarket, iToken, cToken } = await createMoneyMarket(usd.address, fromPercent(100)));
        usd.approve(moneyMarket.address, dollar(10000), { from: alice });
        usd.approve(moneyMarket.address, dollar(10000), { from: bob });
    });

    const expectBalances = async (token: IERC20Instance | TestCTokenInstance | TestTokenInstance, address: string | { address: string }, value: number | string) =>
        expect(await token.balanceOf(typeof address === 'string' ? address : address.address)).bignumber.equal(bn(value));

    it('should be able to mint', async () => {
        await moneyMarket.mint(dollar(1000), { from: alice });
        await expectBalances(usd, alice, dollar(9000));
        await expectBalances(usd, moneyMarket, dollar(1000));
        await expectBalances(iToken, alice, dollar(1000));
    });

    it('should be able to mintTo', async () => {
        await moneyMarket.mintTo(bob, dollar(1000), { from: alice });
        await expectBalances(usd, alice, dollar(9000));
        await expectBalances(usd, moneyMarket, dollar(1000));
        await expectBalances(iToken, alice, 0);
        await expectBalances(iToken, bob, dollar(1000));
    });

    describe('with iToken', () => {
        beforeEach(async () => {
            await moneyMarket.mint(dollar(1000), { from: alice });
        });

        it('should be able to redeem', async () => {
            await moneyMarket.redeem(dollar(800), { from: alice });
            await expectBalances(usd, alice, dollar(9800));
            await expectBalances(usd, moneyMarket, dollar(200));
            await expectBalances(iToken, alice, dollar(200));
        });

        it('should be able to redeemTo', async () => {
            await moneyMarket.redeemTo(bob, dollar(800), { from: alice });
            await expectBalances(usd, alice, dollar(9000));
            await expectBalances(usd, bob, dollar(10800));
            await expectBalances(usd, moneyMarket, dollar(200));
            await expectBalances(iToken, alice, dollar(200));
        });

        it('should be able to redeemBaseToken', async () => {
            await moneyMarket.redeemBaseToken(dollar(800), { from: alice });
            await expectBalances(usd, alice, dollar(9800));
            await expectBalances(usd, moneyMarket, dollar(200));
            await expectBalances(iToken, alice, dollar(200));
        });

        it('should be able to redeemBaseTokenTo', async () => {
            await moneyMarket.redeemBaseTokenTo(bob, dollar(800), { from: alice });
            await expectBalances(usd, alice, dollar(9000));
            await expectBalances(usd, bob, dollar(10800));
            await expectBalances(usd, moneyMarket, dollar(200));
            await expectBalances(iToken, alice, dollar(200));
        });

        describe('setMinLiquidity', async () => {
            it('should be able to setMinLiquidity and rebalance', async () => {
                // make cToken utilization to 100%
                await usd.transfer(cToken.address, dollar(200));
                await cToken.borrow(alice, dollar(200));

                await moneyMarket.setMinLiquidity(fromPercent(10));
                expect(await moneyMarket.minLiquidity()).bignumber.equal(fromPercent(10));
                await expectBalances(usd, moneyMarket, dollar(100));
                await expectBalances(usd, cToken, dollar(900));

                await moneyMarket.setMinLiquidity(fromPercent(20));
                expect(await moneyMarket.minLiquidity()).bignumber.equal(fromPercent(20));
                await expectBalances(usd, moneyMarket, dollar(200));
                await expectBalances(usd, cToken, dollar(800));
            });

            it('should not be able to setMinLiquidity by others', async () => {
                await expectRevert(moneyMarket.setMinLiquidity(fromPercent(10), { from: badAddress }), messages.onlyOwner);
            });
        });
    });

    for (const minLiquidity of [0, 40, 100]) {
        describe(`with ${minLiquidity}% min liquidity`, async () => {
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
                it(`should deposit usd to cToken: ${JSON.stringify({cTokenBorrow, cTokenTotal, totalValue})}`, async () => {
                    const cTokenBorrowBN = dollar(cTokenBorrow);
                    const cTokenTotalBN = dollar(cTokenTotal);
                    const cTokenCashBN = cTokenTotalBN.sub(cTokenBorrowBN);
        
                    const totalValueBN = dollar(totalValue);
        
                    await usd.transfer(cToken.address, cTokenTotalBN);
                    await cToken.borrow(alice, cTokenBorrowBN);
        
                    const invest = calculateInvestAmount(cTokenCashBN, cTokenBorrowBN, totalValueBN, minLiquidity);
                    const cash = totalValueBN.sub(invest);
        
                    await moneyMarket.mint(totalValueBN, { from: alice });
                    await expectBalances(usd, moneyMarket, cash);
                    await expectBalances(usd, cToken, cTokenCashBN.add(invest));
                });
            }

            // TODO: more tests with redeem and cToken accrue interests
        });
    }
});

function _calculateInvestAmount(cTokenCash: bigint, cTokenBorrow: bigint, totalValue: bigint, minLiquidity: number) {
    if (cTokenBorrow === 0n) {
        return 0;
    }
    const targetLiquidityAmount = totalValue * BigInt(minLiquidity) / 100n
    const a = cTokenBorrow + targetLiquidityAmount
    if (a <= totalValue) {
        return totalValue
    }
​
    const invest = ((totalValue - targetLiquidityAmount) * (cTokenCash + cTokenBorrow)) / (a - totalValue)
​
    if (totalValue < invest) {
        return totalValue
    }
​
    return invest
}

function calculateInvestAmount(cTokenCash: BN, cTokenBorrow: BN, totalValue: BN, minLiquidity: number) {
    return bn(_calculateInvestAmount(BigInt(cTokenCash), BigInt(cTokenBorrow), BigInt(totalValue), minLiquidity));
}