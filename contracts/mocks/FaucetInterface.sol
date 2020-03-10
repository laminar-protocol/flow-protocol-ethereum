pragma solidity ^0.6.3;
interface FaucetInterface {
    function allocateTo(address _owner, uint256 value) external;
}
