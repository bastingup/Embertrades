/*

    Color Codes for console logs
    BLUE    \u001b[0;36m    -   Server things       
    GREEN   \u001B[32m      -   Sell
    YELLOW  \u001B[33m      -   Buy
    RED     \u001B[31m      -   Stop loss
    PURPLE  \u001B[35m      -   Events emitted on bus
    WHITE   \u001B[37m      -   General and Info

*/

// #region IMPORTS
// Module imports
import {default as fs} from "fs";

// Custom imports
import * as markets from './src/markets.js';
import * as indicators from './src/indicators.js'
import {downloadImage, loadIconFromLocalFolder} from "./src/imageLoader.js"
import * as dbmanagement from "./src/databaseManagement.js"
import * as server from "./src/server.js"
import * as config from "./src/config.js"
import * as brain from "./src/brain.js"


// #endregion

// -------------- Colors
const blueLog = "\u001B[0;36m"
// ------------- /Colors

async function main() {

    // --------------------------------------------------
    // --------------------------------------------------
    // --------------- SET UP & CONFIG ------------------
    // --------------------------------------------------
    // --------------------------------------------------

    // -------------- EVENT SUBSCRIPTIONS
    // Register callback on Main
    server.eventBus.on('finished-main-function', brain.mainEventCallback);
    server.eventBus.on('got-market-data', indicators.buildTradingSignals);

    // -------------- LOAD CONFIG FILE
    const configData = config.readInConfigFile()

    // -------------- SET UP DB
    dbmanagement.setUpDatabase();

    // -------------- START THE APP ON PORT
    server.startApp(configData.tech.port);

    // -------------- AUTHENTICATE WITH BINANCE AND CLIENT SET UP
    markets.instantiateBinanceClient();


    // --------------------------------------------------
    // --------------------------------------------------
    // --------------- TRADING CODE ---------------------
    // --------------------------------------------------
    // --------------------------------------------------

    markets.getMarketDataAndWriteToDB(configData, 0)

    // --------------------------------------------------
    // --------------------------------------------------
    // --------------- FINISH MAIN ----------------------
    // --------------------------------------------------
    // --------------------------------------------------

    // -------------- FIN
    // Emit event after main
    server.eventBus.emit("finished-main-function")

}

main();