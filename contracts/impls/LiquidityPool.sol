pragma solidity ^0.5.8;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "../interfaces/LiquidityPoolInterface.sol";
import "../interfaces/MoneyMarketInterface.sol";
import "./FlowMarginProtocol.sol";
import "./MarginTradingPair.sol";

contract LiquidityPool is LiquidityPoolInterface, Ownable {
    using SafeERC20 for IERC20;

    uint constant MAX_UINT = 2**256 - 1;

    MoneyMarketInterface private moneyMarket;
    uint private spread;
    uint private collateralRatio;

    mapping (address => bool) private allowedTokens;

    constructor(MoneyMarketInterface moneyMarket_, uint spread_) public {
        moneyMarket = moneyMarket_;
        spread = spread_;
        collateralRatio = 0; // use fToken default
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

    function openPosition(
        address /* tradingPair */, uint /* positionId */, address quoteToken, int leverage, uint /* baseTokenAmount */
    ) external returns (bool) {
        // This is a view function so no need to have permission control
        // Otherwise needs to require msg.sender is approved FlowMarginProtocol
        return _openPosition(quoteToken, leverage);
    }

    function _openPosition(
        address quoteToken, int leverage
    ) private view returns (bool) {
        if (!allowedTokens[quoteToken]) {
            return false;
        }
        if (leverage > 100 || leverage < -100) {
            return false;
        }
        if (leverage < 2 && leverage > -2) {
            return false;
        }
        return true;
    }

    function closeMarginPosition(FlowMarginProtocol protocol, MarginTradingPair pair, uint id) external onlyOwner {
        protocol.closePosition(pair, id);
    }

    function approve(address protocol, uint amount) external onlyOwner {
        moneyMarket.iToken().safeApprove(protocol, amount);
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
