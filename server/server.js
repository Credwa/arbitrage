const http = require("http");
const express = require("express");
const socketIO = require("socket.io");
const moment = require("moment");
// const { mongoose } = require('./db/mongoose');

const currencies = require("./config/currencies");

currencies.startCrons();

const port = process.env.PORT || 3000;
let app = express();
let server = http.createServer(app);
let io = socketIO(server);

// Finds the lastest saved symbol data in database to show on initial page load
let findLatestSymbolData = arr => {
  let found = [];
  let latest = [];
  for (let i = arr.length - 1; i >= 0; i--) {
    if (latest.length < 5) {
      let isAlreadyFound = false;
      for (let j = 0; j < found.length; j++) {
        if (arr[i].symbol === found[j]) {
          isAlreadyFound = true;
        }
      }
      if (!isAlreadyFound) {
        found.push(arr[i].symbol);
        latest.push(arr[i]);
      }
    }
  }
  return latest;
};

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,PATCH,DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Latest symbols data for Argentina exchange
app.get("/latest/ARS", (req, res) => {
  currencies.refArgentina.once("value", data => {
    let argentinaPesosData = data.val();
    let argArr = [];
    for (data in argentinaPesosData) {
      argArr.push(argentinaPesosData[data]);
    }
    res.send([
      ...findLatestSymbolData(
        argArr.sort((a, b) => {
          return a.time > b.time ? 1 : b.time > a.time ? -1 : 0;
        })
      )
    ]);
  });
});

// Latest data for symbols for Austrailian exchange
app.get("/latest/AUD", (req, res) => {
  currencies.refAustrailia.once("value", data => {
    let AUDData = data.val();
    let ausArr = [];
    for (data in AUDData) {
      ausArr.push(AUDData[data]);
    }
    res.send([
      ...findLatestSymbolData(
        ausArr.sort((a, b) => {
          return a.time > b.time ? 1 : b.time > a.time ? -1 : 0;
        })
      )
    ]);
  });
});

// Latest data for symbols from Mexican exchange
app.get("/latest/MXN", (req, res) => {
  currencies.refMexico.once("value", data => {
    let mexicoPesosData = data.val();
    let mexArr = [];
    for (data in mexicoPesosData) {
      mexArr.push(mexicoPesosData[data]);
    }
    res.send([
      ...findLatestSymbolData(
        mexArr.sort((a, b) => {
          return a.time > b.time ? 1 : b.time > a.time ? -1 : 0;
        })
      )
    ]);
  });
});

// Returns historical data for specified symbol from specified exchange
app.get("/historical/:symbol/:foreignExchange", (req, res) => {
  if (req.params.foreignExchange.toUpperCase() === "MXN") {
    currencies.refMexico
      .orderByChild("symbol")
      .equalTo(req.params.symbol.toUpperCase())
      .once("value", data => {
        res.send(data.val());
      });
  } else if (
    req.params.foreignExchange.toUpperCase() === "ARS" &&
    (req.params.symbol.toUpperCase() === "BTC" ||
      req.params.symbol.toUpperCase() === "ETH")
  ) {
    currencies.refArgentina
      .orderByChild("symbol")
      .equalTo(req.params.symbol)
      .once("value", data => {
        res.send(data.val());
      });
  } else if (req.params.foreignExchange.toUpperCase() === "AUD") {
    let sym = req.params.symbol.toUpperCase();
    if (sym === "BTC" || sym === "ETC" || sym === "BCH") {
      currencies.refAustrailia
        .orderByChild("symbol")
        .equalTo(req.params.symbol)
        .once("value", data => {
          res.send(data.val());
        });
    }
  } else {
    res.status(404).send();
  }
});

