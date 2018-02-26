# Binance Trader Overlay Server

Server files for binance trader overlay. This handles eliot orders mainly

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

What things you need to install the software and how to install them

```
nodejs https://nodejs.org/en/
git https://git-scm.com/downloads
```

### Installing

A step by step series of examples that tell you have to get a development env running

Open terminal

Clone repository

```
git clone https://[insert username]:[insert password]@github.com/Credwa/arbitrage.git
```

cd into repo

```
cd arbitrage
```

Install project dependencies

```
npm install
```

Create config json file for environment variables

```
cd config/

touch config.json (for mac)
echo "" > config.json (for window)
```

Fill required variables in json file db_name can be anything the rest are found from firebase and sendgrid.

```json
{
  "development": {
    "client_email": "",
    "database_URL": "",
    "arbitrage_db_name": "",
    "private_key": "",
    "project_id": "",
  }
}
```

Start server

```
node server.js
```

Connect with socket and emit events (may change to http requests in future versions)

## Running the tests

Nothing here for now

### Break down into end to end tests

Nothing here for now

### And coding style tests

Nothing here for now

## Deployment

Add additional notes about how to deploy this on a live system

## Built With

* [Express](https://expressjs.com/)
* [Socketio](https://socket.io/)

## Contributing

Nothing here for now.

## Versioning

Nothing here for now.

## Authors

* **Craig Edwards** - *Initial work* - [Credwa](https://github.com/credwa)

See also the list of [contributors](https://github.com/credwa/arbitrage/contributors) who participated in this project.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments