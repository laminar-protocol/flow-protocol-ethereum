pragma solidity ^0.6.4;

import "../../impls/FlowMarginProtocol.sol";

contract MockPoolIsSafeMarginProtocol is FlowMarginProtocol {
    function isPoolSafe(LiquidityPoolInterface _pool) public override returns (bool) {
        return true;
    }
}

contract MockPoolIsNotSafeMarginProtocol is FlowMarginProtocol {
    function isPoolSafe(LiquidityPoolInterface _pool) public override returns (bool) {
        return false;
    }
}