pragma solidity ^0.6.4;

import "../../impls/FlowMarginProtocol.sol";

contract TestFlowMarginProtocol0 is FlowMarginProtocol {
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
            position.swapRate,
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
            _position.swapRate,
            _position.timeWhenOpened
        );
    }
}