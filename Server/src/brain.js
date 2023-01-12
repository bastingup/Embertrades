import * as colors from "./colors.js"
import * as server from "./server.js"
import * as dbmanagement from "./databaseManagement.js"
import * as indicators from './indicators.js'

// --------------------------------------------------
// --------------------------------------------------
// --------------- BACKEND SOLO ---------------------
// --------------------------------------------------
// --------------------------------------------------

export const decisionDirection = {"BUY": "BUY", "SELL" : "SELL"}

export function mainEventCallback() {
    console.log(colors.importantInfoLog + "BRAIN - Emitted event: finished-main-function. Main function ran through.")
}

export async function backtestIndicatorSelection(configData) {

    console.log(colors.stoplossLog + "BRAIN - On-the-fly-backtest not fully implemented yet.")

    dbmanagement.db.markets.find({}).sort({ timeStamp: 1 }).exec(function (err, docs) {

        // Get all the unique steps in time form database sorted in ascending order
        const uniqueStepsInTime = getSortedUniqueStepsInTime(docs)

        // Go through steps in time and fine assets
        for (const step of uniqueStepsInTime) {
            // Go through all assets in a given step in time
            for (const d of docs.filter(doc => doc.timeStamp == step)) {
                decision(configData, d, decisionDirection.BUY)
            }
        }
    })
}

function decision(configData, d, direction) {

    // Get rules depending on market trend (BULL, BEAR, RANGE, UNKNOWN)
    const ruleSet = configData.trading.rules[d.ADX_TREND_SHORT]
    const ruleConfig = configData.trading.rules["DEFAULT"]
    let rules = []
    let decisions = []

    for (const d of ruleConfig.filter(d => ruleSet.BUY.includes(d.name))) {
        rules.push(d)
    }

    for (const r of rules) {
        switch (r.name) {
            case "RSI" : 
                decisions.push({"RSI" : checkRSI(r, d, direction)})
                break
            case "STOCH" :
                decisions.push({"STOCH" : checkSTOCH(r, d, direction)})
                break
        }
    }
    console.log(decisions, d.asset, d.ADX_TREND_SHORT)
    
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

export function trackAvailableBUSDOverTime(j, value) {
    availableBUSDOverTime.push({"timestamp" : j, "value" : value})
}

export function countBacktests() {
    countedBacktests += 1
    console.log("Backtest counted.")
}

export function getGridsearchResults() {
    return backtestResults
}

