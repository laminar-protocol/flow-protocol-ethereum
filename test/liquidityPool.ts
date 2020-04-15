import { expectRevert, constants } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import {
  LiquidityPoolInstance,
  TestTokenInstance,
  MoneyMarketInstance,
  IERC20Instance,
} from 'types/truffle-contracts';
import * as helper from './helpers';

const LiquidityPool = artifacts.require('LiquidityPool');
const LiquidityPoolNewVersion = artifacts.require('LiquidityPoolNewVersion');
const MockPoolIsSafeMarginProtocol = artifacts.require(
  'MockPoolIsSafeMarginProtocol',
);
const MockPoolIsNotSafeMarginProtocol = artifacts.require(
  'MockPoolIsNotSafeMarginProtocol',
);
const Proxy = artifacts.require('Proxy');

contract('LiquidityPool', accounts => {
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
    usd = await helper.createTestToken(
      [liquidityProvider, 10000],
      [protocol, 10000],
    );
    ({ moneyMarket, iToken } = await helper.createMoneyMarket(usd.address));

    const liquidityPoolImpl = await LiquidityPool.new();
    const liquidityPoolProxy = await Proxy.new();
    await liquidityPoolProxy.upgradeTo(liquidityPoolImpl.address);
    liquidityPool = await LiquidityPool.at(liquidityPoolProxy.address);
    await (liquidityPool as any).methods['initialize(address,address,uint256)'](
      moneyMarket.address,
      protocol,
      helper.fromPip(10),
      {
        from: liquidityProvider,
      },
    );

    await liquidityPool.approve(protocol, constants.MAX_UINT256, {
      from: liquidityProvider,
    });
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
      await liquidityPool.setSpread(helper.fromPip(20), {
        from: liquidityProvider,
      });
      let spread = await liquidityPool.getBidSpread(fToken);
      expect(spread).bignumber.equal(helper.fromPip(20));
      spread = await liquidityPool.getAskSpread(fToken);
      expect(spread).bignumber.equal(helper.fromPip(20));
    });

    it('requires owner to set spread', async () => {
      await expectRevert(
        liquidityPool.setSpread(helper.fromPip(30), { from: badAddress }),
        helper.messages.onlyOwner,
      );
    });
  });

  describe('collateral ratio', () => {
    it('should get 0 for disabled token', async () => {
      const ratio = await liquidityPool.getAdditionalCollateralRatio(
        badAddress,
      );
      expect(ratio).bignumber.equal(helper.ZERO);
    });

    it('should get default value', async () => {
      const ratio = await liquidityPool.getAdditionalCollateralRatio(fToken);
      expect(ratio).bignumber.equal(helper.ZERO);
    });

    it('should be able to set and get new value', async () => {
      await liquidityPool.setCollateralRatio(helper.fromPercent(20), {
        from: liquidityProvider,
      });
      const ratio = await liquidityPool.getAdditionalCollateralRatio(fToken);
      expect(ratio).bignumber.equal(helper.fromPercent(20));
    });

    it('requires owner to set collateral ratio', async () => {
      await expectRevert(
        liquidityPool.setCollateralRatio(helper.fromPercent(30), {
          from: badAddress,
        }),
        helper.messages.onlyOwner,
      );
    });
  });

  describe('enable token', () => {
    it('should be able to enable token', async () => {
      await liquidityPool.enableToken(fTokenTwo, { from: liquidityProvider });

      let spread = await liquidityPool.getBidSpread(fTokenTwo);
      expect(spread).bignumber.equal(
        helper.fromPip(10),
        'should get spread for enabled token',
      );
      spread = await liquidityPool.getAskSpread(fTokenTwo);
      expect(spread).bignumber.equal(
        helper.fromPip(10),
        'should get spread for enabled token',
      );
    });

    it('should be able to disable token', async () => {
      await liquidityPool.disableToken(fToken, { from: liquidityProvider });

      let spread = await liquidityPool.getBidSpread(fToken);
      expect(spread).bignumber.equal(
        helper.ZERO,
        'should get 0 for disabled token',
      );
      spread = await liquidityPool.getAskSpread(fToken);
      expect(spread).bignumber.equal(
        helper.ZERO,
        'should get 0 for disabled token',
      );
    });

    it('requires owner to enable token', async () => {
      await expectRevert(
        liquidityPool.enableToken(fTokenTwo, { from: badAddress }),
        helper.messages.onlyOwner,
      );
    });

    it('requires owner to disable token', async () => {
      await expectRevert(
        liquidityPool.disableToken(fToken, { from: badAddress }),
        helper.messages.onlyOwner,
      );
    });
  });

  describe('deposit', () => {
    beforeEach(async () => {
      await usd.approve(liquidityPool.address, 500, {
        from: protocol,
      });
    });

    it('should be able to withdraw by protocol', async () => {
      await liquidityPool.depositLiquidity(500, {
        from: protocol,
      });
      expect(await usd.balanceOf(protocol)).bignumber.equal(helper.bn(9500));
      expect(await iToken.balanceOf(liquidityPool.address)).bignumber.equal(
        helper.bn(5000),
      );
    });
  });

  describe('withdraw', () => {
    beforeEach(async () => {
      await moneyMarket.mintTo(liquidityPool.address, 1000, {
        from: liquidityProvider,
      });
    });

    it('should be able to withdraw by protocol', async () => {
      await liquidityPool.withdrawLiquidity(5000, {
        from: protocol,
      });
      expect(await usd.balanceOf(protocol)).bignumber.equal(helper.bn(10500));
      expect(await iToken.balanceOf(liquidityPool.address)).bignumber.equal(
        helper.bn(5000),
      );
    });

    describe('when pool is safe', () => {
      beforeEach(async () => {
        const mockedProtocol = await MockPoolIsSafeMarginProtocol.new();
        liquidityPool = await LiquidityPool.new();
        await (liquidityPool as any).methods[
          'initialize(address,address,uint256)'
        ](moneyMarket.address, mockedProtocol.address, helper.fromPip(10), {
          from: liquidityProvider,
        });
        await moneyMarket.mintTo(liquidityPool.address, 1000, {
          from: liquidityProvider,
        });
      });

      it('should be able to withdraw by owner', async () => {
        await liquidityPool.withdrawLiquidityOwner(5000, {
          from: liquidityProvider,
        });
        expect(await usd.balanceOf(liquidityProvider)).bignumber.equal(
          helper.bn(8500),
        );
        expect(await iToken.balanceOf(liquidityPool.address)).bignumber.equal(
          helper.bn(5000),
        );
      });
    });

    describe('when pool is not safe', () => {
      beforeEach(async () => {
        const mockedProtocol = await MockPoolIsNotSafeMarginProtocol.new();
        liquidityPool = await LiquidityPool.new();
        await (liquidityPool as any).methods[
          'initialize(address,address,uint256)'
        ](moneyMarket.address, mockedProtocol.address, helper.fromPip(10), {
          from: liquidityProvider,
        });
        await moneyMarket.mintTo(liquidityPool.address, 1000, {
          from: liquidityProvider,
        });
      });

      it('should not be able to withdraw by others', async () => {
        await expectRevert(
          liquidityPool.withdrawLiquidityOwner(1, {
            from: liquidityProvider,
          }),
          helper.messages.poolNotSafeAfterWithdrawal,
        );
      });
    });

    it('should not be able to withdraw by others', async () => {
      await expectRevert(
        liquidityPool.withdrawLiquidityOwner(500, { from: badAddress }),
        helper.messages.onlyOwner,
      );
    });
  });

  describe('when upgrading the contract', () => {
    it('upgrades the contract', async () => {
      const liquidityPoolProxy = await Proxy.at(liquidityPool.address);
      const newLiquidityPoolImpl = await LiquidityPoolNewVersion.new();
      await liquidityPoolProxy.upgradeTo(newLiquidityPoolImpl.address);
      const newLiquidityPool = await LiquidityPoolNewVersion.at(
        liquidityPool.address,
      );
      const value = helper.bn(345);
      const firstBytes32 =
        '0x18e5f16b91bbe0defc5ee6bc25b514b030126541a8ed2fc0b69402452465cc00';
      const secondBytes32 =
        '0x18e5f16b91bbe0defc5ee6bc25b514b030126541a8ed2fc0b69402452465cc99';

      const newValueBefore = await newLiquidityPool.newStorageUint();
      await newLiquidityPool.addNewStorageBytes32(firstBytes32);
      await newLiquidityPool.setNewStorageUint(value);
      await newLiquidityPool.addNewStorageBytes32(secondBytes32);
      const newValueAfter = await newLiquidityPool.newStorageUint();
      const newStorageByte1 = await newLiquidityPool.newStorageBytes32(0);
      const newStorageByte2 = await newLiquidityPool.newStorageBytes32(1);

      expect(newValueBefore).to.be.bignumber.equal(helper.bn(0));
      expect(newValueAfter).to.be.bignumber.equal(value);
      expect(newStorageByte1).to.be.equal(firstBytes32);
      expect(newStorageByte2).to.be.equal(secondBytes32);
    });
  });
});
