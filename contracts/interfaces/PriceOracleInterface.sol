pragma solidity ^0.5.8;

interface PriceOracleInterface {
    function isPriceOracle() external pure returns (bool);
    function getPrice(address addr) external view returns (uint);

    event PriceUpdated(address indexed addr, uint price);
}
