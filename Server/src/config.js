import * as indicators from './indicators.js'
import {default as fs} from "fs";

// --------------------------------------------------
// --------------------------------------------------
// --------------- BACKEND SOLO ---------------------
// --------------------------------------------------
// --------------------------------------------------

export function readInConfigFile() {
  // it is not ./conf, but with src inbetween, cuz the function is called in main
  const c = fs.readFileSync("./src/config.json");
  const configData = JSON.parse(c);
  return configData;
}


// --------------------------------------------------
// --------------------------------------------------
// --------------/ BACKEND SOLO ---------------------
// --------------------------------------------------
// --------------------------------------------------

/*

// BACKTEST VERSION 3
//#region Backend Attached
export var decisionSettings = {
  "BEAR" : {
    "BUY" : [
      indicators.indicatorForDecision.MACD_MEDIAN
    ],
    "SELL" : [
      indicators.indicatorForDecision.JUST_SELL
    ]
  },
  "BULL" : {
    "BUY" : [
      indicators.indicatorForDecision.STOCH_NOW_SIMPLE
    ],
    "SELL" : [
      indicators.indicatorForDecision.MACD
    ]
  },
  "RANGE" : {
    "BUY" : [
      indicators.indicatorForDecision.STOCH_NOW_SIMPLE
    ],
    "SELL" : [
      indicators.indicatorForDecision.JUST_SELL
    ]
  },
  "UNKNOWN" : {
    "BUY" : [
      indicators.indicatorForDecision.NOTHING
    ],
    "SELL" : [
      indicators.indicatorForDecision.JUST_SELL
    ]
  }
}


export const atLeastRatioForBuy = 0.001;
export const atLeastRatioForSell = 0.001;
export const nonOptionalBuy = -1;
export const nonOptionalSell = -1;

export const binanceFee = 0.001;
export const stoplossPercentage = 0.05;
export const atrStoplossMultiplicator = 100;
export let atrProfitMultiplier = 3;
export const minimumProfitPercentage = 0.03;
export const minimalProfitBUSD = 0.04; // Absolute minimum for fees, not implemented yet

// Server
export const port = 3001;

// Market fields
export const stepsBackInTime = 5000;
export const minimumBUSDForTrade = 15;
export const numberOfClosesForATH = 12;
export var bearBrake = true;

export var timeWindow = "4h";
export const cryptoBaseAsset = "BUSD"
export const shareOnTrends = {
  "BULL" : 0.1,
  "BEAR" : 0.2,
  "RANGE" : 0.1,
  "UNKNOWN" : 0
}

// Indicator Fields
export var periodK = 14;
export var periodD = 5;
export var rocInterval = 12;
export var macdInterval = [5, 35, 5];
export const stochLookback = 3;
export const oversoldLimit = 20;
export const overboughtLimit = 80;
export const minimumStepsTillNextStochBuy = 3
export const allowedArrayLengthTrends = 7
export const maximumBearRatioAllowed = allowedArrayLengthTrends 
export const shortMA = 13
export const longMA = 48

// Backtest
export const minimumIndex = 100
export const minimumNumberOfPoints = 49

// Wallets
export let availableBacktestBUSD = 1000;
export let backtestWallet = {"BUSD" : availableBacktestBUSD}
export let holdWallet = {"BUSD" : availableBacktestBUSD}

// Endpoints and clients
export const binancebaseUrl = 'https://api.binance.com/api/v3/ticker/price?symbol=';
export const iconEndpoint = "https://raw.githubusercontent.com/rainner/binance-watch/master/public/images/icons/";

// Equators
export const unixTimeToLookBack = {
    "1d" : 86400000,
    "6h" : 21600000,
    "4h" : 14400000,
    "2h" : 7200000,
    "1h" : 3600000,
    "30m" : 1800000,
    "15m" : 900000,
    "10m" : 600000,
    "5m" : 300000
  }

export function configureFundsToTradeWith(trend) {
  useShareOfAvailableFundes = shareOnTrends[trend]
}

export function resetBacktestWallet() {
  backtestWallet = {"BUSD" : availableBacktestBUSD}
}
  
export function adjustAtrMultipliers(isTrue) {
  if (isTrue)
    atrProfitMultiplier = 2
  else
    atrProfitMultiplier = 1
}
*/
//#endregion