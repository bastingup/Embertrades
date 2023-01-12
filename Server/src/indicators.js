import {SMA, ROC, ADX, MACD, EMA, ATR, StochasticOscillator, RSI} from 'trading-signals'; // https://github.com/bennycode/trading-signals
import * as config from './config.js';
import * as dbmanagement from "./databaseManagement.js";
import * as markets from './markets.js';
import * as colors from "./colors.js"
import * as server from "./server.js"

// --------------------------------------------------
// --------------------------------------------------
// --------------- BACKEND SOLO ---------------------
// --------------------------------------------------
// --------------------------------------------------

let registeredAssets = 0
export const marketState = {"BULL": "BULL", "BEAR": "BEAR", "RANGE" : "RANGE", "UNKNOWN" : "UNKNOWN"}
export const crosses = {"DOWNTOP" : "DOWNTOP", "UPLOW" : "UPLOW", "STAYUP" : "STAYUP", "STAYDOWN" : "STAYDOWN", "UPTOP" : "UPTOP", "DOWNLOW" : "DOWNLOW", "NONE" : "NONE"}

export function giveFeedbackAssetDone(configData) {
  registeredAssets = registeredAssets + 1
  if (registeredAssets === configData.trading.markets.length) {
      console.log(colors.importantInfoLog + "INDICATORS - All calculations for indiators are done for this run.")
      server.eventBus.emit("all-assets-done", null, configData)
      registeredAssets = 0
  }
}

export function buildTradingSignals(configData, asset, data, limit, docs) {

  console.log(colors.infoLog + "INDICATORS - Starting to calculate technical indicators for", asset, ".")
  
  // List of technical indicators with configs
  const selectedSignals = configData.trading.signalsSettings

  // Candles
  let candles = markets.buildCandlesFromDownloadedData(data[0]);
  let indicatorResults = {}
  let oldCandles = []
  let allCandles = []

  // If we are just adding things to ongoing db, get old candles for indicators
  if (limit < configData.trading.stepsInTime) {
    oldCandles = buildCandlesFromDBData(docs)
    allCandles = oldCandles.concat(candles)
    candles = allCandles
  }

  // Iterate all indicators
  for (let j = 0; j < selectedSignals.length; j++) {
    switch (selectedSignals[j].name) {

      case "STOCH" :
        console.log(colors.infoLog + "INDICATORS - Building Stochastic Oscillator indicator for", asset)
        indicatorResults[selectedSignals[j].name] = indicatorSTOCH(selectedSignals[j], candles)
        break

      case "ROC" :
        console.log(colors.infoLog + "INDICATORS - Building Rate of Change indicator for", asset)
        indicatorResults[selectedSignals[j].name] = indicatorROC(selectedSignals[j], candles)
        break

      case "MADOUBLE" :
        console.log(colors.infoLog + "INDICATORS - Building Double Moving Average indicator for", asset)
        indicatorResults[selectedSignals[j].name] = {"SHORT" : null, "LONG" : null}
        indicatorResults[selectedSignals[j].name].SHORT = indicatorMA(selectedSignals[j].signalConfig.shortma, candles)
        indicatorResults[selectedSignals[j].name].LONG = indicatorMA(selectedSignals[j].signalConfig.longma, candles)
        break

      case "ADX" :
        console.log(colors.infoLog + "INDICATORS - Building ADX indicator for", asset)

        // Short term market
        indicatorResults[selectedSignals[j].name] = {"PDI" : null, "MDI" : null, "ADX_R_SHORT" : null, "ADX_TREND_SHORT" : null}
        const r = indicatorADX(selectedSignals[j].signalConfig, selectedSignals[j].signalConfig.currentMarketInterval, candles)
        indicatorResults[selectedSignals[j].name].PDI_SHORT = r.p
        indicatorResults[selectedSignals[j].name].MDI_SHORT = r.m
        indicatorResults[selectedSignals[j].name].ADX_R_SHORT = r.f
        indicatorResults[selectedSignals[j].name].ADX_TREND_SHORT = r.t
        break

      case "RSI" :
        console.log(colors.infoLog + "INDICATORS - Building Relative Strength Index indicator for", asset)
        indicatorResults[selectedSignals[j].name] = {"RSI" : null, "CROSS" : null}
        const s = indicatorRSI(configData, selectedSignals[j].signalConfig.interval, candles)
        indicatorResults[selectedSignals[j].name].RSI = s.results
        indicatorResults[selectedSignals[j].name].CROSS = s.crosses
        break 
    }
  }

  // PUT ALL CANDLES WITH THEIR INDICATOR RESULTS TOGETHER
  const realC = candles.length - limit
  for (let c = realC, f = 0; c < candles.length; c++, f++) {

    // Stoch Osc
    candles[c].STOCH = parseFloat(indicatorResults.STOCH[c])

    // RoC
    candles[c].ROC = parseFloat(indicatorResults.ROC[c])

    // Moving Average
    candles[c].MA_SHORT = parseFloat(indicatorResults.MADOUBLE.SHORT[c])
    candles[c].MA_LONG = parseFloat(indicatorResults.MADOUBLE.LONG[c])

    // ADX Shortterm
    candles[c].ADX_PDI_SHORT = parseFloat(indicatorResults.ADX.PDI_SHORT[c])
    candles[c].ADX_MDI_SHORT = parseFloat(indicatorResults.ADX.MDI_SHORT[c])
    candles[c].ADX_RESULT_SHORT = parseFloat(indicatorResults.ADX.ADX_R_SHORT[c])
    candles[c].ADX_TREND_SHORT = indicatorResults.ADX.ADX_TREND_SHORT[c]

    // RSI
    candles[c].RSI = parseFloat(indicatorResults.RSI.RSI[c])
    candles[c].RSI_CROSS = indicatorResults.RSI.CROSS[c]
    

    // General Info
    candles[c].timeStamp = data[0][f][0]
    candles[c].asset = asset
  }

  // Add to db
  dbmanagement.db.markets.insert(candles.slice(-limit), function (err, newDoc) {
    console.log(colors.dbLog + "INDICATORS - Added", limit.toString(), "of asset", asset.toString(), "to the markets database.")
    giveFeedbackAssetDone(configData)
  });
  console.log(colors.importantInfoLog + "INDICATORS - Finished building indicators for", asset)
}


