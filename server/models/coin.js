const mongoose = require('mongoose');

let Coin = mongoose.model('Coin', {
  Symbol: {
    type: String,
    required: true
  },
  USDPrice: {
    type: Number,
    required: true,
    default: null
  },
  priceInPesos: {
    type: Number,
    required: true,
    default: null
  },
  bitsoPrice: {
    type: Number,
    required: true,
    default: null
  },
  bitsoPriceUSD: {
    type: Number,
    required: true,
    default: null
  },
  spread: {
    type: Number,
    required: true,
    default: null
  },
  spreadPercentage: {
    type: Number,
    required: true,
    default: null
  },
  time: {
    type: Number,
    required: true,
    default: null
  }
});

module.exports = { Coin };
