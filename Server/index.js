

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
import {SMA, ROC, ADX, MACD, EMA, StochasticOscillator} from 'trading-signals'; // https://github.com/bennycode/trading-signals
// #endregion

// #region FIELDS

const app = express();
const client = getBinanceClient();

// Config
const debug = false;
var timeWindow = "6h";
const unixTimeToLookBack = {
  "6h" : 21600000,
  "4h" : 14400000,
  "2h" : 7200000,
  "1h" : 3600000,
  "30m" : 1800000,
  "15m" : 900000,
  "10m" : 600000,
  "5m" : 300000
}
const binancebaseUrl = 'https://api.binance.com/api/v3/ticker/price?symbol=';
const stepsBackInTime = 180;

var minimalProfitPercent = 0.01;
var minimalProfitBUSD = 0.06;

// Technical indicator settings
const movingAverageShortterm = 10;
const movingAverageLongterm = 40;
const adxInterval = 10;
const adxThreshold = 27;
const macdInterval = [8, 18, 12];
const oversoldLimit = 20
const overboughtLimit = 80
const allocation = 0.6;    

// Markets
let busdMarkets = [];
const assets = ["SOL", "ETH", "DOT", "ADA", "SOL", "YGG", "LINK", "BNB", "DAR", "BTC", "DOGE", "SHIB", "TRX", "XLM", "CHZ", "IOTA", "ETC"]
//const assets = ["DOT"]
const base = "BUSD"

// Global database variable
let db = null;

// Market enum
const marketState = {"BULL": "BULL", "BEAR": "BEAR", "RANGE" : "RANGE", "UNKNOWN" : "UNKNOWN"}
const macdState = {"CROSSED_TO_POSITIVE": "CROSSED_TO_POSITIVE", "CROSSED_TO_NEGATIVE": "CROSSED_TO_NEGATIVE", "ZERO_ERROR": "ZERO_ERROR", "NO_CHANGE": "NO_CHANGE"}
const buyStrategyState = {"GOLDENCROSS": "GOLDENCROSS"
                         ,"GOLDENCROSS_BULL": "GOLDENCROSS_BULL"
                         ,"MACD_MA": "MACD_MA"
                         ,"ADX_MA": "ADX_MA"
                         ,"MACD_TURN": "MACD_TURN"
                         ,"MACD_STOCH": "MACD_STOCH"}
let selectedBuyStrategy = buyStrategyState.MACD_STOCH;

const sellStrategyState = {"MASHORT_ABOVE_MALONG_ROC_ZERO": "MASHORT_ABOVE_MALONG_ROC_ZERO"
                          ,"PRICE_X_ABOVE_BUY_PRICE": "PRICE_X_ABOVE_BUY_PRICE"
                          ,"DYNAMIC_STOP": "DYNAMIC_STOP"}
let strategyPerAsset = {}
// #endregion

// #region API
app.post('/api/binanceClient', getBinanceClient);

// #endregion


const main = async () => {

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

        var closes, closesPast, movingAverageShort, marketTrend, movingAverageLong, currentRoc, lastRoc = null;
        
        switch (selectedBuyStrategy) {
          case buyStrategyState.MACD_STOCH:
            getCurrentPrice(m).then(function(currentPrice) {
            
              closes = extractOHLCFromData(result[0], 4)
              // 1. Longterm trend positive
              const roc = getROCResult(closes, 100).getResult().toFixed(4)
              console.log("ROC 100", roc)
              if (roc > 0) {
                console.log("ROC 100 bigger than 0")
              }

              // 2. Oversold, in the recent past
              const stochLookback = 12;
              var oversold = false;
              for (var i = 1; i < stochLookback + 1; i++) {
                if (getSTOCHResult(buildCandles(result[0].slice(0, -i))).k.toFixed(2) < oversoldLimit) {
                  oversold = true;
                }
              }
              if (oversold) {
                
                // 3. MACD Signals
                console.log("Oversold in the recent past.")
                const macdResult = getMACDResult(closes);     
                const macdHistogram = macdResult.histogram.toFixed(4);
                const macdResultPast = getMACDResult(closes.slice(0, -1));     
                const macdHistogramPast = macdResultPast.histogram.toFixed(4);
                const crossing = (detectCrossing(macdHistogramPast, macdHistogram))

                var signalDoc = {
                  "timestamp" : Date.now(),
                  "asset" : m,
                  "signal" : "",
                  "price" : currentPrice,
                  "roc100" : roc
                }

                if (crossing == macdState.CROSSED_TO_POSITIVE) {
                  console.log("\u001B[31mBUY BUY BUY FOR MACD", m, "at", currentPrice)
                  console.log("Minimal Profit for buying at price", currentPrice, "is", calculateMinimalProfit(currentPrice))
                  signalDoc.signal = "BUY"

                  db.signals.insert(signalDoc, function (err, newDoc) { });
                  BUY(m, currentPrice, amountOfFreeBaseForAsset)

                } else if (crossing == macdState.CROSSED_TO_NEGATIVE) {
                  console.log("\u001B[31mSELL SELL SELL FOR MACD", m, "at", result[0][4])
                  console.log("\u001B[0m")
                  signalDoc.signal = "SELL"
                  db.signals.insert(signalDoc, function (err, newDoc) { });
                  lookForOpenOrdersToClose(m, currentPrice)

                } else {
                  console.log("No crossing found")
                }
                // 4. Set dynamic stoploss limit
                // TODO CRITICAL
              } else {
                console.log("No oversell in the recent past")
              }
            })
            
            break;

        }
      })
    })
  })
}



