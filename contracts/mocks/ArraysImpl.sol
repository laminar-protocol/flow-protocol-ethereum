// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;
import "../libs/Arrays.sol";

contract ArraysImpl {
    function findMedian(uint256[] memory unsorted) public pure returns (uint256) {
        return Arrays.findMedian(unsorted);
    }
}

contract QuickImpl {
    function select(uint256[] memory arr, uint256 k) public pure returns (uint256) {
        return Quick.select(arr, k);
    }
}
