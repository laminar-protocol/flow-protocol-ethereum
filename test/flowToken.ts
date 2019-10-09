import { expectRevert, constants } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import { createTestToken, createMoneyMarket, fromPercent, bn } from './helpers';
import { 
  TestTokenInstance, FlowTokenInstance, MoneyMarketInstance, IERC20Instance
} from 'types/truffle-contracts';

const FlowToken = artifacts.require("FlowToken");

contract('FlowProtocol', accounts => {
  const owner = accounts[0];
  const liquidityPool = accounts[1];
  const liquidityPoolTwo = accounts[2];
  const alice = accounts[3];

  let usd: TestTokenInstance;
  let iUsd: IERC20Instance;
  let fToken: FlowTokenInstance;
  let moneyMarket: MoneyMarketInstance;

  beforeEach(async () => {
    usd = await createTestToken();
    ({ moneyMarket, iToken: iUsd } = await createMoneyMarket(usd.address, fromPercent(100)));

    fToken = await FlowToken.new('Euro', 'EUR', moneyMarket.address, owner);

    await usd.approve(moneyMarket.address, constants.MAX_UINT256);
    
    await moneyMarket.mint(10000);
  });

  describe('with some position', () => {
    beforeEach(async () => {
      await fToken.addPosition(liquidityPool, 1200, 100, 200);
      await iUsd.transfer(fToken.address, 1200);
    });

    it('should be able to addPosition and keep interest share rate', async () => {    
      expect(await fToken.interestShareExchangeRate()).bignumber.equal(fromPercent(100));
      expect(await fToken.totalPrincipalAmount()).bignumber.equal(bn(1200));
      expect(await fToken.totalInterestShares()).bignumber.equal(bn(200));
      expect(await fToken.totalInterestDebits()).bignumber.equal(bn(200));
      expect(await fToken.interestShares(liquidityPool)).bignumber.equal(bn(200));
      expect(await fToken.interestDebits(liquidityPool)).bignumber.equal(bn(200));

      await fToken.addPosition(liquidityPoolTwo, 2400, 200, 400);
      await iUsd.transfer(fToken.address, 2400);

      expect(await fToken.interestShareExchangeRate()).bignumber.equal(fromPercent(100));
      expect(await fToken.totalPrincipalAmount()).bignumber.equal(bn(3600));
      expect(await fToken.totalInterestShares()).bignumber.equal(bn(600));
      expect(await fToken.totalInterestDebits()).bignumber.equal(bn(600));
      expect(await fToken.interestShares(liquidityPoolTwo)).bignumber.equal(bn(400));
      expect(await fToken.interestDebits(liquidityPoolTwo)).bignumber.equal(bn(400));
    });

    it('should be able to remove position', async () => {
      expect(await fToken.removePosition.call(liquidityPool, 600, 50)).bignumber.equal(bn(0));
      await fToken.removePosition(liquidityPool, 600, 50);
      await iUsd.transferFrom(fToken.address, owner, 600);

      expect(await fToken.interestShareExchangeRate()).bignumber.equal(fromPercent(100));
      expect(await fToken.totalPrincipalAmount()).bignumber.equal(bn(600));
      expect(await fToken.totalInterestShares()).bignumber.equal(bn(100));
      expect(await fToken.totalInterestDebits()).bignumber.equal(bn(100));
      expect(await fToken.interestShares(liquidityPool)).bignumber.equal(bn(100));
      expect(await fToken.interestDebits(liquidityPool)).bignumber.equal(bn(100));

      expect(await fToken.removePosition.call(liquidityPool, 600, 50)).bignumber.equal(bn(0));
      await fToken.removePosition(liquidityPool, 600, 50);
      await iUsd.transferFrom(fToken.address, owner, 600);

      expect(await fToken.interestShareExchangeRate()).bignumber.equal(fromPercent(100));
      expect(await fToken.totalPrincipalAmount()).bignumber.equal(bn(0));
      expect(await fToken.totalInterestShares()).bignumber.equal(bn(0));
      expect(await fToken.totalInterestDebits()).bignumber.equal(bn(0));
      expect(await fToken.interestShares(liquidityPool)).bignumber.equal(bn(0));
      expect(await fToken.interestDebits(liquidityPool)).bignumber.equal(bn(0));
    });

    describe('with 20% interests', () => {
      beforeEach(async () => {
        // 20% interest earned
        await usd.transfer(moneyMarket.address, bn(2000));
      });

      it('should be able to earn interest and withdraw it', async () => {
        // 20% interest * 1200 pricipal / 200 shares = 120% return = 220
        expect(await fToken.interestShareExchangeRate()).bignumber.equal(fromPercent(100 * 0.2 * 1200 / 200 + 100));
  
        // only withdraw interests
        // 1200 pricipal * 20% interest = 240
        expect(await fToken.removePosition.call(liquidityPool, 0, 0)).bignumber.equal(bn(240));
        await fToken.removePosition(liquidityPool, 0, 0);
        // take 240 / 1.2 iToken away
        await iUsd.transferFrom(fToken.address, owner, 240 / 1.2);

        expect(await fToken.interestShareExchangeRate()).bignumber.equal(fromPercent(220));
        expect(await fToken.totalPrincipalAmount()).bignumber.equal(bn(1200));
        expect(await fToken.totalInterestShares()).bignumber.equal(bn(200));
        expect(await fToken.totalInterestDebits()).bignumber.equal(bn(440));
        expect(await fToken.interestShares(liquidityPool)).bignumber.equal(bn(200));
        expect(await fToken.interestDebits(liquidityPool)).bignumber.equal(bn(440));
      });

      it('should be able to remove position', async () => {
        expect(await fToken.removePosition.call(liquidityPool, 600, 50)).bignumber.equal(bn(240));
        await fToken.removePosition(liquidityPool, 600, 50);
        await iUsd.transferFrom(fToken.address, owner, 840 / 1.2);
  
        expect(await fToken.interestShareExchangeRate()).bignumber.equal(fromPercent(220));
        expect(await fToken.totalPrincipalAmount()).bignumber.equal(bn(600));
        expect(await fToken.totalInterestShares()).bignumber.equal(bn(100));
        expect(await fToken.totalInterestDebits()).bignumber.equal(bn(220));
        expect(await fToken.interestShares(liquidityPool)).bignumber.equal(bn(100));
        expect(await fToken.interestDebits(liquidityPool)).bignumber.equal(bn(220));
  
        expect(await fToken.removePosition.call(liquidityPool, 600, 50)).bignumber.equal(bn(0));
        await fToken.removePosition(liquidityPool, 600, 50);
        await iUsd.transferFrom(fToken.address, owner, 600 / 1.2);
  
        expect(await fToken.interestShareExchangeRate()).bignumber.equal(fromPercent(100));
        expect(await fToken.totalPrincipalAmount()).bignumber.equal(bn(0));
        expect(await fToken.totalInterestShares()).bignumber.equal(bn(0));
        expect(await fToken.totalInterestDebits()).bignumber.equal(bn(0));
        expect(await fToken.interestShares(liquidityPool)).bignumber.equal(bn(0));
        expect(await fToken.interestDebits(liquidityPool)).bignumber.equal(bn(0));
      });

      it('should be able to deposit and withdraw', async () => {
        await fToken.mint(alice, 100);
        await fToken.deposit(alice, 100, fromPercent(200));

        expect(await fToken.balanceOf(alice)).bignumber.equal(bn(0));

        expect(await fToken.interestShareExchangeRate()).bignumber.equal(fromPercent(220));
        expect(await fToken.totalPrincipalAmount()).bignumber.equal(bn(1200));
        expect(await fToken.totalInterestShares()).bignumber.equal(bn(200 + 200));
        expect(await fToken.totalInterestDebits()).bignumber.equal(bn(200 + 200 * 2.2));
        expect(await fToken.interestShares(alice)).bignumber.equal(bn(200));
        expect(await fToken.interestDebits(alice)).bignumber.equal(bn(440));

        // earn more interests
        await usd.transfer(moneyMarket.address, bn(2000));

        // 20% interest * 1200 pricipal / 400 shares = 60% return -> 60 + 220 = 280
        expect(await fToken.interestShareExchangeRate()).bignumber.equal(fromPercent(280));

        await fToken.withdraw(alice, 100);
        expect(await fToken.balanceOf(alice)).bignumber.equal(bn(100));
        // half of the 240 total interest
        expect(await usd.balanceOf(alice)).bignumber.equal(bn(240 / 2));
        // half of the 240 total interest and 240 interest before alice deposit
        expect(await fToken.removePosition.call(liquidityPool, 0, 0)).bignumber.equal(bn(240 + 240 / 2));

        expect(await fToken.interestShareExchangeRate()).bignumber.equal(fromPercent(280));
        expect(await fToken.totalPrincipalAmount()).bignumber.equal(bn(1200));
        expect(await fToken.totalInterestShares()).bignumber.equal(bn(200));
        expect(await fToken.totalInterestDebits()).bignumber.equal(bn(200));
        expect(await fToken.interestShares(alice)).bignumber.equal(bn(0));
        expect(await fToken.interestDebits(alice)).bignumber.equal(bn(0));
      });
    });
  });

  describe('incentiveRatio', () => {
    const data = [
      // extreme, liquidation, current, incentive
      [1, 5, 106, 0],
      [1, 5, 105, 0],
      [1, 5, 100, 100],
      [1, 5, 99, 0],
      [1, 5, 103, 50],
      [10, 20, 112, 80],
      [10, 20, 117, 30]
    ];

    for (const [extreme, liquidation, current, incentive] of data) {
      it(`calculates incentive ratio with ${JSON.stringify({extreme, liquidation, current, incentive})}`, async () => {
        await fToken.setExtremeCollateralRatio(fromPercent(extreme));
        await fToken.setLiquidationCollateralRatio(fromPercent(liquidation));
        expect(await fToken.incentiveRatio(fromPercent(current))).bignumber.equal(fromPercent(incentive));
      });
    }
  });
});