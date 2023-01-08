import e from 'express';
import {SMA, ROC, ADX, MACD, EMA, ATR, StochasticOscillator} from 'trading-signals'; // https://github.com/bennycode/trading-signals
import * as config from './config.js';
import * as dbmanagement from "./databaseManagement.js";
import * as markets from './markets.js';

// --------------------------------------------------
// --------------------------------------------------
// --------------- BACKEND SOLO ---------------------
// --------------------------------------------------
// --------------------------------------------------

export function buildTradingSignals(configData, asset, data) {
  console.log("Building technical indicators for", asset, ".")

  // List of technical indicators with configs
  const selectedSignals = configData.trading.signalsSettings

  // Candles
  let candles = markets.buildCandles(data[0]);
  let indicatorResults = {}

  // Iterate all indicators
  for (let j = 0; j < selectedSignals.length; j++) {
    switch (selectedSignals[j].name) {

      case "STOCH" :
        console.log("Building Stochastic Oscillator signals for", asset)
        indicatorResults[selectedSignals[j].name] = indicatorSTOCH(selectedSignals[j], candles)

    }
  }

  // PUT ALL CANDLES WITH THEIR INDICATOR RESULTS TOGETHER
  /*
  for (let c = 0; c < candles.length; c++) {
    console.log(candles[c], indicatorResults.STOCH[c])
  } */
}

// Stochastic Oscillator
function indicatorSTOCH(conf, candles) {
  const k = conf.signalConfig.periodK;
  const d = conf.signalConfig.periodD;
  const stoch = new StochasticOscillator(k, d);
  let stochResults = []
  for (const candle of candles) {
    const stochResult = stoch.update(candle);
    let result = "Unstable"
    if (stoch.isStable && stochResult) {
      result = stoch.getResult().k.toFixed(5)
    }
    stochResults.push(result)
  }
  return stochResults
}


// --------------------------------------------------
// --------------------------------------------------
// -------------// BACKEND SOLO ---------------------
// --------------------------------------------------
// --------------------------------------------------

//#region Legacy
const movingAverageShortterm = 10;
const movingAverageLongterm = 40;
const adxInterval = 10;
const adxThreshold = 20;
const oversoldLimit = 20
const overboughtLimit = 80

export const marketState = {"BULL": "BULL", "BEAR": "BEAR", "RANGE" : "RANGE", "UNKNOWN" : "UNKNOWN"}
export const macdState = {"CROSSED_TO_POSITIVE": "CROSSED_TO_POSITIVE", "CROSSED_TO_NEGATIVE": "CROSSED_TO_NEGATIVE", "ZERO_ERROR": "ZERO_ERROR", "NO_CHANGE": "NO_CHANGE"}
export const crossOvers = {"CROSSED_UP" : "CROSSED_UP", "CROSSED_DOWN" : "CROSSED_DOWN", "NO_CHANGE": "NO_CHANGE"}
export const indicatorForDecision = {"MACD" : "MACD",
                                     "MACD_MEDIAN" : "MACD_MEDIAN",
                                     "STOCH_NOW_SIMPLE" : "STOCH_NOW_SIMPLE",
                                     "ROC" : "ROC",
                                     "ADX" : "ADX",
                                     "JUST_SELL" : "JUST_SELL",
                                     "STOCH_RECENT_PAST" : "STOCH_RECENT_PAST",
                                     "DYNAMIC_STOP_SELL" : "DYNAMIC_STOP_SELL",
                                     "UPWARDS_ROC_MODE" : "UPWARDS_ROC_MODE",
                                     "MEDIAN" : "MEDIAN",
                                     "GOLDEN_CROSS" : "GOLDEN_CROSS",
                                     "NOTHING" : "NOTHING"}
export const decisionMadeWithIndicators = {"BUY": "BUY", "SELL": "SELL", "NOTHING" : "NOTHING"}

export function getROCResult(prices, interval) {
    const roc = new ROC(interval);
    prices.forEach(p => roc.update(p));
    return roc;
}

export function getADXResult(cadnles) {
  var marketTrend = marketState.UNKNOWN;
  const adxResult = calculateTrendDirectionADX(cadnles);
  if (adxResult.getResult().toFixed(2) > adxThreshold) {
    const positiveADX = adxResult.pdi.toFixed(2);
    const negativeADX = adxResult.mdi.toFixed(2);
    if (positiveADX > negativeADX) { marketTrend = marketState.BULL; }
    else if (negativeADX > positiveADX) { marketTrend = marketState.BEAR; }
  } else {
    marketTrend = marketState.RANGE; 
  }
  return marketTrend;
}

function calculateTrendDirectionADX(candle) {
  const adx = new ADX(adxInterval);
  candle.forEach(c => adx.update(c));
  if (adx.isStable) {
    return adx
  }
  return null;
}

export function macdBreaker() {

}

export function getATRResult(candles) {
  const atr = new ATR(5);
  for (const candle of candles) {
    atr.update(candle);
  }
  if (atr.isStable) {
    return atr.getResult().toFixed(4);
  }
}

