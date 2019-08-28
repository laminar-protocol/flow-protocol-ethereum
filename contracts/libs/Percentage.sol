pragma solidity ^0.5.8;

import "@openzeppelin/contracts/math/SafeMath.sol";

library Percentage {
    using SafeMath for uint256;

    uint constant one = 1e18;
    uint constant oneByOne = 1e36; 

    struct Percent {
        uint value;
    }

    function fromFraction(uint numerator, uint denominator) internal pure returns (Percent memory) {
        return Percent(numerator.mul(one).div(denominator));
    }

    function mulPercent(uint val, Percent memory percent) internal pure returns (uint) {
        return val.mul(percent.value).div(one);
    }

    function divPercent(uint val, Percent memory percent) internal pure returns (uint) {
        return val.mul(one).div(percent.value);
    }

    function oneOver(Percent memory percent) internal pure returns (Percent memory) {
        return Percent(oneByOne.div(percent.value));
    }

    function addPercent(Percent memory a, Percent memory b) internal pure returns (Percent memory) {
        return Percent(a.value.add(b.value));
    }

    function subPercent(Percent memory a, Percent memory b) internal pure returns (Percent memory) {
        return Percent(a.value.sub(b.value));
    }

    function oneHundredPercent() internal pure returns (Percent memory) {
        return Percent(one);
    }
}