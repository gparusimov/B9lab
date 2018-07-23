pragma solidity ^0.4.21;

import "./interfaces/PausableI.sol";
import "./Owned.sol";


contract Pausable is PausableI, Owned {

    bool paused;

    function Pausable(bool _paused) public {
        paused = _paused;
    }

    modifier whenPaused {
        require(paused);
        _;
    }

    modifier whenNotPaused {
        require(!paused);
        _;
    }

    function setPaused(bool newState)
    public
    returns(bool success)
    {
        require(paused != newState);
        paused = newState;
        emit LogPausedSet(msg.sender, paused);
        return true;
    }

    function isPaused()
    constant
    public
    returns(bool isIndeed){
        return paused;
    }

}