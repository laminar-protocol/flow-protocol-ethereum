pragma solidity ^0.6.4;

import "../impls/synthetic/SyntheticFlowProtocol.sol";
import "../impls/synthetic/SyntheticFlowToken.sol";

interface SyntheticLiquidityPoolInterface {
    function addCollateral(SyntheticFlowProtocol protocol, SyntheticFlowToken token, uint256 baseTokenAmount) external;
    function withdrawCollateral(SyntheticFlowProtocol protocol, SyntheticFlowToken token) external;

    function getBidSpread(address fToken) external view returns (uint256);
    function getAskSpread(address fToken) external view returns (uint256);
    function setSpreadForToken(address fToken, uint256 value) external;
    function spreadsPerToken(address fToken) external returns (uint256);

    function collateralRatio() external view returns (uint256);
    function getAdditionalCollateralRatio(address fToken) external view returns (uint256);
    function setCollateralRatio(uint256 value) external;

    function enableToken(address token, uint256 spread) external;
    function disableToken(address token) external;
    function allowedTokens(address token) external returns (bool);

    event SpreadUpdated(address indexed token, uint256 newSpread);
    event AdditionalCollateralRatioUpdated();
}