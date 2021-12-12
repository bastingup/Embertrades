

// #region IMPORTS
// CONNECTIONS
import {default as axios} from "axios";
import {default as fs} from "fs";

// DB & BACKEND
import {default as Datastore} from 'nedb'

// FRONT END
import express from 'express';

// EXCHANGE CLIENT & SIGNALS
import {getBinanceClient} from './src/binance.js';
import {SMA, ROC, ADX} from 'trading-signals'; // https://github.com/bennycode/trading-signals
// #endregion

// #region FIELDS
// Config
const debug = true;
const timeWindow = "15m";
const unixTimeToLookBack = {
  "1d" : 3600000,
  "15m" : 900000
}
const binancebaseUrl = 'https://api.binance.com/api/v3/ticker/price?symbol=';
const stepsBackInTime = 180;
const minimalProfitPercent = 0.005;
const minimalProfitBUSD = 0.05;
const movingAverageShortterm = 10;
const movingAverageLongterm = 40;
const adxInterval = 10;

const allocation = 0.8;    

const app = express();
const client = getBinanceClient();

// Markets
let busdMarkets = [];
const assets = ["DOT", "ADA", "SOL", "DOGE", "DAR", "YGG", "BNB"]
const base = "BUSD"

// Global database variable
let db = null;

// Market enum
const marketState = {"BULL": "BULL", "BEAR": "BEAR", "RANGE" : "RANGE", "UNKNOWN" : "UNKNOWN"}
const rocState = {"CROSSED_TO_POSITIVE": "CROSSED_TO_POSITIVE", "CROSSED_TO_NEGATIVE": "CROSSED_TO_NEGATIVE", "ZERO_ERROR": "ZERO_ERROR", "NO_CHANGE": "NO_CHANGE"}
const buyStrategyState = {"GOLDENCROSS": "GOLDENCROSS"
                         ,"GOLDENCROSS_BULL": "GOLDENCROSS_BULL"}
const sellStrategyState = {"MASHORT_ABOVE_MALONG_ROC_ZERO": "MASHORT_ABOVE_MALONG_ROC_ZERO"
                          ,"PRICE_X_ABOVE_BUY_PRICE": "PRICE_X_ABOVE_BUY_PRICE"
                          ,"DYNAMIC_STOP": "DYNAMIC_STOP"}
let strategyPerAsset = {}
// #endregion

// #region API
app.post('/api/binanceClient', getBinanceClient);

// #endregion


const main = async () => {

  setUpDatabase();

  fetchBalances().then(function(balances) {
    const amountOfFreeBaseForAsset = balances[base].free / assets.length * 0.99
    console.log("FREE BUSD FOR EACH ASSET", amountOfFreeBaseForAsset);

    // Itterate over assets
    assets.forEach(function(a) {

      // New run for asset a on market m
      console.log("\u001b[0;0mStarting run for asset:", a)
      const m = a + "/" + base

      // Historic data
      getHistoricData(a + "/" + base).then(function(result) {

        // Determine market trend
        var marketTrend = determineMarketTrend(result, m);
        console.log("\u001B[32mMarket trend for", m, "is", marketTrend);
        console.log("\u001B[0m")
        
        // TECHNICAL INDICATORS
        const closes = extractOHLCFromData(result, 4)
        const currentRoc = findDirectionOfMovement(closes);
        const lastRoc = findDirectionOfMovement(closes.slice(0, -1));
        const movingAverageShort = getMovingAverage(closes, movingAverageShortterm);
        const movingAverageLong = getMovingAverage(closes, movingAverageLongterm);
        const movingAverageShortPast = getMovingAverage(closes.slice(0, -1), movingAverageShortterm);
        const movingAverageLongPast = getMovingAverage(closes.slice(0, -1), movingAverageLongterm);
        const currentRocState = detectCrossing(lastRoc, currentRoc);

        getCurrentPrice(m).then(function(result) {
          makeSellDecision(marketTrend, currentRocState, movingAverageShort, movingAverageLong, m, result, amountOfFreeBaseForAsset)
          makeBuyDecision(marketTrend, currentRocState, movingAverageShort, movingAverageLong, m, result, amountOfFreeBaseForAsset)
        })
      })
    })
  })
}

