pragma solidity ^0.6.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface MoneyMarketInterface {
    function baseToken() external view returns (IERC20);
    function iToken() external view returns (IERC20);

    function exchangeRate() external view returns (uint);

    function mint(uint baseTokenAmount) external returns (uint);
    function mintTo(address recipient, uint baseTokenAmount) external returns (uint);
    function redeem(uint iTokenAmount) external returns (uint);
    function redeemTo(address recipient, uint iTokenAmount) external returns (uint);
    function redeemBaseToken(uint baseTokenAmount) external;
    function redeemBaseTokenTo(address recipient, uint baseTokenAmount) external;

    function convertAmountFromBase(uint rate, uint baseTokenAmount) external pure returns (uint);
    function convertAmountToBase(uint rate, uint iTokenAmount) external pure returns (uint);

    function totalHoldings() external view returns (uint);

    event Minted(address indexed recipient, uint baseTokenAmount, uint iTokenAmount);
    event Redeemed(address indexed recipient, uint baseTokenAmount, uint iTokenAmount);
}
