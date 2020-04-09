pragma solidity ^0.6.4;

import "../../impls/FlowMarginProtocol.sol";

contract TestFlowMarginProtocol is FlowMarginProtocol {
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

    function getEquityOfTrader(LiquidityPoolInterface _pool, address _trader) public returns (int256) {
        return _getEquityOfTrader(_pool, _trader);
    }

    function getAccumulatedSwapRateOfPosition(uint256 _positionId) public view returns (uint256) {
        return _getAccumulatedSwapRateOfPosition(positionsById[_positionId]);
    }
}