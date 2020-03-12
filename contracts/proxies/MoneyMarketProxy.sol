pragma solidity ^0.6.3;

import "../storages/MoneyMarketStorage.sol";

contract MoneyMarketProxy is MoneyMarketStorage {
    address public implementation;

    modifier onlyOwner() {
        require(owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    constructor(
        CErc20Interface _cToken,
        string memory _iTokenName,
        string memory _iTokenSymbol,
        uint256 _minLiquidity
    ) public MoneyMarketStorage(_cToken, _iTokenName, _iTokenSymbol, _minLiquidity, true) { }

    function upgradeTo(address _newImplementation) external onlyOwner {
        require(implementation != _newImplementation);
        _setImplementation(_newImplementation);
    }

    fallback() payable external {
        address impl = implementation;
        require(impl != address(0));

        assembly {
            let ptr := mload(0x40)
            calldatacopy(ptr, 0, calldatasize())
            let result := delegatecall(gas(), impl, ptr, calldatasize(), 0, 0)
            let size := returndatasize()
            returndatacopy(ptr, 0, size)
            
            switch result
            case 0 { revert(ptr, size) }
            default { return(ptr, size) }
        }
    }

    receive() payable external {
        revert('Contract cannot receive ETH!');
    }

    function _setImplementation(address _newImp) internal {
        implementation = _newImp;
    }
}