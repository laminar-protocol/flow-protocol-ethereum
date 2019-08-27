pragma solidity ^0.5.8;

import "../interfaces/FlowProtocol.sol";

contract ProtocolOwnable {
    FlowProtocol private _protocol;

    constructor () internal {
        _protocol = FlowProtocol(msg.sender);
    }

    function protocol() public view returns (FlowProtocol) {
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
