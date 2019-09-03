const { expectRevert } = require('openzeppelin-test-helpers');
const { expect } = require('chai');

const helper = require('./helpers');

const LiquidityPool = artifacts.require("LiquidityPool");

contract('LiquidityPool', accounts => {
  const liquidityProvider = accounts[0];
  const protocol = accounts[1];
  const fToken = accounts[2];
  const fTokenTwo = accounts[3];
  const badAddress = accounts[4];
  let liquidityPool;
  let usd;

  beforeEach(async () => {
    usd = await helper.createTestToken([liquidityProvider, 10000]);
    liquidityPool = await LiquidityPool.new(protocol, usd.address, helper.fromPip(10), [fToken]);
  });

  describe('spread', () => {
    it('should get 0 for disabled token', async () => {
      const spread = await liquidityPool.getSpread(badAddress);
      expect(spread).bignumber.equal(helper.ZERO);
    });
    
    it('should get default value', async () => {
      const spread = await liquidityPool.getSpread(fToken);
      expect(spread).bignumber.equal(helper.fromPip(10));
    });

    it('should be able to set and get new value', async () => {
      await liquidityPool.setSpread(helper.fromPip(20));
      const spread = await liquidityPool.getSpread(fToken);
      expect(spread).bignumber.equal(helper.fromPip(20));
    });

    it('requires owner to set spread', async () => {
      await expectRevert(liquidityPool.setSpread(helper.fromPip(30), { from: badAddress }), helper.messages.onlyOwner);
    });
  });

  describe('collateral ratio', () => {
    it('should get 0 for disabled token', async () => {
      let ratio = await liquidityPool.getCollateralRatio(badAddress);
      expect(ratio).bignumber.equal(helper.ZERO);
    });

    it('should get default value', async () => {
      const ratio = await liquidityPool.getCollateralRatio(fToken);
      expect(ratio).bignumber.equal(helper.ZERO);
    });

    it('should be able to set and get new value', async () => {
      await liquidityPool.setCollateralRatio(helper.fromPercent(20));
      const ratio = await liquidityPool.getCollateralRatio(fToken);
      expect(ratio).bignumber.equal(helper.fromPercent(20));
    });

    it('requires owner to set collateral ratio', async () => {
      await expectRevert(liquidityPool.setCollateralRatio(helper.fromPercent(30), { from: badAddress }), helper.messages.onlyOwner);
    });
  });

  describe('enable token', async () => {
    it('should be able to enable token', async () => {
      await liquidityPool.enableToken(fTokenTwo);

      const spread = await liquidityPool.getSpread(fTokenTwo);
      expect(spread).bignumber.equal(helper.fromPip(10), 'should get spread for enabled token');
    });

    it('should be able to enable token', async () => {
      await liquidityPool.disableToken(fToken);
  
      const spread = await liquidityPool.getSpread(fToken);
      expect(spread).bignumber.equal(helper.ZERO, 'should get 0 for disabled token');
    });

    it('requires owner to enable token', async () => {
      await expectRevert(liquidityPool.enableToken(fTokenTwo, { from: badAddress }), helper.messages.onlyOwner);
    });

    it('requires owner to disable token', async () => {
      await expectRevert(liquidityPool.disableToken(fToken, { from: badAddress }), helper.messages.onlyOwner);
    });
  });
})