// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../impls/margin/MarginFlowProtocol.sol";
import "../impls/margin/MarginFlowProtocolConfig.sol";
import "./LiquidityPoolInterface.sol";

interface MarginLiquidityPoolInterface is LiquidityPoolInterface {
    function depositLiquidity(uint256 _realized) external returns (uint256);

    function increaseAllowanceForProtocol(uint256 _realized) external;

    function increaseAllowanceForProtocolSafety(uint256 _realized) external;

    function withdrawLiquidityOwner(uint256 _realized) external returns (uint256);

    function getLiquidity() external view returns (uint256);

    function getBidSpread(address baseToken, address quoteToken) external view returns (uint256);

    function getAskSpread(address baseToken, address quoteToken) external view returns (uint256);

    function spreadsPerTokenPair(address baseToken, address quoteToken) external view returns (uint256);

    function setSpreadForPair(
        address baseToken,
        address quoteToken,
        uint256 spread
    ) external;

    function enableToken(
        address baseToken,
        address quoteToken,
        uint256 spread,
        int256 _newSwapRateMarkup
    ) external;

    function disableToken(address baseToken, address quoteToken) external;

    function allowedTokens(address baseToken, address quoteToken) external returns (bool);

    function minLeverage() external returns (uint256);

    function maxLeverage() external returns (uint256);

    function minLeverageAmount() external returns (uint256);

    function getSwapRateMarkupForPair(address baseToken, address quoteToken) external view returns (int256);

    function setMinLeverage(uint256 _minLeverage) external;

    function setMaxLeverage(uint256 _maxLeverage) external;

    function setMinLeverageAmount(uint256 _newMinLeverageAmount) external;

    function setCurrentSwapRateMarkupForPair(
        address base,
        address quote,
        int256 newSwapRateMarkup
    ) external;

    event SpreadUpdated(address indexed baseToken, address indexed quoteToken, uint256 newSpread);
}
