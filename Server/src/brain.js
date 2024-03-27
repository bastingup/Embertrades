import * as colors from "./colors.js"
import * as markets from './markets.js';
import * as server from "./server.js"
import * as dbmanagement from "./databaseManagement.js"
import * as indicators from './indicators.js'
import { config } from "dotenv"
import {default as fs} from "fs";
import * as https from "https"
import fetch from 'node-fetch';

// --------------------------------------------------
// --------------------------------------------------
// --------------- EMBERWAVE DCA --------------------
// --------------------------------------------------
// --------------------------------------------------
export async function handlePositionOpening(configData) {
    const fearAndGreed = await getFearAndGreedIndex()
    const brainCell = await buildAllInformation(configData, configData.dcaSignalConfig.whiteListed[0])
    //console.log(brainCell.candles)
}
export async function handlePositionClosing(configData) {
}

async function buildAllInformation(configData, ASSET) {

    // This is the historic market data
    // e.G. if we get last 5 hours and it is 9.13am right now, it will get us the data for the entries:
    // 5am, 6am, 7am, 8am, 9am -> This way we can build our trading signals with the hsitoric data of the past "full" steps in time
    // and have one more datapoint that is up to date right now in this cycle, like real time data so we see how indicators have changed right now
    let marketData = await markets.getHistoricData(configData, ASSET)

    // Current pricate as last entry in our market data
    const currentMarketData = await markets.getCurrentPrice(configData, ASSET)
    marketData[0].push(markets.buildTickerArrayForHistoricMerge(currentMarketData)) 

    // Turn market data array into candles
    const candles = markets.buildCandlesFromDownloadedData(marketData[0]);

    // Build Indicator signals
    let indicatorResults;
    await indicators.buildIndicatorSignals(configData, ASSET, candles).then(function(data) {indicatorResults = data})

    // What do all the things tell us to do
    const signals = indicators.signalResultsToTradingSignals(configData, indicatorResults)
    //console.log(signals)

    return {"candles": candles,
            "market": marketData,
            "indicators": indicatorResults,
            "signals": signals}
}

async function loadOpenPositions() {

}

async function getFearAndGreedIndex() {
    const url = "https://api.alternative.me/fng/?limit=10"
    return await fetch(url)
    .then(response => response.json())
    .catch(error => console.error('Error:', error));
}

// --------------------------------------------------
// --------------- ALLLLLLLLLLL ISSSS LEGACYYYYYYYYYYYYY ---------------------
// --------------------------------------------------
// --------------------------------------------------
// --------------------------------------------------
// --------------- BACKEND SOLO ---------------------
// --------------------------------------------------
// --------------------------------------------------

export const decisionDirection = {"BUY": "BUY", "SELL" : "SELL"}
const orderType = {"NORMAL" : "NORMAL", "TRAILING" : "TRAILING", "ASAP" : "ASAP", "STOPLOSS" : "STOPLOSS", "FORCE" : "FORCE"}

export function mainEventCallback() {
    console.log(colors.importantInfoLog + "BRAIN - Emitted event: finished-main-function. Main function ran through.")
}

function modeMessage(message) {
    console.log(colors.importantInfoLog + "BRAIN - " + message)
}

