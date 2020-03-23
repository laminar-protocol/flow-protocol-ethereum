Contract module that helps prevent reentrant calls to a function.

Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier

available, which can be applied to functions to make sure there are no nested

(reentrant) calls to them.

Note that because there is a single `nonReentrant` guard, functions marked as

`nonReentrant` may not call one another. This can be worked around by making

those functions `private`, and then adding `external` `nonReentrant` entry

points to them.

# Functions:

- [`initialize()`](#UpgradeReentrancyGuard-initialize--)

# Function `initialize()` {#UpgradeReentrancyGuard-initialize--}

No description
