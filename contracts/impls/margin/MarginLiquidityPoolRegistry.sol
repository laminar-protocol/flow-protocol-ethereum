pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "../../interfaces/MarginLiquidityPoolInterface.sol";
import "../../libs/upgrades/UpgradeReentrancyGuard.sol";
import "../../libs/upgrades/UpgradeOwnable.sol";

import "./MarginMarketLib.sol";

// TODOs:
// - discovery liquidity pool
// - find best spread liquidity pool

contract MarginLiquidityPoolRegistry is Initializable, UpgradeOwnable, UpgradeReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    MarginMarketLib.MarketData private market;

    mapping (MarginLiquidityPoolInterface => bool) public isVerifiedPool;
    mapping (MarginLiquidityPoolInterface => bool) public poolHasPaidDeposits;
    mapping (MarginLiquidityPoolInterface => bool) public isMarginCalled;
    mapping (MarginLiquidityPoolInterface => uint256) public poolMarginCallITokens;
    mapping (MarginLiquidityPoolInterface => uint256) public poolLiquidationITokens;

    function initialize(MarginMarketLib.MarketData memory _market) public initializer {
        UpgradeOwnable.initialize(msg.sender);
        UpgradeReentrancyGuard.initialize();

        market = _market;
    }

    /**
     * @dev Register a new pool by sending the combined margin and liquidation fees.
     * @param _pool The MarginLiquidityPool.
     */
    function registerPool(MarginLiquidityPoolInterface _pool) public nonReentrant {
        require(address(_pool) != address(0), "0");
        require(!poolHasPaidDeposits[_pool], "PR1");

        uint256 poolMarginCallDeposit = market.config.poolMarginCallDeposit();
        uint256 poolLiquidationDeposit = market.config.poolLiquidationDeposit();
        uint256 feeSum = poolMarginCallDeposit.add(poolLiquidationDeposit);
        market.moneyMarket.baseToken().safeTransferFrom(msg.sender, address(this), feeSum);
        market.moneyMarket.baseToken().safeApprove(address(market.moneyMarket), feeSum);

        poolMarginCallITokens[_pool] = market.moneyMarket.mintTo(address(market.protocolSafety), poolMarginCallDeposit);
        poolLiquidationITokens[_pool] = market.moneyMarket.mintTo(address(market.protocolSafety), poolLiquidationDeposit);
        poolHasPaidDeposits[_pool] = true;
    }

    /**
     * @dev Verify a new pool, only for the owner.
     * @param _pool The MarginLiquidityPool.
     */
    function verifyPool(MarginLiquidityPoolInterface _pool) public onlyOwner {
        require(poolHasPaidDeposits[_pool], "PF1");
        require(!isVerifiedPool[_pool], "PF2");
        isVerifiedPool[_pool] = true;
    }

    /**
     * @dev Unverify a pool, only for the owner.
     * @param _pool The MarginLiquidityPool.
     */
    function unverifyPool(MarginLiquidityPoolInterface _pool) public onlyOwner {
        require(isVerifiedPool[_pool], "PV1");
        isVerifiedPool[_pool] = false;
    }

    /**
     * @dev Margin call a pool, only used by the address(market.protocolSafety).
     * @param _pool The MarginLiquidityPool.
     */
    function marginCallPool(MarginLiquidityPoolInterface _pool) external returns (uint256) {
        require(msg.sender == address(market.protocolSafety), "Only safety protocol can call this function");
        require(!isMarginCalled[_pool], "PM1");

        uint256 marginCallITokens = poolMarginCallITokens[_pool];

        isMarginCalled[_pool] = true;
        poolMarginCallITokens[_pool] = 0;

        return marginCallITokens;
    }

    /**
     * @dev Margin call a pool, only used by the address(market.protocolSafety).
     * @param _pool The MarginLiquidityPool.
     */
    function liquidatePool(MarginLiquidityPoolInterface _pool) external returns (uint256) {
        require(msg.sender == address(market.protocolSafety), "Only safety protocol can call this function");
        require(isMarginCalled[_pool], "PM1");

        uint256 liquidationCallITokens = poolLiquidationITokens[_pool];

        isMarginCalled[_pool] = false;
        poolLiquidationITokens[_pool] = 0;

        return liquidationCallITokens;
    }

    /**
     * @dev Make pool safe, only used by address(market.protocolSafety).
     * @param _pool The MarginLiquidityPool.
     */
    function makePoolSafe(MarginLiquidityPoolInterface _pool) external {
        require(msg.sender == address(market.protocolSafety), "Only safety protocol can call this function");
        require(isMarginCalled[_pool], "PS1");

        uint256 poolMarginCallDeposit = market.config.poolMarginCallDeposit();
        market.moneyMarket.baseToken().safeTransferFrom(msg.sender, address(this), poolMarginCallDeposit);
        market.moneyMarket.baseToken().safeApprove(address(market.moneyMarket), poolMarginCallDeposit);

        poolMarginCallITokens[_pool] = market.moneyMarket.mintTo(address(market.protocolSafety), poolMarginCallDeposit);
        isMarginCalled[_pool] = false;
    }
}
