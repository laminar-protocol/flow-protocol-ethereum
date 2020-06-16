// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;

interface PriceOracleInterface {
    function isPriceOracle() external pure returns (bool);

    function getPrice(address addr) external returns (uint256);

    function readPrice(address addr) external view returns (uint256);

    event PriceFeeded(address indexed addr, address indexed sender, uint256 price);
    event PriceUpdated(address indexed addr, uint256 price);
}
