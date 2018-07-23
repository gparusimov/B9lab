pragma solidity ^0.4.21;

import "./interfaces/RegulatorI.sol";
import "./Owned.sol";
import "./TollBoothOperator.sol";

contract  Regulator is RegulatorI, Owned {

    mapping(address => uint) public vehicleToType;
    mapping(address => bool) private operators;

    function Regulator()
    public
    {

    }

    function setVehicleType(address vehicle, uint vehicleType)
    fromOwner
    public
    returns(bool success)
    {
        require(vehicle != address(0));
        require(vehicleType != 0);
        require(vehicleToType[vehicle] != vehicleType);

        vehicleToType[vehicle] = vehicleType;
        emit LogVehicleTypeSet(msg.sender, vehicle, vehicleType);

        return true;
    }

    function getVehicleType(address vehicle)
    constant
    public
    returns(uint vehicleType)
    {
        return vehicleToType[vehicle];
    }

    function createNewOperator(address owner, uint deposit)
    fromOwner
    public
    returns(TollBoothOperatorI newOperator)
    {
        require(owner != address(0));
        require(owner != getOwner());

        TollBoothOperator operator = new TollBoothOperator(true, deposit, address(this));
        operator.setOwner(owner);
        operators[operator] = true;

        emit LogTollBoothOperatorCreated(msg.sender, operator, owner, deposit);
        return operator;
    }

    function removeOperator(address operator)
    fromOwner
    public
    returns(bool success)
    {
        require(operator != address(0));
        require(operators[operator]);

        operators[operator] = false;
        emit LogTollBoothOperatorRemoved(msg.sender, operator);

        return true;
    }

    function isOperator(address operator)
    constant
    public
    returns(bool indeed)
    {
        return operators[operator];
    }
}