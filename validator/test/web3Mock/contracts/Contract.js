class Contract {
  constructor(abi, address) {
    this.abi = abi;
    this.address = address;
    this.options = {
      address
    }
  }
}

module.exports = Contract;
