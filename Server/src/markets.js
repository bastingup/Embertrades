import {default as ccxt} from "ccxt";
import {app} from "./server.js"
import * as server from "./server.js"
import * as dbmanagement from "./databaseManagement.js"
import dotenv from 'dotenv'
dotenv.config()
import * as colors from "./colors.js"
// Client 
export var binanceClient = null

// --------------------------------------------------
// --------------------------------------------------
// --------------- BACKEND SOLO ---------------------
// --------------------------------------------------
// --------------------------------------------------

// Instantiate Client
export function instantiateBinanceClient() {
  try {
    binanceClient = new ccxt.binance({
        apiKey: process.env.API_KEY,
        secret: process.env.API_SECRET,
        enableRateLimit: true,
        adjustForTimeDifference: true
    });
      console.log(colors.infoLog + "MARKETS - Got Binance Client");
      server.eventBus.emit("binance-instantiated");
  } catch(e) {
      console.log(colors.infoLog + "MARKETS - Could not instantiate client properly")
      console.log(e)
  }
}

// Check for wholes in db
export function checkLastTimestampPerAsset(configData) {

  // Define the default since value
  let since = (Date.now() - ((configData.tech.unixTimeToLookBack[configData.trading.timeStepSize]) * configData.trading.stepsInTime));
  for (const asset of configData.trading.markets) {
    dbmanagement.db.markets.find({asset : asset}, function (err, docs) {
      if (docs.length === 0) {
        console.log(colors.dbLog + "MARKETS - Found empty database for", asset.toString(), "- Proceeding to download data in compliance with config.")
        server.eventBus.emit("download-market-data", null, configData, asset, since, configData.trading.stepsInTime, docs)
      }
      else {
        console.log(colors.dbLog + "MARKETS - Found", docs.length.toString(), "entries in database for", asset.toString(), "- Proceeding to download data in compliance with config.")
        // Find the latest entry in db
        docs = sortDocsByTimestamp(docs)
        const lastDoc = docs[docs.length - 1]

        // Find out how many entries are missing between last entry and now
        const numberOfMissingEntries = howManyTimestepsAreMissing(configData, lastDoc)
        const numberOfEntriesToFillNow = Math.floor(numberOfMissingEntries)
        const remainderToFill = numberOfMissingEntries - numberOfEntriesToFillNow
        const unixUntilNextRun = remainderToFill * configData.tech.unixTimeToLookBack[configData.trading.timeStepSize]
        const closable = isGapInMarketDBClosable(configData, numberOfMissingEntries)

        if (closable) {
          if (numberOfEntriesToFillNow >= 1) {
            const closeSince = lastDoc.timeStamp + configData.tech.unixTimeToLookBack[configData.trading.timeStepSize]
            server.eventBus.emit("download-market-data", null, configData, asset, closeSince, numberOfEntriesToFillNow, docs)
          }
          else {
            console.log(colors.infoLog + "MARKETS - No need to fill any gaps. Gap in db amounts to", numberOfMissingEntries.toFixed(2), "missing entries.")
          }
        }
        else {
          dbmanagement.db.markets.remove({ asset: asset }, { multi: true }, function (err, numRemoved) {
            console.log(colors.dbLog + "MARKETS - Gap in markets bd not closable, cleared markets db and removed", numRemoved.toString(), "entries. Starting from scratch.")
            server.eventBus.emit("download-market-data", null, configData, asset, since, configData.trading.stepsInTime, docs)
          });
        }
      }
    });
  }
}

function isGapInMarketDBClosable(configData, numberOfMissingEntries) { 
  if (numberOfMissingEntries < configData.trading.stepsInTime) {
    return true
  }
  return false
}

function howManyTimestepsAreMissing(configData, doc) {
  return (Date.now() - doc.timeStamp) / configData.tech.unixTimeToLookBack[configData.trading.timeStepSize]
}

function sortDocsByTimestamp(docs) {
  return docs.sort((a, b) => {
      if (a.timeStamp < b.timeStamp) {
        return -1;
      }
  });
}

export function fetchMarketData(configData, asset, since, limit, docs) {
  getMarketDataAndWriteToDB(configData, asset, since, limit, docs)
}

async function getMarketDataAndWriteToDB(configData, asset, since, limit, docs) {
  const data = await getHistoricData(configData, asset, since, limit)
  console.log(colors.importantInfoLog + "MARKETS - Got market data for", asset, "- building signals now.")

  if (needToFillUpDownloadedDataWithDBData(configData, limit)) {
    console.log(colors.infoLog + "MARKETS - Need to retrieve data from db, not enough data downloaded to hand over to indicators.")
    // TODO
  }

  server.eventBus.emit("got-market-data", null, configData, asset, data, limit, docs)
}

function needToFillUpDownloadedDataWithDBData(configData, limit) {
  if (limit < configData.trading.stepsInTime) {
    return true
  }
  return false
}

async function getHistoricData(configData, asset, since, limit) {
  // Build market for asset at index
  const market = asset + "/BUSD"
  try {
    return await Promise.all([
      binanceClient.fetch_ohlcv(market, configData.trading.timeStepSize, since = since, limit = limit)
    ]);
  } catch (e) {
    console.log(colors.infoLog + "MARKETS - " + e)}
}

// --- CALLED SOMEWHERE ELSE ---
export function buildCandlesFromDownloadedData(data) {
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

export function buildCandlesFromDBData(data) {

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