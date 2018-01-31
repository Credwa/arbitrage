const http = require('http');
const express = require('express');
const socketIO = require('socket.io');
const moment = require('moment');

// const { mongoose } = require('./db/mongoose');

const currencies = require('./config/currencies');

currencies.startCrons();

const port = process.env.PORT || 3000;
let app = express();
let server = http.createServer(app);
let io = socketIO(server);

let findLatestSymbolData = (arr) => {
  let found = [];
  let latest = [];
  for (let i = arr.length - 1; i >= 0; i--) {
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
  return latest;
};

app.get('/latest/ARS', (req, res) => {
  currencies.refArgentina.once('value', (data) => {
    let argentinaPesosData = data.val();
    let argArr = [];
    for (data in argentinaPesosData) {
      argArr.push(argentinaPesosData[data]);
      // console.log(moment.unix(parseInt(argentinaPesosData[data].time)).format('hh:mm'));
    }

    res.send([...findLatestSymbolData(argArr.sort((a, b) => {
      return (a.time > b.time) ? 1 : ((b.time > a.time) ? -1 : 0);
    }))]);
  });
});

app.get('/latest/MXN', (req, res) => {
  currencies.refMexico.once('value', (data) => {
    let mexicoPesosData = data.val();
    let mexArr = [];
    for (data in mexicoPesosData) {
      mexArr.push(mexicoPesosData[data]);
      // console.log(moment.unix(parseInt(argentinaPesosData[data].time)).format('hh:mm'));
    }
    res.send([...findLatestSymbolData(mexArr.sort((a, b) => {
      return (a.time > b.time) ? 1 : ((b.time > a.time) ? -1 : 0);
    }))]);
  });
});

io.on('connection', socket => {
  currencies.myEmitter.on('newArbitrage', (arbitrage) => {
    socket.emit('newArbitrage', arbitrage);
  });
  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });
});

// start server on specified port
server.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});

module.exports = { app };
