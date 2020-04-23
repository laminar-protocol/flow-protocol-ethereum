pragma solidity ^0.6.4;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "../../libs/upgrades/UpgradeOwnable.sol";
import "../../interfaces/SyntheticLiquidityPoolInterface.sol";

import "../LiquidityPool.sol";
import "./SyntheticFlowProtocol.sol";
import "./SyntheticFlowToken.sol";

contract SyntheticLiquidityPool is Initializable, UpgradeOwnable, LiquidityPool, SyntheticLiquidityPoolInterface {
    mapping (address => uint256) public override spreadsPerToken;
    mapping (address => bool) public override allowedTokens;

    uint256 public override collateralRatio;

    function initialize(MoneyMarketInterface _moneyMarket, address _protocol) public override initializer {
        LiquidityPool.initialize(_moneyMarket, _protocol);
        collateralRatio = 0; // use fToken default        
    }

    function getBidSpread(address _fToken) external view override returns (uint256) {
        if (allowedTokens[_fToken] && spreadsPerToken[_fToken] > 0) {
            return spreadsPerToken[_fToken];
        }

        return 0;
    }

    function getAskSpread(address _fToken) external view override returns (uint256) {
        if (allowedTokens[_fToken] && spreadsPerToken[_fToken] > 0) {
            return spreadsPerToken[_fToken];
        }

        return 0;
    }

    function getAdditionalCollateralRatio(address fToken) external view override returns (uint256) {
        if (allowedTokens[fToken]) {
            return collateralRatio;
        }
        return 0;
    }

    function setSpreadForToken(address _token, uint256 _value) external override onlyOwner {
        require(_value > 0, "Spread is 0");
        spreadsPerToken[_token] = _value;

        emit SpreadUpdated(_token, _value);
    }

    function setCollateralRatio(uint256 _value) external override onlyOwner {
        collateralRatio = _value;

        emit AdditionalCollateralRatioUpdated();
    }

    function enableToken(address _token, uint256 _spread) external override onlyOwner {
        require(_spread > 0, "Spread is 0");

        allowedTokens[_token] = true;
        spreadsPerToken[_token] = _spread;
    }

    function disableToken(address _token) external override onlyOwner {
        allowedTokens[_token] = false;
        spreadsPerToken[_token] = 0;
    }

    function addCollateral(SyntheticFlowProtocol _protocol, SyntheticFlowToken _token, uint256 _baseTokenAmount) external override onlyOwner {
        _protocol.addCollateral(_token, address(this), _baseTokenAmount);
    }

    function withdrawCollateral(SyntheticFlowProtocol _protocol, SyntheticFlowToken _token) external override onlyOwner {
        _protocol.withdrawCollateral(_token);
    }
}