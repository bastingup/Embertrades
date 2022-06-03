/*
  ---  ---

  Software:   Limit Order Bot
  Version:    0.1
  Author:     Anonymous
  Description:
  This bot automatically places limit orders for you, using the Binane API.
  It buys the dips and keeps track of all purchases of crypto. It can use a dedicated amount of your available
  funds, that you allocated beforehand. Every purchase made will be weighed against a sale. The sale volume is the exact
  volume of the purchase but for a higher price.

  NOTE : ≈ $120.76 - 06-12-2021 / 16.33

*/

// --------------------------------------------------
// ------- IMPORTS  ---------------------------------
// --------------------------------------------------

require('dotenv').config();
const ccxt = require('ccxt');
const axios = require("axios");
const fs = require('fs');

// Pretty much debug
let profitMade = 0;


// --------------------------------------------------
// ------- VARIABLES --------------------------------
// --------------------------------------------------

let initialPrice = null;
let pastPrice = null;
//let binanceurl = 'https://api.binance.com/api/v3/ticker/price?symbol=' + market.replace("/", "");
let binancebaseUrl = 'https://api.binance.com/api/v3/ticker/price?symbol=';

let lastPrices = new Object();


// --------------------------------------------------
// ------- MISC FUNCTIONS ---------------------------
// --------------------------------------------------

// #region FUNCTIONS
async function cancelAllOrders (binanceClient, market) {
    const orders = await binanceClient.fetchOpenOrders(market);
    orders.forEach(async order => {
        await binanceClient.cancelOrder(order.id, market);
        console.log("Canceled all orders on Binance")
    });
}

function msToTime(duration) {
  var milliseconds = Math.floor((duration % 1000) / 100),
      seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000 * 60)) % 60),
      hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}
//#endregion

const tick = async (config, binanceClient) => {

  for (var i = 0; i < config.assetList.length; i++) {
    config.asset = config.assetList[i];
    await tickCore(config, binanceClient);
  }
}