function createNewDatabase(localDbPath) {
  return new Datastore({ filename: localDbPath});
}

function findDirectionOfMovement(prices) {
  const roc = new ROC(12);
  prices.forEach(p => roc.update(p));
  return roc.getResult().toFixed(5)
}

function getMovingAverage(prices, n) {
  const ma = new SMA(n);
  prices.forEach(p => ma.update(p));
  return ma.getResult().toFixed(4);
}

function detectCrossing(past, now) {
  const signPast = Math.sign(past);
  const signNow = Math.sign(now);

  if (signPast > signNow) {
    return rocState.CROSSED_TO_NEGATIVE;
  }
  else if (signPast < signNow) {
    return rocState.CROSSED_TO_POSITIVE;
  }

  // TODO test this and deceide
  // If either one is zero, should we catch this?
  if (signNow === 0 || signPast === 0) {
    return rocState.ZERO_ERROR;
  }

  return rocState.NO_CHANGE;
}

function splitMarketIntoChunks(array) {
  var i,j, temporary, chunk = 10;
  for (i = 0,j = array.length; i < j; i += chunk) {
      temporary = array.slice(i, i + chunk);
      // do whatever
  }
}

async function fetchBalances() {
  var balances = null;
  try {
    balances = await client.fetchBalance();
    console.log("Fetched balances")
    return balances
  } catch(e) {
    console.log("\u001b[0;36mCould not fetch available balances")
    console.log(e)
    return balances
  }
}

async function getCurrentPrice(m) {
  var result = null;
  try {
    result = await Promise.all([
      axios.get((binancebaseUrl + m.replace("/", "")))
    ])
    result = parseFloat(result[0].data.price)
  } catch (e) {console.log(e)}
  return result
}

function addDebugOrderToOrderbook() {
  const doc = {
    "boughtAt" : 1638144000000,
    "asset" : "DOT/BUSD",
    "assetAmount" : 1,
    "boughtAtPriceOf" : 12.40,
    "status" : "open",
    "closedAt" : 0
  }

  db.orderbook.insert(doc, function (err, newDoc) { 
  });

}

async function makeBuyDecision(marketTrend, currentRocState, movingAverageShort, movingAverageLong, m, balances, currentPrice, amountOfFreeBaseForAsset) {

  var BUY = false;


  // TODO SWITCH ON DECIDING 
  if (marketTrend == marketState.BULL) {
    if (movingAverageShort < movingAverageLong) {
      console.log("\u001B[31mBUY BUY BUY FOR", m)
      console.log("\u001B[0m")
    }
  }

  if (BUY) {
    const assetAmountToBuy = (amountOfFreeBaseForAsset * allocation) / currentPrice;
    if (!debug) {
      const order = await binanceClient.createMarketBuyOrder(m, assetAmountToBuy); 
    } else {
      const order = makeDebugOrderRealPrices(m, assetAmountToBuy, currentPrice)
    }

    // Add new order to local order book
    const doc = {
      "boughtAt" : order.timestamp,
      "asset" : m,
      "assetAmount" : order.amount,
      "boughtAtPriceOf" : order.price,
      "status" : "open",
      "dynamicStop" : (order.price - minimalProfitPercent),
      "closedAt" : 0
    }

    db.orderbook.insert(doc, function (err, newDoc) { 
    });
  }
}

async function makeSellDecision(marketTrend, currentRocState, movingAverageShort, movingAverageLong, m, balances, currentPrice, amountOfFreeBaseForAsset) {

  var SELL = false;


  // TODO SWITCH ON DECIDING 
  

  if (SELL) {
    // SELL
    // UPDATE ORDERBOOK
  }

}

function makeDebugOrderRealPrices(m, assetAmountToBuy, currentPrice) {
  return doc = {
    "boughtAt" : Date.now(),
    "asset" : m,
    "assetAmount" : assetAmountToBuy,
    "boughtAtPriceOf" : currentPrice,
    "status" : "open",
    "dynamicStop" : (currentPrice - minimalProfitPercent),
    "closedAt" : 0
  }
}

