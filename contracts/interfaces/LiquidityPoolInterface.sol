// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;

import "./MoneyMarketInterface.sol";

interface LiquidityPoolInterface {
    function protocol() external returns (address);

    function moneyMarket() external returns (MoneyMarketInterface);

    function approveToProtocol(uint256 amount) external;

    function getOwner() external view returns (address);
}
