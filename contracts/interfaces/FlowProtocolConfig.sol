pragma solidity ^0.5.8;

interface FlowProtocolConfig {
    function oracleDeltaLastLimit() external view returns (uint256);
    function oracleDeltaSnapshotLimit() external view returns (uint256);
    function oracleDeltaSnapshotTime() external view returns (uint256);
}