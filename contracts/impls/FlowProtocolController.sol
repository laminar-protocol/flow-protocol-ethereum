pragma solidity ^0.5.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "./FlowProtocol.sol";
import "./MoneyMarket.sol";
import "./FlowToken.sol";

contract FlowProtocolController {
    using SafeERC20 for IERC20;

    uint constant MAX_UINT = 2**256 - 1;

    FlowProtocol public protocol;
    MoneyMarket public moneyMarket;
    IERC20 public baseToken;

    constructor(FlowProtocol protocol_, MoneyMarket moneyMarket_) public {
        protocol = protocol_;
        moneyMarket = moneyMarket_;
        baseToken = moneyMarket_.baseToken();

        baseToken.safeApprove(address(protocol_), MAX_UINT);
    }

    function buy(FlowToken token, LiquidityPoolInterface pool, uint baseTokenAmount) external {
        // take base token
        baseToken.safeTransferFrom(msg.sender, address(this), baseTokenAmount);

        // convert to mToken
        moneyMarket.mint(baseTokenAmount);

        // deposit mToken to mint fToken
        uint flowTokenAmount = protocol.deposit(token, pool, baseTokenAmount);

        // transfer fToken back to user
        IERC20(token).safeTransfer(msg.sender, flowTokenAmount);
    }

    function sell(FlowToken token, LiquidityPoolInterface pool, uint flowTokenAmount) external {
        // take fToken
        IERC20(token).safeTransferFrom(msg.sender, address(this), flowTokenAmount);

        // burn fToken to withdraw mToken
        uint baseTokenAmount = protocol.withdraw(token, pool, flowTokenAmount);

        // convert mToken to base token and send to user
        moneyMarket.redeemTo(msg.sender, baseTokenAmount);
    }

    function deposit() external {

    }
}