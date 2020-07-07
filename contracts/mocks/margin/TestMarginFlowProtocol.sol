// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../impls/margin/MarginFlowProtocol.sol";
import "../../impls/margin/MarginMarketLib.sol";

contract TestMarginFlowProtocol is MarginFlowProtocol {
    function getUnrealizedPlAndMarketPriceOfPosition(
        MarginLiquidityPoolInterface _pool,
        address _base,
        address _quote,
        int256 _leverage,
        int256 _leveragedHeld,
        int256 _leveragedDebits,
        uint256 _maxPrice
    ) public returns (int256, uint256) {
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

        (int256 unrealized, Percentage.Percent memory price) = MarginMarketLib.getUnrealizedPlAndMarketPriceOfPosition(market, position, _maxPrice);

        return (unrealized, price.value);
    }

    function getPrice(address _base, address _quote) public returns (Percentage.Percent memory) {
        return MarginMarketLib.getPriceForPair(market, _base, _quote);
    }

    function getUsdValue(address _base, int256 _amount) public returns (int256) {
        return MarginMarketLib.getUsdValue(market, _base, _amount);
    }

    function getAskPrice(
        MarginLiquidityPoolInterface _pool,
        address _base,
        address _quote,
        uint256 _max
    ) public returns (uint256) {
        TradingPair memory pair = TradingPair(_base, _quote);

        return MarginMarketLib.getAskPrice(market, _pool, pair, _max).value;
    }

    function getBidPrice(
        MarginLiquidityPoolInterface _pool,
        address _base,
        address _quote,
        uint256 _min
    ) public returns (uint256) {
        TradingPair memory pair = TradingPair(_base, _quote);

        return MarginMarketLib.getBidPrice(market, _pool, pair, _min).value;
    }

    function removePositionFromPoolList(MarginLiquidityPoolInterface _pool, uint256 _positionId) public {
        TradingPair memory pair = TradingPair(address(address(0)), address(address(0)));
        Position memory position = Position(_positionId, msg.sender, _pool, pair, 0, 0, 0, 0, 0, Percentage.SignedPercent(0), 0);

        uint256 poolIndex = 0;
        uint256 traderIndex = 0;

        for (uint256 i = 0; i < positionsByPool[_pool].length; i++) {
            if (positionsByPool[_pool][i].id == _positionId) {
                poolIndex = i;
                break;
            }
        }
        for (uint256 i = 0; i < positionsByPoolAndTrader[_pool][msg.sender].length; i++) {
            if (positionsByPoolAndTrader[_pool][msg.sender][i].id == _positionId) {
                traderIndex = i;
                break;
            }
        }

        _removePositionFromList(positionsByPoolAndTrader[position.pool][position.owner], position.id, traderIndex);
        _removePositionFromList(positionsByPool[position.pool], position.id, poolIndex);
    }

    function getPositionIdsByPool(MarginLiquidityPoolInterface _pool, address _trader) public view returns (uint256[] memory) {
        Position[] memory positions = _trader == address(0) ? positionsByPool[_pool] : positionsByPoolAndTrader[_pool][_trader];
        uint256[] memory positionIds = new uint256[](positions.length);

        for (uint256 i = 0; i < positions.length; i++) {
            positionIds[i] = positions[i].id;
        }

        return positionIds;
    }

    function getSwapRatesOfTrader(MarginLiquidityPoolInterface _pool, address _trader) public returns (int256) {
        Position[] memory positions = positionsByPoolAndTrader[_pool][_trader];
        return MarginMarketLib.getSwapRatesOfTrader(market, positions);
    }

    function getUnrealizedPlOfTrader(MarginLiquidityPoolInterface _pool, address _trader) public returns (int256) {
        Position[] memory positions = positionsByPoolAndTrader[_pool][_trader];
        return MarginMarketLib.getUnrealizedPlOfTrader(market, positions);
    }

    function getEstimatedFreeMargin(MarginLiquidityPoolInterface _pool, address _trader) public returns (uint256) {
        return _getEstimatedFreeMargin(_pool, _trader);
    }

    function getEstimatedEquityOfTrader(MarginLiquidityPoolInterface _pool, address _trader) public returns (int256) {
        return _getEstimatedEquityOfTrader(_pool, _trader);
    }

    function getAccumulatedSwapRateFromParameters(
        MarginLiquidityPoolInterface _pool,
        address base,
        address quote,
        int256 _leveragedHeld,
        int256 _swapRate,
        uint256 _timeWhenOpened
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

        return market.getAccumulatedSwapRateOfPosition(positionsById[12]);
    }
}
