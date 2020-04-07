pragma solidity ^0.6.4;
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "../libs/upgrades/UpgradeOwnable.sol";
import "../interfaces/LiquidityPoolInterface.sol";
import "../interfaces/MoneyMarketInterface.sol";
import "./FlowProtocol.sol";
import "./FlowToken.sol";
import "./FlowMarginProtocol.sol";
import "./MarginTradingPair.sol";

contract LiquidityPool is Initializable, UpgradeOwnable, LiquidityPoolInterface {
    using SafeERC20 for IERC20;

    // DO NOT CHANGE ORDER WHEN UPDATING, ONLY ADDING NEW VARIABLES IS ALLOWED
    uint constant MAX_UINT = 2**256 - 1;

    MoneyMarketInterface internal moneyMarket;
    uint private spread;
    uint private collateralRatio;

    address public protocol;
    mapping (address => bool) public allowedTokens;

    modifier onlyProtocol() {
        require(msg.sender == protocol, "Ownable: caller is not the protocol");
        _;
    }

    function initialize(MoneyMarketInterface _moneyMarket, address _protocol, uint _spread) public initializer {
        UpgradeOwnable.initialize(msg.sender);

        moneyMarket = _moneyMarket;
        protocol = _protocol;
        spread = _spread;
        collateralRatio = 0; // use fToken default
    }

    function getBidSpread(address fToken) external view override returns (uint) {
        if (allowedTokens[fToken]) {
            return spread;
        }
        return 0;
    }

    function getAskSpread(address fToken) external view override returns (uint) {
        if (allowedTokens[fToken]) {
            return spread;
        }
        return 0;
    }

    function getAdditionalCollateralRatio(address fToken) external view override returns (uint) {
        if (allowedTokens[fToken]) {
            return collateralRatio;
        }
        return 0;
    }

    function openPosition(
        address /* tradingPair */, uint /* positionId */, address quoteToken, int leverage, uint /* baseTokenAmount */
    ) external override returns (bool) {
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

    function approve(address _protocol, uint amount) external onlyOwner {
        moneyMarket.iToken().safeApprove(_protocol, amount);
    }

    function setSpread(uint value) external onlyOwner {
        spread = value;

        emit SpreadUpdated();
    }

    function setCollateralRatio(uint value) external onlyOwner {
        collateralRatio = value;

        emit AdditionalCollateralRatioUpdated();
    }

    function enableToken(address token) external onlyOwner {
        allowedTokens[token] = true;
    }

    function disableToken(address token) external onlyOwner {
        allowedTokens[token] = false;
    }

    function depositLiquidity(uint _baseTokenAmount) external override returns (uint256) {
        moneyMarket.baseToken().safeTransferFrom(msg.sender, address(this), _baseTokenAmount);
        moneyMarket.baseToken().approve(address(moneyMarket), _baseTokenAmount);

        return moneyMarket.mint(_baseTokenAmount);
    }

    function withdrawLiquidity(uint _iTokenAmount) external override onlyProtocol returns (uint256) {
        return moneyMarket.redeemTo(msg.sender, _iTokenAmount);
    }

    function withdrawLiquidityOwner(uint _iTokenAmount) external onlyOwner returns (uint256) {
        return moneyMarket.redeemTo(msg.sender, _iTokenAmount);
    }

    function addCollateral(FlowProtocol _protocol, FlowToken token, uint baseTokenAmount) external onlyOwner {
        _protocol.addCollateral(token, address(this), baseTokenAmount);
    }

    function withdrawCollateral(FlowProtocol _protocol, FlowToken token) external onlyOwner {
        _protocol.withdrawCollateral(token);
    }

    function getLiquidity() external override returns (uint256) {
        return moneyMarket.totalHoldings();
    }
}
