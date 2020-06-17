// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";

interface MoneyMarketInterface {
    function baseToken() external view returns (IERC20);

    function iToken() external view returns (IERC20);

    function exchangeRate() external view returns (uint256);

    function mint(uint256 baseTokenAmount) external returns (uint256);

    function mintTo(address recipient, uint256 baseTokenAmount) external returns (uint256);

    function redeem(uint256 iTokenAmount) external returns (uint256);

    function redeemTo(address recipient, uint256 iTokenAmount) external returns (uint256);

    function redeemBaseToken(uint256 baseTokenAmount) external returns (uint256);

    function redeemBaseTokenTo(address recipient, uint256 baseTokenAmount) external returns (uint256);

    function convertAmountFromBase(uint256 _baseTokenAmount) external view returns (uint256);

    function convertAmountFromBase(uint256 rate, uint256 baseTokenAmount) external pure returns (uint256);

    function convertAmountToBase(uint256 iTokenAmount) external view returns (uint256);

    function convertAmountToBase(uint256 rate, uint256 iTokenAmount) external pure returns (uint256);

    function convertAmountFromBase(int256 _baseTokenAmount) external view returns (int256);

    function convertAmountFromBase(int256 rate, int256 baseTokenAmount) external pure returns (int256);

    function convertAmountToBase(int256 iTokenAmount) external view returns (int256);

    function convertAmountToBase(int256 rate, int256 iTokenAmount) external pure returns (int256);

    function totalHoldings() external view returns (uint256);

    event Minted(address indexed recipient, uint256 baseTokenAmount, uint256 iTokenAmount);
    event Redeemed(address indexed recipient, uint256 baseTokenAmount, uint256 iTokenAmount);
}
