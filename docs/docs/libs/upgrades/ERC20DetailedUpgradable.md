Optional functions from the ERC20 standard.

# Functions:

- [`initialize(string name, string symbol, uint8 decimals)`](#ERC20DetailedUpgradable-initialize-string-string-uint8-)

- [`name()`](#ERC20DetailedUpgradable-name--)

- [`symbol()`](#ERC20DetailedUpgradable-symbol--)

- [`decimals()`](#ERC20DetailedUpgradable-decimals--)

# Function `initialize(string name, string symbol, uint8 decimals)` {#ERC20DetailedUpgradable-initialize-string-string-uint8-}

Sets the values for `name`, `symbol`, and `decimals`. All three of

these values are immutable: they can only be set once during

construction.

# Function `name() → string` {#ERC20DetailedUpgradable-name--}

Returns the name of the token.

# Function `symbol() → string` {#ERC20DetailedUpgradable-symbol--}

Returns the symbol of the token, usually a shorter version of the

name.

# Function `decimals() → uint8` {#ERC20DetailedUpgradable-decimals--}

Returns the number of decimals used to get its user representation.

For example, if `decimals` equals `2`, a balance of `505` tokens should

be displayed to a user as `5,05` (`505 / 10 ** 2`).

Tokens usually opt for a value of 18, imitating the relationship between

Ether and Wei.

NOTE: This information is only used for _display_ purposes: it in

no way affects any of the arithmetic of the contract, including

{IERC20-balanceOf} and {IERC20-transfer}.
