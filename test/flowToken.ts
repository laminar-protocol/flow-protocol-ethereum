import { expectRevert, constants } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import { createTestToken, createMoneyMarket, fromPercent, bn } from './helpers';
import { 
  TestTokenInstance, FlowTokenInstance, MoneyMarketInstance, IERC20Instance
} from 'types/truffle-contracts';

const FlowToken = artifacts.require("FlowToken");

contract.only('FlowProtocol', accounts => {
  const owner = accounts[0];
  const liquidityPool = accounts[1];
  const liquidityPoolTwo = accounts[1];

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
      expect(await fToken.interestShares(liquidityPool)).bignumber.equal(bn(200));
      expect(await fToken.interestDebits(liquidityPool)).bignumber.equal(bn(200));

      await fToken.addPosition(liquidityPoolTwo, 2400, 200, 400);
      await iUsd.transfer(fToken.address, 2400);

      expect(await fToken.interestShareExchangeRate()).bignumber.equal(fromPercent(100));
      expect(await fToken.totalPrincipalAmount()).bignumber.equal(bn(3600));
      expect(await fToken.totalInterestShares()).bignumber.equal(bn(600));
      expect(await fToken.interestShares(liquidityPool)).bignumber.equal(bn(600));
      expect(await fToken.interestDebits(liquidityPool)).bignumber.equal(bn(600));
    });

    it('should be able to remove position', async () => {
      expect(await fToken.removePosition.call(liquidityPool, 600, 50)).bignumber.equal(bn(0));
      await fToken.removePosition(liquidityPool, 600, 50);
      await iUsd.transferFrom(fToken.address, owner, 600);

      expect(await fToken.interestShareExchangeRate()).bignumber.equal(fromPercent(100));
      expect(await fToken.totalPrincipalAmount()).bignumber.equal(bn(600));
      expect(await fToken.totalInterestShares()).bignumber.equal(bn(100));
      expect(await fToken.interestShares(liquidityPool)).bignumber.equal(bn(100));
      expect(await fToken.interestDebits(liquidityPool)).bignumber.equal(bn(100));

      expect(await fToken.removePosition.call(liquidityPool, 600, 50)).bignumber.equal(bn(0));
      await fToken.removePosition(liquidityPool, 600, 50);
      await iUsd.transferFrom(fToken.address, owner, 600);

      expect(await fToken.interestShareExchangeRate()).bignumber.equal(fromPercent(100));
      expect(await fToken.totalPrincipalAmount()).bignumber.equal(bn(0));
      expect(await fToken.totalInterestShares()).bignumber.equal(bn(0));
      expect(await fToken.interestShares(liquidityPool)).bignumber.equal(bn(0));
      expect(await fToken.interestDebits(liquidityPool)).bignumber.equal(bn(0));
    });

    describe.skip('with 20% interests', () => {
      beforeEach(async () => {
        // 20% interest earned
        await usd.transfer(moneyMarket.address, bn(2000));
      });

      it('should be able to earn interest and withdraw it', async () => {
        // 20% interest * 1200 pricipal / 200 shares = 120% return
        expect(await fToken.interestShareExchangeRate()).bignumber.equal(fromPercent(100 * 0.2 * 1200 / 200 + 100));
  
        // only withdraw interests
        // 1200 pricipal * 20% interest = 240
        expect(await fToken.removePosition.call(liquidityPool, 0, 0)).bignumber.equal(bn(240));
        await fToken.removePosition(liquidityPool, 0, 0);
        // take 120 / 1.2 iToken away
        await iUsd.transferFrom(fToken.address, owner, 120 / 1.2);
  
        // should still be 240
        expect(await fToken.interestShareExchangeRate()).bignumber.equal(fromPercent(240));
      });

      it('should be able to remove position', async () => {
        expect(await fToken.removePosition.call(liquidityPool, 600, 50)).bignumber.equal(bn(240));
        await fToken.removePosition(liquidityPool, 600, 50);
        await iUsd.transferFrom(fToken.address, owner, 720 / 1.2);
  
        expect(await fToken.interestShareExchangeRate()).bignumber.equal(fromPercent(240));
        expect(await fToken.totalPrincipalAmount()).bignumber.equal(bn(600));
        expect(await fToken.totalInterestShares()).bignumber.equal(bn(100));
        expect(await fToken.interestShares(liquidityPool)).bignumber.equal(bn(100));
        expect(await fToken.interestDebits(liquidityPool)).bignumber.equal(bn(100));
  
        expect(await fToken.removePosition.call(liquidityPool, 600, 50)).bignumber.equal(bn(0));
        await fToken.removePosition(liquidityPool, 600, 50);
        await iUsd.transferFrom(fToken.address, owner, 600 / 1.2);
  
        expect(await fToken.interestShareExchangeRate()).bignumber.equal(fromPercent(100));
        expect(await fToken.totalPrincipalAmount()).bignumber.equal(bn(0));
        expect(await fToken.totalInterestShares()).bignumber.equal(bn(0));
        expect(await fToken.interestShares(liquidityPool)).bignumber.equal(bn(0));
        expect(await fToken.interestDebits(liquidityPool)).bignumber.equal(bn(0));
      });
    });
  });
});