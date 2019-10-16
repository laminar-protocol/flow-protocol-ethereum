import { expectRevert, constants } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import { LiquidityPoolInstance, TestTokenInstance, MoneyMarketInstance, IERC20Instance } from 'types/truffle-contracts';
import * as helper from './helpers';

const LiquidityPool = artifacts.require('LiquidityPool');

contract('LiquidityPool', (accounts) => {
  const liquidityProvider = accounts[1];
  const protocol = accounts[2];
  const fToken = accounts[3];
  const fTokenTwo = accounts[4];
  const badAddress = accounts[5];
  let liquidityPool: LiquidityPoolInstance;
  let usd: TestTokenInstance;
  let iToken: IERC20Instance;
  let moneyMarket: MoneyMarketInstance;

  beforeEach(async () => {
    usd = await helper.createTestToken([liquidityProvider, 10000]);
    ({ moneyMarket, iToken } = await helper.createMoneyMarket(usd.address));
    liquidityPool = await LiquidityPool.new(moneyMarket.address, helper.fromPip(10), { from: liquidityProvider });

    await liquidityPool.approve(protocol, constants.MAX_UINT256, { from: liquidityProvider });
    await liquidityPool.enableToken(fToken, { from: liquidityProvider });

    usd.approve(moneyMarket.address, 10000, { from: liquidityProvider });
  });

  describe('spread', () => {
    it('should get 0 for disabled token', async () => {
      let spread = await liquidityPool.getBidSpread(badAddress);
      expect(spread).bignumber.equal(helper.ZERO);
      spread = await liquidityPool.getAskSpread(badAddress);
      expect(spread).bignumber.equal(helper.ZERO);
    });

    it('should get default value', async () => {
      let spread = await liquidityPool.getBidSpread(fToken);
      expect(spread).bignumber.equal(helper.fromPip(10));
      spread = await liquidityPool.getAskSpread(fToken);
      expect(spread).bignumber.equal(helper.fromPip(10));
    });

    it('should be able to set and get new value', async () => {
      await liquidityPool.setSpread(helper.fromPip(20), { from: liquidityProvider });
      let spread = await liquidityPool.getBidSpread(fToken);
      expect(spread).bignumber.equal(helper.fromPip(20));
      spread = await liquidityPool.getAskSpread(fToken);
      expect(spread).bignumber.equal(helper.fromPip(20));
    });

    it('requires owner to set spread', async () => {
      await expectRevert(liquidityPool.setSpread(helper.fromPip(30), { from: badAddress }), helper.messages.onlyOwner);
    });
  });

  describe('collateral ratio', () => {
    it('should get 0 for disabled token', async () => {
      const ratio = await liquidityPool.getAdditoinalCollateralRatio(badAddress);
      expect(ratio).bignumber.equal(helper.ZERO);
    });

    it('should get default value', async () => {
      const ratio = await liquidityPool.getAdditoinalCollateralRatio(fToken);
      expect(ratio).bignumber.equal(helper.ZERO);
    });

    it('should be able to set and get new value', async () => {
      await liquidityPool.setCollateralRatio(helper.fromPercent(20), { from: liquidityProvider });
      const ratio = await liquidityPool.getAdditoinalCollateralRatio(fToken);
      expect(ratio).bignumber.equal(helper.fromPercent(20));
    });

    it('requires owner to set collateral ratio', async () => {
      await expectRevert(liquidityPool.setCollateralRatio(helper.fromPercent(30), { from: badAddress }), helper.messages.onlyOwner);
    });
  });

  describe('enable token', () => {
    it('should be able to enable token', async () => {
      await liquidityPool.enableToken(fTokenTwo, { from: liquidityProvider });

      let spread = await liquidityPool.getBidSpread(fTokenTwo);
      expect(spread).bignumber.equal(helper.fromPip(10), 'should get spread for enabled token');
      spread = await liquidityPool.getAskSpread(fTokenTwo);
      expect(spread).bignumber.equal(helper.fromPip(10), 'should get spread for enabled token');
    });

    it('should be able to disable token', async () => {
      await liquidityPool.disableToken(fToken, { from: liquidityProvider });

      let spread = await liquidityPool.getBidSpread(fToken);
      expect(spread).bignumber.equal(helper.ZERO, 'should get 0 for disabled token');
      spread = await liquidityPool.getAskSpread(fToken);
      expect(spread).bignumber.equal(helper.ZERO, 'should get 0 for disabled token');
    });

    it('requires owner to enable token', async () => {
      await expectRevert(liquidityPool.enableToken(fTokenTwo, { from: badAddress }), helper.messages.onlyOwner);
    });

    it('requires owner to disable token', async () => {
      await expectRevert(liquidityPool.disableToken(fToken, { from: badAddress }), helper.messages.onlyOwner);
    });
  });

  describe('withdraw', () => {
    beforeEach(async () => {
      await moneyMarket.mintTo(liquidityPool.address, 1000, { from: liquidityProvider });
    });

    it('should be able to withdraw by owner', async () => {
      await liquidityPool.withdrawLiquidity(500, { from: liquidityProvider });
      expect(await usd.balanceOf(liquidityProvider)).bignumber.equal(helper.bn(9500));
      expect(await iToken.balanceOf(liquidityPool.address)).bignumber.equal(helper.bn(500));
    });

    it('should not be able to withdraw by others', async () => {
      await expectRevert(liquidityPool.withdrawLiquidity(500, { from: badAddress }), helper.messages.onlyOwner);
    });
  });
});
