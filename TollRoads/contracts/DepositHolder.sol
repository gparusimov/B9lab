pragma solidity ^0.4.21;

import "./interfaces/DepositHolderI.sol";
import "./Owned.sol";

contract DepositHolder is DepositHolderI, Owned {
    uint private currentDeposit;

    function DepositHolder(uint _deposit)
    public
    {
        require(_deposit != 0);

        currentDeposit = _deposit;
    }

    function setDeposit(uint depositWeis)
    fromOwner
    public
    returns(bool success)
    {
        require(depositWeis != 0);
        require (currentDeposit != depositWeis);

        currentDeposit = depositWeis;
        emit LogDepositSet(msg.sender, depositWeis);
        return true;
    }

    function getDeposit()
    constant
    public
    returns(uint weis)
    {
        return currentDeposit;
    }
}