// Main function of actual trading
export async function trading(configData) {
    console.log(colors.importantInfoLog + "BRAIN - Running the trading function.")

    // Message so we know what mode we are in
    let message = "Mode set to: " + configData.mode
    switch(configData.mode) {
        case "dev":
            message += ". Exiting trading function now."
            modeMessage(message)
            return
        case "backtest":
            message += ". Backtesting strategy from config file."
            modeMessage(message)
            break
        case "live_trading":
            message += ". LIVE TRADING. We are making trades, let's goooo."
            modeMessage(message)
            break
        case "backtest_2":
            message += ". LIVE TRADING. We are making trades, let's goooo."
            modeMessage(message)
            break
        case "simulative_trading":
            message += ". SIMULATIVE TRADING. Same as live trading but without actually making real trades"
            modeMessage(message)
            break
        default:
            message += ". ERROR appeared. Exiting trading function now."
            modeMessage(message)
            return
    }

    // Get the data from db
    dbmanagement.db.markets.find({}).sort({ timeStamp: 1 }).exec(function (err, docs) {

        // Everything needed for backtesting
        let backTestOrderbook = []
        let backtestBUSD = configData.backtest.fakeBUSDTotal
        let finalValue = 0
        let availableBUSDOverTime = []
        let walletValueOverTime = []
        var completeMarketData = []

         // Get all the docs of a certain step in time
        const uniqueStepsInTime = getSortedUniqueStepsInTime(docs)

        // ------------------------------------------
        // ------------- BACKTEST
        // ------------------------------------------
        if (configData.mode == "backtest") {

            // Everything needed for backtesting
            let backTestOrderbook = []
            let backtestBUSD = configData.backtest.fakeBUSDTotal
            let finalValue = 0
            let availableBUSDOverTime = []
            let walletValueOverTime = []
            var completeMarketData = []

            // ----------------------------------------------- STEP IN TIME
            // Get all the docs of a certain step in time
            const uniqueStepsInTime = getSortedUniqueStepsInTime(docs)
            for (const step of uniqueStepsInTime) {

                // Track what is happening at this point in time across assets
                let allAssetsWithBuySignalAtThisTimestep = []
                let walletValueAtThisPointInTime = 0

                // ----------------------------------------------- DOCUMENT AT STEP IN TIME
                for (const d of docs.filter(doc => doc.timeStamp == step)) {

                    
     
                    // ----------------------------------------------- SELL SELL SELL SELL SELL SELL SELL SELL SELL 
                    // Are there sell signals right now for this asset at this point in time?
                    d["SELLSIGNALS"] = {}
                    const sellDec = decision(configData, d, decisionDirection.SELL)
                    for (const e of sellDec){d["SELLSIGNALS"][Object.keys(e)[0]] = Object.values(e)[0]} 
                    if (sellDec.some(c => Object.values(c)[0] == true)) {
                        // Go through whole order book and check for open orders
                        for (let order of backTestOrderbook) {

                            // Order that are still open at this point in time and are of the current asset
                            if (order.asset == d.asset && order.status == "OPEN") {

                                // Get an updated order object
                                const updatedOrder = makeFakeSell(configData, order, d, true)
                                if (updatedOrder.status != "OPEN") {

                                    // Update the order in the orderbook
                                    order = updatedOrder

                                    // Add money made or lost to our BUSDWallet
                                    backtestBUSD += updatedOrder.moneyMade + (updatedOrder.priceSell * updatedOrder.qty)

                                    // --------------------------- PROFIT
                                    if (updatedOrder.status == "CLOSED") {
                                        console.log(colors.profitLog + "BRAIN - Closed order:", order.asset, order.priceBuy, order.priceSell, order.moneyMade, order.qty)
                                    }

                                    // --------------------------- STOPLOSS
                                    else if (updatedOrder.status == "STOPLOSS") {
                                        console.log(colors.stoplossLog + "BRAIN - Closed order:", order.asset, order.priceBuy, order.priceSell, order.moneyMade, order.qty)
                                    }
                                }
                            }
                        }
                    }

                    // ----------------------------------------------- BUY BUY BUY BUY BUY BUY BUY BUY BUY BUY BUY 
                    // Signals for buying
                    d["BUYSIGNALS"] = {}
                    const buyDec = decision(configData, d, decisionDirection.BUY)
                    for (const e of buyDec){d["BUYSIGNALS"][Object.keys(e)[0]] = Object.values(e)[0]}
                    if (buyDec.some(c => Object.values(c)[0] == true)) {allAssetsWithBuySignalAtThisTimestep.push(d)}

                    // Fake order
                    let order = makeFakeOrder(configData, allAssetsWithBuySignalAtThisTimestep, backtestBUSD)
                    if (order[0].length > 0) {
                        backTestOrderbook.push(...order[0][0])
                        const recentOrder = backTestOrderbook[backTestOrderbook.length - 1]
                        backtestBUSD -= order[1]
                        console.log(colors.buyLog + "BRAIN - Made order:", recentOrder.asset, recentOrder.priceBuy, recentOrder.qty)
                    }


                    // ----------------------------------------------- VALUE TRACKER
                    // If last timestep, check the final value of the BUSD Wallet
                    if (d.timeStamp == docs[docs.length - 1].timeStamp) { finalValue += checkFinalBUSDValue(d, backTestOrderbook) }

                    // Track market data
                    completeMarketData.push(d)

                    // Track value of complete portfolio
                    const allOpenOrders = backTestOrderbook.filter(function(order) { return order.status == "OPEN" && order.asset == d.asset; });
                    for (let order of allOpenOrders) {walletValueAtThisPointInTime += d.close * order.qty}
                    

                } // ----------------------------------------------/ DOCUMENT AT STEP IN TIME

                // After going through all assets at this step in time, how is our portfolio doing?
                availableBUSDOverTime.push({"timestamp" : step, "value" : backtestBUSD})
                walletValueAtThisPointInTime += backtestBUSD
                walletValueOverTime.push({"timestamp" : step, "value" : walletValueAtThisPointInTime})

                
            } // ----------------------------------------------/ STEP IN TIME

            

            // Save tracked values to json
            fs.writeFile("./data/busdOverTime.json", JSON.stringify(availableBUSDOverTime), function(err) { if (err) { console.log(err); } });
            fs.writeFile("./data/backtestOrderbook.json", JSON.stringify(backTestOrderbook), function(err) {if (err) { console.log(err); } });
            fs.writeFile("./data/marketData.json", JSON.stringify(completeMarketData), function(err) {if (err) { console.log(err); } });
            fs.writeFile("./data/walletValueOverTime.json", JSON.stringify(walletValueOverTime), function(err) {if (err) { console.log(err); } });

            // Add remaining BUSD to finalvalue
            finalValue += backtestBUSD
            console.log("Final BUSD value", finalValue)
            console.log(colors.importantInfoLog + "BRAIN - Finished on-the-fly-backtesting for all available data.")
        }

        if (configData.mode == "backtest_2") {
            // ----------------------------------------------- STEP IN TIME
            for (const step of uniqueStepsInTime) {
                // Track what is happening at this point in time across assets
                let allAssetsWithBuySignalAtThisTimestep = []
                let walletValueAtThisPointInTime = 0
                // ----------------------------------------------- DOCUMENT AT STEP IN TIME
                for (const d of docs.filter(doc => doc.timeStamp == step)) {
            

                    // BACKTEST v2
                    console.log(d)



                }
            }

        }

        // ------------------------------------------
        // ------------- SIMULATIVE & LIVE TRADING
        // ------------------------------------------

        else {
            // Only get last document for trading right now
            // CRITICAL Binance is only sending 15m intervals set to 10.45 for example
            //docs = docs.slice(-1)
        }
    })
}


