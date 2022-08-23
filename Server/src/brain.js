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

export function mainEventCallback() {
    console.log("\u001B[35mEmitted event: finished-main-function. Main function ran through.")
}