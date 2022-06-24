import * as indicators from './indicators.js'

// BACKTEST VERSION 3

export var decisionSettings = {
  "BEAR" : {
    "BUY" : [
      indicators.indicatorForDecision.STOCH_NOW_SIMPLE
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
      indicators.indicatorForDecision.MACD,
      indicators.indicatorForDecision.STOCH_NOW_SIMPLE
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

// BACKTEST VERSION 3

// Master
export const softwareModes = {
                              // Is building signals after loading the data
                              // IMPLEMENTED
                              "Signals": "Signals",

                              // Is gridsearching most profitable combinations of 3 out of all data
                              // IMPLEMENTED
                              "Gridsearch": "Gridsearch",

                              // LIVE MODE WITH REAL ORDERS
                              // TODO
                              "Live" : "Live",

                              // LIVE MODE with fake orders in local orderbook
                              // TODO
                              "Halflife" : "Halflife",

                              // Run simulation with given parameters and assets
                              // IMPLEMENTED
                              "Test" : "Test",

                              // Have running simulation with scan for most volatile assets and switch markets on the fly
                              // TODO
                              "Test_VolatilityMonitor" : "Test_VolatilityMonitor",
                            
                              // Only calls dev function
                              // TODO
                              "Dev" : "Dev"
                            };
export const softwareMode = softwareModes.Test;

export const stoplossModes = {"HARD" : "HARD",
                              "TRAILING_HARD" : "TRAILING_HARD",
                              "TRAILING_ATR" : "TRAILING_ATR",
                              "ATR" : "ATR"};
                              
export const stoplossMode = stoplossModes.ATR;

// TODO Implement corresponding functions
/*
export const marketDataModes = {"Download": "Download"
                      ,"DownloadAndSave": "DownloadAndSave",
                       "ReadFromDisk" : "ReadFromDisk",
                      "Dev" : "Dev"};
export const marketDataMode = softwareModes.Download;
*/

export const atLeastRatioForBuy = 0.001;
export const atLeastRatioForSell = 0.001;
export const nonOptionalBuy = -1;
export const nonOptionalSell = -1;

export const binanceFee = 0.001;
export const stoplossPercentage = 0.05;
export const atrStoplossMultiplicator = 1;
export let atrProfitMultiplier = 2;
export const minimumProfitPercentage = 0.03;
export const minimalProfitBUSD = 0.04; // Absolute minimum for fees, not implemented yet

// Server
export const port = 3001;

// Market fields
export const stepsBackInTime = 5000;
export const minimumBUSDForTrade = 15;
export const numberOfClosesForATH = 12;
export var bearBrake = true;

export var timeWindow = "1h";
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