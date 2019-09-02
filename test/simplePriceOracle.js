const { expectRevert } = require('openzeppelin-test-helpers');
const { expect } = require('chai');

const helper = require('./helpers');

const SimplePriceOracle = artifacts.require("SimplePriceOracle");

contract('SimplePriceOracle', accounts => {
    const owner = accounts[0];
    const priceFeeder = accounts[1];
    const priceFeederTwo = accounts[2];
    const fToken = accounts[3];
    const fTokenTwo = accounts[4];
    const badAddress = accounts[5];

    let oracle;

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