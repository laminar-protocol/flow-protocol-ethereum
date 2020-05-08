pragma solidity ^0.6.4;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "../../interfaces/MarginLiquidityPoolInterface.sol";
import "../../interfaces/MoneyMarketInterface.sol";
import "../../libs/upgrades/UpgradeReentrancyGuard.sol";
import "../../libs/upgrades/UpgradeOwnable.sol";

// TODOs:
// - discovery liquidity pool
// - find best spread liquidity pool

contract MarginLiquidityPoolRegistry is Initializable, UpgradeOwnable, UpgradeReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    MoneyMarketInterface private moneyMarket;
    address private protocolSafety;

    mapping (MarginLiquidityPoolInterface => bool) public isVerifiedPool;
    mapping (MarginLiquidityPoolInterface => bool) public poolHasPaidDeposits;
    mapping (MarginLiquidityPoolInterface => bool) public isMarginCalled;
    mapping (MarginLiquidityPoolInterface => uint256) public poolMarginCallITokens;
    mapping (MarginLiquidityPoolInterface => uint256) public poolLiquidationITokens;

    uint256 constant public LIQUIDITY_POOL_MARGIN_CALL_FEE = 1000 ether; // TODO
    uint256 constant public LIQUIDITY_POOL_LIQUIDATION_FEE = 3000 ether; // TODO

    function initialize(MoneyMarketInterface _moneyMarket, address _protocolSafety) public initializer {
        UpgradeOwnable.initialize(msg.sender);
        UpgradeReentrancyGuard.initialize();

        moneyMarket = _moneyMarket;
        protocolSafety = _protocolSafety;
    }

    /**
     * @dev Register a new pool by sending the combined margin and liquidation fees.
     * @param _pool The MarginLiquidityPool.
     */
    function registerPool(MarginLiquidityPoolInterface _pool) public nonReentrant {
        require(address(_pool) != address(0), "0");
        require(!poolHasPaidDeposits[_pool], "PR1");

        uint256 feeSum = LIQUIDITY_POOL_MARGIN_CALL_FEE.add(LIQUIDITY_POOL_LIQUIDATION_FEE);
        moneyMarket.baseToken().safeTransferFrom(msg.sender, address(this), feeSum);
        moneyMarket.baseToken().safeApprove(address(moneyMarket), feeSum);

        poolMarginCallITokens[_pool] = moneyMarket.mintTo(protocolSafety, LIQUIDITY_POOL_MARGIN_CALL_FEE);
        poolLiquidationITokens[_pool] = moneyMarket.mintTo(protocolSafety, LIQUIDITY_POOL_LIQUIDATION_FEE);
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
     * @dev Margin call a pool, only used by the protocolSafety.
     * @param _pool The MarginLiquidityPool.
     */
    function marginCallPool(MarginLiquidityPoolInterface _pool) public returns (uint256) {
        require(msg.sender == protocolSafety, "Only safety protocol can call this function");
        require(!isMarginCalled[_pool], "PM1");

        uint256 marginCallITokens = poolMarginCallITokens[_pool];

        isMarginCalled[_pool] = true;
        poolMarginCallITokens[_pool] = 0;

        return marginCallITokens;
    }

    /**
     * @dev Margin call a pool, only used by the protocolSafety.
     * @param _pool The MarginLiquidityPool.
     */
    function liquidatePool(MarginLiquidityPoolInterface _pool) public returns (uint256) {
        require(msg.sender == protocolSafety, "Only safety protocol can call this function");
        require(isMarginCalled[_pool], "PM1");

        uint256 liquidationCallITokens = poolLiquidationITokens[_pool];

        isMarginCalled[_pool] = false;
        poolLiquidationITokens[_pool] = 0;

        return liquidationCallITokens;
    }

    /**
     * @dev Make pool safe, only used by protocolSafety.
     * @param _pool The MarginLiquidityPool.
     */
    function makePoolSafe(MarginLiquidityPoolInterface _pool) public {
        require(msg.sender == protocolSafety, "Only safety protocol can call this function");
        require(isMarginCalled[_pool], "PS1");

        isMarginCalled[_pool] = false;
    }
}
