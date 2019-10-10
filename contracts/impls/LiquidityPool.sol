pragma solidity ^0.5.8;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "../interfaces/LiquidityPoolInterface.sol";
import "../interfaces/MoneyMarketInterface.sol";

contract LiquidityPool is LiquidityPoolInterface, Ownable {
    using SafeERC20 for IERC20;

    uint constant MAX_UINT = 2**256 - 1;

    MoneyMarketInterface private moneyMarket;
    uint private spread;
    uint private collateralRatio;

    mapping (address => bool) private allowedTokens;

    constructor(address protocol, MoneyMarketInterface moneyMarket_, uint spread_, address[] memory fTokens) public {
        moneyMarket = moneyMarket_;
        spread = spread_;
        collateralRatio = 0; // use fToken default

        moneyMarket.iToken().safeApprove(protocol, MAX_UINT);

        for (uint i = 0; i < fTokens.length; i++) {
            allowedTokens[fTokens[i]] = true;
        }
    }

    function getBidSpread(address fToken) external view returns (uint) {
        if (allowedTokens[fToken]) {
            return spread;
        }
        return 0;
    }

    function getAskSpread(address fToken) external view returns (uint) {
        if (allowedTokens[fToken]) {
            return spread;
        }
        return 0;
    }

    function getAdditoinalCollateralRatio(address fToken) external view returns (uint) {
        if (allowedTokens[fToken]) {
            return collateralRatio;
        }
        return 0;
    }

    function setSpread(uint value) external onlyOwner {
        spread = value;

        emit SpreadUpdated();
    }

    function setCollateralRatio(uint value) external onlyOwner {
        collateralRatio = value;

        emit AdditoinalCollateralRatioUpdated();
    }

    function enableToken(address token) external onlyOwner {
        allowedTokens[token] = true;
    }

    function disableToken(address token) external onlyOwner {
        allowedTokens[token] = false;
    }

    function withdraw(uint amount) external onlyOwner {
        moneyMarket.redeemTo(msg.sender, amount);
    }
}
