import { expectRevert } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import { LiquidityPoolInstance } from 'types/truffle-contracts';
import * as helper from './helpers';

const LiquidityPool = artifacts.require("LiquidityPool");

contract('LiquidityPool', accounts => {
  const liquidityProvider = accounts[0];
  const protocol = accounts[1];
  const fToken = accounts[2];
  const fTokenTwo = accounts[3];
  const badAddress = accounts[4];
  let liquidityPool: LiquidityPoolInstance;
  let usd;

  beforeEach(async () => {
    usd = await helper.createTestToken([liquidityProvider, 10000]);
    liquidityPool = await LiquidityPool.new(protocol, usd.address, helper.fromPip(10), [fToken]);
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
      await liquidityPool.setSpread(helper.fromPip(20));
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
      let ratio = await liquidityPool.getAdditoinalCollateralRatio(badAddress);
      expect(ratio).bignumber.equal(helper.ZERO);
    });

    it('should get default value', async () => {
      const ratio = await liquidityPool.getAdditoinalCollateralRatio(fToken);
      expect(ratio).bignumber.equal(helper.ZERO);
    });

    it('should be able to set and get new value', async () => {
      await liquidityPool.setCollateralRatio(helper.fromPercent(20));
      const ratio = await liquidityPool.getAdditoinalCollateralRatio(fToken);
      expect(ratio).bignumber.equal(helper.fromPercent(20));
    });

    it('requires owner to set collateral ratio', async () => {
      await expectRevert(liquidityPool.setCollateralRatio(helper.fromPercent(30), { from: badAddress }), helper.messages.onlyOwner);
    });
  });

  describe('enable token', async () => {
    it('should be able to enable token', async () => {
      await liquidityPool.enableToken(fTokenTwo);

      let spread = await liquidityPool.getBidSpread(fTokenTwo);
      expect(spread).bignumber.equal(helper.fromPip(10), 'should get spread for enabled token');
      spread = await liquidityPool.getAskSpread(fTokenTwo);
      expect(spread).bignumber.equal(helper.fromPip(10), 'should get spread for enabled token');
    });

    it('should be able to disable token', async () => {
      await liquidityPool.disableToken(fToken);
  
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
})