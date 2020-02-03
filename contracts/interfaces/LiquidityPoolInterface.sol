pragma solidity ^0.5.8;

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

    // deposit liquidity into this pool
    function depositLiquidity(uint256 amount) external;

    // withdraw liquidity from this pool
    function withdrawLiquidity(uint256 amount) external;

    event SpreadUpdated();
    event AdditoinalCollateralRatioUpdated();
}
