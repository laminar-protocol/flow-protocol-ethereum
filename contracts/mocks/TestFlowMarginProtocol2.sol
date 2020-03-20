pragma solidity ^0.6.3;

import "../impls/FlowMarginProtocol2.sol";

contract TestFlowMarginProtocol2 is FlowMarginProtocol2 {
    function testUnrealizedPl(
        LiquidityPoolInterface _pool,
        FlowToken _base,
        FlowToken _quote,
        int256 _leverage,
        int256 _leveragedHeld,
        int256 _leveragedDebits
    ) public returns(int256) {
        TradingPair memory pair = TradingPair(_base, _quote);
        Position memory position = Position(msg.sender, _pool, pair, _leverage, _leveragedHeld, _leveragedDebits, 0, 0, 0);

        return _getUnrealizedPlOfPosition(position);
    }

    function testGetUsdValue(IERC20 _currencyToken, int256 _amount) public returns (int256) {
        return _getUsdValue(_currencyToken, _amount);
    }

    function getAskPrice(LiquidityPoolInterface _pool, FlowToken _base,FlowToken _quote, uint256 _max) public returns (uint256) {
        TradingPair memory pair = TradingPair(_base, _quote);

        return _getAskPriceInWei(_pool, pair, _max);
    }

    function getBidPrice(LiquidityPoolInterface _pool, FlowToken _base,FlowToken _quote, uint256 _min) public returns (uint256) {
        TradingPair memory pair = TradingPair(_base, _quote);

        return _getBidPriceInWei(_pool, pair, _min);
    }
}