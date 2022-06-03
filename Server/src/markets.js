import {default as ccxt} from "ccxt";
import {app} from "./server.js"
import * as config from "./config.js"

import dotenv from 'dotenv'
dotenv.config()

export const binanceClient = getBinanceClient();
let busdMarkets = [];

export function getBinanceClient() {
    return new ccxt.binance({
        apiKey: process.env.API_KEY,
        secret: process.env.API_SECRET,
        enableRateLimit: true,
        adjustForTimeDifference: true
    });
}

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

app.post('/api/account/fetchBalances', async function fetchBalances(req, res) {
    var balances = null;
    try {
        balances = await binanceClient.fetchBalance();
        console.log("Fetched balances");
        res.send(balances);
        eventBus.emit("fetched-balances");
    } catch(e) {
        console.log("\u001b[0;36mCould not fetch available balances")
        console.log(e)
        res.send(balances);
    }
});
 
export async function getHistoricData(market) {
  try {
    var since = (Date.now() - ((config.unixTimeToLookBack[config.timeWindow]) * config.stepsBackInTime));
    return await Promise.all([
      binanceClient.fetch_ohlcv(market, config.timeWindow, since = since)
    ]);
  } catch (e) {
    console.log(e)}
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