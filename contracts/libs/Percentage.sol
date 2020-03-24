pragma solidity ^0.6.4;
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";

library Percentage {
    using SafeMath for uint256;
    using SignedSafeMath for int256;

    uint public constant ONE = 1e18;
    uint public constant ONE_BY_ONE = 1e36;

    int public constant SIGNED_ONE = 1e18;
    int public constant SIGNED_ONE_BY_ONE = 1e36;

    struct Percent {
        uint value;
    }

    struct SignedPercent {
        int value;
    }

    function fromFraction(uint numerator, uint denominator) internal pure returns (Percent memory) {
        if (numerator == 0) {
            // it is fine if denominator is 0 in this case
            return Percent(0);
        }
        return Percent(numerator.mul(ONE).div(denominator));
    }

    function signedFromFraction(int numerator, int denominator) internal pure returns (SignedPercent memory) {
        if (numerator == 0) {
            // it is fine if denominator is 0 in this case
            return SignedPercent(0);
        }
        return SignedPercent(numerator.mul(SIGNED_ONE).div(denominator));
    }


    function mulPercent(uint val, Percent memory percent) internal pure returns (uint) {
        return val.mul(percent.value).div(ONE);
    }

    function signedMulPercent(int val, SignedPercent memory percent) internal pure returns (int) {
        return val.mul(percent.value).div(SIGNED_ONE);
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

    function signedSubPercent(SignedPercent memory a, SignedPercent memory b) internal pure returns (SignedPercent memory) {
        return SignedPercent(a.value.sub(b.value));
    }

    function oneHundredPercent() internal pure returns (Percent memory) {
        return Percent(ONE);
    }

    function one() internal pure returns (uint) {
        return ONE;
    }
}