function buildCandlesFromDBData(docs) {
  var candles = [];
  for (var i = 0; i < docs.length; i++) {
    candles.push({
      "close" : docs[i]["close"],
      "high" : docs[i]["high"],
      "low" : docs[i]["low"]
    })
  }
  return candles;
}

// --------------- INDICATORS -----------------------
// --------------------------------------------------

// Stochastic Oscillator
function indicatorSTOCH(conf, candles) {
  const k = conf.signalConfig.periodK;
  const d = conf.signalConfig.periodD;
  const stoch = new StochasticOscillator(k, d);
  let stochResults = []
  for (const candle of candles) {
    const stochResult = stoch.update(candle);
    let r = "Unstable"
    if (stoch.isStable && stochResult) {
      r = stoch.getResult().k.toFixed(5)
    }
    stochResults.push(r)
  }
  return stochResults
}

// ROC
function indicatorROC(conf, candles) {
  const roc = new ROC(conf.signalConfig.interval);
  let rocResults = []
  for (const candle of candles) {
    const result = roc.update(candle["close"]);
    let r = "Unstable"
    if (roc.isStable && result) {
      r = roc.getResult().toFixed(2)
    }
    rocResults.push(r)
  }
  return rocResults
}

// MA
function indicatorMA(n, candles) {
  const ma = new SMA(n);
  let results = []
  for (const candle of candles) {
    const result = ma.update(candle["close"]);
    let r = "Unstable"
    if (ma.isStable && result) {
      r = ma.getResult().toFixed(2)
    }
    results.push(r)
  }
  return results
}

// ADX
function indicatorADX(configData, n, candles) {
  const adx = new ADX(n);
  let pdiResult = []
  let mdiResult = []
  let fResult = []
  let tResult = []
  for (const candle of candles) {
    const result = adx.update(candle);
    let p = "Unstable"
    let m = "Unstable"
    let f = "Unstable"
    let t = marketState.UNKNOWN
    if (adx.isStable && result) {
      p = adx.pdi.toFixed(4)
      m = adx.mdi.toFixed(4)
      f = adx.getResult().toFixed(4)
      t = determineADX(configData, f, p, m)
      
    }
    pdiResult.push(p)
    mdiResult.push(m)
    fResult.push(f)
    tResult.push(t)
  }
  return {"p" : pdiResult, "m" : mdiResult, "f" : fResult , "t" : tResult}
}
function determineADX(configData, result, p, m){
  let state = marketState.UNKNOWN
  if (result != undefined) {
    if (result > configData.threshold) {
      if (p > m) {state = marketState.BULL}
      else if (p < m) {state = marketState.BEAR}
    }
    else {
      state = marketState.RANGE
    }
  }
  return state
}

// RSI
function indicatorRSI(configData, n, candles) {
  const indi = new RSI(n);
  let results = []
  let crossResults = []

  for (const candle of candles) {
    const result = indi.update(candle["close"]);
    let r = "Unstable"
    if (indi.isStable && result) {
      r = indi.getResult().toFixed(4)
    }
    results.push(r)

    const crossedDown = function(configData, results) {
      const last = results[results.length - 1]
      const preLast = results[results.length - 2]
      let lim = 100
      let crossed = crosses.NONE

      for (const d of configData.trading.rules.DEFAULT.filter(d => d.name == "RSI")) {
        if (preLast > d.sell && last < d.sell) {
          crossed = crosses.DOWNTOP
        }
        else if (preLast < d.buy && last > d.buy) {
          crossed = crosses.UPLOW
        }
        else if (preLast > d.sell && last > d.sell) {
          crossed = crosses.STAYUP
        }
        else if (preLast < d.buy && last < d.buy) {
          crossed = crosses.STAYDOWN
        }
        else if (preLast < d.sell && last > d.sell) {
          crossed = crosses.UPTOP
        }
        else if (preLast > d.buy && last < d.buy) {
          crossed = crosses.DOWNLOW
        }
      }
      return crossed
    }
    crossResults.push(crossedDown(configData, results))
  }
  return {"results" : results, "crosses" : crossResults}
}


// --------------------------------------------------
// --------------------------------------------------
// -------------// BACKEND SOLO ---------------------
// --------------------------------------------------
// --------------------------------------------------

//#region Legacy
const adxInterval = 10;
const adxThreshold = 20;

//export const marketState = {"BULL": "BULL", "BEAR": "BEAR", "RANGE" : "RANGE", "UNKNOWN" : "UNKNOWN"}
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