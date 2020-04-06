pragma solidity ^0.6.4;

import "../../impls/FlowMarginProtocol.sol";

contract TestFlowMarginProtocol1 is FlowMarginProtocol {
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
        Position memory position = Position(0, msg.sender, _pool, pair, _leverage, _leveragedHeld, _leveragedDebits, 0, 0, 0, 0);

        (int256 unrealized, Percentage.Percent memory price) = _getUnrealizedPlAndMarketPriceOfPosition(position, maxPrice);

        return (unrealized, price.value);
    }

    function getUsdValue(IERC20 _currencyToken, int256 _amount) public returns (int256) {
        return _getUsdValue(_currencyToken, _amount);
    }

    function getMarginLevel(LiquidityPoolInterface _pool, address _trader) public returns (int256) {
        return _getMarginLevel(_pool, _trader).value;
    }

    function getUnrealizedPlOfTrader(LiquidityPoolInterface _pool, address _trader) public returns (int256) {
        return _getUnrealizedPlOfTrader(_pool, _trader);
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

    function getAccumulatedSwapRateOfPosition(uint256 _swapRate, uint256 _timeWhenOpened) public view returns (uint256) {
        TradingPair memory pair = TradingPair(FlowToken(address(0)), FlowToken(address(0)));
        LiquidityPoolInterface pool = LiquidityPoolInterface(address(0));
        Position memory position = Position(0, msg.sender, pool, pair, 0, 0, 0, 0, 0, _swapRate, _timeWhenOpened);

        return _getAccumulatedSwapRateOfPosition(position);
    }

    function getEquityOfTrader(LiquidityPoolInterface _pool, address _trader) public returns (int256) {
        return _getEquityOfTrader(_pool, _trader);
    }
}