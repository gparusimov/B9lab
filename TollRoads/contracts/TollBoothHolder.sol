pragma solidity ^0.4.21;

import "./interfaces/TollBoothHolderI.sol";
import "./Owned.sol";

contract TollBoothHolder is TollBoothHolderI, Owned {
    mapping(address => bool) tollBooths;

    function TollBoothHolder()
    public
    {
    }

    function addTollBooth(address tollBooth)
    fromOwner
    public
    returns(bool success)
    {
        require(tollBooth != address(0));
        require(!tollBooths[tollBooth]);

        tollBooths[tollBooth] = true;
        emit LogTollBoothAdded(msg.sender, tollBooth);
        return true;
    }

    function isTollBooth(address tollBooth)
    constant
    public
    returns(bool isIndeed)
    {
        return tollBooths[tollBooth];
    }

    function removeTollBooth(address tollBooth)
    fromOwner
    public
    returns(bool success)
    {
        require(tollBooth !=  address(0));
        require(tollBooths[tollBooth]);

        tollBooths[tollBooth] = false;
        emit LogTollBoothRemoved(msg.sender, tollBooth);
        return true;
    }
}