const { expectRevert } = require('openzeppelin-test-helpers');
const { expect } = require('chai');

const helper = require('./helpers');

const LiquidityPool = artifacts.require("LiquidityPool");

contract('LiquidityPool', accounts => {
  const liquidityProvider = accounts[0];
  const fToken = accounts[1];
  const fTokenTwo = accounts[2];
  const badAddress = accounts[3];
  let liquidityPool;
  let usd;

  beforeEach(async () => {
    usd = await helper.createTestToken([liquidityProvider, 10000]);
    liquidityPool = await LiquidityPool.new(usd.address, helper.fromPip(10), [fToken]);
  });

  it('should be able to set and get spread', async () => {
    let spread = await liquidityPool.getSpread(badAddress);
    expect(spread).bignumber.equal(helper.ZERO);

    spread = await liquidityPool.getSpread(fToken);
    expect(spread).bignumber.equal(helper.fromPip(10));

    await liquidityPool.setSpread(helper.fromPip(20));
    spread = await liquidityPool.getSpread(fToken);
    expect(spread).bignumber.equal(helper.fromPip(20));
  });

  it('requires owner to set spread', async () => {
    await expectRevert(liquidityPool.setSpread(helper.fromPip(30), { from: badAddress }), helper.messages.onlyOwner);
  });

  it('should be able to set and get collateral ratio', async () => {
    let ratio = await liquidityPool.getCollateralRatio(badAddress);
    expect(ratio).bignumber.equal(helper.ZERO);

    ratio = await liquidityPool.getCollateralRatio(fToken);
    expect(ratio).bignumber.equal(helper.ZERO);

    await liquidityPool.setCollateralRatio(helper.fromPercent(20));
    ratio = await liquidityPool.getCollateralRatio(fToken);
    expect(ratio).bignumber.equal(helper.fromPercent(20));
  });

  it('requires owner to set collateral ratio', async () => {
    await expectRevert(liquidityPool.setCollateralRatio(helper.fromPercent(30), { from: badAddress }), helper.messages.onlyOwner);
  });

  it('should be able to enable and disable token', async () => {
    await liquidityPool.enableToken(fTokenTwo);

    let spread = await liquidityPool.getSpread(fTokenTwo);
    expect(spread).bignumber.equal(helper.fromPip(10));

    await liquidityPool.disableToken(fTokenTwo);

    spread = await liquidityPool.getSpread(fTokenTwo);
    expect(spread).bignumber.equal(helper.ZERO);

    await liquidityPool.disableToken(fToken);

    spread = await liquidityPool.getSpread(fToken);
    expect(spread).bignumber.equal(helper.ZERO);
  });

  it('requires owner to enable and disable token', async () => {
    await expectRevert(liquidityPool.enableToken(fTokenTwo, { from: badAddress }), helper.messages.onlyOwner);
    await expectRevert(liquidityPool.disableToken(fToken, { from: badAddress }), helper.messages.onlyOwner);
  });
})