pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import "../../impls/margin/MarginFlowProtocolSafety.sol";

contract TestMarginFlowProtocolSafety is MarginFlowProtocolSafety {
    function getIsTraderSafe(MarginLiquidityPoolInterface _pool, address _trader) public returns (bool) {
        return _isTraderSafe(_pool, _trader);
    }

    function getLeveragedDebitsOfTrader(MarginLiquidityPoolInterface _pool, address _trader) public view returns (uint256) {
        return _getLeveragedDebitsOfTrader(_pool, _trader);
    }

    function getEquityOfPool(MarginLiquidityPoolInterface _pool) public returns (int256) {
        return _getEquityOfPool(_pool);
    }

    function getEnpAndEll(MarginLiquidityPoolInterface _pool) public returns (uint256,uint256) {
        (Percentage.Percent memory enp, Percentage.Percent memory ell) = _getEnpAndEll(_pool);
        return (enp.value, ell.value);
    }
}