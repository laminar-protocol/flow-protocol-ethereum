pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import "../../impls/FlowMarginProtocolSafety.sol";

contract MockPoolIsSafeMarginProtocol is FlowMarginProtocolSafety {
    function isPoolSafe(LiquidityPoolInterface _pool) public override returns (bool) {
        return true;
    }
}

contract MockPoolIsNotSafeMarginProtocol is FlowMarginProtocolSafety {
    function isPoolSafe(LiquidityPoolInterface _pool) public override returns (bool) {
        return false;
    }
}