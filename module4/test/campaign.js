var Campaign = artifacts.require("./Campaign.sol");

contract('Campaign', function(accounts) {

  var contract
  var goal = 1000;
  var duration = 10;
  var expectedDeadline;

  var owner = accounts[0];
  var funder1 = accounts[1];  var contribution1 = 1;
  var funder2 = accounts[2];  var contribution2 = 10;

  beforeEach(function(){
    return Campaign.new(duration, goal, {from: owner})
    .then(function(instance)  {
      contract = instance;
      expectedDeadline = web3.eth.blockNumber + duration;
    });
  });

  it("should just say hello", function() {
    assert.strictEqual(true,true,"Something is wrong.");
  });

  it("should be owned by owner", function() {
    return contract.owner({from: owner})
    .then(function(_owner){
      assert.strictEqual(_owner, owner,"Contract is not by owner");
    });
  });

  it("should have a deadline", function() {
    return contract.deadline({from: owner})
    .then(function(_deadline) {
      assert.equal(_deadline.toString(10),expectedDeadline,"Deadline is incorrect");
    });
  });

  it("it should process contributions", function(){
    var fundsRaised;
    var funder1Contribution;
    var funder2Contribution;
    return contract.contribute({from: funder1, value: contribution1})
    .then(function(txn) {
      return contract.contribute({from: funder2, value: contribution2})
      .then(function(txtn) {
        return contract.fundsRaised({from: owner});
      })
      .then(function(_raised) {
        fundsRaised = _raised;
        return contract.funderStructs(0,{from:owner});
      })
      .then(function(_funder1) {
        funder1Contribution = _funder1[1].toString(10);
        return contract.funderStructs(1,{from: owner});
      })
      .then(function(_funder2) {
        funder2Contribution = _funder2[1].toString(10);
        assert.equal(fundsRaised.toString(10), contribution1 = contribution2, "Funds rasied is incorrect.");
        asser.equal(funder1Contribution, contribution1, "Funder 1's contribution was not tracked.");
        asser.equal(funder2Contribution, contribution2, "Funder 2's contribution was not tracked.");
        return contract.isSuccess({from:owner});
      })
      .then(function(_isSuccess) {
        assert.strictEqual(_isSuccess, false, "Project was declared success early.");
        return contract.hasFailed({from: owner});
      })
      .then(function(_hasFailed) {
        assert.strictEqual(_hasFailed, false, "Project was declared failed early.");
      });
    });
  });

});

