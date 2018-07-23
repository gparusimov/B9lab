pragma solidity ^0.4.21;

import "./interfaces/OwnedI.sol";

contract Owned is OwnedI {
    address private owner;

    function Owned()
    public
    {
        owner = msg.sender;
    }

    modifier fromOwner
    {
        require(owner == msg.sender);
        _;
    }

    function setOwner(address newOwner)
    fromOwner
    public
    returns(bool success)
    {
        require(newOwner != 0);
        require(newOwner != owner);

        owner = newOwner;
        emit LogOwnerSet(msg.sender, owner);
        return true;
    }

    function getOwner()
    public
    view
    returns(address)
    {
        return owner;
    }
}