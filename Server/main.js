/*

    Color Codes for console logs
    BLUE    \u001b[0;36m    -   Server things       
    GREEN   \u001B[32m      -   Sell
    YELLOW  \u001B[33m      -   Buy
    RED     \u001B[31m      -   Stop loss
    PURPLE  \u001B[35m      -   Events emitted on bus
    WHITE   \u001B[37m      -   General and Info

*/


// #region IMPORTS
// Module imports
import {default as fs} from "fs";

// Custom imports
import * as markets from './src/markets.js';
import * as indicators from './src/indicators.js'
import {downloadImage, loadIconFromLocalFolder} from "./src/imageLoader.js"
import * as dbmanagement from "./src/databaseManagement.js"
import * as server from "./src/server.js"
import * as config from "./src/config.js"
import * as brain from "./src/brain.js"
// #endregion

// #region FIELDS
// TODO get latest ATR for each market and only trade on the markets that have a relatilely high ATR on average in the recent past
const cryptoAssets =  ["ETH", "BTC", "BNB", "AAVE", "IOTA", "XRP", "DOT", "ETC", "LINK", "ADA"]
//const cryptoAssets = ["DOT"]
// Favs: DOT, MANA, LINK, AAVE
var selectedAssets = ["BNB", "ETH", "BTC"]
var combinationsOfCryptos = undefined

let assetCounter = 0
let signalsWithBuyDecision = 0
let excludedOrders = []

let numberOfProfitableSells = 0
let numberOfBuys = 0
let numberOfStopLoss = 0
let lastStochBuyStepsAgo = 0

// Random buy event for testing HODL against buy-sell-signals
const buyChance = 0.8
let randomBuyEventForHold = true;
let randomOrderWas = null
// #endregion

// #region OBJECTS
let marketData = new Object()
// #endregion


const main = async () => {

    // -------------- SET UP AND REGISTER
    // Register callback on Main
    server.eventBus.on('finished-main-function', mainEventCallback);

    // Market
    server.eventBus.on('finished-asset-getdata', assetsGetDataCallback);
    server.eventBus.on('finished-asset-signals', backtestTrading);

    // Proceed after loading signals
    server.eventBus.on('loaded-backtest-signals', backtestSignalsCallback);

    // Coutners, trackers
    server.eventBus.on('finished-backtest-trades', brain.countBacktests)

    // Register loop callback for gridsearch
    if (config.softwareMode == config.softwareModes.Gridsearch)
        server.eventBus.on('finished-backtest-trades', backtestSignalsCallback)
    if (config.softwareMode == config.softwareModes.Signals)
        server.eventBus.on('loaded-backtest-signals', downloadMarketDataForAssets)
    
    resetTrackers();
    const runDate = Date.now()
    dbmanagement.setUpDatabase();
    server.startApp(config.port);
    console.log("\u001B[0;36mMode is set to: ", config.softwareMode);

    // -------------- FIN
    // Emit event after main
    server.eventBus.emit("finished-main-function")

}

//#region General Functions
// Can always be called. Only runs when software mode is set to Dev
// Put into devFunction whatever needs testing during dev mode
function backtestSignalsCallback() {

    switch(config.softwareMode) {

        case config.softwareModes.Test:
            backtestTrading();
            break;

        case config.softwareModes.Gridsearch:

            // Find all combinations of crypto
            // Put this somewhere else so it does not run all the time
            if (brain.countedBacktests == 0) {
                combinationsOfCryptos = findAllCombinationsOf()
            }
                
            if (brain.countedBacktests < combinationsOfCryptos.length) {
                selectedAssets = combinationsOfCryptos[brain.countedBacktests]
                backtestTrading()
            } else {
                console.log("\u001B[0;36mFinished Gridsearch.\u001B[37m");
                console.log(brain.getGridsearchResults())
            }

            break;

        default:
            console.log("\u001B[37mbacktestSignalsCallback called but not used, due to Software Mode.")
    }
}

function findAllCombinationsOf() {
    let combinationsOfThree = [];
    for (let i = 0; i < cryptoAssets.length - 1; i++) {
        for (let j = i + 1; j < cryptoAssets.length; j++) {
            for (let f = j + 1; f < cryptoAssets.length; f++) {
                combinationsOfThree.push([cryptoAssets[i], cryptoAssets[j], cryptoAssets[f]])
            }
        }
    }
    return combinationsOfThree
}

