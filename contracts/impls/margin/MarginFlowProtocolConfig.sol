pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2; // not experimental anymore

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SignedSafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";

import "../../libs/Percentage.sol";
import "../../interfaces/MarginLiquidityPoolInterface.sol";
import "./MarginFlowProtocol.sol";

contract MarginFlowProtocolConfig is Initializable, OwnableUpgradeSafe {
    using SignedSafeMath for int256;

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

    uint256 public traderMarginCallDeposit;
    uint256 public traderLiquidationDeposit;
    uint256 public poolMarginCallDeposit;
    uint256 public poolLiquidationDeposit;
    uint256 public maxSpread;

    mapping (address => mapping(address => uint256)) public currentSwapUnits;
    mapping (address => mapping(address => mapping (PositionType => int256))) private currentSwapRates;
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
        uint256 _initialTraderRiskMarginCallThreshold,
        uint256 _initialTraderRiskLiquidateThreshold,
        uint256 _initialLiquidityPoolENPMarginThreshold,
        uint256 _initialLiquidityPoolELLMarginThreshold,
        uint256 _initialLiquidityPoolENPLiquidateThreshold,
        uint256 _initialLiquidityPoolELLLiquidateThreshold
    ) public initializer {
        OwnableUpgradeSafe.__Ownable_init();

        maxSpread = _maxSpread;

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
        currentSwapRates[_base][_quote][PositionType.LONG] = _newSwapRateLong;
        currentSwapRates[_base][_quote][PositionType.SHORT] = _newSwapRateShort;
    }

    function setMaxSpread(uint256 _maxSpread) external onlyOwner {
        maxSpread = _maxSpread;
    }

    /**
     * @dev Add new trading pair, only for the owner.
     * @param _base The base token.
     * @param _quote The quote token.
     * @param _swapUnit The swap unit.
     * @param _swapRateLong The swap rate as percentage for longs.
     * @param _swapRateShort The swap rate as percentage for shorts.
     */
    function addTradingPair(address _base, address _quote, uint256 _swapUnit, int256 _swapRateLong, int256 _swapRateShort) external onlyOwner {
        require(_base != address(0) && _quote != address(0) && _swapUnit != 0 && _swapRateLong != 0 && _swapRateShort != 0, "0");
        require(!tradingPairWhitelist[_base][_quote], "TP2");
        require(_base != _quote, "TP3");

        currentSwapUnits[_base][_quote] = _swapUnit;
        currentSwapRates[_base][_quote][PositionType.LONG] = _swapRateLong;
        currentSwapRates[_base][_quote][PositionType.SHORT] = _swapRateShort;
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

    function getCurrentTotalSwapRateForPoolAndPair(
        MarginLiquidityPoolInterface _pool,
        MarginFlowProtocol.TradingPair calldata _pair,
        PositionType _type
    ) external view returns (Percentage.SignedPercent memory) {
        int256 baseSwapRate = currentSwapRates[_pair.base][_pair.quote][_type];
        int256 poolMarkup = _pool.getSwapRateMarkupForPair(_pair.base, _pair.quote);

        return Percentage.SignedPercent(baseSwapRate.add(poolMarkup));
    }
}