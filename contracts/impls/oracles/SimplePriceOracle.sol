pragma solidity ^0.6.4;

import "../../interfaces/PriceOracleInterface.sol";
import "../../roles/PriceFeederRole.sol";
import "../../libs/Arrays.sol";
import "../../libs/Percentage.sol";

import "./PriceOracleConfig.sol";

library PriceOracleStructs {
    struct PriceRecord {
        uint price;
        uint timestamp;
    }
}


/// Price oracle data source. Only for inheritance.
contract PriceOracleDataSource {
    // key => feeder => price record
    mapping(address => mapping(address => PriceOracleStructs.PriceRecord)) private priceRecords;
    // key => hasUpdate
    mapping(address => bool) internal hasUpdate;

    function _feedPrice(address key, uint price) internal {
        priceRecords[key][msg.sender] = PriceOracleStructs.PriceRecord(price, block.timestamp);
        hasUpdate[key] = true;
    }

    function findMedianPrice(address key, uint expireIn, address[] storage priceFeeders) internal view returns (uint) {
        uint expireAt = block.timestamp - expireIn;

        // filter active price records, put them in an array with max possible length
        uint[] memory validPricesWithMaxCapacity = new uint[](priceFeeders.length);
        uint validPricesLength = 0;
        for (uint i = 0; i < priceFeeders.length; i++) {
            PriceOracleStructs.PriceRecord storage record = priceRecords[key][priceFeeders[i]];
            if (record.timestamp > expireAt) {
                validPricesWithMaxCapacity[validPricesLength] = record.price;
                validPricesLength += 1;
            }
        }

        if (validPricesLength == 0) {
            return 0;
        }

        // move active price records into an array just long enough to hold all records
        uint[] memory validPrices = new uint[](validPricesLength);
        for (uint i = 0; i < validPricesLength; i++) {
            validPrices[i] = validPricesWithMaxCapacity[i];
        }

        return Arrays.findMedian(validPrices);
    }
}


contract SimplePriceOracle is PriceOracleConfig, PriceOracleInterface, PriceFeederRole, PriceOracleDataSource {
    mapping(address => uint) private cachedPrices;
    mapping(address => PriceOracleStructs.PriceRecord) private priceSnapshots;

    function initialize() public override(PriceOracleConfig,PriceFeederRole) initializer {
        PriceOracleConfig.initialize();
        PriceFeederRole.initialize();
    }

    function isPriceOracle() external pure override returns (bool) {
        return true;
    }

    event PriceUpdated(address indexed addr, uint price);

    function feedPrice(address key, uint price) external onlyPriceFeeder {
        _feedPrice(key, price);

        emit PriceFeeded(key, msg.sender, price);
    }

    function getPrice(address key) external override returns (uint) {
        if (hasUpdate[key]) {
            uint price = findMedianPrice(key, expireIn, priceFeeders);
            if (price > 0) {
                _setPrice(key, price);
            }
            hasUpdate[key] = false;
        }
        return cachedPrices[key];
    }

    function readPrice(address key) external view returns (uint) {
        if (hasUpdate[key]) {
            uint price = findMedianPrice(key, expireIn, priceFeeders);
            if (price > 0) {
                return _calculateCapPrice(key, price);
            }
        }
        return cachedPrices[key];
    }

    function _calculateCapPrice(address addr, uint price) private view returns (uint) {
        require(price != 0, "Invalid price");

        PriceOracleStructs.PriceRecord storage snapshotPrice = priceSnapshots[addr];
        uint lastPrice = cachedPrices[addr];
        uint price2 = _capPrice(price, lastPrice, oracleDeltaLastLimit);
        uint price3 = _capPrice(price2, snapshotPrice.price, oracleDeltaSnapshotLimit);

        return price3;
    }

    function _setPrice(address addr, uint price) private {
        uint finalPrice = _calculateCapPrice(addr, price);
        PriceOracleStructs.PriceRecord storage snapshotPrice = priceSnapshots[addr];
        if (snapshotPrice.timestamp + oracleDeltaSnapshotTime < block.timestamp) {
            snapshotPrice.price = finalPrice;
            snapshotPrice.timestamp = block.timestamp;
        }

        cachedPrices[addr] = finalPrice;

        emit PriceUpdated(addr, finalPrice);
    }

    function _capPrice(uint current, uint last, Percentage.Percent storage limit) private pure returns (uint) {
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
