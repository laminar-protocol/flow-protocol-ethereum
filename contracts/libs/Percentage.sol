pragma solidity ^0.5.8;

import "@openzeppelin/contracts/math/SafeMath.sol";

library Percentage {
    using SafeMath for uint256;

    uint public constant ONE = 1e18;
    uint public constant ONE_BY_ONE = 1e36;

    struct Percent {
        uint value;
    }

    function fromFraction(uint numerator, uint denominator) internal pure returns (Percent memory) {
        if (numerator == 0) {
            // it is fine if denominator is 0 in this case
            return Percent(0);
        }
        return Percent(numerator.mul(ONE).div(denominator));
    }

    function mulPercent(uint val, Percent memory percent) internal pure returns (uint) {
        return val.mul(percent.value).div(ONE);
    }

    function divPercent(uint val, Percent memory percent) internal pure returns (uint) {
        return val.mul(ONE).div(percent.value);
    }

    function oneOver(Percent memory percent) internal pure returns (Percent memory) {
        return Percent(ONE_BY_ONE.div(percent.value));
    }

    function addPercent(Percent memory a, Percent memory b) internal pure returns (Percent memory) {
        return Percent(a.value.add(b.value));
    }

    function subPercent(Percent memory a, Percent memory b) internal pure returns (Percent memory) {
        return Percent(a.value.sub(b.value));
    }

    function oneHundredPercent() internal pure returns (Percent memory) {
        return Percent(ONE);
    }

    function one() internal pure returns (uint) {
        return ONE;
    }
}