function resetTrackers() {
    assetCounter = 0;
    excludedOrders = []
}

function mainEventCallback() {
    console.log("\u001B[35mEmitted event: finished-main-function. Main function ran through.")
}

function assetsGetDataCallback() {
    assetCounter += 1;
    if (assetCounter == cryptoAssets.length) {
        console.log("\u001B[37mGot data for all assets. Proceed to build signals.");
        buildSignals();
    }
}
//#endregion

//#region Backtest V 3
function backtestTrading() {
    console.log("\u001B[37mStarting buy and sell decisions for", selectedAssets)

    var localOrderbook = []
    var allSignals = []
    var marketTrendsByAsset = {}
    var athByAsset = {}
    var rocByAsset = {}
    var masByAsset = {}
    var finalWalletValue = 0

    dbmanagement.db.backtestSignals.find({asset : { $in: selectedAssets }}).sort({ timestamp: -1 }).limit(1).exec(function (err, dst) {
        const latestPointInTime = dst[0].timestamp + 1;
        dbmanagement.db.backtestSignals.find({asset : { $in: selectedAssets }}).sort({ timestamp: 1 }).exec(function (err, ds) {

            for (let j = 0; j < latestPointInTime; j++) {

                // Filter signals at this moment in time
                const signalsRightNow = ds.filter(item => {
                for (var i = 0; i < ds.length; i++) {
                if (item.timestamp === j) { return item; }}})


                let entriesToBuyAtTimestamp = []

                // Signals right now
                signalsRightNow.forEach(function(signal) {

                    // Track signals for recordings
                    allSignals.push(signal)

                    // Identify market trend
                    if (marketTrendsByAsset[signal.asset] === undefined) 
                    marketTrendsByAsset[signal.asset] = []
                    marketTrendsByAsset[signal.asset].push(signal.SIGNAL_ADX)
                    if (marketTrendsByAsset[signal.asset].length > config.allowedArrayLengthTrends) 
                        marketTrendsByAsset[signal.asset].shift()

                    // Identify ROC dominance
                    if (rocByAsset[signal.asset] === undefined) 
                        rocByAsset[signal.asset] = []
                    rocByAsset[signal.asset].push(parseFloat(signal.SIGNAL_ROC))
                    if (rocByAsset[signal.asset].length > config.allowedArrayLengthTrends) 
                        rocByAsset[signal.asset].shift()

                    // Get ATH of recent time window
                    if (athByAsset[signal.asset] === undefined) 
                        athByAsset[signal.asset] = []
                    athByAsset[signal.asset].push(signal.price)
                    if (athByAsset[signal.asset].length > config.numberOfClosesForATH) 
                        athByAsset[signal.asset].shift()
                    const median = indicators.getMedianOfLatestClosings(athByAsset[signal.asset])

                    // MAs
                    if (masByAsset[signal.asset] === undefined) {
                        masByAsset[signal.asset] = {}
                        masByAsset[signal.asset]["MA_Long"] = []
                        masByAsset[signal.asset]["MA_Short"] = []
                    } 
                    masByAsset[signal.asset]["MA_Long"].push(signal.SIGNAL_MA_LONG)
                    masByAsset[signal.asset]["MA_Short"].push(signal.SIGNAL_MA_SHORT)
                    if (masByAsset[signal.asset]["MA_Long"].length > 2) {
                        masByAsset[signal.asset]["MA_Long"].shift()
                        masByAsset[signal.asset]["MA_Short"].shift()
                    }
            
                // ------------------------------------------------------
                // ------------- CODE FOR BACKTESTING VERSION 3 ---------
                // ------------------------------------------------------
                // ------------- Is iterating through all steps in time -
                // ------------- from i to latest point in time ---------
                // ------------------------------------------------------
// ------------------------- SETUP -----------------------------------------------------

                    const trend = getModeFromArray(marketTrendsByAsset[signal.asset])
                   // config.configureFundsToTradeWith(trend)

                    // Update latest ROC modes
                    var rocCounts = rocByAsset[signal.asset].reduce(function(s, n) {
                        s[n <= 0 ? 'below' : 'above'] += 1;
                        return s;
                    }, { above: 0, below: 0 });

                    // Counter for stoch
                    lastStochBuyStepsAgo += 1

                    // Other trade relevant information
                    var otherSignalInfo = {
                        "ROC_Counts" : rocCounts,
                        "Median" : median,
                        "stepsSinceStoch" : lastStochBuyStepsAgo,
                        "MAsCrossed" : indicators.determineValueCrossover(masByAsset[signal.asset]["MA_Short"], masByAsset[signal.asset]["MA_Long"])
                    }

                    const dec = decideOnTrading(signal, config.decisionSettings[trend], otherSignalInfo);
                    const resBuy = indicators.atLeastAreDecisions(dec[0], indicators.decisionMadeWithIndicators.BUY);
                    const resSell = indicators.atLeastAreDecisions(dec[1], indicators.decisionMadeWithIndicators.SELL);

                    // BEAR BREAK
                    const bearCount = countOccurrences(marketTrendsByAsset[signal.asset], indicators.marketState.BEAR);

                    // Final say on resBuy and resSell
                   // if (bearCount >= config.maximumBearRatioAllowed && config.bearBrake) 
                    //    resBuy.conditionFullfilled = false;

// ------------------------- SELL SPOT ORDER -------------------------------------------
                    
                        // Filter orders
                        const openOrders = localOrderbook.filter(item => {
                            for (var i = 0; i < ds.length; i++) {
                                if (item.asset == signal.asset & item.status == "open" & item.timestamp < signal.timestamp) {
                                    return item;
                                }
                            }
                        });
                    

                        // Go through all orders of the respectie asset
                        openOrders.forEach(function(openOrder) {

                            // Determine stop loss hit                                   
                            const objIndex = localOrderbook.findIndex(element => element.id == openOrder.id)
                            const stopLoss = openOrder.stoploss  

                            // TODO CRITICAL actualy implement fees. The fees are wrong and breaking sell orders
                            //const fee = ((signal.price * openOrder.amount) * config.binanceFee)
                            const fee = signal.price * config.binanceFee
                            const amount = localOrderbook[objIndex].amount - (localOrderbook[objIndex].amount * config.binanceFee)

                            // Change profitable to ATR prof
                            //const profitable = signal.price > ((openOrder.price + (openOrder.price * config.minimumProfitPercentage) + fee))
                            const profitable = signal.price >= openOrder.profitableAt + fee
                         //   console.log("ATR", signal.SIGNAL_ATR, "POFIT AT", openOrder.profitableAt, "CURRENT PRICE", signal.price, "FEE", fee)
                            // Profitable sell
                            if (resSell.conditionFullfilled == true && profitable) {
                                
                                console.log("\u001B[32mPROFITABLE \u001B[37m- Closed position for:", openOrder.asset, "with", openOrder.price, "at", signal.price, "totaled at:", parseFloat(((signal.price / openOrder.price) * 100).toFixed(2)), "%.")
                                

                                localOrderbook[objIndex].status = "closed"
                                localOrderbook[objIndex].closedAt = signal.price
                                localOrderbook[objIndex].closedPointInTime = signal.timestamp
                                

                                // Update backtest wallet
                                updateBacktestWallet(localOrderbook[objIndex], signal, amount)

                                // For backtest
                                numberOfProfitableSells += 1
                                
                            } 
                            
                            if (signal.price < stopLoss) {

                                console.log("\u001B[31mSTOPLOSS \u001B[37m- Closed position for:", openOrder.asset, "with", openOrder.price, "at", signal.price, "totaled at:", ((signal.price / openOrder.price) * 100), "%.")
                                
                                localOrderbook[objIndex].status = "stoploss"
                                localOrderbook[objIndex].closedAt = signal.price
                                localOrderbook[objIndex].closedPointInTime = signal.timestamp

                                // Update backtest wallet
                                updateBacktestWallet(localOrderbook[objIndex], signal, amount)

                                // For backtesting
                                numberOfStopLoss += 1
                            } else if (signal.price > openOrder.price) {
                                openOrder.stopLoss = indicators.determineSmartStoploss(signal)
                            }
                        }) 


// ------------------------- BUY SPOT ORDER --------------------------------------------
                    // Add asset at point in time to the shopping list
                    
                    // TODO quantify token volatility and check for major movements before considering buy spot order

                    if (resBuy.conditionFullfilled == true) 
                        entriesToBuyAtTimestamp.push(signal);
                    })

                // Outisde of signals loop, but inside time loop                         
                if (entriesToBuyAtTimestamp.length > 0) {
                    entriesToBuyAtTimestamp.forEach(function(e) {
                        const availableBacktestBudget = ((config.backtestWallet.BUSD / entriesToBuyAtTimestamp.length) * config.shareOnTrends[e.SIGNAL_ADX])
                        // Check if minimum amount of money in absolute number is available
                        if (availableBacktestBudget < config.minimumBUSDForTrade) 
                            return

                        // Build order object 
                        const amount = availableBacktestBudget / e.price
                        var order = {
                            "timestamp" : e.timestamp,
                            "asset" : e.asset,
                            "price" : e.price,
                            "amount" : amount - (amount * config.binanceFee),
                            "status" : "open",
                            "stoploss" : indicators.determineSmartStoploss(e),
                            "profitableAt" : e.price + (config.atrProfitMultiplier * parseFloat(e.SIGNAL_ATR)),
                            "closedAt" : 0,
                            "closedPointInTime" : 0,
                            "id" : generateUniqueID(e.asset)
                        }

                        localOrderbook.push(order)
                        console.log("\u001B[33mOPENED POSITION \u001B[37m- opened position for", order.asset, "at", order.price, "with amount", order.amount, "at step", order.timestamp)

                        numberOfBuys += 1
                        lastStochBuyStepsAgo = 0

                        // Update Wallet
                        updateBacktestWallet(order, undefined, order.amount)
                    }) 
                }
                
                brain.trackWalletValueOverTime(j, getWalletValue(ds, j, config.backtestWallet))
                brain.trackAvailableBUSDOverTime(j, config.backtestWallet.BUSD)

                // ------------------------------------------------------
                // ------------- END CODE FOR BACKTESTING VERSION 3 -----
                // ------------------------------------------------------
                
            }

            // END OF BACKTEST
            fs.writeFile("./data/backtestOrderbook.json", JSON.stringify(localOrderbook), function(err) {
                if (err) {
                    console.log(err);
                }
            });

            fs.writeFile("./data/signals.json", JSON.stringify(allSignals), function(err) {
                if (err) {
                    console.log(err);
                }
            });

            fs.writeFile("./data/tradingWalletValueOverTime.json", JSON.stringify(brain.walletValueOverTime), function(err) {
                if (err) {
                    console.log(err);
                }
            });

            fs.writeFile("./data/busdOverTime.json", JSON.stringify(brain.availableBUSDOverTime), function(err) {
                if (err) {
                    console.log(err);
                }
            });
            
            finalWalletValue = getWalletValue(ds, latestPointInTime, config.backtestWallet)
            const finalHoldValue = getWalletValue(ds, latestPointInTime, config.holdWallet)
            
            brain.updateBacktestResults({
                "value" : finalWalletValue,
                "assets" : selectedAssets
            })

            const numberOfDays = config.unixTimeToLookBack[config.timeWindow] * 450 * 0.001 / 60 / 60 / 24
            console.log("Final trading wallet value:", parseFloat(finalWalletValue.toFixed(2)), "vs final HODL wallet:", parseFloat(finalHoldValue.toFixed(2)))
            console.log("Return on investment:", parseFloat(((finalWalletValue / config.availableBacktestBUSD * 100) - 100).toFixed(1)), "% after just about", parseInt(Math.floor(numberOfDays)), "days of trading.")

            server.eventBus.emit("finished-backtest-trades");
            console.log("\u001B[35mEmitted event: finished-backtest-trades.");
            config.resetBacktestWallet()
            return finalWalletValue
        })
    })
}

