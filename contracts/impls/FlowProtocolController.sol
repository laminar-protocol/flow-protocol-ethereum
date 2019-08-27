pragma solidity ^0.5.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";

import "../libs/Percentage.sol";
import "../interfaces/FlowProtocol.sol";
import "../interfaces/PriceOracle.sol";
import "../roles/ProtocolOwnable.sol";

contract FlowProtocolController is FlowProtocol, Ownable {
    PriceOracle public oracle;
    IERC20 public baseToken;

    constructor(PriceOracle oracle_, IERC20 baseToken_) public {
        oracle = oracle_;
        baseToken = baseToken_;
    }
}