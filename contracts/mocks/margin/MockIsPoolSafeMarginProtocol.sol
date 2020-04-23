pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import "../../impls/margin/MarginFlowProtocolSafety.sol";

contract MockPoolIsSafeMarginProtocol is MarginFlowProtocolSafety {
    function safetyProtocol() public view returns (MarginFlowProtocolSafety) {
        return MarginFlowProtocolSafety(this);
    }

    function isPoolSafe(MarginLiquidityPoolInterface _pool) public override returns (bool) {
        return address(_pool) != address(0);
    }
}

contract MockPoolIsNotSafeMarginProtocol is MarginFlowProtocolSafety {
    function safetyProtocol() public view returns (MarginFlowProtocolSafety) {
        return MarginFlowProtocolSafety(this);
    }

    function isPoolSafe(MarginLiquidityPoolInterface _pool) public override returns (bool) {
        return address(_pool) == address(0);
    }
}