function updateBacktestWallet(order, signal, amount) {
    if (signal == undefined) {
        if (config.backtestWallet[order.asset] === undefined ) {
            config.backtestWallet[order.asset] = amount;
        } else {
            config.backtestWallet[order.asset] += amount;
        }
        config.backtestWallet.BUSD -= amount * order.price
        return
    }

    config.backtestWallet[order.asset] -= (order.amount);
    config.backtestWallet.BUSD += order.amount * signal.price;
    return
}

const countOccurrences = (arr, val) => arr.reduce((a, v) => (v === val ? a + 1 : a), 0);

function decideOnTrading(signal, consider, otherSignalInfo) {

    // What we are supposed to do. Default is nothing.
    let collectedBuyDecisions = []
    let collectedSellDecisions = []

    // ------------ BUY
    consider["BUY"].forEach(function(c) {
        switch(c) {

            // STOCH Decision
            case indicators.indicatorForDecision.STOCH_NOW_SIMPLE:
                if (signal["SIGNAL_STOCH"][4] == true) 
                    collectedBuyDecisions.push(indicators.decisionMadeWithIndicators.BUY);
                else 
                    collectedBuyDecisions.push(indicators.decisionMadeWithIndicators.NOTHING);
                break;

            case indicators.indicatorForDecision.GOLDEN_CROSS:
                switch (otherSignalInfo.MAsCrossed) {
                    case indicators.crossOvers.CROSSED_UP:
                        collectedBuyDecisions.push(indicators.decisionMadeWithIndicators.BUY);
                    default: 
                        collectedBuyDecisions.push(indicators.decisionMadeWithIndicators.NOTHING);
                }

            // NOTHING 
            case indicators.indicatorForDecision.NOTHING:
                collectedBuyDecisions.push(indicators.decisionMadeWithIndicators.NOTHING);
                break;

            case indicators.indicatorForDecision.UPWARDS_ROC_MODE:
                if (otherSignalInfo.ROC_Counts.above > otherSignalInfo.ROC_Counts.below - 1)
                    collectedBuyDecisions.push(indicators.decisionMadeWithIndicators.BUY);
                else
                    collectedBuyDecisions.push(indicators.decisionMadeWithIndicators.NOTHING);
                break;

            // MACD Decision
            case indicators.indicatorForDecision.MACD:
                switch (signal["SIGNAL_MACD"]) {
                    case indicators.macdState.CROSSED_TO_POSITIVE:
                        collectedBuyDecisions.push(indicators.decisionMadeWithIndicators.BUY);
                        break;
                    default:
                        collectedBuyDecisions.push(indicators.decisionMadeWithIndicators.NOTHING);
                        break;
                }
                break;

            // MEDIAN Decision
            case indicators.indicatorForDecision.MEDIAN:
                if (signal.price < otherSignalInfo.Median)
                    collectedBuyDecisions.push(indicators.decisionMadeWithIndicators.BUY);
                else
                    collectedBuyDecisions.push(indicators.decisionMadeWithIndicators.NOTHING);
                break;

            
            // MACD MEDIAN Decision
            case indicators.indicatorForDecision.MACD_MEDIAN:
                switch (signal["SIGNAL_MACD"]) {
                    case indicators.macdState.CROSSED_TO_POSITIVE:
                        if (signal.price < otherSignalInfo.Median)
                            collectedBuyDecisions.push(indicators.decisionMadeWithIndicators.BUY);
                        break;
                    default:
                        collectedBuyDecisions.push(indicators.decisionMadeWithIndicators.NOTHING);
                        break;
                }
                break;

            // STOCH Decision 2
            case indicators.indicatorForDecision.STOCH_RECENT_PAST:
                if (signal["SIGNAL_STOCH"][0] == true & otherSignalInfo.lastStochBuyStepsAgo >= config.minimumStepsTillNextStochBuy) {
                    collectedBuyDecisions.push(indicators.decisionMadeWithIndicators.BUY);
                }
                else {
                    collectedBuyDecisions.push(indicators.decisionMadeWithIndicators.NOTHING);
                }
        }
    })

    // ------------ SELL
    consider["SELL"].forEach(function(c) {

        switch (c) {
            // MACD Decision
        case indicators.indicatorForDecision.MACD:
            switch (signal["SIGNAL_MACD"]) {
                case indicators.macdState.CROSSED_TO_NEGATIVE:
                    collectedSellDecisions.push(indicators.decisionMadeWithIndicators.SELL);
                    break;
                default:
                    collectedSellDecisions.push(indicators.decisionMadeWithIndicators.NOTHING);
                    break;
            }
            break;

        case indicators.indicatorForDecision.GOLDEN_CROSS:
            switch (otherSignalInfo.MAsCrossed) {
                case indicators.crossOvers.CROSSED_DOWN:
                    collectedSellDecisions.push(indicators.decisionMadeWithIndicators.SELL);
                default: 
                    collectedSellDecisions.push(indicators.decisionMadeWithIndicators.NOTHING);
            }

        case indicators.indicatorForDecision.MEDIAN:
            if (signal.price > otherSignalInfo.Median)
                collectedSellDecisions.push(indicators.decisionMadeWithIndicators.SELL);
            else
                collectedSellDecisions.push(indicators.decisionMadeWithIndicators.NOTHING);
            break;
        
        // ROC Decision
        case indicators.indicatorForDecision.ROC:
            if (signal["SIGNAL_ROC"] < 0) {
                collectedSellDecisions.push(indicators.decisionMadeWithIndicators.SELL);
            } else {
                collectedSellDecisions.push(indicators.decisionMadeWithIndicators.NOTHING);
            }
            break;

        // ADX Decision
        case indicators.indicatorForDecision.ADX:
            switch (signal["SIGNAL_ADX"]) {
                //  case indicators.marketState.BEAR:
                case indicators.marketState.BULL:
                    collectedSellDecisions.push(indicators.decisionMadeWithIndicators.SELL);
                    break;
                default:
                    collectedSellDecisions.push(indicators.decisionMadeWithIndicators.NOTHING);
                    break;
            }
            break;

        // STOCH Decision
        case indicators.indicatorForDecision.STOCH_NOW_SIMPLE:
            if (signal["SIGNAL_STOCH"][5] == true) {
                collectedSellDecisions.push(indicators.decisionMadeWithIndicators.SELL);
            } else {
                collectedSellDecisions.push(indicators.decisionMadeWithIndicators.NOTHING);
            }
            break;

        // STOCH Decision 2
        case indicators.indicatorForDecision.STOCH_RECENT_PAST:
            if (signal["SIGNAL_STOCH"][1] == true) {
                collectedSellDecisions.push(indicators.decisionMadeWithIndicators.SELL);
            }
            else {
                collectedSellDecisions.push(indicators.decisionMadeWithIndicators.NOTHING);
            }
        
        // Blind Sell
        case indicators.indicatorForDecision.JUST_SELL:
            collectedSellDecisions.push(indicators.decisionMadeWithIndicators.SELL);
            break;

            // Nothing
        case indicators.indicatorForDecision.NOTHING:
            collectedSellDecisions.push(indicators.decisionMadeWithIndicators.NOTHING);
            break;
        }
    })  

    return [collectedBuyDecisions, collectedSellDecisions]
}

