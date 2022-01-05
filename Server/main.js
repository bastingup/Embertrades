// #region IMPORTS
// Module imports
import {default as axios} from "axios";

import {default as fs} from "fs";
import {default as Datastore} from 'nedb'

// Custom imports
import {binanceClient, cryptoBaseAsset} from './src/markets.js';
import {getROCResult, getSTOCHResult, getMAResult, getMACDResult, buyStrategyState, sellStrategyState, marketState, macdState} from './src/indicators.js'
import {downloadImage, loadIconFromLocalFolder} from "./src/imageLoader.js"
import * as dbmanagement from "./src/databaseManagement.js"
import * as server from "./src/server.js"
import * as config from "./src/config.js"
// #endregion

// #region FIELDS
// Technical indicator settings


// Markets
const assets =  ["DOT", "TRX", "XLM", "IOTA"]
//const assets = ["DOT"]


// Market enum

// #endregion


const main = async () => {

    // Register callback on main
    server.eventBus.on('finished-main-function', mainEventCallback);

    const runDate = Date.now()

    dbmanagement.setUpDatabase();
    server.startApp(config.port);

    // Emit event after main
    server.eventBus.emit("finished-main-function")
}

function mainEventCallback() {
    console.log("Emitted event: finished-main-function - main function ran through.")
}

main();
//setInterval(main, unixTimeToLookBack[timeWindow]);



// -------------------------------------- DEBUG AREA ----------------------
const busdmarketsapidebug = (`http://127.0.0.1:` + config.port + "/api/markets/getAllBusdMarkets").toString()
const fetchbalanesdebug = (`http://127.0.0.1:` + config.port + "/api/account/fetchBalances").toString()

const argumentMarketDebug = "ETH/BUSD"
const getHistoricdatadebug = (`http://127.0.0.1:` + config.port + "/api/markets/getHistoricData").toString()


headers.append("Content-Type", "application/json");
axios({method: 'POST',
    url: getHistoricdatadebug,
    data: JSON.stringify({
        market : argumentMarketDebug
    })
}).then(function(r) {console.log(r)})
