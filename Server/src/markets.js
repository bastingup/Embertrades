import {default as ccxt} from "ccxt";
import {app} from "./server.js"
import * as config from "./config.js"

import dotenv from 'dotenv'
dotenv.config()

export const binanceClient = getBinanceClient();
export const cryptoBaseAsset = "BUSD"
let busdMarkets = [];

export function getBinanceClient() {
    return new ccxt.binance({
        apiKey: process.env.API_KEY,
        secret: process.env.API_SECRET,
        enableRateLimit: true,
    });
}

app.post('/api/markets/getAllBusdMarkets', function getAllBusdMarkets(req, res) {
    getAllMarkets().then(function(allMarkets) {
        const busdMarketsOnBinance = createBUSDMarkets(allMarkets);
        res.send("Length of markets:" + busdMarketsOnBinance.length);
        eventBus.emit("got-all-busd-markets");
    })
});

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

app.post('/api/markets/getHistoricData', async function getHistoricData(req, res) {
  console.log(req.body)
    try {
        var since = (Date.now() - (config.unixTimeToLookBack[config.timeWindow]) * config.stepsBackInTime);
        var r = await Promise.all([
          binanceClient.fetch_ohlcv(market, config.timeWindow, since = since)
        ]);
        res.send(r)
      } catch (e) {
        console.log(e)}
});


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