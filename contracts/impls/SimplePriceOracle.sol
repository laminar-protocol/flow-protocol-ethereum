pragma solidity ^0.5.8;

import "../interfaces/PriceOracleInterface.sol";
import "../impls/PriceOracleConfig.sol";
import "../libs/Percentage.sol";
import "../roles/PriceFeederRole.sol";
import "../libs/Arrays.sol";

library PriceOracleStructs {
    struct PriceRecord {
        uint price;
        uint timestamp;
    }
}

contract PriceOracleDataSource is PriceFeederRole {
    // key => feeder => price record
    mapping(address => mapping(address => PriceOracleStructs.PriceRecord)) private priceRecords;
    // key => hasUpdate
    mapping(address => bool) private hasUpdate;

    // to store temp non-expired records for `findMedianPrice` method
    uint[] private validPrices;

    constructor(address[] memory priceFeeders) public {
        for (uint i = 0; i < priceFeeders.length; i++) {
            addPriceFeeder(priceFeeders[i]);
        }
    }

    function feedPrice(address key, uint price) public onlyPriceFeeder {
        priceRecords[key][msg.sender] = PriceOracleStructs.PriceRecord(price, block.timestamp);
        hasUpdate[key] = true;
    }

    function findMedianPrice(address key, uint expireIn) public returns (uint) {
        uint expireAt = block.timestamp - expireIn;

        // filter active price records
        delete validPrices;
        for (uint i = 0; i < priceFeeders.length; i++) {
            PriceOracleStructs.PriceRecord storage record = priceRecords[key][priceFeeders[i]];
            if (record.timestamp > expireAt) {
                validPrices.push(record.price);
            }
        }

        return Arrays.findMedian(validPrices);
    }
}

contract SimplePriceOracle is PriceOracleConfig, PriceFeederRole, PriceOracleInterface {
    mapping(address => uint) private prices;
    mapping(address => PriceOracleStructs.PriceRecord) private priceSnapshots;

    bool public constant isPriceOracle = true;

    event PriceUpdated(address indexed addr, uint price);

    function getPrice(address addr) external view returns (uint) {
        return prices[addr];
    }

    function setPrice(address addr, uint price) public onlyPriceFeeder {
        require(price != 0, "Invalid price");
        uint lastPrice = prices[addr];
        PriceOracleStructs.PriceRecord storage snapshotPrice = priceSnapshots[addr];
        uint price2 = capPrice(price, lastPrice, oracleDeltaLastLimit);
        uint price3 = capPrice(price2, snapshotPrice.price, oracleDeltaSnapshotLimit);
        if (snapshotPrice.timestamp + oracleDeltaSnapshotTime < block.timestamp) {
            snapshotPrice.price = price3;
            snapshotPrice.timestamp = block.timestamp;
        }

        prices[addr] = price3;

        emit PriceUpdated(addr, price3);
    }

    function capPrice(uint current, uint last, Percentage.Percent storage limit) internal pure returns (uint) {
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
