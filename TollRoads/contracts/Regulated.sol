pragma solidity ^0.4.21;

import "./interfaces/RegulatedI.sol";

contract Regulated is RegulatedI {
    address private currentRegulator;

    modifier onlyRegulator {
        require(msg.sender == currentRegulator);
        _;
    }

    function Regulated( address _regulator)
    public
    {
     require(_regulator != address(0));
     currentRegulator = _regulator;
    }

    function setRegulator(address newRegulator)
    public
    onlyRegulator
    returns(bool success)
    {
        require(newRegulator != address(0));
        require(newRegulator != currentRegulator);

        address regulator = currentRegulator;
        currentRegulator = newRegulator;
        emit LogRegulatorSet(regulator, newRegulator);
        return true;
    }

    function getRegulator()
    constant
    public
    returns(RegulatorI regulator){

        return RegulatorI(currentRegulator);
    }
}