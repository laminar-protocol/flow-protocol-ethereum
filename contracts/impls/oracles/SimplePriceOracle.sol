// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;

import "../../interfaces/PriceOracleInterface.sol";
import "../../roles/PriceFeederRole.sol";
import "../../libs/Arrays.sol";
import "../../libs/Percentage.sol";

import "./PriceOracleConfig.sol";

library PriceOracleStructs {
    struct PriceRecord {
        uint256 price;
        uint256 timestamp;
    }
}

/// Price oracle data source. Only for inheritance.
contract PriceOracleDataSource {
    // key => feeder => price record
    mapping(address => mapping(address => PriceOracleStructs.PriceRecord)) private priceRecords;
    // key => hasUpdate
    mapping(address => bool) internal hasUpdate;

    function _feedPrice(address key, uint256 price) internal {
        priceRecords[key][msg.sender] = PriceOracleStructs.PriceRecord(price, block.timestamp);
        hasUpdate[key] = true;
    }

    function findMedianPrice(
        address key,
        uint256 expireIn,
        address[] storage priceFeeders
    ) internal view returns (uint256) {
        uint256 expireAt = block.timestamp - expireIn;

        // filter active price records, put them in an array with max possible length
        uint256[] memory validPricesWithMaxCapacity = new uint256[](priceFeeders.length);
        uint256 validPricesLength = 0;
        for (uint256 i = 0; i < priceFeeders.length; i++) {
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
        uint256[] memory validPrices = new uint256[](validPricesLength);
        for (uint256 i = 0; i < validPricesLength; i++) {
            validPrices[i] = validPricesWithMaxCapacity[i];
        }

        return Arrays.findMedian(validPrices);
    }
}

contract SimplePriceOracle is PriceOracleConfig, PriceOracleInterface, PriceFeederRole, PriceOracleDataSource {
    mapping(address => uint256) private cachedPrices;
    mapping(address => PriceOracleStructs.PriceRecord) private priceSnapshots;

    function initialize() public override(PriceOracleConfig, PriceFeederRole) initializer {
        PriceOracleConfig.initialize();
        PriceFeederRole.initialize();
    }

    function isPriceOracle() external override pure returns (bool) {
        return true;
    }

    event PriceUpdated(address indexed addr, uint256 price);

    function feedPrice(address key, uint256 price) external onlyPriceFeeder {
        _feedPrice(key, price);

        emit PriceFeeded(key, msg.sender, price);
    }

    function getPrice(address key) external override returns (uint256) {
        if (hasUpdate[key]) {
            uint256 price = findMedianPrice(key, expireIn, priceFeeders);
            if (price > 0) {
                _setPrice(key, price);
            }
            hasUpdate[key] = false;
        }
        return cachedPrices[key];
    }

    function readPrice(address key) external override view returns (uint256) {
        if (hasUpdate[key]) {
            uint256 price = findMedianPrice(key, expireIn, priceFeeders);
            if (price > 0) {
                return _calculateCapPrice(key, price);
            }
        }
        return cachedPrices[key];
    }

    function _calculateCapPrice(address addr, uint256 price) private view returns (uint256) {
        require(price != 0, "Invalid price");

        PriceOracleStructs.PriceRecord storage snapshotPrice = priceSnapshots[addr];
        uint256 lastPrice = cachedPrices[addr];
        uint256 price2 = _capPrice(price, lastPrice, oracleDeltaLastLimit);
        uint256 price3 = _capPrice(price2, snapshotPrice.price, oracleDeltaSnapshotLimit);

        return price3;
    }

    function _setPrice(address addr, uint256 price) private {
        uint256 finalPrice = _calculateCapPrice(addr, price);

        PriceOracleStructs.PriceRecord storage snapshotPrice = priceSnapshots[addr];
        if (snapshotPrice.timestamp + oracleDeltaSnapshotTime < block.timestamp) {
            snapshotPrice.price = finalPrice;
            snapshotPrice.timestamp = block.timestamp;
        }

        cachedPrices[addr] = finalPrice;

        emit PriceUpdated(addr, finalPrice);
    }

    function _capPrice(
        uint256 current,
        uint256 last,
        Percentage.Percent storage limit
    ) private pure returns (uint256) {
        if (last == 0) {
            return current;
        }
        uint256 price = current;
        uint256 cap = Percentage.mulPercent(last, limit);
        if (current > last) {
            uint256 diff = current - last;
            if (diff > cap) {
                price = last + cap;
            }
        } else if (current < last) {
            uint256 diff = last - current;
            if (diff > cap) {
                price = last - cap;
            }
        }
        return price;
    }
}
