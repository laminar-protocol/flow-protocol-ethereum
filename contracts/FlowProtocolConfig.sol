pragma solidity ^0.5.8;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "./Percentage.sol";

contract FlowProtocolConfig is Ownable {
    // max price diff since last input
    Percentage.Percent public oracleDeltaLastLimit;
    // max price diff since last snapshot
    Percentage.Percent public oracleDeltaSnapshotLimit;
    // min time between snapshots
    uint public oracleDeltaSnapshotTime;

    // TODO: all the values will be from constructor parameter instead
    constructor() public {
        oracleDeltaLastLimit = Percentage.fromFraction(10, 100);
        oracleDeltaSnapshotLimit = Percentage.fromFraction(15, 100);
        oracleDeltaSnapshotTime = 1 hours;
    }
}