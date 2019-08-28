pragma solidity ^0.5.8;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../interfaces/PriceOracleInterface.sol";
import "../interfaces/LiquidityPoolInterface.sol";
import "../roles/ProtocolOwnable.sol";

contract FlowToken is ProtocolOwnable, ERC20, ERC20Detailed {
    PriceOracle public oracle;
    IERC20 public baseToken;

    constructor(
        string memory name,
        string memory symbol,
        PriceOracle oracle_,
        IERC20 baseToken_
    ) ERC20Detailed(name, symbol, 18) public {
        oracle = oracle_;
        baseToken = baseToken_;
    }
}
