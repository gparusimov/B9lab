import { CONFIG } from '../util/config'
import {execute, executeTransaction} from './RegulatorService'

export const isOperatorPaused = async (operatorAddress) => {
    return await execute(async () => {
        const operatorInstance = await CONFIG.operator.at(operatorAddress);
        return await operatorInstance.isPaused();
    })
};

export const setPaused = async (operatorAddress, paused, from, gas) => {
    const operatorInstance = await CONFIG.operator.at(operatorAddress);
    await executeTransaction(() => operatorInstance.setPaused(paused, { from, gas }));
};

export const getOperatorOwner = async (operatorAddress) => {
    return await execute(async () => {
        const instance = await CONFIG.operator.at(operatorAddress);
        return await instance.getOwner();
    })
};

export const isSetMultiplier = async (operatorAddress, vehicle) => {
    return await execute(async () => {
        const operatorInstance = await CONFIG.operator.at(operatorAddress);
        const vehicleType = await CONFIG.regulatorInstance.getVehicleType(vehicle)
        const multiplier = await operatorInstance.getMultiplier(vehicleType);
        return await multiplier.toNumber() !== 0;
    })
};

export const reportExitRoad = async (operatorAddress, exitBooth, secret, gas) => {
    const operatorInstance = await CONFIG.operator.at(operatorAddress);
    return await executeTransaction(() => operatorInstance.reportExitRoad(secret, { from: exitBooth, gas }))
}

export const enterRoad = async (operatorAddress, entryBooth, secret, from, value, gas) => {
    const operatorInstance = await CONFIG.operator.at(operatorAddress);
    const hashedSecret = await execute(async () => {return await  operatorInstance.hashSecret(secret);})
    return await executeTransaction(() => operatorInstance.enterRoad(entryBooth, hashedSecret, { from, value, gas }))
}

export const getVehicle = async (operatorAddress, hashedSecret, from, gas) => {
    return await execute(async () => {
        const operatorInstance = await CONFIG.operator.at(operatorAddress);
        return await operatorInstance.getVehicleEntry(hashedSecret, { from, gas })
    })
};

export const getOperatorDeposit = async (operatorAddress) => {
    return await execute(async () => {
        const operatorInstance = await CONFIG.operator.at(operatorAddress);
        const deposit = await operatorInstance.getDeposit();
        return deposit.toString();
    })
}

export const getBalance = async (owner) => {
    const balance = await CONFIG.web3.eth.getBalance(owner);
    return balance.toString()
}

export const addTollBooth = async (boothAddress, operatorAddress, from, gas) => {
    const operatorInstance = await CONFIG.operator.at(operatorAddress);
    return await executeTransaction(() => operatorInstance.addTollBooth(boothAddress, { from, gas }))
};

export const setRoutePrice = async (operatorAddress, price, fromBooth, toBooth, from, gas) => {
    const operatorInstance = await CONFIG.operator.at(operatorAddress)
    return executeTransaction(() => operatorInstance.setRoutePrice(fromBooth, toBooth, price, { from, gas }))
};

export const setMultiplier = async (operatorAddress, vehicleType, multiplier, from, gas) => {
    const operatorInstance = await CONFIG.operator.at(operatorAddress);
    await executeTransaction(() => operatorInstance.setMultiplier(vehicleType, multiplier, { from, gas }))
}

export const getMultipliers = async (operatorAddress, vehicles) => {
    return await execute(async () => {
        const operatorInstance = await CONFIG.operator.at(operatorAddress);
        let types = await getVehicleTypes(vehicles);
        const multipliers = [];
        for (let i = 0; i < types.length; i++) {
            const multiplier = await operatorInstance.getMultiplier(types[i]);
            if (multiplier.toNumber() !== 0) {
                multipliers.push({ vehicleType: types[i], multiplier: multiplier.toString() })
            }
        }
        return multipliers
    })
};

export const getVehicleTypes = async (vehicles) => {
    return await execute(async () => {
        const mapTypes = {};
        vehicles.forEach(vehicle => {
            mapTypes[vehicle.vehicleType] = 1
        });
        return Object.keys(mapTypes)
    })
};