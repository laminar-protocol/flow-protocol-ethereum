## Functions:

- [`addFlowToken(contract SyntheticFlowToken token)`](#SyntheticFlowProtocol-addFlowToken-contract-SyntheticFlowToken-)

- [`mint(contract SyntheticFlowToken _token, contract SyntheticLiquidityPoolInterface _pool, uint256 _baseTokenAmount)`](#SyntheticFlowProtocol-mint-contract-SyntheticFlowToken-contract-SyntheticLiquidityPoolInterface-uint256-)

- [`mintWithMaxPrice(contract SyntheticFlowToken _token, contract SyntheticLiquidityPoolInterface _pool, uint256 _baseTokenAmount, uint256 _maxPrice)`](#SyntheticFlowProtocol-mintWithMaxPrice-contract-SyntheticFlowToken-contract-SyntheticLiquidityPoolInterface-uint256-uint256-)

- [`redeem(contract SyntheticFlowToken _token, contract SyntheticLiquidityPoolInterface _pool, uint256 _flowTokenAmount)`](#SyntheticFlowProtocol-redeem-contract-SyntheticFlowToken-contract-SyntheticLiquidityPoolInterface-uint256-)

- [`redeemWithMinPrice(contract SyntheticFlowToken _token, contract SyntheticLiquidityPoolInterface _pool, uint256 _flowTokenAmount, uint256 _minPrice)`](#SyntheticFlowProtocol-redeemWithMinPrice-contract-SyntheticFlowToken-contract-SyntheticLiquidityPoolInterface-uint256-uint256-)

- [`liquidate(contract SyntheticFlowToken token, contract SyntheticLiquidityPoolInterface pool, uint256 flowTokenAmount)`](#SyntheticFlowProtocol-liquidate-contract-SyntheticFlowToken-contract-SyntheticLiquidityPoolInterface-uint256-)

- [`addCollateral(contract SyntheticFlowToken token, address poolAddr, uint256 baseTokenAmount)`](#SyntheticFlowProtocol-addCollateral-contract-SyntheticFlowToken-address-uint256-)

- [`withdrawCollateral(contract SyntheticFlowToken token)`](#SyntheticFlowProtocol-withdrawCollateral-contract-SyntheticFlowToken-)

- [`deposit(contract SyntheticFlowToken token, uint256 flowTokenAmount)`](#SyntheticFlowProtocol-deposit-contract-SyntheticFlowToken-uint256-)

- [`withdraw(contract SyntheticFlowToken token, uint256 flowTokenAmount)`](#SyntheticFlowProtocol-withdraw-contract-SyntheticFlowToken-uint256-)

- [`getAskSpread(contract SyntheticLiquidityPoolInterface _pool, address _flowToken)`](#SyntheticFlowProtocol-getAskSpread-contract-SyntheticLiquidityPoolInterface-address-)

- [`getBidSpread(contract SyntheticLiquidityPoolInterface _pool, address _flowToken)`](#SyntheticFlowProtocol-getBidSpread-contract-SyntheticLiquidityPoolInterface-address-)

## Events:

- [`NewFlowToken(address token)`](#SyntheticFlowProtocol-NewFlowToken-address-)

- [`Minted(address sender, address token, address liquidityPool, uint256 baseTokenAmount, uint256 flowTokenAmount)`](#SyntheticFlowProtocol-Minted-address-address-address-uint256-uint256-)

- [`Redeemed(address sender, address token, address liquidityPool, uint256 baseTokenAmount, uint256 flowTokenAmount)`](#SyntheticFlowProtocol-Redeemed-address-address-address-uint256-uint256-)

- [`Liquidated(address sender, address token, address liquidityPool, uint256 baseTokenAmount, uint256 flowTokenAmount)`](#SyntheticFlowProtocol-Liquidated-address-address-address-uint256-uint256-)

- [`CollateralAdded(address token, address liquidityPool, uint256 baseTokenAmount, uint256 iTokenAmount)`](#SyntheticFlowProtocol-CollateralAdded-address-address-uint256-uint256-)

- [`CollateralWithdrew(address token, address liquidityPool, uint256 baseTokenAmount, uint256 iTokenAmount)`](#SyntheticFlowProtocol-CollateralWithdrew-address-address-uint256-uint256-)

- [`FlowTokenDeposited(address sender, address token, uint256 baseTokenAmount, uint256 flowTokenAmount)`](#SyntheticFlowProtocol-FlowTokenDeposited-address-address-uint256-uint256-)

- [`FlowTokenWithdrew(address sender, address token, uint256 baseTokenAmount, uint256 flowTokenAmount)`](#SyntheticFlowProtocol-FlowTokenWithdrew-address-address-uint256-uint256-)

### [Function `addFlowToken(contract SyntheticFlowToken token)`](#SyntheticFlowProtocol-addFlowToken-contract-SyntheticFlowToken-)

No description

### [Function `mint(contract SyntheticFlowToken _token, contract SyntheticLiquidityPoolInterface _pool, uint256 _baseTokenAmount) → uint256`](#SyntheticFlowProtocol-mint-contract-SyntheticFlowToken-contract-SyntheticLiquidityPoolInterface-uint256-)

No description

### [Function `mintWithMaxPrice(contract SyntheticFlowToken _token, contract SyntheticLiquidityPoolInterface _pool, uint256 _baseTokenAmount, uint256 _maxPrice) → uint256`](#SyntheticFlowProtocol-mintWithMaxPrice-contract-SyntheticFlowToken-contract-SyntheticLiquidityPoolInterface-uint256-uint256-)

No description

### [Function `redeem(contract SyntheticFlowToken _token, contract SyntheticLiquidityPoolInterface _pool, uint256 _flowTokenAmount) → uint256`](#SyntheticFlowProtocol-redeem-contract-SyntheticFlowToken-contract-SyntheticLiquidityPoolInterface-uint256-)

No description

### [Function `redeemWithMinPrice(contract SyntheticFlowToken _token, contract SyntheticLiquidityPoolInterface _pool, uint256 _flowTokenAmount, uint256 _minPrice) → uint256`](#SyntheticFlowProtocol-redeemWithMinPrice-contract-SyntheticFlowToken-contract-SyntheticLiquidityPoolInterface-uint256-uint256-)

No description

### [Function `liquidate(contract SyntheticFlowToken token, contract SyntheticLiquidityPoolInterface pool, uint256 flowTokenAmount) → uint256`](#SyntheticFlowProtocol-liquidate-contract-SyntheticFlowToken-contract-SyntheticLiquidityPoolInterface-uint256-)

No description

### [Function `addCollateral(contract SyntheticFlowToken token, address poolAddr, uint256 baseTokenAmount)`](#SyntheticFlowProtocol-addCollateral-contract-SyntheticFlowToken-address-uint256-)

No description

### [Function `withdrawCollateral(contract SyntheticFlowToken token) → uint256`](#SyntheticFlowProtocol-withdrawCollateral-contract-SyntheticFlowToken-)

No description

### [Function `deposit(contract SyntheticFlowToken token, uint256 flowTokenAmount)`](#SyntheticFlowProtocol-deposit-contract-SyntheticFlowToken-uint256-)

No description

### [Function `withdraw(contract SyntheticFlowToken token, uint256 flowTokenAmount)`](#SyntheticFlowProtocol-withdraw-contract-SyntheticFlowToken-uint256-)

No description

### [Function `getAskSpread(contract SyntheticLiquidityPoolInterface _pool, address _flowToken) → uint256`](#SyntheticFlowProtocol-getAskSpread-contract-SyntheticLiquidityPoolInterface-address-)

No description

### [Function `getBidSpread(contract SyntheticLiquidityPoolInterface _pool, address _flowToken) → uint256`](#SyntheticFlowProtocol-getBidSpread-contract-SyntheticLiquidityPoolInterface-address-)

No description

### Event `NewFlowToken(address token)` {#SyntheticFlowProtocol-NewFlowToken-address-}

No description

### Event `Minted(address sender, address token, address liquidityPool, uint256 baseTokenAmount, uint256 flowTokenAmount)` {#SyntheticFlowProtocol-Minted-address-address-address-uint256-uint256-}

No description

### Event `Redeemed(address sender, address token, address liquidityPool, uint256 baseTokenAmount, uint256 flowTokenAmount)` {#SyntheticFlowProtocol-Redeemed-address-address-address-uint256-uint256-}

No description

### Event `Liquidated(address sender, address token, address liquidityPool, uint256 baseTokenAmount, uint256 flowTokenAmount)` {#SyntheticFlowProtocol-Liquidated-address-address-address-uint256-uint256-}

No description

### Event `CollateralAdded(address token, address liquidityPool, uint256 baseTokenAmount, uint256 iTokenAmount)` {#SyntheticFlowProtocol-CollateralAdded-address-address-uint256-uint256-}

No description

### Event `CollateralWithdrew(address token, address liquidityPool, uint256 baseTokenAmount, uint256 iTokenAmount)` {#SyntheticFlowProtocol-CollateralWithdrew-address-address-uint256-uint256-}

No description

### Event `FlowTokenDeposited(address sender, address token, uint256 baseTokenAmount, uint256 flowTokenAmount)` {#SyntheticFlowProtocol-FlowTokenDeposited-address-address-uint256-uint256-}

No description

### Event `FlowTokenWithdrew(address sender, address token, uint256 baseTokenAmount, uint256 flowTokenAmount)` {#SyntheticFlowProtocol-FlowTokenWithdrew-address-address-uint256-uint256-}

No description
