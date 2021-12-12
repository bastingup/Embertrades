import {default as ccxt} from "ccxt";
import dotenv from 'dotenv'
dotenv.config()

export function getBinanceClient() {
    return new ccxt.binance({
        apiKey: process.env.API_KEY,
        secret: process.env.API_SECRET,
        enableRateLimit: true,
    });
}