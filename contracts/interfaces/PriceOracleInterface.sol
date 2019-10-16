pragma solidity ^0.5.8;

interface PriceOracleInterface {
    function isPriceOracle() external pure returns (bool);
    function getPrice(address addr) external returns (uint);
}
