pragma solidity ^0.5.8;

import "@openzeppelin/contracts/access/roles/WhitelistedRole.sol";

import "./PriceOracle.sol";
import "./FlowProtocolConfig.sol";
import "./Percentage.sol";

contract FlowProtocolOracle is WhitelistedRole, PriceOracle {
    struct PriceData {
        uint price;
        uint timestamp;
    }

    FlowProtocolConfig internal config;
    mapping(address => uint) private prices;
    mapping(address => PriceData) private priceSnapshots;

    bool public constant isPriceOracle = true;

    constructor(FlowProtocolConfig config_) public {
        config = config_;
    }

    function getPrice(address addr) external view returns (uint) {
        return prices[addr];
    }

    function setPrice(address addr, uint price) public onlyWhitelisted {
        require(price != 0, "Invalid price");
        uint lastPrice = prices[addr];
        PriceData storage snapshotPrice = priceSnapshots[addr];
        uint price2 = capPrice(price, lastPrice, config.oracleDeltaLastLimit());
        uint price3 = capPrice(price2, snapshotPrice.price, config.oracleDeltaSnapshotLimit());
        if (snapshotPrice.timestamp + config.oracleDeltaSnapshotTime() < now) {
            snapshotPrice.price = price3;
            snapshotPrice.timestamp = now;
        }

        prices[addr] = price3;
    }

    function capPrice(uint current, uint last, uint limit) pure internal returns (uint) {
        if (last == 0) {
            return current;
        }
        uint price = current;
        uint cap = Percentage.mulPercent(last, Percentage.Percent(limit));
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
