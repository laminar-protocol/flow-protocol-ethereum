import { expectRevert, time } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import { SimplePriceOracleInstance } from 'types/truffle-contracts';
import * as helper from './helpers';

const SimplePriceOracle = artifacts.require("SimplePriceOracle");

contract('SimplePriceOracle', accounts => {
    const owner = accounts[0];
    const priceFeeder = accounts[1];
    const priceFeederTwo = accounts[2];
    const fToken = accounts[3];
    const fTokenTwo = accounts[4];
    const badAddress = accounts[5];

    let oracle: SimplePriceOracleInstance;

    beforeEach(async () => {
        oracle = await SimplePriceOracle.new([priceFeeder]);
    });

    describe('set and get price', () => {
        it('should get 0 for unavailable token', async () => {
            const price = await oracle.getPrice(badAddress);
            expect(price).bignumber.equal(helper.ZERO);
        });

        it('should be able to set and get new price', async () => {
            await oracle.setPrice(fToken, 100, { from: priceFeeder });
            expect(await oracle.getPrice(fToken)).bignumber.equal(helper.bn(100));
            expect(await oracle.getPrice(fTokenTwo)).bignumber.equal(helper.ZERO);

            await oracle.setPrice(fTokenTwo, 110, { from: priceFeeder });
            expect(await oracle.getPrice(fToken)).bignumber.equal(helper.bn(100));
            expect(await oracle.getPrice(fTokenTwo)).bignumber.equal(helper.bn(110));
        });

        it('requires price feeder role to set price', async () => {
            await expectRevert(oracle.setPrice(fToken, 100, { from: owner }), helper.messages.onlyPriceFeeder);
            await expectRevert(oracle.setPrice(fToken, 100, { from: badAddress }), helper.messages.onlyPriceFeeder);
        });
    });

    describe('oracle config', () => {
        it('should be able to set config', async () => {
            await oracle.setOracleDeltaLastLimit(123);
            expect(await oracle.oracleDeltaLastLimit()).bignumber.equal(helper.bn(123));

            await oracle.setOracleDeltaSnapshotLimit(456);
            expect(await oracle.oracleDeltaSnapshotLimit()).bignumber.equal(helper.bn(456));

            await oracle.setOracleDeltaSnapshotTime(789);
            expect(await oracle.oracleDeltaSnapshotTime()).bignumber.equal(helper.bn(789));
        });

        it('requires owner to set config', async () => {
            await expectRevert(oracle.setOracleDeltaLastLimit(123, { from: badAddress }), helper.messages.onlyOwner);
            await expectRevert(oracle.setOracleDeltaLastLimit(123, { from: priceFeeder }), helper.messages.onlyOwner);

            await expectRevert(oracle.setOracleDeltaSnapshotLimit(456, { from: badAddress }), helper.messages.onlyOwner);
            await expectRevert(oracle.setOracleDeltaSnapshotLimit(456, { from: priceFeeder }), helper.messages.onlyOwner);

            await expectRevert(oracle.setOracleDeltaSnapshotTime(789, { from: badAddress }), helper.messages.onlyOwner);
            await expectRevert(oracle.setOracleDeltaSnapshotTime(789, { from: priceFeeder }), helper.messages.onlyOwner);
        });
    });

    describe('price cap', () => {
        describe('last price', () => {
            beforeEach(async () => {
                await oracle.setOracleDeltaLastLimit(helper.fromPercent(10));
                await oracle.setOracleDeltaSnapshotLimit(helper.fromPercent(1000));
                await oracle.addPriceFeeder(owner);
                await oracle.setPrice(fToken, 1000);
            });

            it('should allow increase less than cap', async () => {
                await oracle.setPrice(fToken, 1099);
                expect(await oracle.getPrice(fToken)).bignumber.equal(helper.bn(1099));

                await oracle.setPrice(fToken, 1207);
                expect(await oracle.getPrice(fToken)).bignumber.equal(helper.bn(1207));
            });

            it('should allow decrease less than cap', async () => {
                await oracle.setPrice(fToken, 901);
                expect(await oracle.getPrice(fToken)).bignumber.equal(helper.bn(901));

                await oracle.setPrice(fToken, 811);
                expect(await oracle.getPrice(fToken)).bignumber.equal(helper.bn(811));
            });

            it('should cap increase', async () => {
                await oracle.setPrice(fToken, 1101);
                expect(await oracle.getPrice(fToken)).bignumber.equal(helper.bn(1100));

                await oracle.setPrice(fToken, 1211);
                expect(await oracle.getPrice(fToken)).bignumber.equal(helper.bn(1210));
            });
    
            it('should cap decrease', async () => {
                await oracle.setPrice(fToken, 899);
                expect(await oracle.getPrice(fToken)).bignumber.equal(helper.bn(900));

                await oracle.setPrice(fToken, 798);
                expect(await oracle.getPrice(fToken)).bignumber.equal(helper.bn(810));
            });
        });

        describe('snapshot price price', () => {
            beforeEach(async () => {
                await oracle.setOracleDeltaLastLimit(helper.fromPercent(1000));
                await oracle.setOracleDeltaSnapshotLimit(helper.fromPercent(10));
                await oracle.setOracleDeltaSnapshotTime(30);
                await oracle.addPriceFeeder(owner);
                await oracle.setPrice(fToken, 1000);
            });

            it('should allow increase less than cap', async () => {
                await oracle.setPrice(fToken, 950);

                await oracle.setPrice(fToken, 1099);
                expect(await oracle.getPrice(fToken)).bignumber.equal(helper.bn(1099));
            });

            it('should allow decrease less than cap', async () => {
                await oracle.setPrice(fToken, 1050);

                await oracle.setPrice(fToken, 901);
                expect(await oracle.getPrice(fToken)).bignumber.equal(helper.bn(901));
            });

            it('should cap increase', async () => {
                await oracle.setPrice(fToken, 1050);

                await oracle.setPrice(fToken, 1101);
                expect(await oracle.getPrice(fToken)).bignumber.equal(helper.bn(1100));

                await oracle.setPrice(fToken, 1102);
                expect(await oracle.getPrice(fToken)).bignumber.equal(helper.bn(1100));
            });
    
            it('should cap decrease', async () => {
                await oracle.setPrice(fToken, 950);

                await oracle.setPrice(fToken, 899);
                expect(await oracle.getPrice(fToken)).bignumber.equal(helper.bn(900));

                await oracle.setPrice(fToken, 898);
                expect(await oracle.getPrice(fToken)).bignumber.equal(helper.bn(900));
            });

            it('should take new snapshot', async () => {
                await time.increase(29);
                await oracle.setPrice(fToken, 1100); // this is not new snapshot

                await time.increase(2);
                await oracle.setPrice(fToken, 900); // this is the new snapshot

                await oracle.setPrice(fToken, 1000);
                expect(await oracle.getPrice(fToken)).bignumber.equal(helper.bn(990));

                await time.increase(31);

                await oracle.setPrice(fToken, 1001);
                expect(await oracle.getPrice(fToken)).bignumber.equal(helper.bn(990)); // new snapshot

                await oracle.setPrice(fToken, 1100);
                expect(await oracle.getPrice(fToken)).bignumber.equal(helper.bn(1089));
            });
        });
    });

    describe('price feeder', () => {
        it('should be able to query price feeder', async () => {
            expect(await oracle.isPriceFeeder(owner)).to.be.false;
            expect(await oracle.isPriceFeeder(priceFeeder)).to.be.true;
            expect(await oracle.isPriceFeeder(badAddress)).to.be.false;
        });

        it('should allow owner to add price feeder', async () => {
            await oracle.addPriceFeeder(priceFeederTwo);
            expect(await oracle.isPriceFeeder(priceFeederTwo)).to.be.true;
        });

        it('should allow owner to remove price feeder', async () => {
            await oracle.removePriceFeeder(priceFeeder);
            expect(await oracle.isPriceFeeder(priceFeeder)).to.be.false;
        });

        it('should allow price feeder to renounce role', async () => {
            await oracle.renouncePriceFeeder({ from: priceFeeder });
            expect(await oracle.isPriceFeeder(priceFeeder)).to.be.false;
        });

        it('should only allow owner to change price feeder', async () => {
            await expectRevert(oracle.addPriceFeeder(badAddress, { from: priceFeeder }), helper.messages.onlyOwner);
            await expectRevert(oracle.addPriceFeeder(badAddress, { from: badAddress }), helper.messages.onlyOwner);
            await expectRevert(oracle.removePriceFeeder(priceFeeder, { from: priceFeeder }), helper.messages.onlyOwner);
            await expectRevert(oracle.removePriceFeeder(priceFeeder, { from: badAddress }), helper.messages.onlyOwner);
        });
    });
});