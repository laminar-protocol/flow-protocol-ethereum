Contract module which provides a basic access control mechanism, where

there is an account (an owner) that can be granted exclusive access to

specific functions.

This module is used through inheritance. It will make available the modifier

`onlyOwner`, which can be aplied to your functions to restrict their use to

the owner.

# Functions:

- [`initialize(address sender)`](#UpgradeOwnable-initialize-address-)

- [`owner()`](#UpgradeOwnable-owner--)

- [`isOwner()`](#UpgradeOwnable-isOwner--)

- [`renounceOwnership()`](#UpgradeOwnable-renounceOwnership--)

- [`transferOwnership(address newOwner)`](#UpgradeOwnable-transferOwnership-address-)

# Events:

- [`OwnershipTransferred(address previousOwner, address newOwner)`](#UpgradeOwnable-OwnershipTransferred-address-address-)

# Function `initialize(address sender)` {#UpgradeOwnable-initialize-address-}

Initializes the contract setting the deployer as the initial owner.

# Function `owner() → address` {#UpgradeOwnable-owner--}

Returns the address of the current owner.

# Function `isOwner() → bool` {#UpgradeOwnable-isOwner--}

Returns true if the caller is the current owner.

# Function `renounceOwnership()` {#UpgradeOwnable-renounceOwnership--}

Leaves the contract without owner. It will not be possible to call

`onlyOwner` functions anymore. Can only be called by the current owner.

> Note: Renouncing ownership will leave the contract without an owner,

thereby removing any functionality that is only available to the owner.

# Function `transferOwnership(address newOwner)` {#UpgradeOwnable-transferOwnership-address-}

Transfers ownership of the contract to a new account (`newOwner`).

Can only be called by the current owner.

# Event `OwnershipTransferred(address previousOwner, address newOwner)` {#UpgradeOwnable-OwnershipTransferred-address-address-}

No description
