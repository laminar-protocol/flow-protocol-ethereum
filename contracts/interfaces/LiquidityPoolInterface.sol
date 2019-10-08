pragma solidity ^0.5.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface LiquidityPoolInterface {
    // return 0 means not available for this trade
    function getBidSpread(address fToken) external view returns (uint);
    // return 0 means not available for this trade
    function getAskSpread(address fToken) external view returns (uint);
    // additional collaterla ratio this pool want to maintain. e.g. 0.5 ether means 150% of the issuing assets value
    function getAdditoinalCollateralRatio(address fToken) external view returns (uint);

    event SpreadUpdated();
    event AdditoinalCollateralRatioUpdated();
}
