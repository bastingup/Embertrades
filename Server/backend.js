// #region IMPORTS
import {default as fs} from "fs";
import * as markets from './src/markets.js';
import * as indicators from './src/indicators.js'
import * as dbmanagement from "./src/databaseManagement.js"
import * as server from "./src/server.js"
import * as config from "./src/config.js"
import * as brain from "./src/brain.js"
import * as colors from "./src/colors.js"
// #endregion

async function main() {


    // --------------------------------------------------
    // --------------- SUBSCRIPTIONS --------------------
    // ----- ACTUAL MAIN PART OF THE SOFTWARE LOGIC -----
    // --------------------------------------------------

    // -------------- LOAD CONFIG FILE
    const configData = config.readInConfigFile()

    // -------------- EVENT SUBSCRIPTIONS
    server.eventBus.on('finished-main-function', brain.mainEventCallback);
    server.eventBus.on('loaded-db', dbmanagement.giveFeedbackDBAlive);
    server.eventBus.on('all-db-alive', buildMarketInformation);
    server.eventBus.on('got-market-data', indicators.buildTradingSignals);
    server.eventBus.on('download-market-data', markets.fetchMarketData);
    server.eventBus.on('time-to-next-run', brain.scheduleNextRun);
    server.eventBus.on('next-run', buildMarketInformation);

    // --------------------------------------------------
    // --------------- SET UP, CONFIG & -----------------
    // ------------- AUTHENTICATION ---------------------
    // --------------------------------------------------

    // -------------- START THE APP ON PORT
    server.startApp(configData.tech.port);

    // -------------- AUTHENTICATE WITH BINANCE AND CLIENT SET UP
    markets.instantiateBinanceClient();

    // -------------- SET UP DB
    dbmanagement.loadDatabase(configData);


    // --------------------------------------------------
    // --------------- DEBUG CODE -----------------------
    // --------------------------------------------------

    // Download market data and build signals afterwards
    //markets.getMarketDataAndWriteToDB(configData, 0)
   
    //markets.fetchMarketDataForAllConfiguredAssets(configData)

    

    // --------------------------------------------------
    // --------------- FINISH MAIN ----------------------
    // --------------------------------------------------

    // -------------- FIN
    server.eventBus.emit("finished-main-function")
}


// --------------------------------------------------
// --------------- DOWNLOAD MARKET DATA -------------
// --------------- AND BUILD INDICATORS -------------
// --------------------------------------------------

async function buildMarketInformation(configData) {
    markets.checkLastTimestampPerAsset(configData)
}


// --------------------------------------------------
// --------------- CALL MAIN ------------------------
// --------------------------------------------------

main();