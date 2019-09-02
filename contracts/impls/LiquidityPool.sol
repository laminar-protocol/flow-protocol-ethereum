pragma solidity ^0.5.8;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

contract LiquidityPool is Ownable {
    using SafeERC20 for IERC20;

    uint constant MAX_UINT = 2**256 - 1;

    uint private spread;
    uint private collateralRatio;

    mapping (address => bool) private allowedTokens;

    constructor(IERC20 baseToken, uint spread_, address[] memory fTokens) public {
        baseToken.safeApprove(msg.sender, MAX_UINT);
        spread = spread_;
        collateralRatio = 0; // use fToken default

        for (uint i = 0; i < fTokens.length; i++) {
            allowedTokens[fTokens[i]] = true;
        }
    }

    function getSpread(address fToken) external view returns (uint) {
        if (allowedTokens[fToken]) {
            return spread;
        }
        return 0;
    }

    function getCollateralRatio(address fToken) external view returns (uint) {
        if (allowedTokens[fToken]) {
            return collateralRatio;
        }
        return 0;
    }

    function setSpread(uint value) external onlyOwner {
        spread = value;
    }

    function setCollateralRatio(uint value) external onlyOwner {
        collateralRatio = value;
    }

    function enableToken(address token) external onlyOwner {
        allowedTokens[token] = true;
    }

    function disableToken(address token) external onlyOwner {
        allowedTokens[token] = false;
    }
}