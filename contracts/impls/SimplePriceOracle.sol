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
    mapping(address => bool) public hasUpdate;

    // to store temp non-expired records for `findMedianPrice` method
    uint[] private validPrices;

    constructor(address[] memory priceFeeders) public {
        for (uint i = 0; i < priceFeeders.length; i++) {
            addPriceFeeder(priceFeeders[i]);
        }
    }

    function feedPrice(address key, uint price) external onlyPriceFeeder {
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

    function setHasUpdate(address key, bool value) public {
        hasUpdate[key] = value;
    }
}

contract SimplePriceOracle is PriceOracleConfig, PriceOracleInterface {
    mapping(address => uint) private cachedPrices;
    mapping(address => PriceOracleStructs.PriceRecord) private priceSnapshots;

    PriceOracleDataSource private dataSource;
    uint private expireIn;

    bool public constant isPriceOracle = true;

    event PriceUpdated(address indexed addr, uint price);

    function getPrice(address key) external view returns (uint) {
        if (dataSource.hasUpdate(key)) {
            uint price = dataSource.findMedianPrice(key, expireIn);
            if (price > 0) {
                setPrice(key, price);
            }
            dataSource.setHasUpdate(key, false);
        }
        return cachedPrices[key];
    }

    function setPrice(address addr, uint price) private {
        require(price != 0, "Invalid price");
        uint lastPrice = cachedPrices[addr];
        PriceOracleStructs.PriceRecord storage snapshotPrice = priceSnapshots[addr];
        uint price2 = capPrice(price, lastPrice, oracleDeltaLastLimit);
        uint price3 = capPrice(price2, snapshotPrice.price, oracleDeltaSnapshotLimit);
        if (snapshotPrice.timestamp + oracleDeltaSnapshotTime < block.timestamp) {
            snapshotPrice.price = price3;
            snapshotPrice.timestamp = block.timestamp;
        }

        cachedPrices[addr] = price3;

        emit PriceUpdated(addr, price3);
    }

    function capPrice(uint current, uint last, Percentage.Percent storage limit) private pure returns (uint) {
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
