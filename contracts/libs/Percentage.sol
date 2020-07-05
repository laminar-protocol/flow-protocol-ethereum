// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SignedSafeMath.sol";

library Percentage {
    using SafeMath for uint256;
    using SignedSafeMath for int256;

    uint256 public constant ONE = 1e18;
    uint256 public constant ONE_BY_ONE = 1e36;

    int256 public constant SIGNED_ONE = 1e18;
    int256 public constant SIGNED_ONE_BY_ONE = 1e36;

    struct Percent {
        uint256 value;
    }

    struct SignedPercent {
        int256 value;
    }

    function fromFraction(uint256 numerator, uint256 denominator) internal pure returns (Percent memory) {
        if (numerator == 0) {
            // it is fine if denominator is 0 in this case
            return Percent(0);
        }
        return Percent(numerator.mul(ONE).div(denominator));
    }

    function signedFromFraction(int256 numerator, int256 denominator) internal pure returns (SignedPercent memory) {
        if (numerator == 0) {
            // it is fine if denominator is 0 in this case
            return SignedPercent(0);
        }
        return SignedPercent(numerator.mul(SIGNED_ONE).div(denominator));
    }

    function mulPercent(uint256 val, Percent memory percent) internal pure returns (uint256) {
        return val.mul(percent.value).div(ONE);
    }

    function signedMulPercent(int256 val, SignedPercent memory percent) internal pure returns (int256) {
        return val.mul(percent.value).div(SIGNED_ONE);
    }

    function divPercent(uint256 val, Percent memory percent) internal pure returns (uint256) {
        return val.mul(ONE).div(percent.value);
    }

    function oneOver(Percent memory percent) internal pure returns (Percent memory) {
        return Percent(ONE_BY_ONE.div(percent.value));
    }

    function addPercent(Percent memory a, Percent memory b) internal pure returns (Percent memory) {
        return Percent(a.value.add(b.value));
    }

    function signedAddPercent(SignedPercent memory a, SignedPercent memory b) internal pure returns (SignedPercent memory) {
        return SignedPercent(a.value.add(b.value));
    }

    function subPercent(Percent memory a, Percent memory b) internal pure returns (Percent memory) {
        return Percent(a.value.sub(b.value));
    }

    function signedSubPercent(SignedPercent memory a, SignedPercent memory b) internal pure returns (SignedPercent memory) {
        return SignedPercent(a.value.sub(b.value));
    }

    function signedMulPercent(SignedPercent memory a, SignedPercent memory b) internal pure returns (SignedPercent memory) {
        return SignedPercent(a.value.mul(b.value).div(SIGNED_ONE));
    }

    function oneHundredPercent() internal pure returns (Percent memory) {
        return Percent(ONE);
    }

    function one() internal pure returns (uint256) {
        return ONE;
    }
}
