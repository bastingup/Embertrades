import {buyStrategyState} from "./indicators.js"

// Master
export const debug = true;
export var timeWindow = "1h";

// Server
export const port = 3001;

// Strategy fields
export let selectedBuyStrategy = buyStrategyState.MACD_STOCH;

// Market fields
export const stepsBackInTime = 180;
export var minimalProfitPercent = 0.01;
export var minimalProfitBUSD = 0.06;
export const minimumBUSD = 30;
export const allocation = 1;   

// Endpoints and clients
export const binancebaseUrl = 'https://api.binance.com/api/v3/ticker/price?symbol=';
export const iconEndpoint = "https://raw.githubusercontent.com/rainner/binance-watch/master/public/images/icons/";

// Equators
export const unixTimeToLookBack = {
    "6h" : 21600000,
    "4h" : 14400000,
    "2h" : 7200000,
    "1h" : 3600000,
    "30m" : 1800000,
    "15m" : 900000,
    "10m" : 600000,
    "5m" : 300000
  }