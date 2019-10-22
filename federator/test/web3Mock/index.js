const eth = require('./eth');

class Web3Mock {
  constructor() {
    this.eth = eth;
  }
}

module.exports = Web3Mock;
