pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2; // not experimental anymore

import "@openzeppelin/upgrades/contracts/Initializable.sol";

import "../../libs/Percentage.sol";
import "../../libs/upgrades/UpgradeOwnable.sol";
import "./MarginFlowProtocol.sol";

contract MarginFlowProtocolConfig is Initializable, UpgradeOwnable {
    enum PositionType {
        LONG,
        SHORT
    }

    /**
     * @dev Event for new trading pair being added.
     * @param base The base token
     * @param quote The quote token
     */
    event NewTradingPair(address indexed base, address indexed quote);

    uint256 public maxSpread;
    uint256 public minLeverage;
    uint256 public maxLeverage;
    uint256 public minLeverageAmount;
    uint256 public swapRateUnit;

    mapping (address => mapping(address => mapping (PositionType => Percentage.SignedPercent))) public currentSwapRates;
    mapping(address => mapping (address => bool)) public tradingPairWhitelist;

    MarginFlowProtocol.TradingPair[] private tradingPairs;

    Percentage.Percent public traderRiskMarginCallThreshold;
    Percentage.Percent public traderRiskLiquidateThreshold;
    uint256 public liquidityPoolENPMarginThreshold;
    uint256 public liquidityPoolELLMarginThreshold;
    uint256 public liquidityPoolENPLiquidateThreshold;
    uint256 public liquidityPoolELLLiquidateThreshold;

    function initialize(
        uint256 _maxSpread,
        uint256 _initialMinLeverage,
        uint256 _initialMaxLeverage,
        uint256 _initialMinLeverageAmount,
        uint256 _swapRateUnit,
        uint256 _initialTraderRiskMarginCallThreshold,
        uint256 _initialTraderRiskLiquidateThreshold,
        uint256 _initialLiquidityPoolENPMarginThreshold,
        uint256 _initialLiquidityPoolELLMarginThreshold,
        uint256 _initialLiquidityPoolENPLiquidateThreshold,
        uint256 _initialLiquidityPoolELLLiquidateThreshold
    ) public initializer {
        UpgradeOwnable.initialize(msg.sender);

        maxSpread = _maxSpread;
        minLeverage = _initialMinLeverage;
        maxLeverage = _initialMaxLeverage;
        minLeverageAmount = _initialMinLeverageAmount;
        swapRateUnit = _swapRateUnit;

        liquidityPoolENPMarginThreshold = _initialLiquidityPoolENPMarginThreshold;
        liquidityPoolELLMarginThreshold = _initialLiquidityPoolELLMarginThreshold;
        liquidityPoolENPLiquidateThreshold = _initialLiquidityPoolENPLiquidateThreshold;
        liquidityPoolELLLiquidateThreshold = _initialLiquidityPoolELLLiquidateThreshold;
        traderRiskMarginCallThreshold = Percentage.Percent(
            _initialTraderRiskMarginCallThreshold
        );
        traderRiskLiquidateThreshold = Percentage.Percent(
            _initialTraderRiskLiquidateThreshold
        );
    }

    /**
     * @dev Set new swap rate for token pair, only for the owner.
     * @param _base The base token.
     * @param _quote The quote token.
     * @param _newSwapRateLong The new swap rate as percentage for longs.
     * @param _newSwapRateShort The new swap rate as percentage for shorts.
     */
    function setCurrentSwapRateForPair(address _base, address _quote, int256 _newSwapRateLong, int256 _newSwapRateShort) external onlyOwner {
        require(_newSwapRateLong != 0 && _newSwapRateShort != 0, "0");
        currentSwapRates[_base][_quote][PositionType.LONG] = Percentage.SignedPercent(_newSwapRateLong);
        currentSwapRates[_base][_quote][PositionType.SHORT] = Percentage.SignedPercent(_newSwapRateShort);
    }

    /**
     * @dev Set new minimum leverage, only for the owner.
     * @param _newMinLeverage The new minimum leverage.
     */
    function setMinLeverage(uint256 _newMinLeverage) external onlyOwner {
        require(_newMinLeverage > 0, "0");
        minLeverage = _newMinLeverage;
    }

    /**
     * @dev Set new maximum leverage, only for the owner.
     * @param _newMaxLeverage The new maximum leverage.
     */
    function setMaxLeverage(uint256 _newMaxLeverage) external onlyOwner {
        require(_newMaxLeverage > 0, "0");
        maxLeverage = _newMaxLeverage;
    }

    /**
     * @dev Set new minimum leverage amount, only for the owner.
     * @param _newMinLeverageAmount The new minimum leverage amount.
     */
    function setMinLeverageAmount(uint256 _newMinLeverageAmount) external onlyOwner {
        require(_newMinLeverageAmount > 0, "0");
        minLeverageAmount = _newMinLeverageAmount;
    }

    function setMaxSpread(uint256 _maxSpread) external onlyOwner {
        maxSpread = _maxSpread;
    }

    /**
     * @dev Add new trading pair, only for the owner.
     * @param _base The base token.
     * @param _quote The quote token.
     * @param _swapRateLong The swap rate as percentage for longs.
     * @param _swapRateShort The swap rate as percentage for shorts.
     */
    function addTradingPair(address _base, address _quote, int256 _swapRateLong, int256 _swapRateShort) external onlyOwner {
        require(_base != address(0) && _quote != address(0) && _swapRateLong != 0 && _swapRateShort != 0, "0");
        require(_base != _quote, "TP3");
        require(!tradingPairWhitelist[_base][_quote], "TP2");

        currentSwapRates[_base][_quote][PositionType.LONG] = Percentage.SignedPercent(_swapRateLong);
        currentSwapRates[_base][_quote][PositionType.SHORT] = Percentage.SignedPercent(_swapRateShort);
        tradingPairWhitelist[_base][_quote] = true;

        tradingPairs.push(MarginFlowProtocol.TradingPair(_base, _quote));

        emit NewTradingPair(_base, _quote);
    }

     /**
     * @dev Set new trader risk threshold for trader margin calls, only set by owner.
     * @param _newTraderRiskMarginCallThreshold The new trader risk threshold as percentage.
     */
    function setTraderRiskMarginCallThreshold(
        uint256 _newTraderRiskMarginCallThreshold
    ) external onlyOwner {
        require(_newTraderRiskMarginCallThreshold > 0, "0");
        traderRiskMarginCallThreshold = Percentage.Percent(
            _newTraderRiskMarginCallThreshold
        );
    }

    /**
     * @dev Set new trader risk threshold for trader liquidation, only set by owner.
     * @param _newTraderRiskLiquidateThreshold The new trader risk threshold as percentage.
     */
    function setTraderRiskLiquidateThreshold(
        uint256 _newTraderRiskLiquidateThreshold
    ) external onlyOwner {
        require(_newTraderRiskLiquidateThreshold > 0, "0");
        traderRiskLiquidateThreshold = Percentage.Percent(
            _newTraderRiskLiquidateThreshold
        );
    }

    /**
     * @dev Set new trader risk threshold, only for the owner.
     * @param _newLiquidityPoolENPMarginThreshold The new trader risk threshold.
     */
    function setLiquidityPoolENPMarginThreshold(
        uint256 _newLiquidityPoolENPMarginThreshold
    ) external onlyOwner {
        require(_newLiquidityPoolENPMarginThreshold > 0, "0");
        liquidityPoolENPMarginThreshold = _newLiquidityPoolENPMarginThreshold;
    }

    /**
     * @dev Set new trader risk threshold, only for the owner.
     * @param _newLiquidityPoolELLMarginThreshold The new trader risk threshold.
     */
    function setLiquidityPoolELLMarginThreshold(
        uint256 _newLiquidityPoolELLMarginThreshold
    ) external onlyOwner {
        require(_newLiquidityPoolELLMarginThreshold > 0, "0");
        liquidityPoolELLMarginThreshold = _newLiquidityPoolELLMarginThreshold;
    }

    /**
     * @dev Set new trader risk threshold, only for the owner.
     * @param _newLiquidityPoolENPLiquidateThreshold The new trader risk threshold.
     */
    function setLiquidityPoolENPLiquidateThreshold(
        uint256 _newLiquidityPoolENPLiquidateThreshold
    ) external onlyOwner {
        require(_newLiquidityPoolENPLiquidateThreshold > 0, "0");
        liquidityPoolENPLiquidateThreshold = _newLiquidityPoolENPLiquidateThreshold;
    }

    /**
     * @dev Set new trader risk threshold, only for the owner.
     * @param _newLiquidityPoolELLLiquidateThreshold The new trader risk threshold.
     */
    function setLiquidityPoolELLLiquidateThreshold(
        uint256 _newLiquidityPoolELLLiquidateThreshold
    ) external onlyOwner {
        require(_newLiquidityPoolELLLiquidateThreshold > 0, "0");
        liquidityPoolELLLiquidateThreshold = _newLiquidityPoolELLLiquidateThreshold;
    }

    /// View functions

    function getTradingPairs() external view returns (MarginFlowProtocol.TradingPair[] memory) {
        return tradingPairs;
    }
}