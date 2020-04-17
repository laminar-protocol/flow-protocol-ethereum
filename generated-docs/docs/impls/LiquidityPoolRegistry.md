## Functions:

- [`initialize(contract MoneyMarketInterface _moneyMarket, address _protocolSafety)`](#LiquidityPoolRegistry-initialize-contract-MoneyMarketInterface-address-)

- [`registerPool(contract LiquidityPoolInterface _pool)`](#LiquidityPoolRegistry-registerPool-contract-LiquidityPoolInterface-)

- [`verifyPool(contract LiquidityPoolInterface _pool)`](#LiquidityPoolRegistry-verifyPool-contract-LiquidityPoolInterface-)

- [`unverifyPool(contract LiquidityPoolInterface _pool)`](#LiquidityPoolRegistry-unverifyPool-contract-LiquidityPoolInterface-)

- [`marginCallPool(contract LiquidityPoolInterface _pool)`](#LiquidityPoolRegistry-marginCallPool-contract-LiquidityPoolInterface-)

- [`makePoolSafe(contract LiquidityPoolInterface _pool)`](#LiquidityPoolRegistry-makePoolSafe-contract-LiquidityPoolInterface-)

### [Function `initialize(contract MoneyMarketInterface _moneyMarket, address _protocolSafety)`](#LiquidityPoolRegistry-initialize-contract-MoneyMarketInterface-address-)

No description

### [Function `registerPool(contract LiquidityPoolInterface _pool)`](#LiquidityPoolRegistry-registerPool-contract-LiquidityPoolInterface-)

Register a new pool by sending the combined margin and liquidation fees.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `verifyPool(contract LiquidityPoolInterface _pool)`](#LiquidityPoolRegistry-verifyPool-contract-LiquidityPoolInterface-)

Verify a new pool, only for the owner.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `unverifyPool(contract LiquidityPoolInterface _pool)`](#LiquidityPoolRegistry-unverifyPool-contract-LiquidityPoolInterface-)

Unverify a pool, only for the owner.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `marginCallPool(contract LiquidityPoolInterface _pool)`](#LiquidityPoolRegistry-marginCallPool-contract-LiquidityPoolInterface-)

Margin call a pool, only used by the protocolSafety.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `makePoolSafe(contract LiquidityPoolInterface _pool)`](#LiquidityPoolRegistry-makePoolSafe-contract-LiquidityPoolInterface-)

Make pool safe, only used by protocolSafety.

#### Parameters:

- `_pool`: The MarginLiquidityPool.
