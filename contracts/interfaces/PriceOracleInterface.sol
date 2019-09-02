pragma solidity ^0.5.8;

interface PriceOracle {
    function isPriceOracle() external pure returns (bool);
    function getPrice(address addr) external view returns (uint);
    // TODO: get swap
}
