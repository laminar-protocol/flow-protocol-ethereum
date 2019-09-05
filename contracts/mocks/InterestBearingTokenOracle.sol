pragma solidity ^0.5.8;

import "../interfaces/PriceOracleInterface.sol";
import "./InterestBearingToken.sol";

contract InterestBearingTokenOracle is PriceOracleInterface {
    bool public constant isPriceOracle = true;

    PriceOracleInterface oracle;
    InterestBearingToken token;

    constructor(PriceOracleInterface oracle_, InterestBearingToken token_) public {
        oracle = oracle_;
        token = token_;
    }

    function getPrice(address addr) external view returns (uint) {
        uint underlayingPrice = oracle.getPrice(addr);
        uint tokenPrice = token.getPrice();
        return underlayingPrice * tokenPrice / 1 ether;
    }
}