const { expectRevert, constants } = require('openzeppelin-test-helpers');
const { expect } = require('chai');

const helper = require('./helpers');

const FlowProtocol = artifacts.require("FlowProtocol");
const LiquidityPool = artifacts.require("LiquidityPool");
const SimplePriceOracle = artifacts.require("SimplePriceOracle");
const FlowToken = artifacts.require("FlowToken");

// TODO: fix this
contract.skip('FlowProtocol', accounts => {
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
    usd = await helper.createTestToken([liquidityProvider, 20000], [alice, 10000], [bob, 10000]);
    protocol = await FlowProtocol.new(oracle.address, usd.address);
    await protocol.createFlowToken('Euro', 'EUR');
    fToken = new FlowToken(await protocol.tokens('EUR'));
    await usd.approve(protocol.address, constants.MAX_UINT256, { from: alice });
    await usd.approve(protocol.address, constants.MAX_UINT256, { from: bob });
    await usd.approve(protocol.address, constants.MAX_UINT256, { from: liquidityProvider });
    
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
  const liquidate = (addr, amount) => () => protocol.liquidate(fToken.address, liquidityPool.address, amount, { from: addr });
  const addCollateral = (from, token, pool, amount) => () => protocol.addCollateral(token, pool, amount, { from });
  const revert = (fn, msg) => () => expectRevert(fn(), msg);

  it('able to buy and sell', async () => {
    const actions = [
      buy(alice, 1001),
      balance(fToken, alice, 1000),
      balance(usd, alice, 8999),
      balance(usd, fToken.address, 1100),
      balance(usd, liquidityPool.address, 9901),

      sell(alice, 1000),
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
      buy(alice, 1001),
      balance(fToken, alice, 1000),
      balance(usd, alice, 8999),
      balance(usd, fToken.address, 1100),
      balance(usd, liquidityPool.address, 9901),
      setPrice(105),

      sell(alice, 1000),
      balance(fToken, alice, 0),
      balance(usd, alice, 10048),
      balance(usd, fToken.address, 0),
      balance(usd, liquidityPool.address, 9952),
    ];

    for (const act of actions) {
      await act();
    }
  });

  it('can stop lost', async () => {
    const actions = [
      buy(alice, 1001),
      balance(fToken, alice, 1000),
      balance(usd, alice, 8999),
      balance(usd, fToken.address, 1100),
      balance(usd, liquidityPool.address, 9901),
      setPrice(95),

      sell(alice, 1000),
      balance(fToken, alice, 0),
      balance(usd, alice, 9948),
      balance(usd, fToken.address, 0),
      balance(usd, liquidityPool.address, 10052),
    ];

    for (const act of actions) {
      await act();
    }
  });

  it('support multiple users', async () => {
    const actions = [
      buy(alice, 1001),
      buy(bob, 1001),
      balance(fToken, alice, 1000),
      balance(fToken, bob, 1000),
      balance(usd, alice, 8999),
      balance(usd, bob, 8999),
      balance(usd, fToken.address, 2200),
      balance(usd, liquidityPool.address, 9802),

      setPrice(98),

      buy(alice, 980),
      sell(bob, 500),
      balance(fToken, alice, 1998),
      balance(fToken, bob, 500),
      balance(usd, alice, 8019),
      balance(usd, bob, 9488),
      balance(usd, fToken.address, 2692),
      balance(usd, liquidityPool.address, 9801),

      setPrice(100),

      sell(alice, 998),
      buy(bob, 1020),
      balance(fToken, alice, 1000),
      balance(fToken, bob, 1518),
      balance(usd, alice, 9016),
      balance(usd, bob, 8468),
      balance(usd, fToken.address, 2769),
      balance(usd, liquidityPool.address, 9747),

      setPrice(101),

      sell(alice, 1000),
      sell(bob, 1518),
      balance(fToken, alice, 0),
      balance(fToken, bob, 0),
      balance(usd, alice, 10025),
      balance(usd, bob, 9999),
      balance(usd, fToken.address, 0),
      balance(usd, liquidityPool.address, 9976),
    ];

    for (const act of actions) {
      await act();
    }
  });

  describe('liquidate', () => {
    it('allow people to liquidate position', async () => {
      const actions = [
        buy(alice, 1001),
        setPrice(107),
        liquidate(alice, 1000),

        balance(fToken, alice, 0),
        balance(usd, alice, 10083),
        balance(usd, fToken.address, 0),
        balance(usd, liquidityPool.address, 9917),
      ];
      for (const act of actions) {
        await act();
      }
    });

    it('allow liqudity provider to topup collaterals', async () => {
      const actions = [
        buy(alice, 1000),
        setPrice(107),
        addCollateral(liquidityProvider, fToken.address, liquidityPool.address, 100),
        revert(liquidate(alice, 999), helper.messages.stillSafe),
      ];
      for (const act of actions) {
        await act();
      }
    });

    it('not allow people to liquidate with safe position', async () => {
      const actions = [
        buy(alice, 1000),
        revert(liquidate(alice, 999), helper.messages.stillSafe),
      ];
      for (const act of actions) {
        await act();
      }
    });

    it('allow to liquidate partially', async () => {
      const actions = [
        buy(alice, 1001),
        setPrice(107),
        liquidate(alice, 500),

        balance(fToken, alice, 500),
        balance(usd, alice, 9541),
        balance(usd, fToken.address, 549),
        balance(usd, liquidityPool.address, 9910),

        liquidate(alice, 500),
        balance(fToken, alice, 0),
        balance(usd, alice, 10082),
        balance(usd, fToken.address, 0),
        balance(usd, liquidityPool.address, 9918),
      ];
      for (const act of actions) {
        await act();
      }
    });
  });
});
