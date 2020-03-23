pragma solidity ^0.6.4;

import "./LiquidityPoolInterface.sol";

interface MarginLiquidityPoolInterface is LiquidityPoolInterface {
    function depositLiquidity(uint256 _realized) external;

    function withdrawLiquidity(uint256 _realized) external;

    function getLiquidity() external returns (uint256);
}
