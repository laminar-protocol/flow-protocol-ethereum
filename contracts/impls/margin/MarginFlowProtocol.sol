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

contract MarginFlowProtocol is Initializable, ReentrancyGuardUpgradeSafe {
    using Percentage for uint256;
    using Percentage for int256;
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using MarginMarketLib for MarginMarketLib.MarketData;

    struct TradingPair {
        address base;
        address quote;
    }

    struct Position {
        uint256 id;
        address owner;
        MarginLiquidityPoolInterface pool;
        TradingPair pair;
        int256 leverage;
        int256 leveragedHeld;
        int256 leveragedDebits;
        uint256 marginHeld;
        Percentage.SignedPercent swapRate;
        uint256 timeWhenOpened;
    }

    /**
     * @dev Event for deposits.
     * @param sender The sender
     * @param liquidityPool The MarginLiquidityPool
     * @param liquidityPool The MarginLiquidityPool
     * @param baseToken The base token
     * @param quoteToken The quote token
     * @param leverage The leverage, e.g., 20x
     * @param leveragedDebitsInUsd The base token amount to open position
     * @param price The max/min price for opening, 0 means accept all.
     */
    event PositionOpened(
        uint256 positionId,
        address indexed sender,
        address indexed liquidityPool,
        address indexed baseToken,
        address quoteToken,
        int256 leverage,
        int256 leveragedDebitsInUsd,
        uint256 price
    );

    /**
     * @dev Event for deposits.
     * @param sender The sender
     * @param liquidityPool The MarginLiquidityPool
     * @param baseToken The base token
     * @param quoteToken The quote token
     * @param realizedPl The realized profit or loss after closing
     * @param positionId The position id
     * @param price The max/min price for closing, 0 means accept all.
     */
    event PositionClosed(
        uint256 positionId,
        address indexed sender,
        address indexed liquidityPool,
        address indexed baseToken,
        address quoteToken,
        int256 realizedPl,
        uint256 price
    );

    /**
     * @dev Event for deposits.
     * @param sender The sender
     * @param amount The amount
     */
    event Deposited(MarginLiquidityPoolInterface pool, address indexed sender, uint256 amount);

    /**
     * @dev Event for withdrawals.
     * @param sender The sender
     * @param amount The amount
     */
    event Withdrew(MarginLiquidityPoolInterface pool, address indexed sender, uint256 amount);

    /**
     * @dev Event for withdrawals of stopped pools.
     * @param sender The sender
     * @param amount The amount
     */
    event WithdrewStoppedPool(MarginLiquidityPoolInterface pool, address indexed sender, uint256 amount);

    MarginMarketLib.MarketData public market;

    // positions
    mapping(uint256 => Position) internal positionsById;
    mapping(MarginLiquidityPoolInterface => mapping(address => Position[])) public positionsByPoolAndTrader;
    mapping(MarginLiquidityPoolInterface => Position[]) public positionsByPool;

    // protocol state
    mapping(MarginLiquidityPoolInterface => mapping(address => int256)) public balances;
    mapping(MarginLiquidityPoolInterface => mapping(address => bool)) public traderIsMarginCalled;

    uint256 public nextPositionId;
    int256 private constant MAX_INT = type(int256).max;
    uint256 private constant MAX_UINT = type(uint256).max;

    modifier poolIsVerifiedAndRunning(MarginLiquidityPoolInterface _pool) {
        require(market.liquidityPoolRegistry.isVerifiedPool(_pool), "LR1");
        require(!market.protocolLiquidated.stoppedPools(_pool), "LR2");

        _;
    }

    /**
     * @dev Initialize the MarginFlowProtocol.
     * @param _oracle The price oracle
     * @param _moneyMarket The money market.
     * @param _protocolSafety The _protocolSafety.
     * @param _liquidityPoolRegistry The liquidity pool registry.
     */
    function initialize(
        PriceOracleInterface _oracle,
        MoneyMarketInterface _moneyMarket,
        MarginFlowProtocolConfig _protocolConfig,
        MarginFlowProtocolSafety _protocolSafety,
        MarginFlowProtocolLiquidated _protocolLiquidated,
        MarginFlowProtocolAccPositions _protocolAcc,
        MarginLiquidityPoolRegistry _liquidityPoolRegistry
    ) external initializer {
        ReentrancyGuardUpgradeSafe.__ReentrancyGuard_init();
        _moneyMarket.baseToken().safeApprove(address(_moneyMarket), MAX_UINT);

        market = MarginMarketLib.MarketData(
            this,
            _moneyMarket,
            _oracle,
            _protocolConfig,
            _protocolSafety,
            _protocolLiquidated,
            _protocolAcc,
            _liquidityPoolRegistry,
            address(_moneyMarket.baseToken())
        );
    }

    /**
     * @dev Deposit amount to pool balance.
     * @param _pool The MarginLiquidityPool.
     * @param _baseTokenAmount The base token amount to deposit.
     */
    function deposit(MarginLiquidityPoolInterface _pool, uint256 _baseTokenAmount) external nonReentrant poolIsVerifiedAndRunning(_pool) {
        require(_baseTokenAmount > 0, "0");

        market.moneyMarket.baseToken().safeTransferFrom(msg.sender, address(this), _baseTokenAmount);
        market.moneyMarket.baseToken().approve(address(market.moneyMarket), _baseTokenAmount);

        uint256 iTokenAmount = market.moneyMarket.mint(_baseTokenAmount);
        balances[_pool][msg.sender] = balances[_pool][msg.sender].add(int256(iTokenAmount));

        emit Deposited(_pool, msg.sender, _baseTokenAmount);
    }

    /**
     * @dev Withdraw amount from pool balance. Automatically withdraws trader deposits when withdrawing all funds.
     * @param _pool The MarginLiquidityPool.
     * @param _iTokenAmount The iToken amount to withdraw.
     */
    function withdraw(MarginLiquidityPoolInterface _pool, uint256 _iTokenAmount) external nonReentrant {
        require(market.liquidityPoolRegistry.isVerifiedPool(_pool), "LR1");
        uint256 baseTokenAmount = market.moneyMarket.redeemTo(msg.sender, _iTokenAmount);

        if (market.protocolLiquidated.stoppedPools(_pool) || market.protocolLiquidated.stoppedTradersInPool(_pool, msg.sender)) {
            require(positionsByPoolAndTrader[_pool][msg.sender].length == 0, "W2");
        }

        require(
            market.getEstimatedFreeMargin(
                _pool,
                msg.sender,
                market.protocolAcc.traderPositionAccMarginHeld(_pool, msg.sender),
                balances[_pool][msg.sender]
            ) >= baseTokenAmount,
            "W1"
        );
        require(baseTokenAmount > 0, "0");
        balances[_pool][msg.sender] = balances[_pool][msg.sender].sub(int256(_iTokenAmount));

        if (positionsByPoolAndTrader[_pool][msg.sender].length == 0 && balances[_pool][msg.sender] == 0) {
            // withdraw trader deposits if no more money left otherwise
            if (market.protocolSafety.traderHasPaidDeposits(_pool, msg.sender)) {
                market.protocolSafety.__withdrawTraderDeposits(_pool, msg.sender);
            }
        }

        emit Withdrew(_pool, msg.sender, baseTokenAmount);
    }

    /**
     * @dev Withdraw amount from pool balance for pool. Moves iTokens back to the pool.
     * @param _iTokenAmount The iToken amount to withdraw.
     */
    function withdrawForPool(uint256 _iTokenAmount) external nonReentrant {
        MarginLiquidityPoolInterface pool = MarginLiquidityPoolInterface(msg.sender);

        require(_iTokenAmount > 0, "0");
        require(market.liquidityPoolRegistry.isVerifiedPool(pool), "LR1");
        require(!market.protocolLiquidated.stoppedPools(pool) || positionsByPool[pool].length == 0, "LR2");
        require(int256(_iTokenAmount) <= balances[pool][msg.sender], "WP1");

        balances[pool][msg.sender] = balances[pool][msg.sender].sub(int256(_iTokenAmount));
        market.moneyMarket.iToken().safeTransfer(msg.sender, _iTokenAmount);
    }

    /**
     * @dev Open a new position with a min/max price. Trader must pay deposits for first position.
     * Set price to 0 if you want to use the current market price.
     * @param _pool The MarginLiquidityPool.
     * @param _base The base token.
     * @param _quote The quote token.
     * @param _leverage The leverage number, e.g., 20x.
     * @param _leveragedHeld The leveraged held balance.
     * @param _price The max/min price when opening the position.
     */
    function openPosition(
        MarginLiquidityPoolInterface _pool,
        address _base,
        address _quote,
        int256 _leverage,
        uint256 _leveragedHeld,
        uint256 _price
    ) external nonReentrant poolIsVerifiedAndRunning(_pool) {
        require(market.config.tradingPairWhitelist(address(_base), address(_quote)), "TP1");
        require(!traderIsMarginCalled[_pool][msg.sender], "OP2");
        require(!market.liquidityPoolRegistry.isMarginCalled(_pool), "OP3");
        require((_leverage >= 0 ? uint256(_leverage) : uint256(-_leverage)) >= _pool.minLeverage(), "OP4");
        require((_leverage >= 0 ? uint256(_leverage) : uint256(-_leverage)) <= _pool.maxLeverage(), "OP5");
        require(!market.protocolLiquidated.stoppedTradersInPool(_pool, msg.sender), "OP7");

        if (!market.protocolSafety.traderHasPaidDeposits(_pool, msg.sender)) {
            // automatically pay deposits for first position
            uint256 traderMarginCallDeposit = market.moneyMarket.convertAmountFromBase(market.config.traderMarginCallDeposit());
            uint256 traderLiquidationCallDeposit = market.moneyMarket.convertAmountFromBase(market.config.traderLiquidationDeposit());
            uint256 traderLiquidationFees = traderMarginCallDeposit.add(traderLiquidationCallDeposit);

            require(balances[_pool][msg.sender] > int256(traderLiquidationFees), "OP8");

            balances[_pool][msg.sender] = balances[_pool][msg.sender].sub(int256(traderLiquidationFees));
            market.moneyMarket.iToken().transfer(address(market.protocolSafety), traderLiquidationFees);
            market.protocolSafety.__markTraderDepositsAsPaid(_pool, msg.sender, traderMarginCallDeposit, traderLiquidationCallDeposit);
        }

        // opening price
        Percentage.Percent memory debitsPrice = (_leverage > 0)
            ? market.getAskPrice(_pool, TradingPair(_base, _quote), _price)
            : market.getBidPrice(_pool, TradingPair(_base, _quote), _price);

        _insertPosition(_pool, TradingPair(_base, _quote), _leverage, _leveragedHeld, debitsPrice);
    }

    /**
     * @dev Close the given position with a min/max price. Set price to 0 if you want to use the current market price.
     * @param _positionId The id of the position to close.
     * @param _price The max/min price when closing the position..
     */
    function closePosition(
        uint256 _positionId,
        uint256 _price,
        uint256 _estimatedPoolIndex,
        uint256 _estimatedTraderIndex
    ) external nonReentrant {
        Position memory position = positionsById[_positionId];
        require(msg.sender == position.owner, "CP1");
        require(!market.protocolLiquidated.stoppedTradersInPool(position.pool, msg.sender), "CP2");

        // total PL = unrealized + swap
        (int256 unrealizedPl, Percentage.Percent memory marketPrice) = market.getUnrealizedPlAndMarketPriceOfPosition(position, _price);
        int256 accumulatedSwapRate = getAccumulatedSwapRateOfPosition(_positionId);
        int256 totalUnrealized = unrealizedPl.add(accumulatedSwapRate);

        _transferUnrealized(position.pool, position.owner, totalUnrealized, 0);
        _removePosition(position, totalUnrealized, marketPrice, _estimatedPoolIndex, _estimatedTraderIndex);
    }

    /**
     * @dev Get the exact free margin, incl. swap rates (only use as view function due to gas costs).
     * @param _pool The MarginLiquidityPool.
     * @param _trader The trader address.
     * @return The free margin amount.
     */
    function getExactFreeMargin(MarginLiquidityPoolInterface _pool, address _trader) external returns (uint256) {
        return
            market.getExactFreeMargin(
                positionsByPoolAndTrader[_pool][_trader],
                market.protocolAcc.traderPositionAccMarginHeld(_pool, _trader),
                balances[_pool][_trader]
            );
    }

    /**
     * @dev Get the exact equity of trader (only use as view function due to gas costs).
     * @param _pool The MarginLiquidityPool.
     * @param _trader The trader address.
     * @return The equity of trader.
     */
    function getExactEquityOfTrader(MarginLiquidityPoolInterface _pool, address _trader) external returns (int256) {
        // equityOfTrader = balance + unrealizedPl - accumulatedSwapRate
        return market.getExactEquityOfTrader(positionsByPoolAndTrader[_pool][_trader], balances[_pool][_trader]);
    }

    /**
     * @dev Get the unrealized profit and loss of a position based on current market price.
     * @param _positionId The position id.
     * @return The equity of trader.
     */
    function getUnrealizedPlOfPosition(uint256 _positionId) external returns (int256) {
        // unrealizedPlOfPosition = (currentPrice - openPrice) * leveragedHeld * to_usd_price
        (int256 unrealizedPl, ) = market.getUnrealizedPlAndMarketPriceOfPosition(positionsById[_positionId], 0);
        return unrealizedPl;
    }

    /**
     * @dev Get the current accumulated swap rate of a position.
     * @param _positionId The position id.
     * @return The accumulated swap rate.
     */
    function getAccumulatedSwapRateOfPosition(uint256 _positionId) public returns (int256) {
        // accumulated interest rate = rate * swap unit
        return market.getAccumulatedSwapRateOfPosition(positionsById[_positionId]);
    }

    /// View functions

    /**
     * @dev Sum of all margin held of a given trader.
     * @param _pool The MarginLiquidityPool.
     * @param _trader The trader address.
     * @return The margin held sum.
     */
    function getMarginHeld(MarginLiquidityPoolInterface _pool, address _trader) external view returns (uint256) {
        return market.protocolAcc.traderPositionAccMarginHeld(_pool, _trader);
    }

    /**
     * @dev Get the position count of a pool.
     * @param _pool The MarginLiquidityPool.
     * @return The position count.
     */
    function getPositionsByPoolLength(MarginLiquidityPoolInterface _pool) external view returns (uint256) {
        return positionsByPool[_pool].length;
    }

    /**
     * @dev Get the position by id.
     * @param _positionId The position id..
     * @return The position.
     */
    function getPositionById(uint256 _positionId) external view returns (Position memory) {
        return positionsById[_positionId];
    }

    /**
     * @dev Get all positions of a pool.
     * @param _pool The MarginLiquidityPool.
     * @return The positions.
     */
    function getPositionsByPool(MarginLiquidityPoolInterface _pool) external view returns (Position[] memory) {
        return positionsByPool[_pool];
    }

    /**
     * @dev Get the positions of a trader in a given pool.
     * @param _pool The MarginLiquidityPool.
     * @param _trader The trader.
     * @return The positions.
     */
    function getPositionsByPoolAndTrader(MarginLiquidityPoolInterface _pool, address _trader) external view returns (Position[] memory) {
        return positionsByPoolAndTrader[_pool][_trader];
    }

    /**
     * @dev Get the positions count of a trader in a given pool.
     * @param _pool The MarginLiquidityPool.
     * @param _trader The trader.
     * @return The positions count.
     */
    function getPositionsByPoolAndTraderLength(MarginLiquidityPoolInterface _pool, address _trader) external view returns (uint256) {
        return positionsByPoolAndTrader[_pool][_trader].length;
    }

    /**
     * @dev Get the position id of the n'th position of a trader in a given pool.
     * @param _pool The MarginLiquidityPool.
     * @param _trader The trader.
     * @return The position id.
     */
    function getPositionIdByPoolAndTraderAndIndex(
        MarginLiquidityPoolInterface _pool,
        address _trader,
        uint256 _index
    ) external view returns (uint256) {
        return positionsByPoolAndTrader[_pool][_trader][_index].id;
    }

    /**
     * @dev Get the total liquidity of a pool. It is the combined value of the internal protocol balance and the pool's iToken balance.
     * @param _pool The MarginLiquidityPool.
     * @return The liquidity
     */
    function getTotalPoolLiquidity(MarginLiquidityPoolInterface _pool) public view returns (int256) {
        int256 poolLiquidity = int256(_pool.getLiquidity());
        int256 poolProtocolBalance = balances[_pool][address(_pool)];

        return poolLiquidity.add(poolProtocolBalance);
    }

    // Only for protocol safety functions

    function __setTraderIsMarginCalled(
        MarginLiquidityPoolInterface _pool,
        address _trader,
        bool _isMarginCalled
    ) external {
        require(msg.sender == address(market.protocolSafety), "SP1");
        traderIsMarginCalled[_pool][_trader] = _isMarginCalled;
    }

    // Only for protocol liquidated functions

    function __removePosition(
        Position calldata _position,
        int256 _unrealizedPosition,
        Percentage.Percent calldata _marketStopPrice,
        uint256 _estimatedPoolIndex,
        uint256 _estimatedTraderIndex
    ) external {
        require(msg.sender == address(market.protocolLiquidated), "T1");
        _removePosition(_position, _unrealizedPosition, _marketStopPrice, _estimatedPoolIndex, _estimatedTraderIndex);
    }

    function __transferUnrealized(
        MarginLiquidityPoolInterface _pool,
        address _owner,
        int256 _unrealized,
        int256 _storedTraderEquity
    ) external {
        require(msg.sender == address(market.protocolLiquidated), "T1");
        _transferUnrealized(_pool, _owner, _unrealized, _storedTraderEquity);
    }

    // Internal functions

    function _insertPosition(
        MarginLiquidityPoolInterface _pool,
        TradingPair memory _pair,
        int256 _leverage,
        uint256 _leveragedHeld,
        Percentage.Percent memory _debitsPrice
    ) internal {
        int256 heldSignum = _leverage > 0 ? int256(1) : int256(-1);
        uint256 leveragedDebits = _leveragedHeld.mulPercent(_debitsPrice);
        uint256 leveragedDebitsInUsd = uint256(market.getUsdValue(_pair.quote, int256(leveragedDebits)));
        uint256 marginHeld = market.moneyMarket.convertAmountFromBase(
            uint256(int256(leveragedDebitsInUsd).mul(_leverage > 0 ? int256(1) : int256(-1)).div(_leverage))
        );

        require(leveragedDebitsInUsd >= _pool.minLeverageAmount(), "OP6");
        require(_getEstimatedFreeMargin(_pool, msg.sender) >= marginHeld, "OP1");

        Position memory position = _createPosition(_pool, _pair, _leverage, _leveragedHeld, leveragedDebits, marginHeld);
        market.protocolAcc.__updateAccumulatedPositions(position, true);

        positionsById[position.id] = position;
        positionsByPoolAndTrader[_pool][msg.sender].push(position);
        positionsByPool[_pool].push(position);
        nextPositionId++;

        emit PositionOpened(
            position.id,
            msg.sender,
            address(_pool),
            _pair.base,
            _pair.quote,
            _leverage,
            int256(leveragedDebitsInUsd).mul(heldSignum.mul(-1)),
            _debitsPrice.value
        );
    }

    function _createPosition(
        MarginLiquidityPoolInterface _pool,
        TradingPair memory _pair,
        int256 _leverage,
        uint256 _leveragedHeld,
        uint256 _leveragedDebits,
        uint256 _marginHeld
    ) private view returns (Position memory) {
        int256 heldSignum = _leverage > 0 ? int256(1) : int256(-1);

        return
            Position(
                nextPositionId,
                msg.sender,
                _pool,
                _pair,
                _leverage,
                int256(_leveragedHeld).mul(heldSignum),
                int256(_leveragedDebits).mul(heldSignum.mul(-1)),
                _marginHeld,
                market.config.getCurrentTotalSwapRateForPoolAndPair(
                    _pool,
                    _pair,
                    _leverage > 0 ? MarginFlowProtocolConfig.PositionType.LONG : MarginFlowProtocolConfig.PositionType.SHORT
                ),
                now
            );
    }

    function _getEstimatedEquityOfTrader(MarginLiquidityPoolInterface _pool, address _trader) internal returns (int256) {
        return market.getEstimatedEquityOfTrader(_pool, _trader, balances[_pool][_trader]);
    }

    function _getEstimatedFreeMargin(MarginLiquidityPoolInterface _pool, address _trader) internal returns (uint256) {
        return
            market.getEstimatedFreeMargin(_pool, _trader, market.protocolAcc.traderPositionAccMarginHeld(_pool, _trader), balances[_pool][_trader]);
    }

    function _removePositionFromList(
        Position[] storage _positions,
        uint256 _positionId,
        uint256 _estimatedIndexInList
    ) internal {
        uint256 correctIndex = _getCorrectIndex(_positions, _positionId, _estimatedIndexInList);

        _positions[correctIndex] = _positions[_positions.length.sub(1)];
        _positions.pop();
    }

    function _getCorrectIndex(
        Position[] storage _positions,
        uint256 _positionId,
        uint256 _estimatedIndexInList
    ) private view returns (uint256) {
        require(_estimatedIndexInList < _positions.length, "R1");

        if (_positions[_estimatedIndexInList].id == _positionId) {
            return _estimatedIndexInList;
        }

        // if estimated index isnt correct, look one above and one below
        // arrays can change, so index may be off, worst case tx fails and user has to repeat
        if (_positions.length > _estimatedIndexInList) {
            if (_positions[_estimatedIndexInList.add(1)].id == _positionId) {
                return _estimatedIndexInList + 1;
            }
        }

        if (_positions[_estimatedIndexInList.sub(1, "R1")].id == _positionId) {
            return _estimatedIndexInList - 1;
        }

        revert("R1");
    }

    function _removePosition(
        Position memory _position,
        int256 _unrealizedPosition,
        Percentage.Percent memory _marketStopPrice,
        uint256 _estimatedPoolIndex,
        uint256 _estimatedTraderIndex
    ) private {
        market.protocolAcc.__updateAccumulatedPositions(_position, false);

        _removePositionFromList(positionsByPool[_position.pool], _position.id, _estimatedPoolIndex);
        _removePositionFromList(positionsByPoolAndTrader[_position.pool][_position.owner], _position.id, _estimatedTraderIndex);
        delete positionsById[_position.id];

        emit PositionClosed(
            _position.id,
            _position.owner,
            address(_position.pool),
            _position.pair.base,
            _position.pair.quote,
            _unrealizedPosition,
            _marketStopPrice.value
        );
    }

    function _transferUnrealized(
        MarginLiquidityPoolInterface _pool,
        address _owner,
        int256 _unrealized,
        int256 _storedTraderEquity
    ) private {
        if (_unrealized >= 0) {
            // trader has profit, max realizable is the pool's liquidity
            int256 poolLiquidityIToken = getTotalPoolLiquidity(_pool);
            uint256 realized = poolLiquidityIToken > 0 ? Math.min(uint256(poolLiquidityIToken), uint256(_unrealized)) : 0;

            _transferItokenBalanceFromPool(_pool, _owner, realized);
            return;
        }

        // trader has loss, max realizable is the trader's equity without the given position
        int256 equity = _storedTraderEquity == 0 ? _getEstimatedEquityOfTrader(_pool, _owner) : _storedTraderEquity;
        uint256 unrealizedAbs = uint256(-_unrealized);
        int256 maxRealizable = equity.add(int256(unrealizedAbs));

        if (maxRealizable > 0) {
            // pool gets nothing if no realizable from traders
            uint256 realized = Math.min(uint256(maxRealizable), unrealizedAbs);
            _transferItokenBalance(_pool, _owner, address(_pool), realized); // transfer to pool
        }
    }

    function _transferItokenBalanceFromPool(
        MarginLiquidityPoolInterface _pool,
        address _owner,
        uint256 _amount
    ) private {
        _transferItokenBalance(_pool, address(_pool), _owner, _amount);

        int256 poolBalance = balances[_pool][address(_pool)];

        if (poolBalance < 0) {
            // protocol balance below 0, so deposit new funds
            uint256 transferITokenAmount = uint256(-poolBalance);

            // approve might fail if MAX_UINT is already approved
            try _pool.increaseAllowanceForProtocol(transferITokenAmount)  {
                this; // suppress empty code warning
            } catch (bytes memory) {
                this; // suppress empty code warning
            }
            market.moneyMarket.iToken().safeTransferFrom(address(_pool), address(this), transferITokenAmount);
            balances[_pool][address(_pool)] = 0;
        }
    }

    function _transferItokenBalance(
        MarginLiquidityPoolInterface _pool,
        address _from,
        address _to,
        uint256 _amount
    ) private {
        balances[_pool][_from] = balances[_pool][_from].sub(int256(_amount));
        balances[_pool][_to] = balances[_pool][_to].add(int256(_amount));
    }
}
