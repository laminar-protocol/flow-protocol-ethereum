pragma solidity ^0.5.8;

contract ProtocolOwnable {
    address private _protocol;

    constructor () internal {
        _protocol = msg.sender;
    }

    function protocol() public view returns (address) {
        return _protocol;
    }

    modifier onlyProtocol() {
        require(isProtocol(), "Ownable: caller is not the owner");
        _;
    }

    function isProtocol() public view returns (bool) {
        return msg.sender == address(_protocol);
    }
}