// Finds all symbol data from start of day
app.get("/data/:symbol/:foreignExchange/:timeRange", (req, res) => {
  let todayTime =
    moment()
      .startOf("day")
      .unix() * 1000;
  if (req.params.foreignExchange.toUpperCase() === "MXN") {
    currencies.refMexico
      .orderByChild("symbol")
      .equalTo(req.params.symbol.toUpperCase())
      .once("value", data => {
        let rawData = data.val();
        let filteredData = {};
        Object.keys(rawData).forEach(key => {
          if (rawData[key].time >= todayTime) {
            filteredData[key] = rawData[key];
          }
        });
        res.send(filteredData);
      });
  } else if (
    req.params.foreignExchange.toUpperCase() === "ARS" &&
    (req.params.symbol.toUpperCase() === "BTC" ||
      req.params.symbol.toUpperCase() === "ETH")
  ) {
    currencies.refArgentina
      .orderByChild("symbol")
      .equalTo(req.params.symbol)
      .once("value", data => {
        let rawData = data.val();
        let filteredData = {};
        Object.keys(rawData).forEach(key => {
          if (rawData[key].time >= todayTime) {
            filteredData[key] = rawData[key];
          }
        });
        res.send(filteredData);
      });
  } else if (req.params.foreignExchange.toUpperCase() === "AUD") {
    let sym = req.params.symbol.toUpperCase();
    if (sym === "BTC" || sym === "ETC" || sym === "BCH") {
      currencies.refAustrailia
        .orderByChild("symbol")
        .equalTo(req.params.symbol)
        .once("value", data => {
          let rawData = data.val();
          let filteredData = {};
          Object.keys(rawData).forEach(key => {
            if (rawData[key].time >= todayTime) {
              filteredData[key] = rawData[key];
            }
          });
          res.send(filteredData);
        });
    }
  } else {
    res.status(404).send();
  }
});

// Find data for between specified starting time stamp and ending time stamp
app.get(
  "/date-range/:symbol/:foreignExchange/:startingTimeStamp/:endingTimeStamp",
  (req, res) => {
    if (req.params.foreignExchange.toUpperCase() === "MXN") {
      currencies.refMexico
        .orderByChild("symbol")
        .equalTo(req.params.symbol.toUpperCase())
        .once("value", data => {
          let rawData = data.val();
          let filteredData = {};
          Object.keys(rawData).forEach(key => {
            if (
              rawData[key].time >= req.params.startingTimeStamp &&
              rawData[key].time <= req.params.endingTimeStamp
            ) {
              filteredData[key] = rawData[key];
            }
          });
          res.send(filteredData);
        });
    } else if (
      req.params.foreignExchange.toUpperCase() === "ARS" &&
      (req.params.symbol.toUpperCase() === "BTC" ||
        req.params.symbol.toUpperCase() === "ETH")
    ) {
      currencies.refArgentina
        .orderByChild("symbol")
        .equalTo(req.params.symbol)
        .once("value", data => {
          let rawData = data.val();
          let filteredData = {};
          Object.keys(rawData).forEach(key => {
            if (
              rawData[key].time >= req.params.startingTimeStamp &&
              rawData[key].time <= req.params.endingTimeStamp
            ) {
              filteredData[key] = rawData[key];
            }
          });
          res.send(filteredData);
        });
    } else if (req.params.foreignExchange.toUpperCase() === "AUD") {
      let sym = req.params.symbol.toUpperCase();
      if (sym === "BTC" || sym === "ETC" || sym === "BCH") {
        currencies.refAustrailia
          .orderByChild("symbol")
          .equalTo(req.params.symbol)
          .once("value", data => {
            let rawData = data.val();
            let filteredData = {};
            Object.keys(rawData).forEach(key => {
              if (
                rawData[key].time >= req.params.startingTimeStamp &&
                rawData[key].time <= req.params.endingTimeStamp
              ) {
                filteredData[key] = rawData[key];
              }
            });
            res.send(filteredData);
          });
      }
    } else {
      res.status(404).send();
    }
  }
);

io.on("connection", socket => {
  currencies.myEmitter.on("newArbitrage", arbitrage => {
    socket.emit("newArbitrage", arbitrage);
  });
  socket.on("disconnect", () => {
    console.log("User Disconnected from server");
  });
});

// start server on specified port
server.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});

module.exports = { app };
