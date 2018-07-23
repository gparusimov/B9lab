const expectedExceptionPromise = require("../utils/expectedException.js");
web3.eth.getTransactionReceiptMined = require("../utils/getTransactionReceiptMined.js");
const Promise = require("bluebird");
Promise.allNamed = require("../utils/sequentialPromiseNamed.js");
const randomIntIn = require("../utils/randomIntIn.js");
const toBytes32 = require("../utils/toBytes32.js");

if (typeof web3.eth.getAccountsPromise === "undefined") {
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
}

const Regulator = artifacts.require("./Regulator.sol");
const TollBoothOperator = artifacts.require("./TollBoothOperator.sol");

contract('TollBoothOperator', function(accounts) {

    let regulatorOwner, operatorOwner,
        booth1, booth2,
        vehicle1, vehicle2,
        regulator, operator;
    const operatorDeposit = 10;
    let vehicleDeposit = 10;
    let vehicleDeposit2 =10;
    const vehicleType1 = 1;
    const vehicleType2 = 2;
    const multiplier1 = 1;
    const tmpSecret = randomIntIn(1, 1000);
    const secret1 = toBytes32(tmpSecret);
    const secret2 = toBytes32(tmpSecret+1000);

    let vehicleBalance1;
    let vehicleBalance2;

    let operatorBalance;

    let routePrice = 10;
    let refund = 0;
    const gas = 5000000;
    let hashed1, hashed2;

    before("should prepare", function() {
        assert.isAtLeast(accounts.length, 6);
        regulatorOwner = accounts[0];
        operatorOwner = accounts[6];
        vehicle1 = accounts[2];
        vehicle2 = accounts[3];
        booth1 = accounts[4];
        booth2 = accounts[5];
        return web3.eth.getBalancePromise(regulatorOwner)
            .then(balance => assert.isAtLeast(web3.fromWei(balance).toNumber(), 5));
    });

    describe("Scenarios 1-7", function() {

        function checkSetRoutePriceLogs(txRoutePrice, logsCount, logIndex, entryBooth, exitBooth, priceWeis) {
            assert.strictEqual(txRoutePrice.receipt.logs.length, logsCount);
            assert.strictEqual(txRoutePrice.logs.length, logsCount);
            assert.strictEqual(txRoutePrice.logs[logIndex].event, 'LogRoutePriceSet');
            const logRoutePrice = txRoutePrice.logs[logIndex].args;
            assert.strictEqual(operatorOwner, logRoutePrice.sender);
            assert.strictEqual(entryBooth, logRoutePrice.entryBooth);
            assert.strictEqual(exitBooth, logRoutePrice.exitBooth);
            assert.strictEqual(priceWeis, logRoutePrice.priceWeis.toNumber());
        }

        function checkEnterRoadLogs(txEnterRoad, logsCount, logIndex, entryBooth, hashed, vehicle, priceWeis) {
            assert.strictEqual(txEnterRoad.receipt.logs.length, logsCount);
            assert.strictEqual(txEnterRoad.logs.length, logsCount);
            assert.strictEqual(txEnterRoad.logs[logIndex].event, 'LogRoadEntered');
            const logEnterRoad = txEnterRoad.logs[logIndex].args;
            assert.strictEqual(vehicle, logEnterRoad.vehicle);
            assert.strictEqual(entryBooth, logEnterRoad.entryBooth);
            assert.strictEqual(hashed, logEnterRoad.exitSecretHashed);
            assert.strictEqual(priceWeis, logEnterRoad.depositedWeis.toNumber());
        }

        function checkExitRoadLogs(txExitRoad, logsCount, logIndex, exitBooth, finalFee,refund) {
            assert.strictEqual(txExitRoad.receipt.logs.length, logsCount);
            assert.strictEqual(txExitRoad.logs.length, logsCount);
            assert.strictEqual(txExitRoad.logs[logIndex].event, 'LogRoadExited');
            const logExitRoad = txExitRoad.logs[logIndex].args;
            assert.strictEqual(exitBooth, logExitRoad.exitBooth);
            assert.strictEqual(finalFee, logExitRoad.finalFee.toNumber());
            assert.strictEqual(refund, logExitRoad.refundWeis.toNumber());
        }

        function checkExitRoadPendingLogs(txExitRoadPending, logsCount, logIndex, entryBooth, exitBooth, hashed) {
            assert.strictEqual(txExitRoadPending.receipt.logs.length, logsCount);
            assert.strictEqual(txExitRoadPending.logs.length, logsCount);
            assert.strictEqual(txExitRoadPending.logs[logIndex].event, 'LogPendingPayment');
            const logExitRoadPending= txExitRoadPending.logs[logIndex].args;
            assert.strictEqual(entryBooth, logExitRoadPending.entryBooth);
            assert.strictEqual(exitBooth, logExitRoadPending.exitBooth);
            assert.strictEqual(hashed, logExitRoadPending.exitSecretHashed);
        }

        function checkWithdrawLogs(txWithdraw,  logsCount, logIndex, amount) {
            assert.strictEqual(txWithdraw.receipt.logs.length, logsCount);
            assert.strictEqual(txWithdraw.logs.length, logsCount);
            assert.strictEqual(txWithdraw.logs[logIndex].event, 'LogFeesCollected');
            const logWithdraw= txWithdraw.logs[logIndex].args;
            assert.strictEqual(operatorOwner, logWithdraw.owner);
            assert.strictEqual(amount, logWithdraw.amount.toNumber());

        }

        beforeEach("should deploy regulator and operator", function() {
            return Regulator.new({ from: regulatorOwner })
                .then(instance => regulator = instance)
                .then(() => regulator.setVehicleType(vehicle1, vehicleType1, { from: regulatorOwner }))
                .then(() => regulator.setVehicleType(vehicle2, vehicleType2, { from: regulatorOwner }))
                .then(tx => regulator.createNewOperator(operatorOwner, operatorDeposit, { from: regulatorOwner }))
                .then(tx => operator = TollBoothOperator.at(tx.logs[1].args.newOperator))
                .then(() => operator.addTollBooth(booth1, { from: operatorOwner }))
                .then(tx => operator.addTollBooth(booth2, { from: operatorOwner }))
                .then(tx => operator.setMultiplier(vehicleType1, multiplier1, { from: operatorOwner }))
                .then(tx => operator.setMultiplier(vehicleType2, multiplier1, { from: operatorOwner }))
                .then(tx => operator.setPaused(false, { from: operatorOwner }))
                .then(tx => operator.hashSecret(secret1))
                .then(hash => hashed1 = hash)
                .then(tx => operator.hashSecret(secret2))
                .then(hash => hashed2 = hash)
        });

        it('Scenario 1: should pay deposit equals route price and exit without refund', function () {
            return operator.setRoutePrice(booth1, booth2, routePrice, { from: operatorOwner })
                .then(txRoutePrice => {
                    checkSetRoutePriceLogs(txRoutePrice, 1, 0, booth1, booth2, routePrice);
                    return operator.enterRoad(booth1, hashed1, { from: vehicle1, gas: gas, value: vehicleDeposit});})
                .then((txEnterRoad) => {
                    checkEnterRoadLogs(txEnterRoad, 1, 0, booth1, hashed1, vehicle1, vehicleDeposit);
                    return web3.eth.getBalancePromise(vehicle1);})
                .then(balance => {vehicleBalance1 = balance})
                .then(() => operator.reportExitRoad.call(secret1, { from: booth2, gas: gas }))
                .then(res => assert.equal(res, 1))
                .then(() => operator.reportExitRoad(secret1, { from: booth2, gas: gas }))
                .then(txExitRoad => {
                    checkExitRoadLogs(txExitRoad, 1, 0, booth2, routePrice * multiplier1, refund);
                    return web3.eth.getBalancePromise(vehicle1);})
                .then(balance => assert.equal(balance.toString(), vehicleBalance1.toString(10)))
        });

        it('Scenario 2: should pay deposit less than the price route and exit without refund', function () {
            routePrice = 15;

            return operator.setRoutePrice(booth1, booth2, routePrice, { from: operatorOwner })
                .then(txRoutePrice => {
                    checkSetRoutePriceLogs(txRoutePrice, 1, 0, booth1, booth2, routePrice);
                    return operator.enterRoad(booth1, hashed1, { from: vehicle1, gas: gas, value: vehicleDeposit});})
                .then((txEnterRoad) => {
                    checkEnterRoadLogs(txEnterRoad, 1, 0, booth1, hashed1, vehicle1, vehicleDeposit);
                    return web3.eth.getBalancePromise(vehicle1);})
                .then(balance => {vehicleBalance1 = balance})
                .then(() => operator.reportExitRoad.call(secret1, { from: booth2, gas: gas }))
                .then(res => assert.equal(res, 1))
                .then(() => operator.reportExitRoad(secret1, { from: booth2, gas: gas }))
                .then(txExitRoad => {
                    checkExitRoadLogs(txExitRoad, 1, 0, booth2, vehicleDeposit, refund);
                    return web3.eth.getBalancePromise(vehicle1);})
                .then(balance => assert.equal(balance.toString(), vehicleBalance1.toString(10)))
        });

        it('Scenario 3: should pay price route value when deposit more than the price route and exit with refund', function () {
            routePrice = 6;
            refund = vehicleDeposit - routePrice;

            return operator.setRoutePrice(booth1, booth2, routePrice, { from: operatorOwner })
                .then(txRoutePrice => {
                    checkSetRoutePriceLogs(txRoutePrice, 1, 0, booth1, booth2, routePrice);
                    return operator.enterRoad(booth1, hashed1, { from: vehicle1, gas: gas, value: vehicleDeposit });})
                .then((txEnterRoad) => {
                    checkEnterRoadLogs(txEnterRoad, 1, 0, booth1, hashed1, vehicle1, vehicleDeposit);
                    return web3.eth.getBalancePromise(vehicle1);})
                .then(balance => {vehicleBalance1 = balance})
                .then(() => operator.reportExitRoad.call(secret1, { from: booth2, gas: gas }))
                .then(res => assert.equal(res, 1))
                .then(() => operator.reportExitRoad(secret1, { from: booth2, gas: gas }))
                .then(txExitRoad => {
                    checkExitRoadLogs(txExitRoad, 1, 0, booth2, routePrice * multiplier1, refund);
                    return web3.eth.getBalancePromise(vehicle1);})
                .then(balance => assert.equal(balance, vehicleBalance1.add(refund).toString(10)))
        });

        it('Scenario 4: should pay price route value when it less then vehicle deposit   and exit with refund', function () {
            routePrice = 10;
            vehicleDeposit = 14;
            refund = vehicleDeposit - routePrice;

            return operator.setRoutePrice(booth1, booth2, routePrice, { from: operatorOwner })
                .then(txRoutePrice => {
                    checkSetRoutePriceLogs(txRoutePrice, 1, 0, booth1, booth2, routePrice);
                    return operator.enterRoad(booth1, hashed1, { from: vehicle1, gas: gas, value: vehicleDeposit });})
                .then((txEnterRoad) => {
                    checkEnterRoadLogs(txEnterRoad, 1, 0, booth1, hashed1, vehicle1, vehicleDeposit);
                    return web3.eth.getBalancePromise(vehicle1);})
                .then(balance => {vehicleBalance1 = balance})
                .then(() => operator.reportExitRoad.call(secret1, { from: booth2, gas: gas }))
                .then(res => assert.equal(res, 1))
                .then(() => operator.reportExitRoad(secret1, { from: booth2, gas: gas }))
                .then(txExitRoad => {
                    checkExitRoadLogs(txExitRoad, 1, 0, booth2, routePrice * multiplier1, refund);
                    return web3.eth.getBalancePromise(vehicle1);})
                .then(balance => assert.equal(balance, vehicleBalance1.add(refund).toString(10)))
        });

        it('Scenario 5: should pay price route value when it less then vehicle deposit   and exit with refund', function () {
            routePrice = 11;
            vehicleDeposit = 14;
            refund = vehicleDeposit - routePrice;

            return operator.enterRoad(booth1, hashed1, { from: vehicle1, gas: gas, value: vehicleDeposit })
                .then((txEnterRoad) => {
                    checkEnterRoadLogs(txEnterRoad, 1, 0, booth1, hashed1, vehicle1, vehicleDeposit);
                    return web3.eth.getBalancePromise(vehicle1);})
                .then(balance => {vehicleBalance1 = balance})
                .then(() => operator.reportExitRoad(secret1, { from: booth2, gas: gas }))
                .then(txExitRoadPending => {
                    checkExitRoadPendingLogs(txExitRoadPending, 1, 0, booth1, booth2, hashed1);
                    return operator.getPendingPaymentCount(booth1, booth2);})
                .then(count => {
                    assert.strictEqual(count.toNumber(), 1);
                    return operator.setRoutePrice(booth1, booth2, routePrice, { from: operatorOwner });})
                .then(txRoutePrice => {
                    checkSetRoutePriceLogs(txRoutePrice, 2, 0, booth1, booth2, routePrice);
                    checkExitRoadLogs(txRoutePrice, 2, 1, booth2, routePrice * multiplier1, refund);
                    return web3.eth.getBalancePromise(vehicle1);})
                .then(balance => assert.equal(balance, vehicleBalance1.add(refund).toString(10)))
        });

        it('Scenario 6: should pay 2 vehicles 2 pending payments and exit with refunds', function () {
            routePrice = 6;
            vehicleDeposit = 14;
            let refund1 = vehicleDeposit - routePrice;
            let refund2 = vehicleDeposit2 - routePrice;

            return operator.enterRoad(booth1, hashed1, { from: vehicle1, gas: gas, value: vehicleDeposit })
                .then((txEnterRoad) => {
                    checkEnterRoadLogs(txEnterRoad, 1, 0, booth1, hashed1, vehicle1, vehicleDeposit);
                    return web3.eth.getBalancePromise(vehicle1);})
                .then(balance => {vehicleBalance1 = balance})
                .then(() => operator.reportExitRoad(secret1, { from: booth2, gas: gas }))
                .then(txExitRoadPending => {
                    checkExitRoadPendingLogs(txExitRoadPending, 1, 0, booth1, booth2, hashed1);
                    return operator.enterRoad(booth1, hashed2, { from: vehicle2, gas: gas, value: vehicleDeposit2 });})
                .then((txEnterRoad) => {
                    checkEnterRoadLogs(txEnterRoad, 1, 0, booth1, hashed2, vehicle2, vehicleDeposit2);
                    return web3.eth.getBalancePromise(vehicle2);})
                .then(balance => {vehicleBalance2 = balance})
                .then(() => operator.reportExitRoad(secret2, { from: booth2, gas: gas }))
                .then(txExitRoadPending => {
                    checkExitRoadPendingLogs(txExitRoadPending, 1, 0, booth1, booth2, hashed2);
                    return operator.getPendingPaymentCount(booth1, booth2);})
                .then(count => {
                    assert.strictEqual(count.toNumber(), 2);
                    return operator.setRoutePrice(booth1, booth2, routePrice, { from: operatorOwner });})
                .then(txRoutePrice => {
                    checkSetRoutePriceLogs(txRoutePrice, 2, 0, booth1, booth2, routePrice);
                    checkExitRoadLogs(txRoutePrice, 2, 1, booth2, routePrice * multiplier1, refund1);
                    return web3.eth.getBalancePromise(vehicle1);})
                .then(balance => {
                    assert.equal(balance, vehicleBalance1.add(refund1).toString(10));
                    return operator.getPendingPaymentCount(booth1, booth2);})
                .then(count => {
                    assert.strictEqual(count.toNumber(), 1);})
                .then(() => operator.clearSomePendingPayments(booth1, booth2, 1, { from: operatorOwner, gas: gas}))
                .then(txExitRoad => {
                    checkExitRoadLogs(txExitRoad, 1, 0, booth2, routePrice * multiplier1, refund2);
                    return web3.eth.getBalancePromise(vehicle2);})
                .then(balance => assert.equal(balance, vehicleBalance2.add(refund2).toString(10)))
                .then(() => operator.getCollectedFeesAmount())
                .then (amout => assert.strictEqual(amout.toNumber(), 2*routePrice))
        });

        it('Scenario 7: should pay 2 vehicles 2 pending payments, first with and second witout refund and withdraw all fees', function () {
            routePrice = 11;
            vehicleDeposit = 14;
            vehicleDeposit2 = 10;
            let refund1 = vehicleDeposit - routePrice;
            let refund2 = 0;

            return operator.enterRoad(booth1, hashed1, { from: vehicle1, gas: gas, value: vehicleDeposit })
                .then((txEnterRoad) => {
                    checkEnterRoadLogs(txEnterRoad, 1, 0, booth1, hashed1, vehicle1, vehicleDeposit);
                    return web3.eth.getBalancePromise(vehicle1);})
                .then(balance => {vehicleBalance1 = balance})
                .then(() => operator.reportExitRoad(secret1, { from: booth2, gas: gas }))
                .then(txExitRoadPending => {
                    checkExitRoadPendingLogs(txExitRoadPending, 1, 0, booth1, booth2, hashed1);
                    return operator.enterRoad(booth1, hashed2, { from: vehicle2, gas: gas, value: vehicleDeposit2 });})
                .then((txEnterRoad) => {
                    checkEnterRoadLogs(txEnterRoad, 1, 0, booth1, hashed2, vehicle2, vehicleDeposit2);
                    return web3.eth.getBalancePromise(vehicle2);})
                .then(balance => {vehicleBalance2 = balance})
                .then(() => operator.reportExitRoad(secret2, { from: booth2, gas: gas }))
                .then(txExitRoadPending => {
                    checkExitRoadPendingLogs(txExitRoadPending, 1, 0, booth1, booth2, hashed2);
                    return operator.getPendingPaymentCount(booth1, booth2);})
                .then(count => {
                    assert.strictEqual(count.toNumber(), 2);
                    return operator.setRoutePrice(booth1, booth2, routePrice, { from: operatorOwner });})
                .then(txRoutePrice => {
                    checkSetRoutePriceLogs(txRoutePrice, 2, 0, booth1, booth2, routePrice);
                    checkExitRoadLogs(txRoutePrice, 2, 1, booth2, routePrice * multiplier1, refund1);
                    return web3.eth.getBalancePromise(vehicle1);})
                .then(balance => {
                    assert.equal(balance, vehicleBalance1.add(refund1).toString(10));
                    return operator.getPendingPaymentCount(booth1, booth2);})
                .then(count => {
                    assert.strictEqual(count.toNumber(), 1);})
                .then(() => operator.clearSomePendingPayments(booth1, booth2, 1, { from: operatorOwner, gas: gas}))
                .then(txExitRoad => {
                    checkExitRoadLogs(txExitRoad, 1, 0, booth2, vehicleDeposit2, refund2);
                    return web3.eth.getBalancePromise(vehicle2);})
                .then(balance => assert.equal(balance, vehicleBalance2.add(refund2).toString(10)))
                .then(() => operator.getCollectedFeesAmount())
                .then (amout => {
                    assert.strictEqual(amout.toNumber(), routePrice + vehicleDeposit2);
                    return operator.withdrawCollectedFees({ from: operatorOwner, gas: gas})})
                .then ((txWithdraw) =>
                    checkWithdrawLogs(txWithdraw, 1, 0, routePrice + vehicleDeposit2))
        });

    });

});