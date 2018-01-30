const http = require('http');
const express = require('express');
const socketIO = require('socket.io');

// const { mongoose } = require('./db/mongoose');

const currencies = require('./config/currencies');

currencies.startCrons();

const port = process.env.PORT || 3000;
let app = express();
let server = http.createServer(app);
let io = socketIO(server);

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
