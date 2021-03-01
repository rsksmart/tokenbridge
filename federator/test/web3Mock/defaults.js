const mockData = require('./mockData.json');

const defaults = {
  _data: mockData,

  get data() {
    return this._data;
  },

  set data(values) {
    this._data = {
      ...mockData,
      ...values
    };
  }
}

module.exports = defaults;
