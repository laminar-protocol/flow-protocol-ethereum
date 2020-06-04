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
    function redeemBaseToken(uint baseTokenAmount) external returns (uint);
    function redeemBaseTokenTo(address recipient, uint baseTokenAmount) external returns (uint);

    function convertAmountFromBase(uint _baseTokenAmount) external view returns (uint);
    function convertAmountFromBase(uint rate, uint baseTokenAmount) external pure returns (uint);
    function convertAmountToBase(uint iTokenAmount) external view returns (uint);
    function convertAmountToBase(uint rate, uint iTokenAmount) external pure returns (uint);

    function convertAmountFromBase(int _baseTokenAmount) external view returns (int);
    function convertAmountFromBase(int rate, int baseTokenAmount) external pure returns (int);
    function convertAmountToBase(int iTokenAmount) external view returns (int);
    function convertAmountToBase(int rate, int iTokenAmount) external pure returns (int);

    function totalHoldings() external view returns (uint);


    event Minted(address indexed recipient, uint baseTokenAmount, uint iTokenAmount);
    event Redeemed(address indexed recipient, uint baseTokenAmount, uint iTokenAmount);
}
