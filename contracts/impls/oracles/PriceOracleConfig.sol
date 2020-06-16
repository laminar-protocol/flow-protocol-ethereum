pragma solidity ^0.6.4;

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";

import "../../libs/Percentage.sol";

contract PriceOracleConfig is Initializable, OwnableUpgradeSafe {
    // max price diff since last input
    Percentage.Percent public oracleDeltaLastLimit;
    // max price diff since last snapshot
    Percentage.Percent public oracleDeltaSnapshotLimit;
    // min time between snapshots
    uint public oracleDeltaSnapshotTime;
    // price record is considered expired after this amount of time
    uint public expireIn;

    function initialize() public virtual initializer {
        OwnableUpgradeSafe.__Ownable_init();

        // TODO: all those values should be from constructor parameter
        oracleDeltaLastLimit = Percentage.fromFraction(10, 100);
        oracleDeltaSnapshotLimit = Percentage.fromFraction(15, 100);
        oracleDeltaSnapshotTime = 1 hours;
        expireIn = 10 minutes;
    }

    function setOracleDeltaLastLimit(uint limit) public onlyOwner {
        oracleDeltaLastLimit.value = limit;
    }

    function setOracleDeltaSnapshotLimit(uint limit) public onlyOwner {
        oracleDeltaSnapshotLimit.value = limit;
    }

    function setOracleDeltaSnapshotTime(uint time) public onlyOwner {
        oracleDeltaSnapshotTime = time;
    }

    function setExpireIn(uint time) public onlyOwner {
        expireIn = time;
    }
}
