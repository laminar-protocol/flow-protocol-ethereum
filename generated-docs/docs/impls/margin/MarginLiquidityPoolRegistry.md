## Functions:

- [`initialize(struct MarginMarketLib.MarketData _market)`](#MarginLiquidityPoolRegistry-initialize-struct-MarginMarketLib-MarketData-)

- [`registerPool(contract MarginLiquidityPoolInterface _pool)`](#MarginLiquidityPoolRegistry-registerPool-contract-MarginLiquidityPoolInterface-)

- [`verifyPool(contract MarginLiquidityPoolInterface _pool)`](#MarginLiquidityPoolRegistry-verifyPool-contract-MarginLiquidityPoolInterface-)

- [`unverifyPool(contract MarginLiquidityPoolInterface _pool)`](#MarginLiquidityPoolRegistry-unverifyPool-contract-MarginLiquidityPoolInterface-)

- [`marginCallPool(contract MarginLiquidityPoolInterface _pool)`](#MarginLiquidityPoolRegistry-marginCallPool-contract-MarginLiquidityPoolInterface-)

- [`liquidatePool(contract MarginLiquidityPoolInterface _pool)`](#MarginLiquidityPoolRegistry-liquidatePool-contract-MarginLiquidityPoolInterface-)

- [`makePoolSafe(contract MarginLiquidityPoolInterface _pool)`](#MarginLiquidityPoolRegistry-makePoolSafe-contract-MarginLiquidityPoolInterface-)

### [Function `initialize(struct MarginMarketLib.MarketData _market)`](#MarginLiquidityPoolRegistry-initialize-struct-MarginMarketLib-MarketData-)

No description

### [Function `registerPool(contract MarginLiquidityPoolInterface _pool)`](#MarginLiquidityPoolRegistry-registerPool-contract-MarginLiquidityPoolInterface-)

Register a new pool by sending the combined margin and liquidation fees.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `verifyPool(contract MarginLiquidityPoolInterface _pool)`](#MarginLiquidityPoolRegistry-verifyPool-contract-MarginLiquidityPoolInterface-)

Verify a new pool, only for the owner.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `unverifyPool(contract MarginLiquidityPoolInterface _pool)`](#MarginLiquidityPoolRegistry-unverifyPool-contract-MarginLiquidityPoolInterface-)

Unverify a pool, only for the owner.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `marginCallPool(contract MarginLiquidityPoolInterface _pool) → uint256`](#MarginLiquidityPoolRegistry-marginCallPool-contract-MarginLiquidityPoolInterface-)

Margin call a pool, only used by the address(market.protocolSafety).

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `liquidatePool(contract MarginLiquidityPoolInterface _pool) → uint256`](#MarginLiquidityPoolRegistry-liquidatePool-contract-MarginLiquidityPoolInterface-)

Margin call a pool, only used by the address(market.protocolSafety).

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `makePoolSafe(contract MarginLiquidityPoolInterface _pool)`](#MarginLiquidityPoolRegistry-makePoolSafe-contract-MarginLiquidityPoolInterface-)

Make pool safe, only used by address(market.protocolSafety).

#### Parameters:

- `_pool`: The MarginLiquidityPool.
