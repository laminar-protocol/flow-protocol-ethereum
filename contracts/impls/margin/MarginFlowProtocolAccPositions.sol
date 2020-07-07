// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2; // not experimental anymore

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SignedSafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/Math.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";

import "../../libs/Percentage.sol";

import "../../interfaces/PriceOracleInterface.sol";
import "../../interfaces/MoneyMarketInterface.sol";
import "../../interfaces/MarginLiquidityPoolInterface.sol";

import "./MarginLiquidityPoolRegistry.sol";
import "./MarginFlowProtocolConfig.sol";
import "./MarginFlowProtocolSafety.sol";
import "./MarginMarketLib.sol";

contract MarginFlowProtocolAccPositions is Initializable, ReentrancyGuardUpgradeSafe {
    using Percentage for uint256;
    using Percentage for int256;
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using MarginMarketLib for MarginMarketLib.MarketData;

    enum CurrencyType {USD, BASE, QUOTE}

    int256 private constant MAX_INT = type(int256).max;
    MarginMarketLib.MarketData private market;

    // pools
    mapping(MarginLiquidityPoolInterface => mapping(address => mapping(address => mapping(CurrencyType => uint256))))
        public poolLongPositionAccPerPair;
    mapping(MarginLiquidityPoolInterface => mapping(address => mapping(address => mapping(CurrencyType => uint256))))
        public poolShortPositionAccPerPair;

    // traders
    mapping(MarginLiquidityPoolInterface => mapping(address => uint256)) public traderPositionAccMarginHeld;
    mapping(MarginLiquidityPoolInterface => mapping(address => mapping(address => mapping(address => mapping(CurrencyType => uint256)))))
        public traderLongPositionAccPerPair;
    mapping(MarginLiquidityPoolInterface => mapping(address => mapping(address => mapping(address => mapping(CurrencyType => uint256)))))
        public traderShortPositionAccPerPair;

    /**
     * @dev Initialize the MarginFlowProtocolLiquidated.
     * @param _market The market data.
     */
    function initialize(MarginMarketLib.MarketData memory _market) public initializer {
        ReentrancyGuardUpgradeSafe.__ReentrancyGuard_init();
        market = _market;
    }

    /**
     * @dev Receive current pair safety values for pool.
     * @param _pool The MarginLiquidityPool.
     * @param _pair The trading pair.
     */
    function getPairPoolSafetyInfo(MarginLiquidityPoolInterface _pool, MarginFlowProtocol.TradingPair calldata _pair)
        external
        returns (
            uint256,
            uint256,
            int256
        )
    {
        return
            market.getPairPoolSafetyInfo(
                _pool,
                _pair,
                [
                    poolLongPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.BASE],
                    poolShortPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.BASE],
                    poolLongPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.QUOTE],
                    poolShortPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.QUOTE]
                ]
            );
    }

    /**
     * @dev Receive current unrealized for trader for trading pair.
     * @param _pool The MarginLiquidityPool.
     * @param _trader The trader.
     * @param _pair The trading pair.
     */
    function getPairTraderUnrealized(
        MarginLiquidityPoolInterface _pool,
        address _trader,
        MarginFlowProtocol.TradingPair calldata _pair
    ) external returns (int256) {
        return
            market.getUnrealizedForPair(
                _pool,
                _pair,
                [
                    traderLongPositionAccPerPair[_pool][_trader][_pair.base][_pair.quote][CurrencyType.BASE],
                    traderShortPositionAccPerPair[_pool][_trader][_pair.base][_pair.quote][CurrencyType.BASE],
                    traderLongPositionAccPerPair[_pool][_trader][_pair.base][_pair.quote][CurrencyType.QUOTE],
                    traderShortPositionAccPerPair[_pool][_trader][_pair.base][_pair.quote][CurrencyType.QUOTE]
                ]
            );
    }

    /**
     * @dev Receive current net for trader for trading pair.
     * @param _pool The MarginLiquidityPool.
     * @param _trader The trader.
     * @param _pair The trading pair.
     */
    function getPairTraderNet(
        MarginLiquidityPoolInterface _pool,
        address _trader,
        MarginFlowProtocol.TradingPair calldata _pair
    ) external returns (uint256) {
        return
            market.getNet(
                _pair,
                traderLongPositionAccPerPair[_pool][_trader][_pair.base][_pair.quote][CurrencyType.QUOTE],
                traderShortPositionAccPerPair[_pool][_trader][_pair.base][_pair.quote][CurrencyType.QUOTE]
            );
    }

    // Protocol functions

    function __updateAccumulatedPositions(MarginFlowProtocol.Position memory _position, bool _isAddition) external {
        require(msg.sender == address(market.marginProtocol), "P1");

        MarginLiquidityPoolInterface pool = _position.pool;
        address owner = _position.owner;
        address base = _position.pair.base;
        address quote = _position.pair.quote;

        uint256 leveragedHeld = _position.leverage > 0 ? uint256(_position.leveragedHeld) : uint256(-_position.leveragedHeld);
        uint256 leveragedDebits = _position.leverage > 0 ? uint256(-_position.leveragedDebits) : uint256(_position.leveragedDebits);

        traderPositionAccMarginHeld[pool][owner] = _isAddition
            ? traderPositionAccMarginHeld[pool][owner].add(_position.marginHeld)
            : traderPositionAccMarginHeld[pool][owner].sub(_position.marginHeld);

        if (_isAddition && _position.leverage > 0) {
            _addToAccPositions(poolLongPositionAccPerPair, traderLongPositionAccPerPair, pool, owner, base, quote, leveragedHeld, leveragedDebits);
        } else if (_isAddition) {
            _addToAccPositions(poolShortPositionAccPerPair, traderShortPositionAccPerPair, pool, owner, base, quote, leveragedHeld, leveragedDebits);
        } else if (_position.leverage > 0) {
            _subFromAccPositions(poolLongPositionAccPerPair, traderLongPositionAccPerPair, pool, owner, base, quote, leveragedHeld, leveragedDebits);
        } else {
            _subFromAccPositions(
                poolShortPositionAccPerPair,
                traderShortPositionAccPerPair,
                pool,
                owner,
                base,
                quote,
                leveragedHeld,
                leveragedDebits
            );
        }
    }

    // Internal functions

    function _addToAccPositions(
        mapping(MarginLiquidityPoolInterface => mapping(address => mapping(address => mapping(CurrencyType => uint256)))) storage _poolPositions,
        mapping(MarginLiquidityPoolInterface => mapping(address => mapping(address => mapping(address => mapping(CurrencyType => uint256)))))
            storage _traderPositions,
        MarginLiquidityPoolInterface _pool,
        address _owner,
        address _base,
        address _quote,
        uint256 _leveragedHeld,
        uint256 _leveragedDebits
    ) private {
        _poolPositions[_pool][_base][_quote][CurrencyType.BASE] = _poolPositions[_pool][_base][_quote][CurrencyType.BASE].add(_leveragedHeld);
        _poolPositions[_pool][_base][_quote][CurrencyType.QUOTE] = _poolPositions[_pool][_base][_quote][CurrencyType.QUOTE].add(_leveragedDebits);
        _traderPositions[_pool][_owner][_base][_quote][CurrencyType.BASE] = _traderPositions[_pool][_owner][_base][_quote][CurrencyType.BASE].add(
            _leveragedHeld
        );
        _traderPositions[_pool][_owner][_base][_quote][CurrencyType.QUOTE] = _traderPositions[_pool][_owner][_base][_quote][CurrencyType.QUOTE].add(
            _leveragedDebits
        );
    }

    function _subFromAccPositions(
        mapping(MarginLiquidityPoolInterface => mapping(address => mapping(address => mapping(CurrencyType => uint256)))) storage _poolPositions,
        mapping(MarginLiquidityPoolInterface => mapping(address => mapping(address => mapping(address => mapping(CurrencyType => uint256)))))
            storage _traderPositions,
        MarginLiquidityPoolInterface _pool,
        address _owner,
        address _base,
        address _quote,
        uint256 _leveragedHeld,
        uint256 _leveragedDebits
    ) private {
        _poolPositions[_pool][_base][_quote][CurrencyType.BASE] = _poolPositions[_pool][_base][_quote][CurrencyType.BASE].sub(_leveragedHeld);
        _poolPositions[_pool][_base][_quote][CurrencyType.QUOTE] = _poolPositions[_pool][_base][_quote][CurrencyType.QUOTE].sub(_leveragedDebits);
        _traderPositions[_pool][_owner][_base][_quote][CurrencyType.BASE] = _traderPositions[_pool][_owner][_base][_quote][CurrencyType.BASE].sub(
            _leveragedHeld
        );
        _traderPositions[_pool][_owner][_base][_quote][CurrencyType.QUOTE] = _traderPositions[_pool][_owner][_base][_quote][CurrencyType.QUOTE].sub(
            _leveragedDebits
        );
    }
}
