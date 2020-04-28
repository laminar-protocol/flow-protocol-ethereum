pragma solidity ^0.6.4;

import "../../impls/synthetic/SyntheticFlowToken.sol";

contract SyntheticFlowTokenNewVersion is SyntheticFlowToken {
    bytes32[] public newStorageBytes32;
    uint256 public newStorageUint;

    function addNewStorageBytes32(bytes32 _newBytes32) public {
        newStorageBytes32.push(_newBytes32);
    }

    function setNewStorageUint(uint256 _newStorageUint) public {
        newStorageUint = _newStorageUint;
    }
}