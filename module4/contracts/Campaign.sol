// Contract Factory Pactice

pragma solidity ^0.4.6;

contract Campaign {
    
    address public owner;
    uint    public deadline; //block number
    uint    public goal; //wei
    uint    public fundsRaised;

    struct FunderStruct {
        address funder;
        uint amount;
    }
    
    event LogContribution(address sender, uint amount);
    event LogRefund(address funder, uint amount);
    event LogWithdrawal(address beneficiary, uint amount);

    FunderStruct[] public funderStructs;

    function Campaign(uint campaignDuration, uint campaignGoal){
        owner = msg.sender;
        deadline = block.number + campaignDuration;
        goal = campaignGoal;
    }
    
    function isSuccess()
        public
        constant
        returns(bool isIndeed)
    {
        return(fundsRaised >= goal);
    }

    function hasFailed()
        public
        constant
        returns(bool hasIndeed)
    {
        return(fundsRaised < goal && block.number > deadline);
    }

    function contribute() 
        public 
        payable 
        returns(bool success)
    {
        if(msg.value==0) throw;
        fundsRaised += msg.value;
        FunderStruct memory newFunder;
        newFunder.funder = msg.sender;
        newFunder.amount = msg.value;
        funderStructs.push(newFunder);
        LogContribution(msg.sender, msg.value);
        return true;
    }
    
    function withdrawFunds() 
        public 
        returns (bool success)
    {
        if(msg.sender != owner) throw;
        if(!isSuccess()) throw;
        uint amount = this.balance;
        if(!owner.send(amount)) throw;
        LogWithdrawal(owner, this.balance);
        return true;
    }
    
    function sendRefunds() 
        public 
        returns (bool success)
    {
        if(msg.sender != owner) throw;
        if(!hasFailed()) throw;

        uint funderCount = funderStructs.length;
        for(uint i=0; i<funderCount; i++){
            if(!funderStructs[i].funder.send(funderStructs[i].amount)) {
                
            }
            LogRefund(funderStructs[i].funder,funderStructs[i].amount);
        }
        return true;
    }
}
