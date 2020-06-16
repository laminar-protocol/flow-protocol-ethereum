pragma solidity ^0.6.4;
interface PriceOracleInterface {
    function isPriceOracle() external pure returns (bool);
    function getPrice(address addr) external returns (uint);
    function readPrice(address addr) external view returns (uint);

    event PriceFeeded(address indexed addr, address indexed sender, uint price);
    event PriceUpdated(address indexed addr, uint price);
}