export function getMedianOfLatestClosings(values) {
    if(values.length ===0) throw new Error("No inputs");
  
    values.sort(function(a,b){
      return a-b;
    });
  
    var half = Math.floor(values.length / 2);
    
    if (values.length % 2)
      return values[half];
    
    return (values[half - 1] + values[half]) / 2.0;
}

export function determineValueCrossover(pairOne, pairTwo) {
  if (pairOne[0] > pairTwo[0] & pairOne[1] < pairTwo[1])
    return crossOvers.CROSSED_UP
  if (pairOne[0] < pairTwo[0] & pairOne[1] > pairTwo[1])
    return crossOvers.CROSSED_DOWN
  return crossOvers.NO_CHANGE
}

export function atLeastAreDecisions(decisions, condition) {

  let retObj = {
    "conditionFullfilled" : false,
    "ratio" : 0
  }

  if (decisions.length == 1) {
    if (decisions[0] == condition) {
      retObj.conditionFullfilled = true;
      retObj.ratio = 1
      return retObj;
    }
  } else if (decisions.length > 1) {
    let didMeet = 0;
    let didNotMeet = 0;
    decisions.forEach(function(d) {
      if (d != condition) {
        didNotMeet += 1;
      } else {
        didMeet += 1;
      }
    });
    retObj.ratio = didMeet / decisions.length 
    if (retObj.ratio == NaN)
      retObj.ratio = 0

    let ratioThreshold = config.atLeastRatioForBuy;
    if (condition == decisionMadeWithIndicators.SELL) {
      ratioThreshold = config.atLeastRatioForSell
    }
    

    if (retObj.ratio >= ratioThreshold) {
      retObj.conditionFullfilled = true;
      
      return retObj;
    }
  }

  return retObj;
}

export function determineMarketsToTradeOn(signal) {
  return signal.SIGNAL_ATR / signal.price
}

export function determineSmartStoploss(entry) {
  switch (config.stoplossMode) {
    case config.stoplossModes.HARD:
      return entry.price - (entry.price * config.stoplossPercentage);

    case config.stoplossModes.ATR:
      return (entry.price - (config.atrStoplossMultiplicator * parseFloat(entry.SIGNAL_ATR)))

    default:
      return entry.price - (entry.price * config.stoplossPercentage)
  }
  
}

export function oversoldInTheRecentPast(candles) {
  var oversold = false;
  var overbought = false;
  var stepsSinceOverbought = 0;
  var stepsSinceOversold = 0;
  var oversoldNow = false
  var overbougtNow = false

  if (getSTOCHResult(candles).k.toFixed(2) < config.oversoldLimit) 
    oversoldNow = true;

  if (getSTOCHResult(candles).k.toFixed(2) > config.overboughtLimit)
    overbougtNow = true;

  oversoldLoop:
  for (var i = 1; i < config.stochLookback + 1; i++) {
    if (getSTOCHResult(candles.slice(0, -i)).k.toFixed(2) < config.oversoldLimit) {
      oversold = true;
      stepsSinceOversold = i
      break oversoldLoop;
    }
  }

  overboughtLoop:
  for (var i = 1; i < config.stochLookback + 1; i++) {
    if (getSTOCHResult(candles.slice(0, -i)).k.toFixed(2) > config.overboughtLimit) {
      overbought = true;
      stepsSinceOverbought = i
      break overboughtLoop;
    }
  }

  return [oversold, overbought, stepsSinceOverbought, stepsSinceOversold, oversoldNow, overbougtNow];
}
  
export function getSTOCHResult(prices, periodK = config.periodK, periodD = config.periodD) {
    const stoch = new StochasticOscillator(periodK, periodD);
    prices.forEach(p => stoch.update(p));
    return stoch.getResult();
}
  
export function havingBearBreak(recentPrices) {
  const lastPrice = recentPrices[recentPrices.length - 1]
  const priceBeforeLast = recentPrices[recentPrices.length - 2]

  if (lastPrice <= priceBeforeLast * 0.95 ) {
    return true
  }
  return false
}

export function getMAResult(prices, n) {
    const ma = new SMA(n);
    prices.forEach(p => ma.update(p));
    return ma.getResult().toFixed(4);
}

export function getMACDResult(prices) {
    const macd = new MACD({
      indicator: EMA,
      shortInterval: config.macdInterval[0],
      longInterval: config.macdInterval[1],
      signalInterval: config.macdInterval[2],
    });
    prices.forEach(p => macd.update(p));
    return macd.getResult();
  }

  export function detectCrossing(past, now) {
    const signPast = Math.sign(past);
    const signNow = Math.sign(now);
    if (signPast > signNow) {
      return macdState.CROSSED_TO_NEGATIVE;
    }
    if (signPast < signNow) {
      return macdState.CROSSED_TO_POSITIVE;
    }
    if (signNow === 0 || signPast === 0) {
      return macdState.ZERO_ERROR;
    }
    return macdState.NO_CHANGE;
  }
  //#endregion