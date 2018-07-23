import { createContract, getAccounts } from './web3Util';
import { CONFIG } from './config';

const contract = async contractJson => {
    const web3 = await CONFIG.web3;
    return createContract(contractJson, web3);
};

export const latestDeployed = async contractJson => {
    const contractObj = await contract(contractJson);
    return await contractObj.deployed();
};

export const accounts = async () => {
    const web3 = await CONFIG.web3;
    return await getAccounts(web3);
};

export const contractAt = async (contractJson, address) => {
    const contractObj = await contract(contractJson);
    return await contractObj.at(address);
};
