pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import "../../impls/margin/MarginFlowProtocol.sol";

contract TestMarginFlowProtocol is MarginFlowProtocol {
    function getUnrealizedPlAndMarketPriceOfPosition(
        MarginLiquidityPoolInterface _pool,
        address _base,
        address _quote,
        int256 _leverage,
        int256 _leveragedHeld,
        int256 _leveragedDebits,
        uint256 maxPrice
    ) public returns(int256, uint256) {
        TradingPair memory pair = TradingPair(_base, _quote);
        Position memory position = Position(
            0,
            msg.sender,
            _pool,
            pair,
            _leverage,
            _leveragedHeld,
            _leveragedDebits,
            0,
            0,
            Percentage.SignedPercent(0),
            0
        );

        (int256 unrealized, Percentage.Percent memory price) = _getUnrealizedPlAndMarketPriceOfPosition(position, maxPrice);

        return (unrealized, price.value);
    }

    function getAskPrice(MarginLiquidityPoolInterface _pool, address _base, address _quote, uint256 _max) public returns (uint256) {
        TradingPair memory pair = TradingPair(_base, _quote);

        return _getAskPrice(_pool, pair, _max).value;
    }

    function getBidPrice(MarginLiquidityPoolInterface _pool, address _base, address _quote, uint256 _min) public returns (uint256) {
        TradingPair memory pair = TradingPair(_base, _quote);

        return _getBidPrice(_pool, pair, _min).value;
    }

    function removePositionFromPoolList(MarginLiquidityPoolInterface _pool, uint256 _positionId) public {
        TradingPair memory pair = TradingPair(address(address(0)), address(address(0)));
        Position memory position = Position(_positionId, msg.sender, _pool, pair, 0, 0, 0, 0, 0, Percentage.SignedPercent(0), 0);

        _removePositionFromLists(position);
    }

    function getPositionsByPool(MarginLiquidityPoolInterface _pool, address _trader) public view returns (uint256[] memory) {
        Position[] memory positions = _trader == address(0) ? positionsByPool[_pool] : positionsByPoolAndTrader[_pool][_trader];
        uint256[] memory positionIds = new uint256[](positions.length);

        for (uint256 i = 0; i < positions.length; i++) {
            positionIds[i] = positions[i].id;
        }

        return positionIds;
    }

    function getSwapRatesOfTrader(MarginLiquidityPoolInterface _pool, address _trader) public returns (int256) {
        return _getSwapRatesOfTrader(_pool, _trader);
    }

    function getUnrealizedPlOfTrader(MarginLiquidityPoolInterface _pool, address _trader) public returns (int256) {
        return _getUnrealizedPlOfTrader(_pool, _trader);
    }

    function getAccumulatedSwapRateFromParameters(
        MarginLiquidityPoolInterface _pool, address base, address quote, int256 _leveragedHeld, int256 _swapRate, uint256 _timeWhenOpened
    ) public returns (int256) {
        Position memory position = Position(
            12,
            msg.sender,
            _pool,
            TradingPair(base, quote),
            0,
            _leveragedHeld,
            0,
            0,
            0,
            Percentage.SignedPercent(_swapRate),
            _timeWhenOpened
        );

        positionsById[12] = position;

        return getAccumulatedSwapRateOfPosition(12);
    }
}