pragma solidity ^0.5.8;

interface LiquidityPoolInterface {
    // return 0 means not available for this trade
    function getBidSpread(address fToken) external view returns (uint);
    // return 0 means not available for this trade
    function getAskSpread(address fToken) external view returns (uint);
    // additional collaterla ratio this pool want to maintain. e.g. 0.5 ether means 150% of the issuing assets value
    function getAdditionalCollateralRatio(address fToken) external view returns (uint);

    // positive leverage means long, negative means short
    function openPosition(address tradingPair, uint positionId, address quoteToken, int leverage, uint baseTokenAmount) external returns (bool);

    event SpreadUpdated();
    event AdditoinalCollateralRatioUpdated();
}
