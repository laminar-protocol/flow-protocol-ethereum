pragma solidity ^0.5.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface MoneyMarketInterface {
    function baseToken() external view returns (IERC20);
    function iToken() external view returns (IERC20);

    function exchangeRate() external view returns (uint);

    function mint(uint baseTokenAmount) external;
    function mintTo(address recipient, uint baseTokenAmount) external;
    function redeem(uint iTokenAmount) external;
    function redeemTo(address recipient, uint iTokenAmount) external;
    function redeemBaseToken(uint baseTokenAmount) external;
    function redeemBaseTokenTo(address recipient, uint baseTokenAmount) external;

    function convertAmountFromBase(uint rate, uint baseTokenAmount) external pure returns (uint);
    function convertAmountToBase(uint rate, uint iTokenAmount) external pure returns (uint);
}
