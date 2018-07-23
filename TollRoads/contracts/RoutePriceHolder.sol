pragma solidity ^0.4.21;

import "./interfaces/RoutePriceHolderI.sol";
import "./Owned.sol";
import "./TollBoothHolder.sol";

contract RoutePriceHolder is RoutePriceHolderI, TollBoothHolderI, Owned {
    // map route from entryBooth to exitBooth to price
    mapping(address => mapping(address => uint)) routePrices;

    function RoutePriceHolder()
    public
    {
    }

    function setRoutePrice(address entryBooth, address exitBooth, uint priceWeis)
    fromOwner
    public
    returns(bool success)
    {
        require(entryBooth != address(0) && exitBooth != address(0));
        require(isTollBooth(entryBooth) && isTollBooth(exitBooth));
        require(entryBooth != exitBooth);
        require(routePrices[entryBooth][exitBooth] != priceWeis);
        routePrices[entryBooth][exitBooth] = priceWeis;

        emit LogRoutePriceSet(msg.sender, entryBooth, exitBooth, priceWeis);
        return true;
    }

    function getRoutePrice(address entryBooth, address exitBooth)
    constant
    public
    returns(uint priceWeis)
    {
        return routePrices[entryBooth][exitBooth];
    }
}