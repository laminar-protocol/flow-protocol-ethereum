const { expectRevert, constants } = require('openzeppelin-test-helpers');
const { expect } = require('chai');

const helper = require('./helpers');

const FlowProtocol = artifacts.require("FlowProtocol");
const LiquidityPool = artifacts.require("LiquidityPool");
const SimplePriceOracle = artifacts.require("SimplePriceOracle");
const FlowToken = artifacts.require("FlowToken");

contract('FlowProtocol', accounts => {
  const owner = accounts[0];
  const liquidityProvider = accounts[1];
  const alice = accounts[2];
  const bob = accounts[3];
  const badAddress = accounts[4];

  let oracle;
  let protocol;
  let liquidityPool;
  let usd;
  let fToken;

  before(async () => {
    oracle = await SimplePriceOracle.new([owner]);
    await oracle.setOracleDeltaLastLimit(helper.fromPercent(100));
    await oracle.setOracleDeltaSnapshotLimit(helper.fromPercent(100));
  });

  beforeEach(async () => {
    usd = await helper.createTestToken([liquidityProvider, 10000], [alice, 10000], [bob, 10000]);
    protocol = await FlowProtocol.new(oracle.address, usd.address);
    await protocol.createFlowToken('Euro', 'EUR');
    fToken = new FlowToken(await protocol.tokens('EUR'));
    await usd.approve(protocol.address, constants.MAX_UINT256, { from: alice });
    await usd.approve(protocol.address, constants.MAX_UINT256, { from: bob });
    
    liquidityPool = await LiquidityPool.new(protocol.address, usd.address, helper.fromPip(10), [fToken.address]);
    await usd.transfer(liquidityPool.address, 10000, { from: liquidityProvider });

    await oracle.setPrice(fToken.address, helper.fromPercent(100));
  });

  it('requires owner to create new token', async () => {
    await expectRevert(protocol.createFlowToken('Test', 'TEST', { from: badAddress }), helper.messages.onlyOwner);
  });

  const buy = (addr, amount) => () => protocol.deposit(fToken.address, liquidityPool.address, amount, { from: addr });
  const sell = (addr, amount) => () => protocol.withdraw(fToken.address, liquidityPool.address, amount, { from: addr });
  const balance = (token, addr, amount) => async () => expect(await token.balanceOf(addr)).bignumber.equal(helper.bn(amount));
  const setPrice = price => () => oracle.setPrice(fToken.address, helper.fromPercent(price));

  it('able to buy and sell', async () => {
    const actions = [
      buy(alice, 1000),
      balance(fToken, alice, 999),
      balance(usd, alice, 9000),
      balance(usd, fToken.address, 1100),
      balance(usd, liquidityPool.address, 9900),

      sell(alice, 999),
      balance(fToken, alice, 0),
      balance(usd, alice, 9998),
      balance(usd, fToken.address, 0),
      balance(usd, liquidityPool.address, 10002),
    ];

    for (const act of actions) {
      await act();
    }
  });

  it('can take profit', async () => {
    const actions = [
      buy(alice, 1000),
      balance(fToken, alice, 999),
      balance(usd, alice, 9000),
      balance(usd, fToken.address, 1100),
      balance(usd, liquidityPool.address, 9900),
      setPrice(105),

      sell(alice, 999),
      balance(fToken, alice, 0),
      balance(usd, alice, 10047),
      balance(usd, fToken.address, 0),
      balance(usd, liquidityPool.address, 9953),
    ];

    for (const act of actions) {
      await act();
    }
  });

  it('can stop lost', async () => {
    const actions = [
      buy(alice, 1000),
      balance(fToken, alice, 999),
      balance(usd, alice, 9000),
      balance(usd, fToken.address, 1100),
      balance(usd, liquidityPool.address, 9900),
      setPrice(95),

      sell(alice, 999),
      balance(fToken, alice, 0),
      balance(usd, alice, 9948),
      balance(usd, fToken.address, 0),
      balance(usd, liquidityPool.address, 10052),
    ];

    for (const act of actions) {
      await act();
    }
  });
})