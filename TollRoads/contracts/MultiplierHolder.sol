pragma solidity ^0.4.21;

import "./interfaces/MultiplierHolderI.sol";
import "./Owned.sol";

contract  MultiplierHolder is MultiplierHolderI, Owned {

    // vehicle types to multipliers
    mapping(uint => uint) private multipliers;

    function MultiplierHolder()
    public
    {
    }

    function setMultiplier(uint vehicleType, uint multiplier)
    fromOwner
    public
    returns(bool success)
    {
        require(vehicleType != 0);
        require(multipliers[vehicleType] != multiplier);

        multipliers[vehicleType] = multiplier;
        emit LogMultiplierSet(msg.sender, vehicleType, multiplier);
        return true;
    }

    function getMultiplier(uint vehicleType)
    constant
    public
    returns(uint multiplier)
    {
        return  multipliers[vehicleType];
    }
}