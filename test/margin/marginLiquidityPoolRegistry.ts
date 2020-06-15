import { constants, expectRevert } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import BN from 'bn.js';

import {
  MarginLiquidityPoolRegistryInstance,
  TestTokenInstance,
  MoneyMarketInstance,
  TestMarginFlowProtocolInstance,
  MarginFlowProtocolSafetyInstance,
  MarginFlowProtocolLiquidatedInstance,
  MarginFlowProtocolConfigInstance,
} from 'types/truffle-contracts';
import {
  bn,
  createTestToken,
  createMoneyMarket,
  dollar,
  fromPercent,
  messages,
} from '../helpers';

const TestMarginFlowProtocol = artifacts.require('TestMarginFlowProtocol');
const MarginMarketLib = (artifacts as any).require('MarginMarketLib');
const MarginFlowProtocolConfig = artifacts.require('MarginFlowProtocolConfig');
const MarginFlowProtocolSafety = artifacts.require('MarginFlowProtocolSafety');
const MarginFlowProtocolLiquidated = artifacts.require(
  'MarginFlowProtocolLiquidated',
);
const MarginLiquidityPoolRegistry = artifacts.require(
  'MarginLiquidityPoolRegistry',
);
const MarginLiquidityPoolRegistryNewVersion = artifacts.require(
  'MarginLiquidityPoolRegistryNewVersion',
);
const Proxy = artifacts.require('Proxy');

