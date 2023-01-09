import * as colors from "./colors.js"
import * as server from "./server.js"

// --------------------------------------------------
// --------------------------------------------------
// --------------- BACKEND SOLO ---------------------
// --------------------------------------------------
// --------------------------------------------------

let waitingForRun = false

export function mainEventCallback() {
    console.log(colors.importantInfoLog + "BRAIN - Emitted event: finished-main-function. Main function ran through.")
}

// TODO this is broken af
export async function scheduleNextRun(configData, timeUntilNextRun) {
    if (!waitingForRun) {
        waitingForRun = true
        console.log(colors.serverLog + "BRAIN - Next run scheduled to be in:", timeUntilNextRun)
        await new Promise((resolve) => {
            setTimeout(resolve, timeUntilNextRun);
            waitingForRun = false
            server.eventBus.emit("next-run", null, configData)
          });
    }
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

