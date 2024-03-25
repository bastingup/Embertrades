// #region IMPORTS
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

    // -------------- LOAD CONFIG FILE & GREETINGS
    const configData = config.readInConfigFile()
    welcomeMessage(configData)

    // -------------- EVENT SUBSCRIPTIONS
    // THESE ARE FINE AS THEY ARE
    server.eventBus.on('finished-main-function', brain.mainEventCallback); // Callback when main executed succesfully
    server.eventBus.on('loaded-db', dbmanagement.giveFeedbackDBAlive); // If a db is alive, it registeres via this event
    server.eventBus.on('all-db-alive', allDbAreAliveRegisterClicks); // All db are alive, proceed with workflow


    // THESE NEED REWORKING
    //server.eventBus.on('got-market-data', indicators.buildTradingSignals); // Market data has been loaded, build indicators
    //server.eventBus.on('download-market-data', markets.fetchMarketData); // Proceed to fetch market data
    //server.eventBus.on('next-run', buildMarketInformation); // setInterval ran through, restart the workflow loop
    //server.eventBus.on('all-assets-done', brain.trading); // Which indicator combination would have made the most paper


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



    // --------------------------------------------------
    // --------------- FINISH MAIN ----------------------
    // --------------------------------------------------

    // -------------- FIN
    server.eventBus.emit("finished-main-function")
}


// --------------------------------------------------
// --------------- MAIN FUNCTIONS -------------------
// --------------------------------------------------

async function allDbAreAliveRegisterClicks(configData) {
    console.log(colors.infoLog + "______________________________________________");
    console.log(colors.infoLog + "MAIN - All DBs are alive. We can proceed at:", new Date().toUTCString())
    
    // Check for positions to OPEN
    setInterval(brain.handlePositionClosing, configData.tech.unixTimeToLookBack[configData.dcaSignalConfig.handleClosing.timerToClick], configData);

    // Check for positions to CLOSE
    setInterval(brain.handlePositionOpening, configData.tech.unixTimeToLookBack[configData.dcaSignalConfig.handleOpening.timerToClick], configData);

    // Chcek for coins that show signs of PUMP
    // TODO

    console.log(colors.infoLog + "MAIN - Registered opening and closing handle function.");
    console.log(colors.infoLog + "MAIN - Opening runs every:", configData.dcaSignalConfig.handleOpening.timerToClick);
    console.log(colors.infoLog + "MAIN - Closing runs every:", configData.dcaSignalConfig.handleClosing.timerToClick);

    brain.handlePositionOpening(configData)
}


function welcomeMessage(configData) {
    console.log(colors.helloLog + "______________________________________________")
    console.log(colors.helloLog + "Welcome to embertrades. version", configData.v)
    console.log(colors.helloLog + "Intreval set to", colors.infoLog + configData.trading.timeStepSize, colors.helloLog +"- trading on:", colors.infoLog + configData.trading.markets)
    console.log(colors.helloLog + "Please note that embertrades runs best with a clean, empty market database.")
    console.log(colors.helloLog + "There is no point to build a shadow db of the market.")
    console.log(colors.helloLog + "embertrades is collecting all information itself on the fly.")
    console.log(colors.helloLog + "Have fun trying to get rich.")
    console.log(colors.helloLog + "______________________________________________")
}


// --------------------------------------------------
// --------------- CALL MAIN ------------------------
// --------------------------------------------------

main();