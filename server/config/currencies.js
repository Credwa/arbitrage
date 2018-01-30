require('./config.js');

const cron = require('node-cron');
// const { Coin } = require('../models/coin');
const axios = require('axios');
const admin = require('firebase-admin');
const EventEmitter = require('events');

const serviceAccount = require('./arbitrage-a81cf-firebase-adminsdk-s0gzk-6ea4b36985');

class MyEmitter extends EventEmitter {}

const myEmitter = new MyEmitter();

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.project_id,
    clientEmail: process.env.client_email,
    privateKey: process.env.private_key
  }),
  databaseURL: process.env.database_URL
});
const db = admin.database();
let refArgentina = db.ref('arbitrage/argentine-pesos');
let refMexico = db.ref('arbitrage/mexican-pesos');

// Mexican Peso
let MXNPesoExchangeRate = null;

//
let ARSPesoExchangeRate = null;

const currencies = [
  {
    name: 'bitcoin',
    symbol: 'btc',
    cron: '1,11,21,31,41,51 * * * *'
  },
  {
    name: 'ripple',
    symbol: 'xrp',
    cron: '3,13,23,33,43,53 * * * *'
  },
  {
    name: 'ethereum',
    symbol: 'eth',
    cron: '5,15,25,35,45,55 * * * *'
  },
  {
    name: 'bitcoin-cash',
    symbol: 'bch',
    cron: '7,17,27,37,47,57 * * * *'
  },
  {
    name: 'litecoin',
    symbol: 'ltc',
    cron: '9,19,29,39,49,59 * * * *'
  }
];

let getLatestExchangeRates = () => {
  axios
    .get('http://www.apilayer.net/api/live?access_key=00be7e086b3ce94f527952b7e9db77e5&currencies=MXN,ARS')
    .then(data => {
      MXNPesoExchangeRate = data.data.quotes.USDMXN;
      ARSPesoExchangeRate = data.data.quotes.USDARS;
    })
    .catch(e => {
      console.log(e);
    });
};

getLatestExchangeRates();

cron.schedule('*/60 * * * *', () => {
  getLatestExchangeRates();
});

let getPriceInForeignCurrency = (USDPrice, exchangeRate) => {
  return parseFloat(USDPrice * exchangeRate);
};

let getForeignExchangePriceUSD = (bitsoPrice, exchangeRate) => {
  return parseFloat(bitsoPrice / exchangeRate);
};

let getSpread = (foreignExchangePriceUSD, priceUSD) => {
  return parseFloat(foreignExchangePriceUSD - priceUSD);
};

let getSpreadPercentage = (spread, priceUSD) => {
  return parseFloat(spread / priceUSD);
};

let setarbitrageData = (exchangeRate, coinMarketCapData, lastTradePrice, foreignCurrency, exchange) => {
  let arbitrage = {
    foreignCurrency: null,
    exchange: null,
    symbol: null,
    USDPrice: 0,
    priceInPesos: 0,
    foreignExchangePrice: 0,
    foreignExchangePriceUSD: 0,
    spread: 0,
    spreadPercentage: 0
  };
  arbitrage.foreignCurrency = foreignCurrency;
  arbitrage.exchange = exchange;
  arbitrage.symbol = coinMarketCapData[0].symbol;
  arbitrage.USDPrice = parseFloat(coinMarketCapData[0].price_usd);
  arbitrage.priceInPesos = getPriceInForeignCurrency(
    coinMarketCapData[0].price_usd,
    exchangeRate
  );
  arbitrage.foreignExchangePrice = parseFloat(lastTradePrice);
  arbitrage.foreignExchangePriceUSD = getForeignExchangePriceUSD(
    lastTradePrice,
    exchangeRate
  );
  arbitrage.spread = getSpread(
    getForeignExchangePriceUSD(lastTradePrice, exchangeRate),
    coinMarketCapData[0].price_usd
  );
  arbitrage.spreadPercentage = getSpreadPercentage(
    getSpread(
      getForeignExchangePriceUSD(
        lastTradePrice,
        exchangeRate
      ),
      coinMarketCapData[0].price_usd
    ),
    coinMarketCapData[0].price_usd
  );
  arbitrage.time = coinMarketCapData[0].last_updated;
  myEmitter.emit('newArbitrage', arbitrage);
  return arbitrage;
};

let makeReqMXNExchangeRates = (symbol, coinMarketCapData) => {
  if (symbol === 'bch') {
    axios
      .get(`https://bitpay.com/rates/${symbol.toUpperCase()}/MXN`)
      .then(data => {
        let reqData = data.data.data;
        refMexico.push(setarbitrageData(MXNPesoExchangeRate, coinMarketCapData, reqData.rate, 'Mexican Pesos', 'https://Bitpay.com'));
      }).catch(e => {
        console.log(e);
      });
  } else {
    axios
      .get(`https://api.bitso.com/v3/ticker?book=${symbol}_mxn`)
      .then(data => {
        let reqData = data.data;
        refMexico.push(setarbitrageData(MXNPesoExchangeRate, coinMarketCapData, reqData.payload.last, 'Mexican Pesos', 'https://bitso.com'));
      }).catch(e => {
        console.log(e);
      });
  }
};

let makeReqARSExchangeRates = (symbol, coinMarketCapData) => {
  if (symbol === 'eth') {
    axios.get('https://api.cryptomkt.com/v1/ticker?market=ETHARS').then(data => {
      let reqData = data.data.data[0];
      refArgentina.push(setarbitrageData(ARSPesoExchangeRate, coinMarketCapData, reqData.last_price, 'Argentine Pesos', 'cryptomkt.com'));
    }).catch(e => {
      console.log(e);
    });
  }
  if (symbol === 'btc') {
    axios.get('https://bitpay.com/rates/BTC/ARS').then(data => {
      let reqData = data.data.data;
      refArgentina.push(setarbitrageData(ARSPesoExchangeRate, coinMarketCapData, reqData.rate, 'Argentine Pesos', 'bitpay.com'));
    });
  }
};

let makeCoinDataReq = (coin, symbol) => {
  axios
    .get(`https://api.coinmarketcap.com/v1/ticker/${coin}/`)
    .then(data => {
      let coinMarketCapData = data.data;
      makeReqMXNExchangeRates(symbol, coinMarketCapData);
      if (symbol === 'eth' || symbol === 'btc') {
        makeReqARSExchangeRates(symbol, coinMarketCapData);
      }
    })
    .catch(e => {
      console.log(e);
    });
};

let startCrons = () => {
  for (let i = 0; i < currencies.length; i++) {
    cron.schedule(currencies[i].cron, () => {
      let currency = currencies[i];
      makeCoinDataReq(currency.name, currency.symbol);
    });
  }
};

module.exports = {
  startCrons,
  myEmitter
};
