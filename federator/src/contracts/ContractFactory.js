module.exports = class ContractFactory {
    constructor(config, logger, Web3) {
        this.config = config;
        this.logger = logger;
        this.mainWeb3 = new Web3(config.mainchain.host);
        this.sideWeb3 = new Web3(config.sidechain.host);
        this.contractsByAbi = new Map();
    }

    // There should only be one address per abi - the address is only needed to create a new web3.eth.Contract object.
    getContractByAbi(abi, address, web3) {
        let contractForAbi = this.contractsByAbi.get(abi)
        if (!contractForAbi) {
            contractForAbi = new web3.eth.Contract(abi, address);
            this.contractsByAbi.set(abi, contractForAbi);
        }
        return contractForAbi;
    }
}
