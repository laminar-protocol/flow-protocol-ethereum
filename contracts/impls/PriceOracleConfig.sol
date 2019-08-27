pragma solidity ^0.5.8;

import "@openzeppelin/contracts/ownership/Ownable.sol";

import "../libs/Percentage.sol";

contract PriceOracleConfig is Ownable {
    // max price diff since last input
    Percentage.Percent public oracleDeltaLastLimit;
    // max price diff since last snapshot
    Percentage.Percent public oracleDeltaSnapshotLimit;
    // min time between snapshots
    uint public oracleDeltaSnapshotTime;

    constructor() internal {
        // TODO: all those values should be from constructor parameter
        oracleDeltaLastLimit = Percentage.fromFraction(10, 100);
        oracleDeltaSnapshotLimit = Percentage.fromFraction(15, 100);
        oracleDeltaSnapshotTime = 1 hours;
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
}