function getMACDResult(prices) {
  const macd = new MACD({
    indicator: EMA,
    shortInterval: macdInterval[0],
    longInterval: macdInterval[1],
    signalInterval: macdInterval[2],
  });
  prices.forEach(p => macd.update(p));
  return macd.getResult();
}

function createNewDatabase(localDbPath) {
  return new Datastore({ filename: localDbPath});
}

function getROCResult(prices, interval) {
  const roc = new ROC(interval);
  prices.forEach(p => roc.update(p));
  return roc;
}

function getSTOCHResult(prices) {
  const stoch = new StochasticOscillator(15, 3);
  prices.forEach(p => stoch.update(p));
  return stoch.getResult();
}

function getMAResult(prices, n) {
  const ma = new SMA(n);
  prices.forEach(p => ma.update(p));
  return ma.getResult().toFixed(4);
}

function detectCrossing(past, now) {
  const signPast = Math.sign(past);
  const signNow = Math.sign(now);
  console.log("past", signPast, "now", signNow)
  if (signPast > signNow) {
    return macdState.CROSSED_TO_NEGATIVE;
  }
  if (signPast < signNow) {
    return macdState.CROSSED_TO_POSITIVE;
  }
  // TODO test this and deceide
  // If either one is zero, should we catch this?
  if (signNow === 0 || signPast === 0) {
    return macdState.ZERO_ERROR;
  }
  return macdState.NO_CHANGE;
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

async function BUY(m, currentPrice, amountOfFreeBaseForAsset) {
  const assetAmountToBuy = (amountOfFreeBaseForAsset * allocation) / currentPrice;
  if (!debug) {
    await client.createMarketBuyOrder(m, assetAmountToBuy).then(function(order){
      console.log(order)
      db.orderbook.insert(createOrderForOrderbook(m, order), function (err, newDoc) { });
    })
  } else {
    const order = makeDebugOrderRealPrices(m, assetAmountToBuy, currentPrice)
    db.orderbook.insert(createOrderForOrderbook(m, order), function (err, newDoc) { });
  }
}

function createOrderForOrderbook(m, order) {
  var doc = {
    "boughtAt" : order.timestamp,
    "asset" : m,
    "assetAmount" : order.amount,
    "boughtAtPriceOf" : order.price,
    "status" : "open",
    "dynamicStop" : "NOT IMPLEMENTED",
    "closedAt" : 0
  }

  if (order.fee.currency == m.split('/')[0]) {
    doc.assetAmount -= order.fee.cost
  }

  return doc
}


function makeDebugOrderRealPrices(m, assetAmountToBuy, currentPrice) {
  return {
    "timestamp" : Date.now(),
    "asset" : m,
    "amount" : assetAmountToBuy,
    "price" : currentPrice,
    "status" : "open",
    "dynamicStop" : "NOT IMPLEMENTED",
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

          SELL(doc)

        } else {
          console.log("Position not profitable yet")
        }
      }
    })
  })
}

async function SELL(doc) {
  await client.createMarketSellOrder(doc.asset, doc.assetAmount).then(function(order)
  {
    db.orderbook.update({_id : doc._id}, { $set: { status: 'closed', closedAt: order.price} }, {}, function (err, numReplaced) {
      console.log("Closed position")
      console.log(order)
    })
  })
}

function determineMarketTrendADX(result, m) {
  var marketTrend = marketState.UNKNOWN;
  const adxResult = calculateTrendDirectionADX(buildCandles(result));
  if (adxResult.getResult().toFixed(2) > adxThreshold) {
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

  // Misc, config and history
  db.signals = new Datastore('./db/signals.db');
  db.signals.loadDatabase();

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
  for (var i = 0; i < data.length; i++) {
    candles.push({
      "close" : data[i][4],
      "high" : data[i][2],
      "low" : data[i][3]
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
  for (var i = 0; i < data.length; i++) {
    close.push(data[i][f]);
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
  var busdm = [];
  for (const [ord, vals] of Object.entries(markets)) {
    if (vals.quote.includes("BUSD")) {
      busdm.push(vals.base)
    }
  }
  console.log("Found", busdMarkets.length, "BUSD markets");
  return busdm
}

function allNumbersSameSign(a, b) {
  if (Math.sign(a) == Math.sign(b)) {
    return true;
  }
  return false;
}

function calculateMinimalProfit(price) {
  var minimal = price + (price * minimalProfitPercent)
  if (minimal - price >= minimalProfitBUSD) {
    return minimal
  }
  return price + minimalProfitBUSD;
}



setUpDatabase();
startApp();

main();
setInterval(main, unixTimeToLookBack[timeWindow]);
