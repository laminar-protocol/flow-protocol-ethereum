pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import "../../impls/margin/MarginFlowProtocolSafety.sol";

contract MockPoolIsSafeMarginProtocol {
    event Withdrew(MarginLiquidityPoolInterface pool, address indexed sender, uint256 amount);

    function safetyProtocol() public view returns (MarginFlowProtocolSafety) {
        return MarginFlowProtocolSafety(address(this));
    }

    function isPoolSafe(MarginLiquidityPoolInterface _pool) public pure returns (bool) {
        return address(_pool) != address(0);
    }

    function withdraw(MarginLiquidityPoolInterface _pool, uint256 _iTokenAmount) public {
        emit Withdrew(_pool, msg.sender, _iTokenAmount);
    }

    function balances(MarginLiquidityPoolInterface _pool, address _trader) public pure returns (uint256) {
        if (address(_pool) != address(0) && _trader != address(0) ) {
            return 0;
        }
    }
}

contract MockPoolIsNotSafeMarginProtocol {
    event Withdrew(MarginLiquidityPoolInterface pool, address indexed sender, uint256 amount);

    function safetyProtocol() public view returns (MarginFlowProtocolSafety) {
        return MarginFlowProtocolSafety(address(this));
    }

    function isPoolSafe(MarginLiquidityPoolInterface _pool) public pure returns (bool) {
        return address(_pool) == address(0);
    }

    function withdraw(MarginLiquidityPoolInterface _pool, uint256 _iTokenAmount) public {
        emit Withdrew(_pool, msg.sender, _iTokenAmount);
    }

    function balances(MarginLiquidityPoolInterface _pool, address _trader) public pure returns (uint256) {
        if (address(_pool) != address(0) && _trader != address(0) ) {
            return 0;
        }
    }
}