function lookForOpenOrdersToClose(m, currentPrice) {
  console.log("Current price for", m, "is", currentPrice);

  // Get rate of changes
  db.orderbook.find({ asset: m }, function (err, docs) {
    docs.forEach(function(doc){
      if (doc.status === "open") {
        // Is order profitable?
        const potentialProfit = currentPrice - doc.boughtAtPriceOf - minimalProfitBUSD;
        const minimalSalesPrice = doc.boughtAtPriceOf + (doc.boughtAtPriceOf * minimalProfitPercent)
        if (potentialProfit > 0 & currentPrice > minimalSalesPrice) {
          console.log("Profitable position in orderbook detected. Selling position now:", doc.assetAmount, "of market", m)

          db.orderbook.update({_id : doc._id}, { $set: { status: 'closed' } }, {}, function (err, numReplaced) {
            console.log("Closed position")
          });

        } else {
          console.log("Position not profitable yet")
        }
      }
    })
  })
}

function determineMarketTrend(result, m) {
  var marketTrend = marketState.UNKNOWN;
  const adxResult = calculateTrendDirectionADX(buildCandles(result));
  if (adxResult.getResult().toFixed(2) > 26) {
    console.log("Strong market trend detected")
    const positiveADX = adxResult.pdi.toFixed(2);
    const negativeADX = adxResult.mdi.toFixed(2);
    console.log("DI values are +DI", positiveADX, "and -DI", negativeADX, "for", m);
    if (positiveADX > negativeADX) { marketTrend = marketState.BULL; }
    else if (negativeADX > positiveADX) { marketTrend = marketState.BEAR; }
  } else {
    marketTrend = marketState.RANGE; 
    console.log("No market trend detected for", m);
  }
  return marketTrend;
}

function logServerStart() {
  console.log("\u001b[0;36m__________________________________________");
  console.log("\u001b[0;36mStarting Server at:", new Date(Date.now()));
  console.log("\u001b[0;36m__________________________________________");
}

function setUpDatabase() {

  // Load database
  var localDbPath = './db/local.db'
  db = createNewDatabase(localDbPath);

  // Orderbook
  db.orderbook = new Datastore('./db/orderbook.db');
  db.orderbook.loadDatabase();

  // Misc, config and history
  db.misc = new Datastore('./db/misc.db');
  db.misc.loadDatabase();

  // Count all documents in the datastore
  db.orderbook.count({}, function (err, count) {
    console.log("Loaded orderbook database with", count, "entries");
  });
}

function checkFileExists(file) {
  return fs.promises.access(file, fs.constants.F_OK)
           .then(() => true)
           .catch(() => false)
}

function buildCandles(data) {
  var candles = [];
  for (var i = 0; i < data[0].length; i++) {
    candles.push({
      "close" : data[0][i][4],
      "high" : data[0][i][2],
      "low" : data[0][i][3]
    })
  }
  return candles;
}

function calculateTrendDirectionADX(candle) {
  const adx = new ADX(adxInterval);
  candle.forEach(c => adx.update(c));
  if (adx.isStable) {
    console.log("Average Directional Movement Index is stable")
    return adx
  }
  return null;
}

function extractOHLCFromData(data, f) {
  // Close = 4
  var close = [];
  for (var i = 0; i < data[0].length; i++) {
    close.push(data[0][i][f]);
  }
  return close;
}

function startApp() {
    const port = 3001;
    app.listen(port);
    console.log("App started and listening on Port:", port)

    logServerStart();
  }

async function getHistoricData(market) {
  try {
    var since = (Date.now() - (unixTimeToLookBack[timeWindow]) * stepsBackInTime);
    var r = await Promise.all([
      client.fetch_ohlcv(market, timeWindow, since = since)
    ]);
    return r;
  } catch (e) {
    console.log(e)}
}

async function getAllMarkets() {
  try {
    var r = await Promise.all([
      client.load_markets()
    ]);
    
    return r;
  } catch (e) {
    console.log(e)
  }
}

function createBUSDMarkets(markets) {
  for (const [ord, vals] of Object.entries(markets)) {
    if (vals.symbol.includes("BUSD")) {
      busdMarkets.push(vals.symbol)
    }
  }
  console.log("Found", busdMarkets.length, "BUSD markets");
}

function calculateRoC(market) {
  
}

startApp();
main();
