pragma solidity ^0.5.8;

import "../interfaces/PriceOracleInterface.sol";
import "../impls/PriceOracleConfig.sol";
import "../libs/Percentage.sol";
import "../roles/PriceFeederRole.sol";

contract SimplePriceOracle is PriceOracleConfig, PriceFeederRole, PriceOracleInterface {
    struct PriceData {
        uint price;
        uint timestamp;
    }

    mapping(address => uint) private prices;
    mapping(address => PriceData) private priceSnapshots;

    bool public constant isPriceOracle = true;

    event PriceUpdated(address indexed addr, uint price);

    constructor(address[] memory priceFeeders) public {
        for (uint i = 0; i < priceFeeders.length; i++) {
            addPriceFeeder(priceFeeders[i]);
        }
    }

    function getPrice(address addr) external view returns (uint) {
        return prices[addr];
    }

    function setPrice(address addr, uint price) public onlyPriceFeeder {
        require(price != 0, "Invalid price");
        uint lastPrice = prices[addr];
        PriceData storage snapshotPrice = priceSnapshots[addr];
        uint price2 = capPrice(price, lastPrice, oracleDeltaLastLimit);
        uint price3 = capPrice(price2, snapshotPrice.price, oracleDeltaSnapshotLimit);
        if (snapshotPrice.timestamp + oracleDeltaSnapshotTime < now) {
            snapshotPrice.price = price3;
            snapshotPrice.timestamp = now;
        }

        prices[addr] = price3;

        emit PriceUpdated(addr, price3);
    }

    function capPrice(uint current, uint last, Percentage.Percent storage limit) pure internal returns (uint) {
        if (last == 0) {
            return current;
        }
        uint price = current;
        uint cap = Percentage.mulPercent(last, limit);
        if (current > last) {
            uint diff = current - last;
            if (diff > cap) {
                price = last + cap;
            }
        } else if (current < last) {
            uint diff = last - current;
            if (diff > cap) {
                price = last - cap;
            }
        }
        return price;
    }
}
