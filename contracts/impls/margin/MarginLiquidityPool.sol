// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SignedSafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";

import "../../interfaces/MarginLiquidityPoolInterface.sol";

import "../LiquidityPool.sol";
import "./MarginFlowProtocol.sol";
import "./MarginFlowProtocolConfig.sol";
import "./MarginFlowProtocolSafety.sol";

contract MarginLiquidityPool is Initializable, OwnableUpgradeSafe, LiquidityPool, MarginLiquidityPoolInterface {
    using SignedSafeMath for int256;

    mapping(address => mapping(address => bool)) public override allowedTokens;
    mapping(address => mapping(address => int256)) private swapRatesMarkups;
    mapping(address => mapping(address => uint256)) public override spreadsPerTokenPair;

    uint256 public override minLeverage;
    uint256 public override maxLeverage;
    uint256 public override minLeverageAmount;

    modifier onlyProtocol() {
        require(msg.sender == protocol, "Ownable: caller is not the protocol");
        _;
    }

    modifier onlyProtocolSafety() {
        (, , , , MarginFlowProtocolSafety safety, , , , ) = MarginFlowProtocol(protocol).market();
        require(msg.sender == address(safety), "Ownable: caller is not the protocol safety");
        _;
    }

    function initialize(
        MoneyMarketInterface _moneyMarket,
        address _protocol,
        uint256 _initialMinLeverage,
        uint256 _initialMaxLeverage,
        uint256 _initialMinLeverageAmount
    ) public virtual initializer {
        LiquidityPool.initialize(_moneyMarket, _protocol);

        minLeverage = _initialMinLeverage;
        maxLeverage = _initialMaxLeverage;
        minLeverageAmount = _initialMinLeverageAmount;
    }

    function setSpreadForPair(
        address _baseToken,
        address _quoteToken,
        uint256 _value
    ) external override onlyOwner {
        spreadsPerTokenPair[_baseToken][_quoteToken] = _value;

        emit SpreadUpdated(_baseToken, _quoteToken, _value);
    }

    function depositLiquidity(uint256 _baseTokenAmount) external override returns (uint256) {
        moneyMarket.baseToken().safeTransferFrom(msg.sender, address(this), _baseTokenAmount);
        moneyMarket.baseToken().approve(address(moneyMarket), _baseTokenAmount);

        return moneyMarket.mint(_baseTokenAmount);
    }

    function increaseAllowanceForProtocol(uint256 _iTokenAmount) external override onlyProtocol {
        moneyMarket.iToken().safeIncreaseAllowance(protocol, _iTokenAmount);
    }

    function increaseAllowanceForProtocolSafety(uint256 _iTokenAmount) external override onlyProtocolSafety {
        (, , , , MarginFlowProtocolSafety safety, , , , ) = MarginFlowProtocol(protocol).market();
        address safetyProtocol = address(safety);
        moneyMarket.iToken().safeIncreaseAllowance(safetyProtocol, _iTokenAmount);
    }

    function withdrawLiquidityOwner(uint256 _iTokenAmount) external override onlyOwner returns (uint256) {
        (, , , , MarginFlowProtocolSafety safety, , , , ) = MarginFlowProtocol(protocol).market();
        int256 protocolBalance = MarginFlowProtocol(protocol).balances(this, address(this));
        if (protocolBalance > 0) {
            MarginFlowProtocol(protocol).withdrawForPool(uint256(protocolBalance));
        }

        uint256 baseTokenAmount = moneyMarket.redeemTo(msg.sender, _iTokenAmount);
        require(safety.isPoolSafe(MarginLiquidityPoolInterface(this)), "Pool not safe after withdrawal");

        return baseTokenAmount;
    }

    function getLiquidity() external override view returns (uint256) {
        return moneyMarket.iToken().balanceOf(address(this));
    }

    function getBidSpread(address _baseToken, address _quoteToken) external override view returns (uint256) {
        return _getSpread(_baseToken, _quoteToken);
    }

    function getAskSpread(address _baseToken, address _quoteToken) external override view returns (uint256) {
        return _getSpread(_baseToken, _quoteToken);
    }

    function enableToken(
        address _baseToken,
        address _quoteToken,
        uint256 _spread,
        int256 _newSwapRateMarkup
    ) external override onlyOwner {
        require(_spread != 0, "0");

        allowedTokens[_baseToken][_quoteToken] = true;
        spreadsPerTokenPair[_baseToken][_quoteToken] = _spread;
        swapRatesMarkups[_baseToken][_quoteToken] = _newSwapRateMarkup;
    }

    function disableToken(address _baseToken, address _quoteToken) external override onlyOwner {
        allowedTokens[_baseToken][_quoteToken] = false;
        spreadsPerTokenPair[_baseToken][_quoteToken] = 0;
    }

    /**
     * @dev Set new minimum leverage, only for the owner.
     * @param _newMinLeverage The new minimum leverage.
     */
    function setMinLeverage(uint256 _newMinLeverage) external override onlyOwner {
        require(_newMinLeverage > 0, "0");
        minLeverage = _newMinLeverage;
    }

    /**
     * @dev Set new maximum leverage, only for the owner.
     * @param _newMaxLeverage The new maximum leverage.
     */
    function setMaxLeverage(uint256 _newMaxLeverage) external override onlyOwner {
        require(_newMaxLeverage > 0, "0");
        maxLeverage = _newMaxLeverage;
    }

    /**
     * @dev Set new minimum leverage amount, only for the owner.
     * @param _newMinLeverageAmount The new minimum leverage amount.
     */
    function setMinLeverageAmount(uint256 _newMinLeverageAmount) external override onlyOwner {
        require(_newMinLeverageAmount > 0, "0");
        minLeverageAmount = _newMinLeverageAmount;
    }

    /**
     * @dev Set new swap rate for token pair, only for the owner.
     * @param _base The base token.
     * @param _quote The quote token.
     * @param _newSwapRateMarkup The new swap rate as percentage for longs.
     */
    function setCurrentSwapRateMarkupForPair(
        address _base,
        address _quote,
        int256 _newSwapRateMarkup
    ) external override onlyOwner {
        swapRatesMarkups[_base][_quote] = _newSwapRateMarkup;
    }

    function getSwapRateMarkupForPair(address _baseToken, address _quoteToken) external override view returns (int256) {
        return swapRatesMarkups[_baseToken][_quoteToken];
    }

    function _getSpread(address _baseToken, address _quoteToken) private view returns (uint256) {
        if (allowedTokens[_baseToken][_quoteToken] && spreadsPerTokenPair[_baseToken][_quoteToken] > 0) {
            return spreadsPerTokenPair[_baseToken][_quoteToken];
        }

        return 0;
    }
}
