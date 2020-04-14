pragma solidity ^0.6.4;

import "../../impls/FlowMarginProtocol.sol";

contract TestFlowMarginProtocol is FlowMarginProtocol {
    function getPositionById(uint256 _id)
        public
        view
        returns (uint256, address, LiquidityPoolInterface, FlowToken, FlowToken, int256, int256, int256, int256, uint256, uint256, uint256) {
        Position memory position = positionsById[_id];

        return (
            position.id,
            position.owner,
            position.pool,
            position.pair.base,
            position.pair.quote,
            position.leverage,
            position.leveragedHeld,
            position.leveragedDebits,
            position.leveragedDebitsInUsd,
            position.marginHeld,
            position.swapRate.value,
            position.timeWhenOpened
        );
    }

    function getLastPositionByPoolPart1(LiquidityPoolInterface _pool)
        public
        view
        returns (uint256, address, LiquidityPoolInterface, FlowToken, FlowToken, int256) {
        Position storage position = _getLastPositionByPool(_pool);

        return _getPositionTuplePart1(position);
    }

    function getLastPositionByPoolPart2(LiquidityPoolInterface _pool)
        public
        view
        returns (int256, int256, int256, uint256, uint256, uint256) {
        Position storage position = _getLastPositionByPool(_pool);

        return _getPositionTuplePart2(position);
    }

    function getLastPositionByPoolAndTraderPart1(LiquidityPoolInterface _pool, address _trader)
        public
        view
        returns (uint256, address, LiquidityPoolInterface, FlowToken, FlowToken, int256) {
        Position storage position = _getLastPositionByPoolAndTrader(_pool, _trader);

        return _getPositionTuplePart1(position);
    }

    function getLastPositionByPoolAndTraderPart2(LiquidityPoolInterface _pool, address _trader)
        public
        view
        returns (int256, int256, int256, uint256, uint256, uint256) {
        Position storage position = _getLastPositionByPoolAndTrader(_pool, _trader);

        return _getPositionTuplePart2(position);
    }

    function _getLastPositionByPool(LiquidityPoolInterface _pool) private view returns (Position storage) {
        return positionsByPool[_pool][positionsByPool[_pool].length - 1];
    }

    function _getLastPositionByPoolAndTrader(LiquidityPoolInterface _pool, address _trader) private view returns (Position storage) {
        return positionsByPoolAndTrader[_pool][_trader][positionsByPoolAndTrader[_pool][_trader].length - 1];
    }

    function _getPositionTuplePart1(Position storage _position)
        private
        view
        returns (uint256, address, LiquidityPoolInterface, FlowToken, FlowToken, int256) {
        return (
            _position.id,
            _position.owner,
            _position.pool,
            _position.pair.base,
            _position.pair.quote,
            _position.leverage
        );
    }

    function _getPositionTuplePart2(Position storage _position)
        private
        view
        returns (int256, int256, int256, uint256, uint256, uint256) {
        return (
            _position.leveragedHeld,
            _position.leveragedDebits,
            _position.leveragedDebitsInUsd,
            _position.marginHeld,
            _position.swapRate.value,
            _position.timeWhenOpened
        );
    }

    function getUnrealizedPlAndMarketPriceOfPosition(
        LiquidityPoolInterface _pool,
        FlowToken _base,
        FlowToken _quote,
        int256 _leverage,
        int256 _leveragedHeld,
        int256 _leveragedDebits,
        uint256 maxPrice
    ) public returns(int256, uint256) {
        TradingPair memory pair = TradingPair(_base, _quote);
        Position memory position = Position(0, msg.sender, _pool, pair, _leverage, _leveragedHeld, _leveragedDebits, 0, 0, Percentage.Percent(0), 0);

        (int256 unrealized, Percentage.Percent memory price) = _getUnrealizedPlAndMarketPriceOfPosition(position, maxPrice);

        return (unrealized, price.value);
    }

    function getUsdValue(IERC20 _currencyToken, int256 _amount) public returns (int256) {
        return _getUsdValue(_currencyToken, _amount);
    }

    function getMarginLevel(LiquidityPoolInterface _pool, address _trader) public returns (int256) {
        return _getMarginLevel(_pool, _trader).value;
    }

    function getAskPrice(LiquidityPoolInterface _pool, FlowToken _base,FlowToken _quote, uint256 _max) public returns (uint256) {
        TradingPair memory pair = TradingPair(_base, _quote);

        return _getAskPrice(_pool, pair, _max).value;
    }

    function getBidPrice(LiquidityPoolInterface _pool, FlowToken _base,FlowToken _quote, uint256 _min) public returns (uint256) {
        TradingPair memory pair = TradingPair(_base, _quote);

        return _getBidPrice(_pool, pair, _min).value;
    }

    function getIsPoolSafe(LiquidityPoolInterface _pool) public returns (bool) {
        return _isPoolSafe(_pool);
    }

    function getIsTraderSafe(LiquidityPoolInterface _pool, address _trader) public returns (bool) {
        return _isTraderSafe(_pool, _trader);
    }

    function getAccumulatedSwapRateOfPosition(
        int256 _leveragedDebitsInUsd, uint256 _swapRate, uint256 _timeWhenOpened
    ) public view returns (uint256) {
        TradingPair memory pair = TradingPair(FlowToken(address(0)), FlowToken(address(0)));
        LiquidityPoolInterface pool = LiquidityPoolInterface(address(0));
        Position memory position = Position(
            0,
            msg.sender,
            pool,
            pair,
            0,
            0,
            0,
            _leveragedDebitsInUsd,
            0,
            Percentage.Percent(_swapRate),
            _timeWhenOpened
        );

        return _getAccumulatedSwapRateOfPosition(position);
    }

    function removePositionFromPoolList(LiquidityPoolInterface _pool, uint256 _positionId) public {
        TradingPair memory pair = TradingPair(FlowToken(address(0)), FlowToken(address(0)));
        Position memory position = Position(_positionId, msg.sender, _pool, pair, 0, 0, 0, 0, 0, Percentage.Percent(0), 0);

        _removePositionFromLists(position);
    }

    function getPositionsByPool(LiquidityPoolInterface _pool, address _trader) public view returns (uint256[] memory) {
        Position[] memory positions = _trader == address(0) ? positionsByPool[_pool] : positionsByPoolAndTrader[_pool][_trader];
        uint256[] memory positionIds = new uint256[](positions.length);

        for (uint256 i = 0; i < positions.length; i++) {
            positionIds[i] = positions[i].id;
        }

        return positionIds;
    }

    function getPrice(IERC20 _baseCurrencyId, IERC20 _quoteCurrencyId) public returns (uint256) {
        return _getPrice(_baseCurrencyId, _quoteCurrencyId).value;
    }

    function getLeveragedDebitsOfTrader(LiquidityPoolInterface _pool, address _trader) public view returns (uint256) {
        return _getLeveragedDebitsOfTrader(_pool, _trader);
    }

    function getSwapRatesOfTrader(LiquidityPoolInterface _pool, address _trader) public view returns (uint256) {
        return _getSwapRatesOfTrader(_pool, _trader);
    }

    function getUnrealizedPlOfTrader(LiquidityPoolInterface _pool, address _trader) public returns (int256) {
        return _getUnrealizedPlOfTrader(_pool, _trader);
    }

    function getUnrealizedPlOfPosition(uint256 _positionId) public returns (int256) {
        Position memory position = positionsById[_positionId];
        return _getUnrealizedPlOfPosition(position);
    }

    function getEquityOfTrader(LiquidityPoolInterface _pool, address _trader) public returns (int256) {
        return _getEquityOfTrader(_pool, _trader);
    }

    function getEquityOfPool(LiquidityPoolInterface _pool) public returns (int256) {
        return _getEquityOfPool(_pool);
    }

    function getAccumulatedSwapRateOfPosition(uint256 _positionId) public view returns (uint256) {
        return _getAccumulatedSwapRateOfPosition(positionsById[_positionId]);
    }

    function getEnpAndEll(LiquidityPoolInterface _pool) public returns (uint256,uint256) {
        (Percentage.Percent memory enp, Percentage.Percent memory ell) = _getEnpAndEll(_pool);
        return (enp.value, ell.value);
    }
}