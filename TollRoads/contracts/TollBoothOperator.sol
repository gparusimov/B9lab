pragma solidity ^0.4.21;

import "./interfaces/TollBoothOperatorI.sol";
import "./Regulated.sol";
import "./Pausable.sol";
import "./DepositHolder.sol";
import "./TollBoothHolder.sol";
import "./MultiplierHolder.sol";
import "./RoutePriceHolder.sol";
import "./Regulator.sol";

contract TollBoothOperator is TollBoothOperatorI, Owned, Pausable, DepositHolder, TollBoothHolder,
                              MultiplierHolder, RoutePriceHolder,  Regulated {
    uint collectedFee;

    struct VehicleEntryStruct {
        address vehicle;
        address entryBooth;
        uint deposit;
    }

    struct PendingPaymentStruct {
        bytes32[] hashedSecrets;
        uint currentIndex;
    }
    mapping (bytes32 => VehicleEntryStruct) private vehicleTrips;
    mapping(address => mapping(address => PendingPaymentStruct)) pendingPayments;


    function TollBoothOperator(bool _paused, uint _deposit, address _regulator)
    Pausable(_paused)
    DepositHolder(_deposit)
    Regulated(_regulator)
    public
    {
    }

    function hashSecret(bytes32 secret)
    constant
    public
    returns(bytes32 hashed){
        require(secret != 0);

        return keccak256(secret);
    }

    function enterRoad(address entryBooth, bytes32 exitSecretHashed)
    whenNotPaused
    public
    payable
    returns (bool success)
    {
        require(msg.sender != 0);
        require(isTollBooth(entryBooth));

        uint vehicleType = getRegulator().getVehicleType(msg.sender);
        require(vehicleType != 0);

        uint multiplier = getMultiplier(vehicleType);
        require(multiplier != 0);
        require(msg.value >= getDeposit() * multiplier);
        require(vehicleTrips[exitSecretHashed].vehicle == address(0));

        VehicleEntryStruct memory newVehicleTrip = VehicleEntryStruct(msg.sender, entryBooth, msg.value);
        vehicleTrips[exitSecretHashed] = newVehicleTrip;
        emit LogRoadEntered( msg.sender, entryBooth, exitSecretHashed, msg.value);
        return true;
    }

    function getVehicleEntry(bytes32 exitSecretHashed)
    constant
    public
    returns(address vehicle, address entryBooth, uint depositedWeis)
    {
        return(vehicleTrips[exitSecretHashed].vehicle,
        vehicleTrips[exitSecretHashed].entryBooth,
        vehicleTrips[exitSecretHashed].deposit);
    }

    function reportExitRoad(bytes32 exitSecretClear)
    whenNotPaused
    public
    returns (uint status)
    {
        address exitBooth = msg.sender;
        require(exitBooth != 0);
        require(isTollBooth(exitBooth));

        require(exitSecretClear != 0);
        bytes32 hashedSecret = hashSecret(exitSecretClear);
        VehicleEntryStruct storage vehicleTrip =  vehicleTrips[hashedSecret];

        require(vehicleTrip.vehicle != address(0));
        uint vehicleType = getRegulator().getVehicleType(vehicleTrip.vehicle);
        require(vehicleType != 0);

        uint multiplier = getMultiplier(vehicleType);
        require(multiplier != 0);
        require(exitBooth != vehicleTrip.entryBooth);

        //the secret hasn't already been reported on exit
        require(vehicleTrip.deposit != 0);
        uint price = getRoutePrice(vehicleTrip.entryBooth, exitBooth);

        if(price > 0) {
            roadExitedPayment(exitBooth, hashedSecret, price * multiplier);
            return 1;
        } else {
            pendingPayments[vehicleTrip.entryBooth][exitBooth].hashedSecrets.push(hashedSecret);
            emit LogPendingPayment(hashedSecret, vehicleTrip.entryBooth, exitBooth);
            return 2;
        }

    }

    function roadExitedPayment(address _exitBooth, bytes32 _exitSecretHashed, uint _totalFee)
    private
    {

        VehicleEntryStruct storage vehicleTrip =  vehicleTrips[_exitSecretHashed];
        uint deposit = vehicleTrip.deposit;
        require(deposit > 0);
        uint change = _totalFee < deposit ? deposit - _totalFee : 0;
        uint finalFee = _totalFee < deposit ? deposit - change : deposit;
        collectedFee += finalFee;
        vehicleTrip.deposit = 0;

        emit LogRoadExited(_exitBooth, _exitSecretHashed, finalFee, change);

        if (change > 0) {
            vehicleTrip.vehicle.transfer(change);
        }
    }

    function getPendingPaymentCount(address entryBooth, address exitBooth)
    constant
    public
    returns (uint count){
        PendingPaymentStruct memory pending = pendingPayments[entryBooth][exitBooth];
        return pending.hashedSecrets.length - pending.currentIndex;
    }

    function clearSomePendingPayments(address entryBooth, address exitBooth, uint count)
    whenNotPaused
    public
    returns (bool success){
        uint pendingCount = getPendingPaymentCount(entryBooth, exitBooth);
        require(pendingCount != 0);
        require(entryBooth != address(0));
        require(exitBooth != address(0));
        require(isTollBooth(entryBooth) && isTollBooth(exitBooth));
        require(count > 0);
        require(count <= pendingCount);

        uint price = getRoutePrice(entryBooth, exitBooth);
        require(price > 0);

        PendingPaymentStruct storage pending = pendingPayments[entryBooth][exitBooth];
        for (uint i = 0; i < count; i++) {
            bytes32 hashedSecret = pending.hashedSecrets[pending.currentIndex];
            VehicleEntryStruct storage vehicleTrip =  vehicleTrips[hashedSecret];

            uint vehicleType = getRegulator().getVehicleType(vehicleTrip.vehicle);
            require(vehicleType != 0);

            uint multiplier = getMultiplier(vehicleType);
            require(multiplier > 0);

            //the deposit hasn't already been transfered on exit
            require(vehicleTrip.deposit != 0);
            roadExitedPayment(exitBooth, hashedSecret, price * multiplier);
            pending.currentIndex ++;
        }

        return true;
    }

    function getCollectedFeesAmount()
    constant
    public
    returns(uint amount)
    {
        return collectedFee;
    }

    function withdrawCollectedFees()
    fromOwner
    public
    returns(bool success)
    {
        require(collectedFee > 0);
        uint collectedFeeAmount = collectedFee;
        collectedFee = 0;
        emit LogFeesCollected(msg.sender, collectedFeeAmount);
        msg.sender.transfer(collectedFeeAmount);
        return true;
    }

    function setRoutePrice(address entryBooth, address exitBooth, uint priceWeis)
    public
    returns(bool success)
    {
        require(super.setRoutePrice(entryBooth, exitBooth, priceWeis));

        if (getPendingPaymentCount(entryBooth, exitBooth) >= 1) {PendingPaymentStruct storage pending = pendingPayments[entryBooth][exitBooth];
            require(priceWeis > 0);
            bytes32 hashedSecret = pending.hashedSecrets[pending.currentIndex];
            VehicleEntryStruct storage vehicleTrip =  vehicleTrips[hashedSecret];
            uint vehicleType = getRegulator().getVehicleType(vehicleTrip.vehicle);
            require(vehicleType != 0);

            uint multiplier = getMultiplier(vehicleType);
            require(multiplier > 0);

            //the deposit hasn't already been transfered on exit
            require(vehicleTrip.deposit != 0);
            roadExitedPayment(exitBooth, hashedSecret,  priceWeis * multiplier);
            pending.currentIndex ++;
        }
        return true;
    }

    function ()
    payable
    public
    {
        revert();
    }
}