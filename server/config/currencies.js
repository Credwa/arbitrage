require('./config.js');

const cron = require('node-cron');
const axios = require('axios');
const admin = require('firebase-admin');
const EventEmitter = require('events');
const moment = require('moment');
const cheerio = require('cheerio');

class MyEmitter extends EventEmitter {}

const myEmitter = new MyEmitter();

// firebase DB Setup
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.project_id,
    clientEmail: process.env.client_email,
    privateKey: process.env.private_key
  }),
  databaseURL: process.env.database_URL
});

const db = admin.database();
let refArgentina = db.ref(`${process.env.arbitrage_db_name}/argentine-pesos`);
let refMexico = db.ref(`${process.env.arbitrage_db_name}/mexican-pesos`);

// Mexican Peso
let MXNPesoExchangeRate = null;

// Argentine Peso
let ARSPesoExchangeRate = null;

const currencies = [
  {
    name: 'bitcoin',
    symbol: 'btc',
    cron: '1,31 * * * *'
  },
  {
    name: 'ripple',
    symbol: 'xrp',
    cron: '3,33 * * * *'
  },
  {
    name: 'ethereum',
    symbol: 'eth',
    cron: '5,35 * * * *'
  },
  {
    name: 'bitcoin-cash',
    symbol: 'bch',
    cron: '7,37 * * * *'
  },
  {
    name: 'litecoin',
    symbol: 'ltc',
    cron: '9,39 * * * *'
  }
];

let getLatestExchangeRates = () => {
  axios
    .get('https://www.hsbc.com.mx/1/2/es/personas/divisas')
    .then(data => {
      let $ = cheerio.load(data.data);
      // console.log($.xml());
      MXNPesoExchangeRate = $('tbody > tr')
        .first()
        .text()
        .replace(/\s/g, '')
        .split('$')[2];
    })
    .catch(e => {
      console.log(e);
    });

  axios
    .get('http://www.bna.com.ar/')
    .then(data => {
      let $ = cheerio.load(data.data);

      let pull = $('#divisas')
        .first()
        .text()
        .replace(/\s\s+/g, ' ');

      ARSPesoExchangeRate = pull
        .substr(pull.indexOf('U.S.A'), 21)
        .split(' ')[2];
    })
    .catch(e => {
      console.log(e);
    });
};

getLatestExchangeRates();

cron.schedule('*/3 * * * *', () => {
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
  return parseFloat((spread / priceUSD) * 100);
};

let setarbitrageData = (
  exchangeRate,
  coinMarketCapData,
  lastTradePrice,
  foreignCurrency,
  exchange
) => {
  let arbitrage = {
    foreignCurrency: null,
    exchange: null,
    symbol: null,
    exchangeRate: exchangeRate,
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
      getForeignExchangePriceUSD(lastTradePrice, exchangeRate),
      coinMarketCapData[0].price_usd
    ),
    coinMarketCapData[0].price_usd
  );
  arbitrage.time = moment.now();
  myEmitter.emit('newArbitrage', arbitrage);
  return arbitrage;
};

let makeReqMXNExchangeRates = (symbol, coinMarketCapData) => {
  if (symbol === 'bch') {
    axios
      .get(`https://bitpay.com/rates/${symbol.toUpperCase()}/MXN`)
      .then(data => {
        let reqData = data.data.data;
        refMexico.push(
          setarbitrageData(
            MXNPesoExchangeRate,
            coinMarketCapData,
            reqData.rate,
            'Mexican Pesos',
            'https://Bitpay.com'
          )
        );
      })
      .catch(e => {
        console.log(e);
      });
  } else {
    axios
      .get(`https://api.bitso.com/v3/ticker?book=${symbol}_mxn`)
      .then(data => {
        let reqData = data.data;
        refMexico.push(
          setarbitrageData(
            MXNPesoExchangeRate,
            coinMarketCapData,
            reqData.payload.last,
            'Mexican Pesos',
            'https://bitso.com'
          )
        );
      })
      .catch(e => {
        console.log(e);
      });
  }
};

let makeReqARSExchangeRates = (symbol, coinMarketCapData) => {
  if (symbol === 'eth') {
    axios
      .get('https://api.cryptomkt.com/v1/ticker?market=ETHARS')
      .then(data => {
        let reqData = data.data.data[0];
        refArgentina.push(
          setarbitrageData(
            ARSPesoExchangeRate,
            coinMarketCapData,
            reqData.last_price,
            'Argentine Pesos',
            'cryptomkt.com'
          )
        );
      })
      .catch(e => {
        console.log(e);
      });
  }
  if (symbol === 'btc') {
    axios.get('https://bitpay.com/rates/BTC/ARS').then(data => {
      let reqData = data.data.data;
      refArgentina.push(
        setarbitrageData(
          ARSPesoExchangeRate,
          coinMarketCapData,
          reqData.rate,
          'Argentine Pesos',
          'bitpay.com'
        )
      );
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
      console.log('error', e);
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
  myEmitter,
  refArgentina,
  refMexico
};
