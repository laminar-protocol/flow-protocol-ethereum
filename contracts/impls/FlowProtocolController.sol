pragma solidity ^0.5.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";

import "../libs/Percentage.sol";
import "../interfaces/FlowProtocolConfig.sol";
import "../interfaces/FlowProtocol.sol";
import "../interfaces/PriceOracle.sol";
import "../roles/ProtocolOwnable.sol";
import "./FlowProtocolOracle.sol";

contract FlowProtocolController is FlowProtocol, FlowProtocolConfig, Ownable {
    FlowProtocolOracle public oracle;
    IERC20 public baseToken;
    
    // max price diff since last input
    Percentage.Percent public oracleDeltaLastLimit;
    // max price diff since last snapshot
    Percentage.Percent public oracleDeltaSnapshotLimit;
    // min time between snapshots
    uint public oracleDeltaSnapshotTime;

    constructor(IERC20 baseToken_) public {
        oracle = new FlowProtocolOracle(this);
        baseToken = baseToken_;

        // TODO: all those values should be from constructor parameter
        oracleDeltaLastLimit = Percentage.fromFraction(10, 100);
        oracleDeltaSnapshotLimit = Percentage.fromFraction(15, 100);
        oracleDeltaSnapshotTime = 1 hours;
        addPriceFeeder(msg.sender);
    }

    // --------- owner functions ----------

    function setOracleDeltaLastLimit(uint limit) public onlyOwner {
        oracleDeltaLastLimit.value = limit;
    }

    function setOracleDeltaSnapshotLimit(uint limit) public onlyOwner {
        oracleDeltaSnapshotLimit.value = limit;
    }

    function setOracleDeltaSnapshotTime(uint time) public onlyOwner {
        oracleDeltaSnapshotTime = time;
    }

    function addPriceFeeder(address account) public onlyOwner {
        oracle.addPriceFeeder(account);
    }

    function removePriceFeeder(address account) public onlyOwner {
        oracle.removePriceFeeder(account);
    }
}