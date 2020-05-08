pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import "../../impls/margin/MarginFlowProtocolSafety.sol";

contract MockPoolIsSafeMarginProtocol {
    event FakeWithdrew(address sender, uint256 amount);

    function safetyProtocol() public view returns (MarginFlowProtocolSafety) {
        return MarginFlowProtocolSafety(address(this));
    }

    function isPoolSafe(MarginLiquidityPoolInterface _pool) public pure returns (bool) {
        return address(_pool) != address(0);
    }

    function withdrawForPool(uint256 _iTokenAmount) public {
        emit FakeWithdrew(msg.sender, _iTokenAmount);
    }

    function balances(MarginLiquidityPoolInterface _pool, address _trader) public pure returns (uint256) {
        if (address(_pool) != address(0) && _trader != address(0) ) {
            return 0;
        }
    }
}

contract MockPoolIsNotSafeMarginProtocol {
    event FakeWithdrew(address sender, uint256 amount);

    function safetyProtocol() public view returns (MarginFlowProtocolSafety) {
        return MarginFlowProtocolSafety(address(this));
    }

    function isPoolSafe(MarginLiquidityPoolInterface _pool) public pure returns (bool) {
        return address(_pool) == address(0);
    }

    function withdrawForPool(uint256 _iTokenAmount) public {
        emit FakeWithdrew(msg.sender, _iTokenAmount);
    }

    function balances(MarginLiquidityPoolInterface _pool, address _trader) public pure returns (uint256) {
        if (address(_pool) != address(0) && _trader != address(0) ) {
            return 0;
        }
    }
}