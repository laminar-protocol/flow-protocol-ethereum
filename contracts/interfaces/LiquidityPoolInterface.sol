pragma solidity ^0.6.4;

import "./MoneyMarketInterface.sol";

interface LiquidityPoolInterface {
    // return 0 means not available for this trade
    function getBidSpread(address fToken) external view returns (uint256);
    // return 0 means not available for this trade
    function getAskSpread(address fToken) external view returns (uint256);
    // additional collaterla ratio this pool want to maintain. e.g. 0.5 ether means 150% of the issuing assets value
    function getAdditionalCollateralRatio(address fToken)
        external
        view
        returns (uint256);

    // positive leverage means long, negative means short
    function openPosition(
        address tradingPair,
        uint256 positionId,
        address quoteToken,
        int256 leverage,
        uint256 baseTokenAmount
    ) external returns (bool);

    event SpreadUpdated();
    event AdditionalCollateralRatioUpdated();
}
