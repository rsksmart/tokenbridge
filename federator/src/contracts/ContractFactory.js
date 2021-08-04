module.exports = class ContractFactory {
    constructor(config, logger, Web3) {
        this.config = config;
        this.logger = logger;
        this.mainWeb3 = new Web3(config.mainchain.host);
        this.sideWeb3 = new Web3(config.sidechain.host);
        this.contractsByAddressAndAbi = new Map();
    }

    getContractByAddressAndAbi(abi, address, web3) {
        if (!this.contractsByAddressAndAbi.has(abi)) {
            this.contractsByAddressAndAbi.set(abi, new Map());
        }
        let contractsByAddressForAbi = this.contractsByAddressAndAbi.get(abi)
        if (!contractsByAddressForAbi.has(address)) {
            const contract = new web3.eth.Contract(abi, address);
            contractsByAddressForAbi.set(address, contract);
        }
        return this.contractsByAddressAndAbi.get(abi).get(address);
    }
}
