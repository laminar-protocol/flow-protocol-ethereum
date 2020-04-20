pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import "../../impls/FlowMarginProtocolSafety.sol";

contract MockPoolIsSafeMarginProtocol is FlowMarginProtocolSafety {
    function safetyProtocol() public view returns (FlowMarginProtocolSafety) {
        return FlowMarginProtocolSafety(this);
    }

    function isPoolSafe(LiquidityPoolInterface _pool) public override returns (bool) {
        return address(_pool) != address(0);
    }
}

contract MockPoolIsNotSafeMarginProtocol is FlowMarginProtocolSafety {
    function safetyProtocol() public view returns (FlowMarginProtocolSafety) {
        return FlowMarginProtocolSafety(this);
    }

    function isPoolSafe(LiquidityPoolInterface _pool) public override returns (bool) {
        return address(_pool) == address(0);
    }
}