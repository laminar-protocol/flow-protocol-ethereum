import { expectRevert, constants } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import {
  SimplePriceOracleInstance,
  FlowProtocolInstance,
  LiquidityPoolInstance,
  TestTokenInstance,
  FlowTokenInstance,
  MoneyMarketInstance,
  IERC20Instance,
} from 'types/truffle-contracts';
import {
  createTestToken,
  createMoneyMarket,
  fromPercent,
  messages,
  bn,
  fromPip,
  dollar,
} from './helpers';

const Proxy = artifacts.require('Proxy');
const FlowProtocol = artifacts.require('FlowProtocol');
const FlowProtocolNewVersion = artifacts.require('FlowProtocolNewVersion');
const LiquidityPool = artifacts.require('LiquidityPool');
const SimplePriceOracle = artifacts.require('SimplePriceOracle');
const FlowToken = artifacts.require('FlowToken');

contract('FlowProtocol', accounts => {
  const owner = accounts[0];
  const liquidityProvider = accounts[1];
  const alice = accounts[2];
  const bob = accounts[3];
  const badAddress = accounts[4];

  let oracle: SimplePriceOracleInstance;
  let protocol: FlowProtocolInstance;
  let liquidityPool: LiquidityPoolInstance;
  let usd: TestTokenInstance;
  let iUsd: IERC20Instance;
  let fToken: FlowTokenInstance;
  let moneyMarket: MoneyMarketInstance;

  before(async () => {
    const oracleImpl = await SimplePriceOracle.new();
    const oracleProxy = await Proxy.new();
    oracleProxy.upgradeTo(oracleImpl.address);

    oracle = await SimplePriceOracle.at(oracleProxy.address);
    await oracle.initialize();
    await oracle.addPriceFeeder(owner);
    await oracle.setOracleDeltaLastLimit(fromPercent(100));
    await oracle.setOracleDeltaSnapshotLimit(fromPercent(100));
  });

  beforeEach(async () => {
    usd = await createTestToken(
      [liquidityProvider, dollar(20000)],
      [alice, dollar(10000)],
      [bob, dollar(10000)],
    );
    ({ moneyMarket, iToken: iUsd } = await createMoneyMarket(
      usd.address,
      fromPercent(100),
    ));
    const flowProtocolImpl = await FlowProtocol.new();
    const flowProtocolProxy = await Proxy.new();

    await flowProtocolProxy.upgradeTo(flowProtocolImpl.address);
    protocol = await FlowProtocol.at(flowProtocolProxy.address);
    await protocol.initialize(oracle.address, moneyMarket.address);

    const fTokenImpl = await FlowToken.new();
    const fTokenProxy = await Proxy.new();
    await fTokenProxy.upgradeTo(fTokenImpl.address);
    fToken = await FlowToken.at(fTokenProxy.address);
    await (fToken as any).initialize(
      'Euro',
      'EUR',
      moneyMarket.address,
      protocol.address,
    );

    await protocol.addFlowToken(fToken.address);

    await usd.approve(protocol.address, constants.MAX_UINT256, { from: alice });
    await usd.approve(protocol.address, constants.MAX_UINT256, { from: bob });
    await usd.approve(moneyMarket.address, constants.MAX_UINT256, {
      from: liquidityProvider,
    });
    await iUsd.approve(protocol.address, constants.MAX_UINT256, {
      from: liquidityProvider,
    });

    const liquidityPoolImpl = await LiquidityPool.new();
    const liquidityPoolProxy = await Proxy.new();
    await liquidityPoolProxy.upgradeTo(liquidityPoolImpl.address);
    liquidityPool = await LiquidityPool.at(liquidityPoolProxy.address);
    await liquidityPool.initialize(
      moneyMarket.address,
      protocol.address,
      fromPip(10),
    );

    await liquidityPool.approve(protocol.address, constants.MAX_UINT256);
    await liquidityPool.enableToken(fToken.address);

    await moneyMarket.mintTo(liquidityPool.address, dollar(10000), {
      from: liquidityProvider,
    });
    await moneyMarket.mint(dollar(10000), { from: liquidityProvider });

    await oracle.feedPrice(fToken.address, fromPercent(100), { from: owner });
  });

  it('requires owner to create new token', async () => {
    await expectRevert(
      protocol.addFlowToken(fToken.address, { from: badAddress }),
      messages.onlyOwner,
    );
  });

  const run = async (...actions: Array<() => any>) => {
    for (const act of actions) {
      await act();
    }
  };

  const buy = (addr: string, amount: number) => () =>
    protocol.mint(fToken.address, liquidityPool.address, amount, {
      from: addr,
    });
  const buyWithMaxPrice = (
    addr: string,
    amount: number,
    minPrice: number,
  ) => () =>
    protocol.mintWithMaxPrice(
      fToken.address,
      liquidityPool.address,
      amount,
      minPrice,
      {
        from: addr,
      },
    );
  const sell = (addr: string, amount: any) => () =>
    protocol.redeem(fToken.address, liquidityPool.address, amount, {
      from: addr,
    });
  const sellWithMinPrice = (
    addr: string,
    amount: number,
    minPrice: number,
  ) => () =>
    protocol.redeemWithMinPrice(
      fToken.address,
      liquidityPool.address,
      amount,
      minPrice,
      {
        from: addr,
      },
    );
  const balance = (
    token: IERC20Instance,
    addr: string,
    amount: any,
  ) => async () =>
    expect(await token.balanceOf(addr)).bignumber.equal(bn(amount));
  const setPrice = (price: number) => () =>
    oracle.feedPrice(fToken.address, fromPercent(price), { from: owner });
  const liquidate = (addr: string, amount: number) => () =>
    protocol.liquidate(fToken.address, liquidityPool.address, amount, {
      from: addr,
    });
  const addCollateral = (
    from: string,
    token: string,
    pool: string,
    amount: number,
  ) => () => protocol.addCollateral(token, pool, amount, { from });
  const revert = (fn: () => Promise<any>, msg: string) => () =>
    expectRevert(fn(), msg);

  it('able to buy and sell', async () => {
    await run(
      buy(alice, dollar(1001)),
      balance(fToken, alice, dollar(1000)),
      balance(usd, alice, dollar(8999)),
      balance(iUsd, fToken.address, dollar(11000)),
      balance(iUsd, liquidityPool.address, dollar(99010)),

      sell(alice, dollar(1000)),
      balance(fToken, alice, 0),
      balance(usd, alice, dollar(9998)),
      balance(iUsd, fToken.address, 0),
      balance(iUsd, liquidityPool.address, dollar(100020)),
    );
  });

  it('able to buy and sell with minimum price', async () => {
    await run(
      buyWithMaxPrice(alice, dollar(1001), dollar('1.001')),
      balance(fToken, alice, dollar(1000)),
      balance(usd, alice, dollar(8999)),
      balance(iUsd, fToken.address, dollar(11000)),
      balance(iUsd, liquidityPool.address, dollar(99010)),

      sellWithMinPrice(alice, dollar(1000), dollar('0.999')),
      balance(fToken, alice, 0),
      balance(usd, alice, dollar(9998)),
      balance(iUsd, fToken.address, 0),
      balance(iUsd, liquidityPool.address, dollar(100020)),
    );
  });

  it('reverts when maximum buy price is too low', async () => {
    await expectRevert(
      run(buyWithMaxPrice(alice, dollar(1001), dollar('1.0009'))),
      messages.askPriceTooHigh,
    );
  });

  it('reverts when minimum sell price is too high', async () => {
    await expectRevert(
      run(
        buyWithMaxPrice(alice, dollar(1001), dollar('1.001')),
        balance(fToken, alice, dollar(1000)),
        balance(usd, alice, dollar(8999)),
        balance(iUsd, fToken.address, dollar(11000)),
        balance(iUsd, liquidityPool.address, dollar(99010)),
        sellWithMinPrice(alice, dollar(1000), dollar('0.9991')),
      ),
      messages.bidPriceTooLow,
    );
  });

  it('can take profit', async () => {
    await run(
      buy(alice, dollar(1001)),
      balance(fToken, alice, dollar(1000)),
      balance(usd, alice, dollar(8999)),
      balance(iUsd, fToken.address, dollar(11000)),
      balance(iUsd, liquidityPool.address, dollar(99010)),
      setPrice(105),

      sell(alice, dollar(1000)),
      balance(fToken, alice, 0),
      balance(usd, alice, '10047950000000000000000'),
      balance(iUsd, fToken.address, 0),
      balance(iUsd, liquidityPool.address, '99520500000000000000000'),
    );
  });

  it('can stop lost', async () => {
    await run(
      buy(alice, dollar(1001)),
      balance(fToken, alice, dollar(1000)),
      balance(usd, alice, dollar(8999)),
      balance(iUsd, fToken.address, dollar(11000)),
      balance(iUsd, liquidityPool.address, dollar(99010)),
      setPrice(95),

      sell(alice, dollar(1000)),
      balance(fToken, alice, 0),
      balance(usd, alice, '9948050000000000000000'),
      balance(iUsd, fToken.address, 0),
      balance(iUsd, liquidityPool.address, '100519500000000000000000'),
    );
  });

  it('support multiple users', async () => {
    await run(
      buy(alice, dollar(1001)),
      buy(bob, dollar(1001)),
      balance(fToken, alice, dollar(1000)),
      balance(fToken, bob, dollar(1000)),
      balance(usd, alice, dollar(8999)),
      balance(usd, bob, dollar(8999)),
      balance(iUsd, fToken.address, dollar(22000)),
      balance(iUsd, liquidityPool.address, dollar(98020)),

      setPrice(98),

      buy(alice, dollar(980)),
      sell(bob, dollar(500)),
      balance(fToken, alice, '1999000999000999000999'),
      balance(fToken, bob, dollar(500)),
      balance(usd, alice, dollar(8019)),
      balance(usd, bob, '9488510000000000000000'),
      balance(iUsd, fToken.address, '26939230769230769230760'),
      balance(iUsd, liquidityPool.address, '97985669230769230769240'),

      setPrice(100),

      sell(alice, dollar(998)),
      buy(bob, dollar(1020)),
      balance(fToken, alice, '1001000999000999000999'),
      balance(fToken, bob, '1518981018981018981018'),
      balance(usd, alice, '9016002000000000000000'),
      balance(usd, bob, '8468510000000000000000'),
      balance(iUsd, fToken.address, '27719802197802197802170'),
      balance(iUsd, liquidityPool.address, '97435077802197802197830'),

      setPrice(101),

      sell(alice, '1001000999000999000999'),
      sell(bob, '1518981018981018981018'),
      balance(fToken, alice, 0),
      balance(fToken, bob, 0),
      balance(usd, alice, '10026001997982017982017'),
      balance(usd, bob, '10001146658341658341657'),
      balance(iUsd, fToken.address, 0),
      balance(iUsd, liquidityPool.address, '99728513436763236763260'),
    );
  });

  describe('liquidate', () => {
    it('allow people to liquidate position', async () => {
      await run(
        buy(alice, dollar(1001)),
        setPrice(107),
        liquidate(alice, dollar(1000)),

        balance(fToken, alice, 0),
        balance(usd, alice, '10084989462616822430262'),
        balance(iUsd, fToken.address, 0),
        balance(iUsd, liquidityPool.address, '99150105373831775697380'),
      );
    });

    it('allow liqudity provider to topup collaterals', async () => {
      await run(
        buy(alice, dollar(1000)),
        setPrice(107),
        addCollateral(
          liquidityProvider,
          fToken.address,
          liquidityPool.address,
          dollar(100),
        ),
        revert(liquidate(alice, dollar(999)), messages.stillSafe),
      );
    });

    it('not allow people to liquidate with safe position', async () => {
      await run(
        buy(alice, dollar(1000)),
        revert(liquidate(alice, dollar(999)), messages.stillSafe),
      );
    });

    it('allow to liquidate partially', async () => {
      await run(
        buy(alice, dollar(1001)),
        setPrice(107),
        liquidate(alice, dollar(500)),

        balance(fToken, alice, dollar(500)),
        balance(usd, alice, '9541994731308411215265'),
        balance(iUsd, fToken.address, '5499999999999999997550'),
        balance(iUsd, liquidityPool.address, '99080052686915887849800'),

        liquidate(alice, dollar(500)),
        balance(fToken, alice, 0),
        balance(usd, alice, '10084989462616822430261'),
        balance(iUsd, fToken.address, 0),
        balance(iUsd, liquidityPool.address, '99150105373831775697390'),
      );
    });

    describe('when upgrading the contract', () => {
      it('upgrades the contract', async () => {
        const flowProtocolProxy = await Proxy.at(protocol.address);
        const newFlowProtocolImpl = await FlowProtocolNewVersion.new();
        await flowProtocolProxy.upgradeTo(newFlowProtocolImpl.address);
        const newFlowProtocol = await FlowProtocolNewVersion.at(
          protocol.address,
        );
        const value = bn(345);
        const firstBytes32 =
          '0x18e5f16b91bbe0defc5ee6bc25b514b030126541a8ed2fc0b69402452465cc00';
        const secondBytes32 =
          '0x18e5f16b91bbe0defc5ee6bc25b514b030126541a8ed2fc0b69402452465cc99';

        const newValueBefore = await newFlowProtocol.newStorageUint();
        await newFlowProtocol.addNewStorageBytes32(firstBytes32);
        await newFlowProtocol.setNewStorageUint(value);
        await newFlowProtocol.addNewStorageBytes32(secondBytes32);
        const newValueAfter = await newFlowProtocol.newStorageUint();
        const newStorageByte1 = await newFlowProtocol.newStorageBytes32(0);
        const newStorageByte2 = await newFlowProtocol.newStorageBytes32(1);

        expect(newValueBefore).to.be.bignumber.equal(bn(0));
        expect(newValueAfter).to.be.bignumber.equal(value);
        expect(newStorageByte1).to.be.equal(firstBytes32);
        expect(newStorageByte2).to.be.equal(secondBytes32);
      });

      it('works with old and new data', async () => {
        const maxSpread = await protocol.maxSpread();

        const flowProtocolProxy = await Proxy.at(protocol.address);
        const newFlowProtocolImpl = await FlowProtocolNewVersion.new();
        await flowProtocolProxy.upgradeTo(newFlowProtocolImpl.address);
        const newFlowProtocol = await FlowProtocolNewVersion.at(
          protocol.address,
        );
        const value = bn(345);
        await newFlowProtocol.setNewStorageUint(value);
        const maxSpreadPlusNewValue = await newFlowProtocol.getNewValuePlusMaxSpread();

        expect(maxSpreadPlusNewValue).to.be.bignumber.equal(
          value.add(maxSpread),
        );
      });
    });

    // TODO: check liquidation incentive amount calculation is correct
  });
});
