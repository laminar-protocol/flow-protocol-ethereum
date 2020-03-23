## Functions:

- [`addFlowToken(contract FlowToken token)`](#FlowProtocol-addFlowToken-contract-FlowToken-)

- [`mint(contract FlowToken _token, contract LiquidityPoolInterface _pool, uint256 _baseTokenAmount)`](#FlowProtocol-mint-contract-FlowToken-contract-LiquidityPoolInterface-uint256-)

- [`mintWithMaxPrice(contract FlowToken _token, contract LiquidityPoolInterface _pool, uint256 _baseTokenAmount, uint256 _maxPrice)`](#FlowProtocol-mintWithMaxPrice-contract-FlowToken-contract-LiquidityPoolInterface-uint256-uint256-)

- [`redeem(contract FlowToken _token, contract LiquidityPoolInterface _pool, uint256 _flowTokenAmount)`](#FlowProtocol-redeem-contract-FlowToken-contract-LiquidityPoolInterface-uint256-)

- [`redeemWithMinPrice(contract FlowToken _token, contract LiquidityPoolInterface _pool, uint256 _flowTokenAmount, uint256 _minPrice)`](#FlowProtocol-redeemWithMinPrice-contract-FlowToken-contract-LiquidityPoolInterface-uint256-uint256-)

- [`liquidate(contract FlowToken token, contract LiquidityPoolInterface pool, uint256 flowTokenAmount)`](#FlowProtocol-liquidate-contract-FlowToken-contract-LiquidityPoolInterface-uint256-)

- [`addCollateral(contract FlowToken token, address poolAddr, uint256 baseTokenAmount)`](#FlowProtocol-addCollateral-contract-FlowToken-address-uint256-)

- [`withdrawCollateral(contract FlowToken token)`](#FlowProtocol-withdrawCollateral-contract-FlowToken-)

- [`deposit(contract FlowToken token, uint256 flowTokenAmount)`](#FlowProtocol-deposit-contract-FlowToken-uint256-)

- [`withdraw(contract FlowToken token, uint256 flowTokenAmount)`](#FlowProtocol-withdraw-contract-FlowToken-uint256-)

## Events:

- [`NewFlowToken(address token)`](#FlowProtocol-NewFlowToken-address-)

- [`Minted(address sender, address token, address liquidityPool, uint256 baseTokenAmount, uint256 flowTokenAmount)`](#FlowProtocol-Minted-address-address-address-uint256-uint256-)

- [`Redeemed(address sender, address token, address liquidityPool, uint256 baseTokenAmount, uint256 flowTokenAmount)`](#FlowProtocol-Redeemed-address-address-address-uint256-uint256-)

- [`Liquidated(address sender, address token, address liquidityPool, uint256 baseTokenAmount, uint256 flowTokenAmount)`](#FlowProtocol-Liquidated-address-address-address-uint256-uint256-)

- [`CollateralAdded(address token, address liquidityPool, uint256 baseTokenAmount, uint256 iTokenAmount)`](#FlowProtocol-CollateralAdded-address-address-uint256-uint256-)

- [`CollateralWithdrew(address token, address liquidityPool, uint256 baseTokenAmount, uint256 iTokenAmount)`](#FlowProtocol-CollateralWithdrew-address-address-uint256-uint256-)

- [`FlowTokenDeposited(address sender, address token, uint256 baseTokenAmount, uint256 flowTokenAmount)`](#FlowProtocol-FlowTokenDeposited-address-address-uint256-uint256-)

- [`FlowTokenWithdrew(address sender, address token, uint256 baseTokenAmount, uint256 flowTokenAmount)`](#FlowProtocol-FlowTokenWithdrew-address-address-uint256-uint256-)

### [Function `addFlowToken(contract FlowToken token)`](#FlowProtocol-addFlowToken-contract-FlowToken-)

No description

### [Function `mint(contract FlowToken _token, contract LiquidityPoolInterface _pool, uint256 _baseTokenAmount) → uint256`](#FlowProtocol-mint-contract-FlowToken-contract-LiquidityPoolInterface-uint256-)

No description

### [Function `mintWithMaxPrice(contract FlowToken _token, contract LiquidityPoolInterface _pool, uint256 _baseTokenAmount, uint256 _maxPrice) → uint256`](#FlowProtocol-mintWithMaxPrice-contract-FlowToken-contract-LiquidityPoolInterface-uint256-uint256-)

No description

### [Function `redeem(contract FlowToken _token, contract LiquidityPoolInterface _pool, uint256 _flowTokenAmount) → uint256`](#FlowProtocol-redeem-contract-FlowToken-contract-LiquidityPoolInterface-uint256-)

No description

### [Function `redeemWithMinPrice(contract FlowToken _token, contract LiquidityPoolInterface _pool, uint256 _flowTokenAmount, uint256 _minPrice) → uint256`](#FlowProtocol-redeemWithMinPrice-contract-FlowToken-contract-LiquidityPoolInterface-uint256-uint256-)

No description

### [Function `liquidate(contract FlowToken token, contract LiquidityPoolInterface pool, uint256 flowTokenAmount) → uint256`](#FlowProtocol-liquidate-contract-FlowToken-contract-LiquidityPoolInterface-uint256-)

No description

### [Function `addCollateral(contract FlowToken token, address poolAddr, uint256 baseTokenAmount)`](#FlowProtocol-addCollateral-contract-FlowToken-address-uint256-)

No description

### [Function `withdrawCollateral(contract FlowToken token) → uint256`](#FlowProtocol-withdrawCollateral-contract-FlowToken-)

No description

### [Function `deposit(contract FlowToken token, uint256 flowTokenAmount)`](#FlowProtocol-deposit-contract-FlowToken-uint256-)

No description

### [Function `withdraw(contract FlowToken token, uint256 flowTokenAmount)`](#FlowProtocol-withdraw-contract-FlowToken-uint256-)

No description

### Event `NewFlowToken(address token)` {#FlowProtocol-NewFlowToken-address-}

No description

### Event `Minted(address sender, address token, address liquidityPool, uint256 baseTokenAmount, uint256 flowTokenAmount)` {#FlowProtocol-Minted-address-address-address-uint256-uint256-}

No description

### Event `Redeemed(address sender, address token, address liquidityPool, uint256 baseTokenAmount, uint256 flowTokenAmount)` {#FlowProtocol-Redeemed-address-address-address-uint256-uint256-}

No description

### Event `Liquidated(address sender, address token, address liquidityPool, uint256 baseTokenAmount, uint256 flowTokenAmount)` {#FlowProtocol-Liquidated-address-address-address-uint256-uint256-}

No description

### Event `CollateralAdded(address token, address liquidityPool, uint256 baseTokenAmount, uint256 iTokenAmount)` {#FlowProtocol-CollateralAdded-address-address-uint256-uint256-}

No description

### Event `CollateralWithdrew(address token, address liquidityPool, uint256 baseTokenAmount, uint256 iTokenAmount)` {#FlowProtocol-CollateralWithdrew-address-address-uint256-uint256-}

No description

### Event `FlowTokenDeposited(address sender, address token, uint256 baseTokenAmount, uint256 flowTokenAmount)` {#FlowProtocol-FlowTokenDeposited-address-address-uint256-uint256-}

No description

### Event `FlowTokenWithdrew(address sender, address token, uint256 baseTokenAmount, uint256 flowTokenAmount)` {#FlowProtocol-FlowTokenWithdrew-address-address-uint256-uint256-}

No description
