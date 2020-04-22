pragma solidity ^0.6.4;

import "./MoneyMarketInterface.sol";

interface LiquidityPoolInterface {
    function depositLiquidity(uint256 _realized) external returns (uint256);

    function withdrawLiquidity(uint256 _realized) external returns (uint256);

    function getLiquidity() external returns (uint256);

    // return 0 means not available for this trade
    function getBidSpread(address fToken) external view returns (uint256);
    // return 0 means not available for this trade
    function getAskSpread(address fToken) external view returns (uint256);
    // additional collaterla ratio this pool want to maintain. e.g. 0.5 ether means 150% of the issuing assets value
    function getAdditionalCollateralRatio(address fToken)
        external
        view
        returns (uint256);

    event SpreadUpdated();
    event SpreadUpdated(address indexed token, uint256 newSpread);
    event AdditionalCollateralRatioUpdated();
}