async function tickCore(config, binanceClient) {
  // #region START TICK
  console.log("\u001b[0;36mNew tick at:", new Date(Date.now()));
  //#endregion

  // #region MARKET AND CONFIG
  const { asset, base, allocation } = config;
  const market = `${asset}/${base}`;
  //#endregion

  // #region CANCEL EXISTING ORDERS
  // Cancel all orders
  cancelAllOrders(binanceClient, market);
  //#endregion

  // #region GET MARKET PRICES
  try {
    // Get market price
    var result = await Promise.all([
      axios.get((binancebaseUrl + market.replace("/", "")))
    ])
    result = parseFloat(result[0].data.price)
    console.log("\u001b[0;31mCurrent price of", asset, "in BUSD:", result);

    // Set market price and if not existing last price
    //console.log(lastPrices);
    if (lastPrices[market] === undefined) {
      lastPrices[market] = {"marketPrice" : result};
      console.log("Set last price to market price, since it was not defined yet");
      lastPrices[market].lastPrice = result
    } else {
      lastPrices[market]["marketPrice"] = result;
      console.log("Update market price. Price of last tick was:", lastPrices[market].lastPrice)
    }
  }
  catch(e) {
    console.log(e);
    console.log("\u001b[0;36mCould not fetch market price for", asset, ". Exiting here");
    // TODO EXIT
  }
  //#endregion

  // #region FETCH BALANCES
  // Fetch balances from Binance
  let balances = null;
  try {
    balances = await binanceClient.fetchBalance();
    console.log("Fetched balances")
  } catch {
    console.log("\u001b[0;36mCould not fetch available balances")
  }
  //#endregion

  // #region LOAD ORDERBOOK
  // Order book in local json to keep track of all orders
  var orderbook = await require("./orders/orderbook.json");
  //#endregion

  // #region SET THRESHOLDS FOR BUYING
  // Limit for buying more asset. If market drops to this point since last tick, buy
  var limitForBuyMore = (lastPrices[market].lastPrice - (lastPrices[market].lastPrice * config.percentageBelowLastMarketPrice));
  console.log("Limit for buying more", asset, limitForBuyMore)

  // Amount of asset to buy
  const assetAmountToBuy = (balances.free[base] * allocation) / lastPrices[market].marketPrice;
  //#endregion

  // #region BUY MORE ASSET
  if (balances.free[base] >= config.busdLimit){
    if (lastPrices[market].marketPrice < limitForBuyMore) {
      console.log("Current market price of", lastPrices[market].marketPrice, "is below last market price minus movement of", (config.percentageBelowLastMarketPrice) * 100, "% - Buy limit at", limitForBuyMore);

      // Place a limit buy order
      console.log("Trying to place buy order...");
      try {

        //await binanceClient.createLimitBuyOrder(market, assetAmountToBuy, marketPrice + config.safety); 
        const order = await binanceClient.createMarketBuyOrder(market, assetAmountToBuy); 
        //console.log(order.info);

        // Add new order to local order book
        orderbook.orders[order.timestamp] = {
          "boughtAt" : order.timestamp,
          "asset" : market,
          "assetAmount" : order.amount,
          "assetPriceUsed" : order.price,
          "status" : "open",
          "closedAt" : 0
        }
    
        // ------- SAVE CHANGES TO ORDER BOOK ---------------
        const filename = "./orders/orderbook.json";
        fs.writeFile(filename, JSON.stringify(orderbook), function writeJSON(err, filename) {
          if (err) {
            return console.log(err);
          }
          else {
            // TODO CRITICAL: Change the filename and location. For some reason, it is not passed through the function as arg
            console.log('Updating local orderbook at:', "./orders/orderbook.json");
            console.log("__________________________________________");
          }
        });

        console.log("\u001b[0;32mBought more", asset, "\u001b[0;32mat", lastPrices[market].marketPrice)
      }
      catch (e) {
        console.log("\u001b[0;36mCould not place all orders. Code:", e.code);
      }
    } else {
      console.log("Market price did not go low enough since last tick")
    }
  }
  else {
    console.log("Not enough base crypto in wallet");
  }
  //#endregion

  // #region SELL ASSET
  // Number of open orders to close
  var openLength = Object.values(orderbook.orders).filter(o => o.status === "open").length;
  if (openLength > 0) {
    console.log("Found", openLength, "still to be closed")

    // Itterate orders
    for (const [ord, vals] of Object.entries(orderbook.orders)) {
      if ((vals.status === "open") & (vals.asset === market)){
        let targetSalePrice = (vals.assetPriceUsed + (vals.assetPriceUsed * config.percentageAboveBuy));
        if (targetSalePrice < lastPrices[market].marketPrice) {

          console.log("Market price is ABOVE buy price plus", (config.percentageAboveBuy * 100),"% of", targetSalePrice, "BUSD. // -- SELLING", vals.assetAmount);
          
          // Place a limit sell order
          console.log("Placing sell order...");
          try {

            const order = await binanceClient.createMarketSellOrder(vals.asset, vals.assetAmount); 
            //console.log(order);
            console.log("\u001b[0;32mSold", vals.asset, "\u001b[0;32mat price of", order.price);
          }
          catch (e) {
            console.log("\u001b[0;36mCould not place all orders. Code:", e.code);
          }

          orderbook.orders[ord].status = "closed";
          orderbook.orders[ord].closedAt = lastPrices[market].marketPrice;
          console.log("\u001b[0;0mBe sure to double check your actual orders on Binance. Due to lag, sell price and market price can differ slightly");
          profitMade += (orderbook.orders[ord].closedAt - orderbook.orders[ord].assetPriceUsed) * orderbook.orders[ord].assetAmount
        } else {
          let sellAmount = vals.assetAmount;
          console.log("Market price is BELOW buy price plus", (config.percentageAboveBuy * 100),"% of", targetSalePrice, "BUSD. // -- KEEPING", sellAmount);
        }
      }
    }
  } else {
    console.log("No orders found that require closure");
  }
  //#endregion
    
  // #region UPDATE LAST PRICES
  // Update initial price for next tick
  lastPrices[market].lastPrice = lastPrices[market].marketPrice
  //#endregion

  // #region END TICK
    console.log("Updating variable for tracking market price of last tick with current market price")
    console.log("// Waiting for next tick //")
    console.log("Current profit in BUSD:", profitMade);

    // TODO: Finish iteration by saving closed orders to new file and delete them from orderbook for performance
    console.log("__________________________________________");
    //#endregion
}

// --------------------------------------------------
// ------- MAIN -------------------------------------
// --------------------------------------------------

const main = () => {
    const config = { 
      asset : "DOT",
      assetList : ["ADA", "TRX", "DOT", "SOL", "ETH", "BNB", "BTC"],
      base : "BUSD",
      allocation : 0.25,     
      tickInterval : 60000,  
      percentageAboveBuy : 0.01,
      percentageBelowLastMarketPrice : 0.007,
      safety : 1,
      busdLimit : 12
    };
    const binanceClient = new ccxt.binance({
      apiKey: process.env.API_KEY,
      secret: process.env.API_SECRET
    });


    console.log("\u001b[0;36m__________________________________________");
    console.log("\u001b[0;36mStarting Server at:", new Date(Date.now()));
    console.log("\u001b[0;36mTrading on market:", config.assetList, "\u001b[0;36magainst base currency/", config.base);
    console.log("\u001b[0;36mTime between ticks:", msToTime(config.tickInterval));
    console.log("\u001b[0;36mOnly buying more crypto asset if market drops by", config.percentageBelowLastMarketPrice * 100, "\u001b[0;36m%");
    console.log("\u001b[0;36mOnly selling crypto asset if market is", config.percentageAboveBuy * 100, "\u001b[0;36m% above buy price");
    console.log("\u001b[0;36mAllocating", config.allocation * 100, "\u001b[0;36m% of available funds to buy crypto asset");
    console.log("\u001b[0;36m__________________________________________");

    tick(config, binanceClient);
    setInterval(tick, config.tickInterval, config, binanceClient);
  };

  main()
