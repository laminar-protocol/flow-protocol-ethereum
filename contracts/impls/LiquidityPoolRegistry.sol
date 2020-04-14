/* solium-disable */

import "../interfaces/LiquidityPoolInterface.sol";
import "../interfaces/MoneyMarketInterface.sol";
import "../libs/upgrades/UpgradeReentrancyGuard.sol";
import "../libs/upgrades/UpgradeOwnable.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

pragma solidity ^0.6.4;
// TODOs:
// - discovery liquidity pool
// - find best spread liquidity pool

contract LiquidityPoolRegistry is Initializable, UpgradeOwnable, UpgradeReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    MoneyMarketInterface private moneyMarket;
    address private protocol;

    mapping (LiquidityPoolInterface => bool) public isVerifiedPool;
    mapping (LiquidityPoolInterface => bool) public poolHasPaidFees;
    mapping (LiquidityPoolInterface => bool) public poolIsMarginCalled;

    uint256 constant public LIQUIDITY_POOL_MARGIN_CALL_FEE = 1000 ether; // TODO
    uint256 constant public LIQUIDITY_POOL_LIQUIDATION_FEE = 3000 ether; // TODO

    function initialize(MoneyMarketInterface _moneyMarket, address _protocol) public initializer {
        UpgradeOwnable.initialize(msg.sender);
        UpgradeReentrancyGuard.initialize();

        moneyMarket = _moneyMarket;
        protocol = _protocol;
    }

    /**
     * @dev Register a new pool by sending the combined margin and liquidation fees.
     * @param _pool The MarginLiquidityPool.
     */
    function registerPool(LiquidityPoolInterface _pool) public nonReentrant {
        require(address(_pool) != address(0), "0");
        require(!poolHasPaidFees[_pool], "PR1");

        uint256 feeSum = LIQUIDITY_POOL_MARGIN_CALL_FEE.add(LIQUIDITY_POOL_LIQUIDATION_FEE);
        IERC20(moneyMarket.baseToken()).safeTransferFrom(msg.sender, protocol, feeSum);

        poolHasPaidFees[_pool] = true;
    }

    /**
     * @dev Verify a new pool, only for the owner.
     * @param _pool The MarginLiquidityPool.
     */
    function verifyPool(LiquidityPoolInterface _pool) public onlyOwner {
        require(poolHasPaidFees[_pool], "PF1");
        require(!isVerifiedPool[_pool], "PF2");
        isVerifiedPool[_pool] = true;
    }

    /**
     * @dev Unverify a pool, only for the owner.
     * @param _pool The MarginLiquidityPool.
     */
    function unverifyPool(LiquidityPoolInterface _pool) public onlyOwner {
        require(isVerifiedPool[_pool], "PV1");
        isVerifiedPool[_pool] = false;
    }

    function marginCallPool(LiquidityPoolInterface _pool) public {
        require(msg.sender == protocol, "Only protocol can call this function");
        require(!poolIsMarginCalled[_pool], "PM1");

        poolIsMarginCalled[_pool] = true;
    }

    function makePoolSafe(LiquidityPoolInterface _pool) public {
        require(msg.sender == protocol, "Only protocol can call this function");
        require(poolIsMarginCalled[_pool], "PS1");

        poolIsMarginCalled[_pool] = false;
    }
}