contract('MarginLiquidityPoolRegistry', accounts => {
  const liquidityProvider = accounts[1];
  const protocol = accounts[2];
  const alice = accounts[3];
  const newPool = accounts[4];

  let liquidityPoolRegistry: MarginLiquidityPoolRegistryInstance;
  let usd: TestTokenInstance;
  let moneyMarket: MoneyMarketInstance;

  let protocolContract: TestMarginFlowProtocolInstance;
  let protocolSafety: MarginFlowProtocolSafetyInstance;
  let protocolLiquidated: MarginFlowProtocolLiquidatedInstance;
  let protocolConfig: MarginFlowProtocolConfigInstance;

  before(async () => {
    const marketLib = await MarginMarketLib.new();

    try {
      TestMarginFlowProtocol.link(MarginMarketLib);
      MarginFlowProtocolLiquidated.link(MarginMarketLib);
      MarginFlowProtocolSafety.link(MarginMarketLib);
    } catch (error) {
      // running in buidler, use instance
      TestMarginFlowProtocol.link(marketLib);
      MarginFlowProtocolLiquidated.link(marketLib);
      MarginFlowProtocolSafety.link(marketLib);
    }
  });

  beforeEach(async () => {
    usd = await createTestToken(
      [liquidityProvider, dollar(10000)],
      [protocol, dollar(10000)],
      [alice, dollar(10000)],
    );
    ({ moneyMarket } = await createMoneyMarket(usd.address));

    const flowMarginProtocolImpl = await TestMarginFlowProtocol.new();
    const flowMarginProtocolProxy = await Proxy.new();
    await flowMarginProtocolProxy.upgradeTo(flowMarginProtocolImpl.address);
    protocolContract = await TestMarginFlowProtocol.at(
      flowMarginProtocolProxy.address,
    );

    const flowMarginProtocolSafetyImpl = await MarginFlowProtocolSafety.new();
    const flowMarginProtocolSafetyProxy = await Proxy.new();
    await flowMarginProtocolSafetyProxy.upgradeTo(
      flowMarginProtocolSafetyImpl.address,
    );
    protocolSafety = await MarginFlowProtocolSafety.at(
      flowMarginProtocolSafetyProxy.address,
    );

    const flowMarginProtocolLiquidatedImpl = await MarginFlowProtocolLiquidated.new();
    const flowMarginProtocolLiquidatedProxy = await Proxy.new();
    await flowMarginProtocolLiquidatedProxy.upgradeTo(
      flowMarginProtocolLiquidatedImpl.address,
    );
    protocolLiquidated = await MarginFlowProtocolLiquidated.at(
      flowMarginProtocolLiquidatedProxy.address,
    );

    const flowMarginProtocolConfigImpl = await MarginFlowProtocolConfig.new();
    const flowMarginProtocolConfigProxy = await Proxy.new();
    await flowMarginProtocolConfigProxy.upgradeTo(
      flowMarginProtocolConfigImpl.address,
    );
    protocolConfig = await MarginFlowProtocolConfig.at(
      flowMarginProtocolConfigProxy.address,
    );

    const liquidityPoolRegistryImpl = await MarginLiquidityPoolRegistry.new();
    const liquidityPoolRegistryProxy = await Proxy.new();
    await liquidityPoolRegistryProxy.upgradeTo(
      liquidityPoolRegistryImpl.address,
    );
    liquidityPoolRegistry = await MarginLiquidityPoolRegistry.at(
      liquidityPoolRegistryProxy.address,
    );

    await (protocolContract as any).initialize( // eslint-disable-line
      constants.ZERO_ADDRESS,
      moneyMarket.address,
      protocolConfig.address,
      protocolSafety.address,
      protocolLiquidated.address,
      liquidityPoolRegistry.address,
    );
    const market = await protocolContract.market();
    market['4'] = protocol;
    (market as any).protocolSafety = protocol;
    await (protocolSafety as any).initialize(market, constants.ZERO_ADDRESS);
    await (protocolConfig as any).initialize(
      dollar('0.1'),
      fromPercent(5),
      fromPercent(2),
      fromPercent(50),
      fromPercent(10),
      fromPercent(20),
      fromPercent(2),
    );

    await (protocolLiquidated as any).methods[
      'initialize((address,address,address,address,address,address,address,address))'
    ](market);
    await (liquidityPoolRegistry as any).methods[
      'initialize((address,address,address,address,address,address,address,address))'
    ](market);
  });

  describe('when used by the procotol', () => {
    describe('when margin calling pool', () => {
      it('sets pool as margin called', async () => {
        expect(await liquidityPoolRegistry.isMarginCalled(newPool)).to.be.false;
        await liquidityPoolRegistry.marginCallPool(newPool, { from: protocol });
        expect(await liquidityPoolRegistry.isMarginCalled(newPool)).to.be.true;
      });

      it('reverts for non-protocol safety caller', async () => {
        await expectRevert(
          liquidityPoolRegistry.marginCallPool(newPool, { from: alice }),
          messages.onlyProtocolSafety,
        );
      });

      it('reverts for already margin called pools', async () => {
        await liquidityPoolRegistry.marginCallPool(newPool, { from: protocol });
        await expectRevert(
          liquidityPoolRegistry.marginCallPool(newPool, { from: protocol }),
          messages.poolAlreadyMarginCalled,
        );
      });
    });

    describe('when making pool safe', () => {
      it('sets pool as safe', async () => {
        await liquidityPoolRegistry.marginCallPool(newPool, { from: protocol });
        expect(await liquidityPoolRegistry.isMarginCalled(newPool)).to.be.true;
        await liquidityPoolRegistry.makePoolSafe(newPool, { from: protocol });
        expect(await liquidityPoolRegistry.isMarginCalled(newPool)).to.be.false;
      });

      it('reverts for non-protocol safety caller', async () => {
        await liquidityPoolRegistry.marginCallPool(newPool, { from: protocol });
        await expectRevert(
          liquidityPoolRegistry.makePoolSafe(newPool, { from: alice }),
          messages.onlyProtocolSafety,
        );
      });

      it('reverts for already safe pools', async () => {
        await expectRevert(
          liquidityPoolRegistry.makePoolSafe(newPool, { from: protocol }),
          messages.poolNotMarginCalled,
        );
      });
    });
  });

  describe('when managing pools', () => {
    describe('when registering new pools', () => {
      let poolOwnerBalanceBefore: BN;

      beforeEach(async () => {
        poolOwnerBalanceBefore = await usd.balanceOf(alice);

        const feeSum = (await protocolConfig.traderMarginCallDeposit()).add(
          await protocolConfig.traderLiquidationDeposit(),
        );
        await usd.approve(liquidityPoolRegistry.address, feeSum, {
          from: alice,
        });
        await liquidityPoolRegistry.registerPool(newPool, { from: alice });
      });

      it('sets pool as registered', async () => {
        expect(await liquidityPoolRegistry.poolHasPaidDeposits(newPool)).to.be
          .true;
      });

      it('transfers the feeSum', async () => {
        const LIQUIDITY_POOL_MARGIN_CALL_FEE = await protocolConfig.poolMarginCallDeposit();
        const LIQUIDITY_POOL_LIQUIDATION_FEE = await protocolConfig.poolLiquidationDeposit();

        const poolOwnerBalanceAfter = await usd.balanceOf(alice);
        expect(poolOwnerBalanceAfter).to.be.bignumber.equals(
          poolOwnerBalanceBefore
            .sub(LIQUIDITY_POOL_MARGIN_CALL_FEE)
            .sub(LIQUIDITY_POOL_LIQUIDATION_FEE),
        );
      });

      it('allows only owner to verify pools', async () => {
        await expectRevert(
          liquidityPoolRegistry.registerPool(newPool, { from: alice }),
          messages.poolAlreadyPaidFees,
        );
      });
    });

    describe('when verifying pools', () => {
      beforeEach(async () => {
        const feeSum = (await protocolConfig.poolMarginCallDeposit()).add(
          await protocolConfig.poolLiquidationDeposit(),
        );
        await usd.approve(liquidityPoolRegistry.address, feeSum, {
          from: alice,
        });
      });

      it('sets pool as verified', async () => {
        await liquidityPoolRegistry.registerPool(newPool, { from: alice });
        await liquidityPoolRegistry.verifyPool(newPool);
        expect(await liquidityPoolRegistry.isVerifiedPool(newPool)).to.be.true;
      });

      it('requires that pool has paid fees', async () => {
        await expectRevert(
          liquidityPoolRegistry.verifyPool(newPool),
          messages.poolHasNotPaidFees,
        );
      });

      it('allows only owner to verify pools', async () => {
        await expectRevert(
          liquidityPoolRegistry.verifyPool(newPool, { from: alice }),
          messages.onlyOwner,
        );
      });

      it('allows only owner to verify pools', async () => {
        await liquidityPoolRegistry.registerPool(newPool, { from: alice });
        await liquidityPoolRegistry.verifyPool(newPool);

        await expectRevert(
          liquidityPoolRegistry.verifyPool(newPool),
          messages.poolAlreadyVerified,
        );
      });
    });
  });

  describe('when upgrading the contract', () => {
    it('upgrades the contract', async () => {
      const liquidityPoolRegistryProxy = await Proxy.at(
        liquidityPoolRegistry.address,
      );
      const newLiquidityPoolRegistryImpl = await MarginLiquidityPoolRegistryNewVersion.new();
      await liquidityPoolRegistryProxy.upgradeTo(
        newLiquidityPoolRegistryImpl.address,
      );
      const newLiquidityPoolRegistry = await MarginLiquidityPoolRegistryNewVersion.at(
        liquidityPoolRegistry.address,
      );
      const value = bn(345);
      const firstBytes32 =
        '0x18e5f16b91bbe0defc5ee6bc25b514b030126541a8ed2fc0b69402452465cc00';
      const secondBytes32 =
        '0x18e5f16b91bbe0defc5ee6bc25b514b030126541a8ed2fc0b69402452465cc99';

      const newValueBefore = await newLiquidityPoolRegistry.newStorageUint();
      await newLiquidityPoolRegistry.addNewStorageBytes32(firstBytes32);
      await newLiquidityPoolRegistry.setNewStorageUint(value);
      await newLiquidityPoolRegistry.addNewStorageBytes32(secondBytes32);
      const newValueAfter = await newLiquidityPoolRegistry.newStorageUint();
      const newStorageByte1 = await newLiquidityPoolRegistry.newStorageBytes32(
        0,
      );
      const newStorageByte2 = await newLiquidityPoolRegistry.newStorageBytes32(
        1,
      );

      expect(newValueBefore).to.be.bignumber.equal(bn(0));
      expect(newValueAfter).to.be.bignumber.equal(value);
      expect(newStorageByte1).to.be.equal(firstBytes32);
      expect(newStorageByte2).to.be.equal(secondBytes32);
    });
  });
});
