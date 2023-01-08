import {default as ccxt} from "ccxt";
import {app} from "./server.js"
import * as config from "./config.js"
import * as server from "./server.js"
import * as dbmanagement from "./databaseManagement.js"
import dotenv from 'dotenv'
dotenv.config()

// Client
export var binanceClient = null

// --------------------------------------------------
// --------------------------------------------------
// --------------- BACKEND SOLO ---------------------
// --------------------------------------------------
// --------------------------------------------------

export function instantiateBinanceClient() {
  try {
    binanceClient = new ccxt.binance({
        apiKey: process.env.API_KEY,
        secret: process.env.API_SECRET,
        enableRateLimit: true,
        adjustForTimeDifference: true
    });
      console.log("Got Binance Client");
      server.eventBus.emit("binance-instantiated");
  } catch(e) {
      console.log("\u001b[0;36mCould not instantiate client properly")
      console.log(e)
  }
}

export async function getHistoricData(configData, i) {
  // Build market for asset at index
  const market = configData.trading.markets[i] + "/BUSD"
  try {
    var since = (Date.now() - ((configData.tech.unixTimeToLookBack[configData.trading.timeStepSize]) * configData.trading.stepsInTime));
    return await Promise.all([
      binanceClient.fetch_ohlcv(market, configData.trading.timeStepSize, since = since)
    ]);
  } catch (e) {
    console.log(e)}
}

export async function getMarketDataAndWriteToDB(configData, i) {
  const data = await getHistoricData(configData, i)
  server.eventBus.emit("got-market-data", null, configData, configData.trading.markets[i], data)
  /*
  let newDocs = []
  for (let j = 0; j < data[0].length; j++) {
    var doc = {
      timestamp: data[0][j][0],
      asset : configData.trading.markets[i],
      open : data[0][j][1],
      high : data[0][j][2],
      low : data[0][j][3],
      close : data[0][j][4]
    };
    newDocs.push(doc);
  }

  dbmanagement.db.markets.insert(newDocs, function (err, newDoc) { 
    // optional callback
    console.log("Added", data[0].length, "entries for", configData.trading.markets[i], ". Emitting event.")
    server.eventBus.emit("got-market-data", null, configData, configData.trading.markets[i])
  });
  */
}

// --------------------------------------------------
// --------------------------------------------------
// -------------// BACKEND SOLO ---------------------
// --------------------------------------------------
// --------------------------------------------------

//#region Legacy
// ----------------------------------------------
// ------------------ API ROUTED FUNCTIONS
// ----------------------------------------------

app.post('/api/account/getBinanceClient', async function getBinanceClient(req, res) {
  try {
    binanceClient = new ccxt.binance({
        apiKey: process.env.API_KEY,
        secret: process.env.API_SECRET,
        enableRateLimit: true,
        adjustForTimeDifference: true
    });
      console.log("Got Binance Client");
      res.send(true);
      server.eventBus.emit("binance-instantiated");
  } catch(e) {
      console.log("\u001b[0;36mCould not instantiate client properly")
      console.log(e)
      res.send(false);
  }
});

app.post('/api/account/fetchBalances', async function fetchBalances(req, res) {
  var balances = null;
  try {
      balances = await binanceClient.fetchBalance()
      console.log("Fetched balances");
      res.send(balances);
      server.eventBus.emit("binance-fetched-balances");
  } catch(e) {
      console.log("\u001b[0;36mCould not fetch available balances")
      console.log(e)
      res.send(e);
  }
});

// ----------------------------------------------
// -------///-------- API ROUTED FUNCTIONS
// ----------------------------------------------


export function extractOHLCFromData(data, f) {
  // Close = 4
  var close = [];
  for (var i = 0; i < data.length; i++) {
    close.push(data[i][f]);
  }
  return close;
}


export function buildCandles(data) {
  var candles = [];
  for (var i = 0; i < data.length; i++) {
    candles.push({
      "close" : data[i][4],
      "high" : data[i][2],
      "low" : data[i][3]
    })
  }
  return candles;
}

export function getAllBusdMarkets() {
  getAllMarkets().then(function(allMarkets) {
    const busdMarketsOnBinance = createBUSDMarkets(allMarkets);
    res.send("Length of markets:" + busdMarketsOnBinance.length);
    eventBus.emit("got-all-busd-markets");
    return busdMarketsOnBinance;
  })
}

function createBUSDMarkets(markets) {
    var busdm = [];
    for (const [ord, vals] of Object.entries(markets[0])) {
      if (vals.quote.includes("BUSD")) {
        busdm.push(vals.base)
      }
    }
    return busdm
}

async function getAllMarkets() {
    try {
      var r = await Promise.all([
        binanceClient.load_markets()
      ]);
      
      return r;
    } catch (e) {
      console.log(e)
    }
}

//#endregion