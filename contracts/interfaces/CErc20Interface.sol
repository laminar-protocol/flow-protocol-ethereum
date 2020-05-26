
pragma solidity >=0.4.21 <=0.6.4;

interface CErc20Interface {

    function totalSupply() external view returns (
        uint256
    );

    function exchangeRateStored() external view returns (
        uint256
    );

    function getCash() external view returns (
        uint256
    );

    function totalBorrows() external view returns (
        uint256
    );

    function underlying() external view returns (
        address
    );

    function balanceOf(
        address owner
    ) external view returns (
        uint256
    );

    function redeemUnderlying(
        uint256 redeemAmount
    ) external returns (
        uint256
    );

    function mint(
        uint256 mintAmount
    ) external returns (
        uint256
    );

    function transfer(
        address dst,
        uint256 amount
    ) external returns (
        bool
    );

    function redeem(
        uint256 redeemTokens
    ) external returns (
        uint256
    );

    function approve(
        address spender,
        uint256 amount
    ) external returns (
        bool
    );

    function transferFrom(
        address src,
        address dst,
        uint256 amount
    ) external returns (
        bool
    );
}