//#endregion

function getModeFromArray(array)
{
    if(array.length == 0)
        return null;
    var modeMap = {};
    var maxEl = array[0], maxCount = 1;
    for(var i = 0; i < array.length; i++)
    {
        var el = array[i];
        if(modeMap[el] == null)
            modeMap[el] = 1;
        else
            modeMap[el]++;  
        if(modeMap[el] > maxCount)
        {
            maxEl = el;
            maxCount = modeMap[el];
        }
    }
    return maxEl;
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

function generateUniqueID(asset) {
    return (Date.now().toString(36)+Math.random().toString(36)).replace(/\./g,"")+asset;
};

function removeDuplicatesFroArray(arr) {
    let s = new Set(arr);
    let it = s.values();
    return Array.from(it);
}

server.app.post('/api/main/core', function coreApi(req, res) {
   // getMarketDataForAssets();
});

async function downloadMarketDataForAssets(safe = true) {

    // -------------- GET DATA
    cryptoAssets.forEach(function(a) {

        console.log("\u001B[37mGetting historic data for: ", a)
        markets.getHistoricData(a + "/" + config.cryptoBaseAsset).then(function(historicDataOfMarket) {

            console.log("\u001B[37mReceived historic data for: ", a)

            const data = {
                "asset" : a,
                "historicDataOfMarket" : historicDataOfMarket
            };
            marketData[a] = data;
            console.log("\u001B[37mAdded data to markt data object for: ", a)

            console.log("\u001B[35mEmitting event: finished-asset-getdata.");
            server.eventBus.emit("finished-asset-getdata");
        })
    })

    if (safe) {
        // TODO Implement saving market data to file for backtesting
    }
}

function buildSignals() {
    for (const key in marketData){
        console.log("\u001B[37mStarting to build signals for: ", marketData[key]["asset"]);

        const historicDataOfMarket = marketData[key]["historicDataOfMarket"];
        const a = marketData[key]["asset"];

        // -------------- INDICATORS FOR BUY DECISIONS
        const closes = markets.extractOHLCFromData(historicDataOfMarket[0], 4);
        const candles = markets.buildCandles(historicDataOfMarket[0])
            
        // -------------- MODE SELECT
        switch (config.softwareMode) {
            case config.softwareModes.Signals:
                
                // Delta between first and last point in time for testing
                const numberOfBacktests = closes.length - config.minimumNumberOfPoints - 1
                console.log("Number of points in time:", numberOfBacktests)

                // Itterate beginning from the minium number of points on to the end. Step by step through time in market.
                for (var i = 0; i < numberOfBacktests; i++) {
                    
                    // Get sliced selection of closes
                    const slicedCloses = closes.slice(i, config.minimumNumberOfPoints + 1 + i);
                    const slicedCandles = candles.slice(i, config.minimumNumberOfPoints + 1 + i);

                    const mostRecentIndex = slicedCloses.length - 1;
                    
                    // -------------------------------
                    // -------------- BUILD SIGNALS
                    // -------------------------------

                    // -------------- Get MACD results
                    const macdResult = indicators.getMACDResult(slicedCloses).histogram.toFixed(4); 
                    const macdResultPast = indicators.getMACDResult(slicedCloses.slice(0, -1)).histogram.toFixed(4);     
                    const crossing = indicators.detectCrossing(macdResultPast, macdResult)

                    // -------------- Get ROC results
                    var roc = 0
                    if (config.rocInterval > config.minimumNumberOfPoints) {
                        console.log("\u001B[31mERROR: Cannot calculate RoC, since minimum number of points is not sufficient.")
                    } else {
                        roc = indicators.getROCResult(slicedCloses, config.rocInterval).getResult().toFixed(4)
                    }
                    
                    // -------------- Get STOCH results
                    const stochResults = indicators.oversoldInTheRecentPast(slicedCandles)

                    // -------------- Get ADX results
                    const adxResult = indicators.getADXResult(slicedCandles)

                    // -------------- Get SMA results
                    const shortMAResult = indicators.getMAResult(slicedCloses, config.shortMA)
                    const longMAResult = indicators.getMAResult(slicedCloses, config.longMA)

                    // -------------- Get ATR results
                    const atrResult = indicators.getATRResult(slicedCandles)

                    // -------------- Put all backtest signals in a backtest db
                    let signalDoc = {
                        "timestamp" : i,
                        "asset" : a,
                        "SIGNAL_MACD" : crossing,
                        "SIGNAL_ROC" : roc,
                        "SIGNAL_STOCH" : stochResults,
                        "SIGNAL_ADX" : adxResult,
                        "SIGNAL_MA_SHORT" : shortMAResult,
                        "SIGNAL_MA_LONG" : longMAResult,
                        "SIGNAL_ATR" : atrResult,
                        "price" : slicedCloses[mostRecentIndex]
                    }

                    dbmanagement.db.backtestSignals.insert(signalDoc, function (err, newDoc) {
                        // TODO CRITICAL This function is running async. It prevents i from iterrating properly
                        // i itters faster tha this function is going
                    });

                }

                break;
        }
    }

    server.eventBus.emit("finished-asset-signals");
    console.log("\u001B[35mEmitted event: finished-asset-signals.");
}

main();



/*
// -------------------------------------- DEBUG AREA ----------------------
const busdmarketsapidebug = (`http://127.0.0.1:` + config.port + "/api/markets/getAllBusdMarkets").toString()
const fetchbalanesdebug = (`http://127.0.0.1:` + config.port + "/api/account/fetchBalances").toString()

const argumentMarketDebug = "ETH/BUSD"
const getHistoricdatadebug = (`http://127.0.0.1:` + config.port + "/api/markets/getHistoricData").toString()
const debugAlive = (`http://127.0.0.1:` + config.port + "/api/debug/sayHello").toString()

const data = {
    market : argumentMarketDebug
};

var signal = new signals.Signal(signals.signalType.BUY, "ETHBUSD");


axios({method: 'POST',
    url: debugAlive,
    data: qs.stringify(data),
    headers : {
        "Content-Type":"application/json",  
    }
})//.then(function(r) {console.log(r)})
*/
