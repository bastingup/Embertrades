import {SMA, ROC, ADX, MACD, EMA, StochasticOscillator} from 'trading-signals'; // https://github.com/bennycode/trading-signals

export const macdInterval = [8, 18, 12];
const movingAverageShortterm = 10;
const movingAverageLongterm = 40;
const adxInterval = 10;
const adxThreshold = 27;
const oversoldLimit = 20
const overboughtLimit = 80

export const buyStrategyState = {"GOLDENCROSS": "GOLDENCROSS"
,"GOLDENCROSS_BULL": "GOLDENCROSS_BULL"
,"MACD_MA": "MACD_MA"
,"ADX_MA": "ADX_MA"
,"MACD_TURN": "MACD_TURN"
,"MACD_STOCH": "MACD_STOCH"}
export const sellStrategyState = {"MASHORT_ABOVE_MALONG_ROC_ZERO": "MASHORT_ABOVE_MALONG_ROC_ZERO"
,"PRICE_X_ABOVE_BUY_PRICE": "PRICE_X_ABOVE_BUY_PRICE"
,"DYNAMIC_STOP": "DYNAMIC_STOP"}
export const marketState = {"BULL": "BULL", "BEAR": "BEAR", "RANGE" : "RANGE", "UNKNOWN" : "UNKNOWN"}
export const macdState = {"CROSSED_TO_POSITIVE": "CROSSED_TO_POSITIVE", "CROSSED_TO_NEGATIVE": "CROSSED_TO_NEGATIVE", "ZERO_ERROR": "ZERO_ERROR", "NO_CHANGE": "NO_CHANGE"}

export function getROCResult(prices, interval) {
    const roc = new ROC(interval);
    prices.forEach(p => roc.update(p));
    return roc;
}
  
export function getSTOCHResult(prices) {
    const stoch = new StochasticOscillator(15, 3);
    prices.forEach(p => stoch.update(p));
    return stoch.getResult();
}
  
export function getMAResult(prices, n) {
    const ma = new SMA(n);
    prices.forEach(p => ma.update(p));
    return ma.getResult().toFixed(4);
}

export function getMACDResult(prices) {
    const macd = new MACD({
      indicator: EMA,
      shortInterval: macdInterval[0],
      longInterval: macdInterval[1],
      signalInterval: macdInterval[2],
    });
    prices.forEach(p => macd.update(p));
    return macd.getResult();
  }