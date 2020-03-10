// solium-disable linebreak-style
pragma solidity ^0.5.8;

interface FaucetInterface {
    function allocateTo(address _owner, uint256 value) external;
}
