pragma solidity ^0.6.4;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "../../libs/upgrades/UpgradeOwnable.sol";
import "../../interfaces/MarginLiquidityPoolInterface.sol";

import "../LiquidityPool.sol";
import "./MarginFlowProtocol.sol";
import "./MarginFlowProtocolSafety.sol";

contract MarginLiquidityPool is Initializable, UpgradeOwnable, LiquidityPool, MarginLiquidityPoolInterface {
    mapping (address => mapping (address => bool)) public override allowedTokens;
    mapping (address => mapping (address => uint256)) public override spreadsPerTokenPair;

    modifier onlyProtocol() {
        require(msg.sender == protocol, "Ownable: caller is not the protocol");
        _;
    }

    function setSpreadForPair(address _baseToken, address _quoteToken, uint256 _value) external override onlyOwner {
        spreadsPerTokenPair[_baseToken][_quoteToken] = _value;

        emit SpreadUpdated(_baseToken, _quoteToken, _value);
    }

    function depositLiquidity(uint _baseTokenAmount) external override returns (uint256) {
        moneyMarket.baseToken().safeTransferFrom(msg.sender, address(this), _baseTokenAmount);
        moneyMarket.baseToken().approve(address(moneyMarket), _baseTokenAmount);

        return moneyMarket.mint(_baseTokenAmount);
    }

    function approveLiquidityToProtocol(uint _iTokenAmount) external override onlyProtocol returns (uint256) {
        moneyMarket.iToken().safeIncreaseAllowance(protocol, _iTokenAmount);        
    }

    function withdrawLiquidityOwner(uint _iTokenAmount) external override onlyOwner returns (uint256) {
        uint256 baseTokenAmount = moneyMarket.redeemTo(msg.sender, _iTokenAmount);
        require(
            MarginFlowProtocol(protocol).safetyProtocol().isPoolSafe(MarginLiquidityPoolInterface(this)),
            "Pool not safe after withdrawal"
        );

        return baseTokenAmount;
    }

    function getLiquidity() external override returns (uint256) {
        return moneyMarket.iToken().balanceOf(address(this));
    }

    function getBidSpread(address _baseToken, address _quoteToken) external view override returns (uint256) {
        return _getSpread(_baseToken, _quoteToken);
    }

    function getAskSpread(address _baseToken, address _quoteToken) external view override returns (uint256) {
        return _getSpread(_baseToken, _quoteToken);
    }

    function enableToken(address _baseToken, address _quoteToken, uint256 _spread) external override onlyOwner {
        allowedTokens[_baseToken][_quoteToken] = true;
        spreadsPerTokenPair[_baseToken][_quoteToken] = _spread;
    }

    function disableToken(address _baseToken, address _quoteToken) external override onlyOwner {
        allowedTokens[_baseToken][_quoteToken] = false;
        spreadsPerTokenPair[_baseToken][_quoteToken] = 0;
    }

    function _getSpread(address _baseToken, address _quoteToken) private view returns (uint256) {
        if (allowedTokens[_baseToken][_quoteToken] && spreadsPerTokenPair[_baseToken][_quoteToken] > 0) {
            return spreadsPerTokenPair[_baseToken][_quoteToken];
        }

        return 0;
    }
}