function determineBuySignals() {
    d["BUYSIGNALS"] = {}
    const buyDec = decision(configData, d, decisionDirection.BUY)
    for (const e of buyDec){d["BUYSIGNALS"][Object.keys(e)[0]] = Object.values(e)[0]}
    if (buyDec.some(c => Object.values(c)[0] == true)) {allAssetsWithBuySignalAtThisTimestep.push(d)}

}



function getWalletValue(ds, i, wallet) {
    let finalWalletValue = wallet["BUSD"]
    Object.entries(wallet).forEach(function(o){
        const lastPrice = ds.forEach(function(lastSignal) {
            if (lastSignal.timestamp == i - 1) {
                if (lastSignal.asset == o[0]) {
                    finalWalletValue += lastSignal.price * wallet[o[0]]
                }
            }
        })
    })

    return finalWalletValue
}

export async function backtestIndicatorSelection(configData) {

    console.log(colors.importantInfoLog + "BRAIN - On-the-fly-backtest not fully implemented yet.")

    dbmanagement.db.markets.find({}).sort({ timeStamp: 1 }).exec(function (err, docs) {

        // Get all the unique steps in time form database sorted in ascending order
        const uniqueStepsInTime = getSortedUniqueStepsInTime(docs)
        let backTestOrderbook = []
        let backtestBUSD = configData.backtest.fakeBUSDTotal
        let finalValue = 0
        let recentLosses = 0
        let buyStop = 0

        // Go through steps in time and fine assets
        for (const step of uniqueStepsInTime) {

            // Need to extract docs from filter loop
            let docsWithBuySignalsAtThisTimestep = []

            // Go through all assets in a given step in time
            for (const d of docs.filter(doc => doc.timeStamp == step)) {

                //console.log("STEP IN TIME", step, "BUSD", backtestBUSD, "LENGTH OF OB", backTestOrderbook.length)

                // --------------------------------------------------------------------
                // --------------------------- BUY
                // --------------------------------------------------------------------
                d["BUYSIGNALS"] = {}
                d["SELLSIGNALS"] = {}
                let sellSignal = false

                // --------- MAIN PART
                // --------- HERE WE HAVE A STEP IN TIME
                const decisionsBuy = decision(configData, d, decisionDirection.BUY)
                for (const e of decisionsBuy){d["BUYSIGNALS"][Object.keys(e)[0]] = Object.values(e)[0]}
                if (decisionsBuy.some(c => Object.values(c)[0] == true)) {docsWithBuySignalsAtThisTimestep.push(d)}

                // --------------------------------------------------------------------
                // --------------------------- SELL
                // --------------------------------------------------------------------
                //const openOrders = backTestOrderbook.filter(order => order.status == "OPEN");
                const decisionsSell = decision(configData, d, decisionDirection.SELL)

                for (const e of decisionsSell){d["SELLSIGNALS"][Object.keys(e)[0]] = Object.values(e)[0]} 
                if (decisionsSell.some(c => Object.values(c)[0] == true)) {
                    sellSignal = true
                }

                // Go through whole order book and check for open orders
                for (let o of backTestOrderbook) {
                    if (o.asset == d.asset && o.status == "OPEN") {
                        
                        // Try to close open orders
                        const updatedO = makeFakeSell(configData, o, d, sellSignal)
                        if (updatedO.status != "OPEN") {
                            o = updatedO
                            backtestBUSD += updatedO.moneyMade + (updatedO.priceSell * updatedO.qty)

                            // --------------------------------------------------------------------
                            // --------------------------- PROFIT
                            if (updatedO.status == "CLOSED") {
                                console.log(colors.profitLog + "BRAIN - Closed order:", o.asset, o.priceBuy, o.priceSell, o.moneyMade, o.qty)
                                recentLosses -= 1
                            }
                            // --------------------------------------------------------------------
                            // --------------------------- STOPLOSS
                            else if (updatedO.status == "STOPLOSS") {
                                console.log(colors.stoplossLog + "BRAIN - Closed order:", o.asset, o.priceBuy, o.priceSell, o.moneyMade, o.qty)
                                recentLosses += 1

                                // --------------------------------------------------------------------
                                // --------------------------- TOO MANY STOPLOSSES, FORCE SELL AND/OR STOP TRADING
                                if (recentLosses == 3) {
                                    buyStop = 12
                                    for (let o of backTestOrderbook) {
                                        if (o.asset == d.asset && o.status == "OPEN") {
                                            o = makeFakeSell(configData, o, d, sellSignal, true)
                                            console.log(colors.importantInfoLog + "BRAIN - Closed order:", o.asset, o.priceBuy, o.priceSell, o.moneyMade, o.qty)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                trackAvailableBUSDOverTime(step, backtestBUSD)




                if (d.timeStamp == docs[docs.length - 1].timeStamp) {
                    finalValue += checkFinalBUSDValue(d, backTestOrderbook)
                }
            }

            // --------------------------------------------------------------------
            // --------------------------- FINAL
            // --------------------------------------------------------------------
            if (docsWithBuySignalsAtThisTimestep.length > 0 && buyStop === 0) {
                let order = makeFakeOrder(configData, docsWithBuySignalsAtThisTimestep, backtestBUSD)
                if (order[0].length > 0) {
                    backTestOrderbook.push(...order[0][0])
                    const recentOrder = backTestOrderbook[backTestOrderbook.length - 1]
                    backtestBUSD -= order[1]
                    console.log(colors.buyLog + "BRAIN - Made order:", recentOrder.asset, recentOrder.priceBuy, recentOrder.qty)
                }
            }

            if (buyStop > 0) {
                buyStop -= 1
            }
        }

        finalValue += backtestBUSD
        console.log("Final BUSD value", finalValue)
        console.log(colors.importantInfoLog + "BRAIN - Finished on-the-fly-backtesting for all available data.")



        fs.writeFile("./data/busdOverTime.json", JSON.stringify(availableBUSDOverTime), function(err) {
            if (err) {
                console.log(err);
            }
        });
        fs.writeFile("./data/backtestOrderbook.json", JSON.stringify(backTestOrderbook), function(err) {
            if (err) {
                console.log(err);
            }
        });
        fs.writeFile("./data/signals.json", JSON.stringify(allSignals), function(err) {
            if (err) {
                console.log(err);
            }
        });
    })
}

function checkFinalBUSDValue(d, backTestOrderbook) {
    let finalValues = 0
    for (let o of backTestOrderbook) {
        if (o.status == "OPEN" && o.asset == d.asset) { 
            finalValues += (d.close * o.qty)
        }
    }
    return finalValues
}

function makeFakeSell(configData, o, d, sellSignal, forceSell) {
    const profitable = isProfitable(configData, o, d)
    o.type = checkForStoploss(configData, o, d)
    if (forceSell === true) {
        o.type = "FORCE"
    }

    switch (o.type) {

        case orderType.ASAP:
            if (profitable) {
                o = closeOrder(configData, o, d)
            }
            break

        case orderType.NORMAL:
            if (sellSignal === true) {
                if (profitable) {
                    o = closeOrder(configData, o, d)
                }
            }
            break
        case orderType.TRAILING:
            if (d.close > o.lastHighestPrice) {
                o.lastHighestPrice = d.close
            } else if (d.close < o.lastHighestPrice) {
                if (profitable) {
                    o = closeOrder(configData, o, d)
                }
            }
            break
        case orderType.STOPLOSS:
            o = closeOrder(configData, o, d)
            o.status = "STOPLOSS"
            break

        case orderType.FORCE:
            o = closeOrder(configData, o, d)
            o.status = "FORCE"
            break
    }

    return o
}

function closeOrder(configData, o, d) {
    let moneyMade
    // General stuff
    o.priceSell = d.close
    o.status = "CLOSED"
    // Money made
    moneyMade = calculateMoneyMade(configData, o, d)
    o.moneyMade = moneyMade
    o.timestampSell = d.timeStamp
    o.signalSell = d.SELLSIGNALS
    return o
}

function checkForStoploss(configData, o, d) {
    const p = 100 - ((o.priceBuy / d.close) * 100)
    if (p < 0 && Math.abs(p) > configData.trading.stoploss.value) {
        return "STOPLOSS"
    }
    return o.type
}

function calculateMoneyMade(configData, o, d) {
    // TODO not properly implemnented yet - Don't forget fee
    return (d.close - o.priceBuy) * o.qty
}

function isProfitable(configData, o, d) {
    switch (configData.trading.profit.mode) {

        case "PERCENT":
            const p = 100 - ((o.priceBuy / d.close) * 100)
            if (p > configData.trading.profit.value) {
                return true
            }
            return false
            
        default:
            return false
            

    }
}

function makeFakeOrder(configData, currentDocs, backtestBUSD) {

    let newOrders = [[], 0]
    if (currentDocs.length == 0) {return newOrders}
    
    const budgetPerAsset = (1 / currentDocs.length) * configData.trading.fractionPerStepInTime * backtestBUSD
    if (budgetPerAsset < configData.trading.minimumBUSDSpendable) {
        if (backtestBUSD > configData.trading.minimumBUSDSpendable) {
            const randomAsset = currentDocs[Math.floor(Math.random() * currentDocs.length)];
            currentDocs = [randomAsset]
        } else {
            return newOrders
        }
        return newOrders
    }

    let totalMoneySpent = 0
    for (let i = 0; i < currentDocs.length; i++) {

        const order = {
            "asset" : currentDocs[i].asset,
            "status" : "OPEN",
            "type" : determineTypeOfOrder(configData, currentDocs[i]),
            "priceBuy" : currentDocs[i].close,
            "priceSell" : undefined,
            "lastHighestPrice" : currentDocs[i].close,
            "moneySpent" : budgetPerAsset,
            "moneyMade" : undefined,
            "qty" : budgetPerAsset / currentDocs[i].close,
            "timestampBuy" : currentDocs[i].timeStamp,
            "timestampSell" : undefined,
            "signalBuy" : currentDocs[i].BUYSIGNALS,
            "signalSell" : {},
            "marketCondition" : currentDocs[i].ADX_TREND_SHORT
        }

        totalMoneySpent += order.moneySpent
        newOrders[0].push(order)
    }
    return [newOrders, totalMoneySpent]
}

function determineTypeOfOrder(configData, doc) {
    //console.log(doc.ADX_TREND_SHORT)
    switch(doc.ADX_TREND_SHORT) {
        case indicators.marketState.BULL:
            return orderType.NORMAL
            break
        case indicators.marketState.BEAR:
            return orderType.ASAP
            break
        case indicators.marketState.RANGE:
            return orderType.ASAP
            break
        case indicators.marketState.UNKNOWN:
            return orderType.ASAP
            break
        
    }
}

function decision(configData, d, direction) {

    // Get rules depending on market trend (BULL, BEAR, RANGE, UNKNOWN)
    const ruleSet = configData.trading.rules[d.ADX_TREND_SHORT]
    const ruleConfig = configData.trading.rules["DEFAULT"]
    let rules = []
    let decisions = []

    if (direction == decisionDirection.BUY)
    {
        for (const d of ruleConfig.filter(d => ruleSet.BUY.includes(d.name))) {
            rules.push(d)
        }
    }
    else if (direction == decisionDirection.SELL)
    {
        for (const d of ruleConfig.filter(d => ruleSet.SELL.includes(d.name))) {
            rules.push(d)
        }
    }

    for (const r of rules) {
        switch (r.name) {
            case "RSI" : 
                decisions.push({"RSI" : checkRSI(r, d, direction)})
                break
            case "STOCH" :
                decisions.push({"STOCH" : checkSTOCH(r, d, direction)})
                break
            case "MACD" :
                decisions.push({"MACD" : checkMACD(r, d, direction)})
                break
        }
    }
    return decisions
}

function checkMACD(r, d, direction) {
    // Buy check
    if (direction == decisionDirection.BUY) {
        if (d.MACD == indicators.macdState.CROSSED_TO_POSITIVE) {
            return true
        }
        return false
    }
    // Sell check
    else if (direction == decisionDirection.SELL) {
        if (d.MACD == indicators.macdState.CROSSED_TO_NEGATIVE) {
            return true
        }
        return false
    }
}

function checkRSI(r, d, direction) {
    // Buy check
    if (direction == decisionDirection.BUY) {
        if (d.RSI_CROSS == indicators.crosses.DOWNLOW) {
            return true
        }
    }
    // Sell check
    else if (direction == decisionDirection.SELL) {
        if (d.RSI_CROSS == indicators.crosses.DOWNTOP) {
            return true
        }
    }
    return false
}

function checkSTOCH(r, d, direction) {
    // Buy check
    if (direction == decisionDirection.BUY) { 
        if (d.STOCH < r.buy) {
            return true
        }
    }
    // Sell check
    else if (direction == decisionDirection.SELL) { 
        if (d.STOCH > r.sell) {
            return true
        }
    }
    return false
}

function buildOrderObject() {

}

function getSortedUniqueStepsInTime(docs) {
    const uniqueTimeStamps = function(docs) {
        let steps = []
        for (let i = 0; i < docs.length; i++) {
            steps.push(docs[i].timeStamp)
        }
        return steps.filter(onlyUnique)
    }
    return uniqueTimeStamps(docs).sort(function(a, b){return a - b});
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
  }

// --------------------------------------------------
// --------------------------------------------------
// -------------// BACKEND SOLO ---------------------
// --------------------------------------------------
// --------------------------------------------------

export let walletValueOverTime = []
export let availableBUSDOverTime = []
export let lastStochBuyStepsAgo = 0
export var countedBacktests = 0
var backtestResults = []

export function updateBacktestResults(results) {
    backtestResults.push(results)
}

export function trackWalletValueOverTime(j, value) {
    walletValueOverTime.push({"timestamp" : j, "value" : value})
}

export function trackAvailableBUSDOverTime(j, value, availableBUSDOverTime) {
    return availableBUSDOverTime.push({"timestamp" : j, "value" : value})
}

export function countBacktests() {
    countedBacktests += 1
    console.log("Backtest counted.")
}

export function getGridsearchResults() {
    return backtestResults
}

