pragma solidity ^0.6.3;
import "../libs/Arrays.sol";

contract ArraysImpl {
    function findMedian(uint[] memory unsorted) public pure returns (uint) {
        return Arrays.findMedian(unsorted);
    }
}

contract QuickImpl {
    function select(uint[] memory arr, uint k) public pure returns (uint) {
        return Quick.select(arr, k);
    }
}
