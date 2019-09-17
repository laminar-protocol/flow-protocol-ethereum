pragma solidity ^0.5.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface MoneyMarketInterface {
    function baseToken() view external returns (IERC20);
    function iToken() view external returns (IERC20);
    
    function exchangeRate() view external returns (uint);
    
    function mint(uint baseTokenAmount) external;
    function mintTo(address recipient, uint baseTokenAmount) external;
    function redeem(uint iTokenAmount) external;
    function redeemTo(address recipient, uint iTokenAmount) external;
    function redeemBaseToken(uint baseTokenAmount) external;
    function redeemBaseTokenTo(address recipient, uint baseTokenAmount) external;

    function convertAmountFromBase(uint rate, uint baseTokenAmount) pure external returns (uint);
    function convertAmountToBase(uint rate, uint iTokenAmount) pure external returns (uint);
}
