pragma solidity ^0.6.4;

import "../impls/margin/MarginFlowProtocol.sol";
import "./LiquidityPoolInterface.sol";

interface MarginLiquidityPoolInterface is LiquidityPoolInterface {
    function depositLiquidity(uint256 _realized) external returns (uint256);
    function approveLiquidityToProtocol(uint256 _realized) external returns (uint256);
    function withdrawLiquidityOwner(uint256 _realized) external returns (uint256);
    function getLiquidity() external returns (uint256);

    function getBidSpread(address baseToken, address quoteToken) external view returns (uint256);
    function getAskSpread(address baseToken, address quoteToken) external view returns (uint256);
    function spreadsPerTokenPair(address baseToken, address quoteToken) external view returns (uint256);
    function setSpreadForPair(address baseToken, address quoteToken, uint256 spread) external;

    function enableToken(address baseToken, address quoteToken, uint256 spread) external;
    function disableToken(address baseToken, address quoteToken) external;
    function allowedTokens(address baseToken, address quoteToken) external returns (bool);

    event SpreadUpdated(address indexed baseToken, address indexed quoteToken, uint256 newSpread);
}
