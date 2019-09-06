const { constants } = require('openzeppelin-test-helpers');
const { expect } = require('chai');

const helper = require('./helpers');

const FlowProtocol = artifacts.require("FlowProtocol");
const LiquidityPool = artifacts.require("LiquidityPool");
const SimplePriceOracle = artifacts.require("SimplePriceOracle");
const FlowToken = artifacts.require("FlowToken");
const InterestBearingToken = artifacts.require("InterestBearingToken");
const InterestBearingTokenOracle = artifacts.require("InterestBearingTokenOracle");

contract.skip('FlowProtocolWithInterestBearingToken', accounts => {
  const owner = accounts[0];
  const liquidityProvider = accounts[1];
  const alice = accounts[2];
  const bob = accounts[3];

  let oracle;
  let wrappedOracle;
  let protocol;
  let liquidityPool;
  let usd;
  let iUsd;
  let fToken;

  before(async () => {
    oracle = await SimplePriceOracle.new([owner]);
    await oracle.setOracleDeltaLastLimit(helper.fromPercent(100));
    await oracle.setOracleDeltaSnapshotLimit(helper.fromPercent(100));
  });

  beforeEach(async () => {
    usd = await helper.createTestToken([liquidityProvider, 30000], [alice, 10000], [bob, 10000]);
    iUsd = await InterestBearingToken.new(usd.address);

    await usd.approve(iUsd, constants.MAX_UINT256, { from: bob });
    iUsd.mint(10000, { from: bob });
    await usd.approve(iUsd, constants.MAX_UINT256, { from: alice });
    iUsd.mint(10000, { from: alice });
    await usd.approve(iUsd, constants.MAX_UINT256, { from: liquidityProvider });
    iUsd.mint(20000, { from: liquidityProvider });

    wrappedOracle = await InterestBearingTokenOracle.new(oracle.address, iUsd.address);

    protocol = await FlowProtocol.new(wrappedOracle.address, iUsd.address);
    await protocol.createFlowToken('Euro', 'EUR');
    fToken = new FlowToken(await protocol.tokens('EUR'));
    await iUsd.approve(protocol.address, constants.MAX_UINT256, { from: alice });
    await iUsd.approve(protocol.address, constants.MAX_UINT256, { from: bob });
    await iUsd.approve(protocol.address, constants.MAX_UINT256, { from: liquidityProvider });
    
    liquidityPool = await LiquidityPool.new(protocol.address, iUsd.address, helper.fromPip(10), [fToken.address]);
    await iUsd.transfer(liquidityPool.address, 10000, { from: liquidityProvider });

    await oracle.setPrice(fToken.address, helper.fromPercent(100));
  });

  const buy = (addr, amount) => () => protocol.deposit(fToken.address, liquidityPool.address, amount, { from: addr });
  const sell = (addr, amount) => () => protocol.withdraw(fToken.address, liquidityPool.address, amount, { from: addr });
  const balance = (token, addr, amount) => async () => expect(await token.balanceOf(addr)).bignumber.equal(helper.bn(amount));
//   const setPrice = price => () => oracle.setPrice(fToken.address, helper.fromPercent(price));
//   const addInterest = amount => () => usd.transfer(iUsd, amount, { from: liquidityProvider });

  it('able to buy and sell', async () => {
    const actions = [
      buy(alice, 1000),
      balance(fToken, alice, 999),
      balance(iUsd, alice, 9000),
      balance(iUsd, fToken.address, 1100),
      balance(iUsd, liquidityPool.address, 9900),

      sell(alice, 999),
      balance(fToken, alice, 0),
      balance(iUsd, alice, 9998),
      balance(iUsd, fToken.address, 0),
      balance(iUsd, liquidityPool.address, 10002),
    ];

    for (const act of actions) {
      await act();
    }
  });
});