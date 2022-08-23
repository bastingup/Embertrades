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
import * as debug from "./debug,js"
import * as dbmanagement from "./src/databaseManagement.js"
import * as server from "./src/server.js"
import * as config from "./src/config.js"
import * as brain from "./src/brain.js"
// #endregion

// -------------- DEBUG
const blueLog = "\u001B[0;36m"
// ------------- /DEBUG

function main() {

    // -------------- EVENT SUBSCRIPTIONS
    // Register callback on Main
    server.eventBus.on('finished-main-function', brain.mainEventCallback);

    // -------------- SET UP DB
    dbmanagement.setUpDatabase();

    // -------------- START THE APP ON PORT
    server.startApp(config.port);
    console.log(`${blueLog} Mode is set to: `, config.softwareMode);

    // -------------- FIN
    // Emit event after main
    server.eventBus.emit("finished-main-function")

}

app.post('/api/main/mainDebug', async function mainDebug(req, res, next) {
    const r = "I AM ALIVE!";

    try {
        res.send(r);
    } catch(e) {}
});

main();