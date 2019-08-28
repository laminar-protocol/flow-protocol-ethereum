pragma solidity ^0.5.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface LiquidityPool {
    // return 0 means not available for this trade
    function getSpread(address fToken, uint baseTokenAmount) external view returns (uint);
    // collaterla ratio this pool want to maintain. e.g. 1.5 ethers means 150%
    function collateralRatio() external view returns (uint);
}
