// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;

interface FaucetInterface {
    function allocateTo(address _owner, uint256 value) external;
}
