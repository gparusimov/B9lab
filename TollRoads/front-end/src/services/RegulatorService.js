import { CONFIG } from '../util/config'


export const getBalance = async (address) => {
    const balance = await CONFIG.web3.eth.getBalance(address);
    return balance.toString(10)
};

export const setVehicleType = async (vehicle, _type, _regulator, gas) => {
    return await  executeTransaction(() => CONFIG.regulatorInstance.setVehicleType(vehicle, _type, { from: _regulator, gas: gas }))
};

export const createNewOperator = async (_owner, _deposit, _regulator, gas) => {
    return await executeTransaction(() => CONFIG.regulatorInstance.createNewOperator(_owner, _deposit, { from: _regulator, gas }))
};


export const getRegulatorOwner = async () => {
    return await execute(async () => {
        return await CONFIG.regulatorInstance.getOwner()
    })
};


export const executeTransaction = async (executor) => {
    try {
        const txObject = await executor();
        if (txObject.logs.length === 0) {
            alert('Transaction failed: More info in console')
        }
        return  await txObject;
    } catch (e) {
        console.log(e);
        alert(e);
    }
};

export const execute = async (executor) => {
    try {
        return await executor()
    } catch (e) {
        console.log(e);
        alert(e)
    }
};