pragma solidity ^0.6.3;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./LaminarStorage.sol";

contract LaminarUpgrade is Ownable {

    event ContractUpgraded (
        address indexed _oldContractAddress,
        address indexed _newContractAddress,
        bytes32 indexed _name,
        uint256 created
    );

    event ContractAdded (
        address indexed _contractAddress,
        bytes32 indexed _name,
        uint256 created
    );
    
    LaminarStorage laminarStorage = LaminarStorage(0);

    constructor(address _laminarStorageAddress) public {
        laminarStorage = LaminarStorage(_laminarStorageAddress);
    }

    function getContractAddress(string memory _contractName) public view returns(address) { 
        address contractAddress = laminarStorage.getAddress(keccak256(abi.encodePacked("contract.name", _contractName)));
        require(address(contractAddress) != address(0x0), "Contract not found!");

        return contractAddress;
    }

    function addContract(string memory _name, address _contractAddress) /* TODO access control */ public {
        require(_contractAddress != address(0x0), "Invalid contract address");

        address existingContractName = laminarStorage.getAddress(keccak256(abi.encodePacked("contract.name", _name)));
        require(existingContractName == address(0x0), "Contract name is already in use");
        
        address existingContractAddress = laminarStorage.getAddress(keccak256(abi.encodePacked("contract.address", _contractAddress)));
        require(existingContractAddress == address(0x0), "Contract address is already in use");

        laminarStorage.setAddress(keccak256(abi.encodePacked("contract.name", _name)), _contractAddress);
        laminarStorage.setAddress(keccak256(abi.encodePacked("contract.address", _contractAddress)), _contractAddress);

        emit ContractAdded(_contractAddress, keccak256(abi.encodePacked(_name)), now);
    }

    function upgradeContract(string memory _name, address _upgradedContractAddress, bool _forceEther, bool _forceTokens) onlyOwner public {
        address oldContractAddress = laminarStorage.getAddress(keccak256(abi.encodePacked("contract.name", _name)));

        require(oldContractAddress != address(0x0), "Contract name does not exist");
        require(oldContractAddress != _upgradedContractAddress, "Upgraded contract address must not be existing contract address");

        require(oldContractAddress != getContractAddress("notUpgradableContractName1"), "Cannot upgrade this contract!"); // TODO
        require(oldContractAddress != getContractAddress("notUpgradableContractName2"), "Cannot upgrade this contract!"); // TODO

        if (!_forceEther) {
            require(oldContractAddress.balance == 0, "Existing contract has an ether balance!");
        }
        if (!_forceTokens) {
            IERC20 tokenContract = IERC20(getContractAddress("DAI"));
            require(tokenContract.balanceOf(oldContractAddress) == 0, "Existing contract has DAI balance!");
        }

        laminarStorage.setAddress(keccak256(abi.encodePacked("contract.name", _name)), _upgradedContractAddress);
        laminarStorage.deleteAddress(keccak256(abi.encodePacked("contract.address", oldContractAddress)));

        // used for access control in LaminarStorage
        laminarStorage.setAddress(keccak256(abi.encodePacked("contract.address", _upgradedContractAddress)), _upgradedContractAddress);
        
        emit ContractUpgraded(oldContractAddress, _upgradedContractAddress, keccak256(abi.encodePacked(_name)), now);
    }
}