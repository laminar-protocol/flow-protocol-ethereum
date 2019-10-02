import { expectRevert } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import { TestTokenInstance, MoneyMarketInstance, IERC20Instance, TestCTokenInstance } from 'types/truffle-contracts';
import * as helper from './helpers';

contract.only('MoneyMarket', accounts => {
    const alice = accounts[1];
    const bob = accounts[2];
    const badAddress = accounts[3];
    let usd: TestTokenInstance;
    let iToken: IERC20Instance;
    let cToken: TestCTokenInstance;
    let moneyMarket: MoneyMarketInstance;
  
    beforeEach(async () => {
        usd = await helper.createTestToken([alice, 10000], [bob, 10000]);
        ({ moneyMarket, iToken, cToken } = await helper.createMoneyMarket(usd.address, helper.fromPercent(100)));
        usd.approve(moneyMarket.address, 10000, { from: alice });
        usd.approve(moneyMarket.address, 10000, { from: bob });
    });

    const expectBalances = async (token: IERC20Instance | TestCTokenInstance | TestTokenInstance, address: string | { address: string }, value: number) =>
        expect(await token.balanceOf(typeof address === 'string' ? address : address.address)).bignumber.equal(helper.bn(value));

    it('should be able to mint', async () => {
        await moneyMarket.mint(1000, { from: alice });
        await expectBalances(usd, alice, 9000);
        await expectBalances(usd, moneyMarket, 1000);
        await expectBalances(iToken, alice, 1000);
    });

    it('should be able to mintTo', async () => {
        await moneyMarket.mintTo(bob, 1000, { from: alice });
        await expectBalances(usd, alice, 9000);
        await expectBalances(usd, moneyMarket, 1000);
        await expectBalances(iToken, alice, 0);
        await expectBalances(iToken, bob, 1000);
    });

    describe('with iToken', () => {
        beforeEach(async () => {
            await moneyMarket.mint(1000, { from: alice });
        });

        it('should be able to redeem', async () => {
            await moneyMarket.redeem(800, { from: alice });
            await expectBalances(usd, alice, 9800);
            await expectBalances(usd, moneyMarket, 200);
            await expectBalances(iToken, alice, 200);
        });

        it('should be able to redeemTo', async () => {
            await moneyMarket.redeemTo(bob, 800, { from: alice });
            await expectBalances(usd, alice, 9000);
            await expectBalances(usd, bob, 10800);
            await expectBalances(usd, moneyMarket, 200);
            await expectBalances(iToken, alice, 200);
        });

        it('should be able to redeemBaseToken', async () => {
            await moneyMarket.redeemBaseToken(800, { from: alice });
            await expectBalances(usd, alice, 9800);
            await expectBalances(usd, moneyMarket, 200);
            await expectBalances(iToken, alice, 200);
        });

        it('should be able to redeemBaseTokenTo', async () => {
            await moneyMarket.redeemBaseTokenTo(bob, 800, { from: alice });
            await expectBalances(usd, alice, 9000);
            await expectBalances(usd, bob, 10800);
            await expectBalances(usd, moneyMarket, 200);
            await expectBalances(iToken, alice, 200);
        });

        describe('setMinLiquidity', async () => {
            it('should be able to setMinLiquidity and rebalance', async () => {
                // make cToken utilization to 100%
                await usd.transfer(cToken.address, 200);
                await cToken.borrow(alice, 200);

                await moneyMarket.setMinLiquidity(helper.fromPercent(10));
                expect(await moneyMarket.minLiquidity()).bignumber.equal(helper.fromPercent(10));
                await expectBalances(usd, moneyMarket, 100);
                await expectBalances(usd, cToken, 900);

                await moneyMarket.setMinLiquidity(helper.fromPercent(20));
                expect(await moneyMarket.minLiquidity()).bignumber.equal(helper.fromPercent(20));
                await expectBalances(usd, moneyMarket, 200);
                await expectBalances(usd, cToken, 800);
            });

            it('should not be able to setMinLiquidity by others', async () => {
                await expectRevert(moneyMarket.setMinLiquidity(helper.fromPercent(10), { from: badAddress }), helper.messages.onlyOwner);
            });
        });

        it('should be able to mintTo', async () => {

        });
    });

    describe('with 40% min liquidity', async () => {
        beforeEach(async () => {
            await moneyMarket.setMinLiquidity(helper.fromPercent(40));
        });

        it.only('should deposit usd to cToken', async () => {
            // make cToken utilization to 50%
            await usd.transfer(cToken.address, 200);
            await cToken.borrow(alice, 100);

            await moneyMarket.mint(1000, { from: alice });
            await expectBalances(usd, moneyMarket, 200);
            await expectBalances(usd, cToken, 900); // 100 (old balance) + 800 (transferred in)
            // cash + cTokenValue * (cTokenLiquidity^2) / total = liquidityPercent
            //  200 +    800      * (     0.5       ^2) /  1000 = 40%
        });
    });
});
