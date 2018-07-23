import web3Util from './web3Util'
import Regulator from '../contracts/Regulator.json'
import Operator from '../contracts/TollBoothOperator.json'

export var CONFIG = {};

export const _initConfigs = async (_web3) => {
  const accounts = await web3Util.getAccounts(_web3);
  const regulator = web3Util.createContract(Regulator, _web3);
  const operator = web3Util.createContract(Operator, _web3);
  const regulatorInstance = await regulator.deployed();

  CONFIG = {
    web3: _web3,
    accounts,
    regulator,
    operator,
    regulatorInstance,
    DEFAULT_GAS_LIMIT: 2500000
  }
}
