// #region IMPORTS
import * as markets from './src/markets.js';
import * as indicators from './src/indicators.js'
import * as dbmanagement from "./src/databaseManagement.js"
import * as server from "./src/server.js"
import * as config from "./src/config.js"
import * as brain from "./src/brain.js"
import * as colors from "./src/colors.js"
// #endregion

// Technical Indicators
// https://www.britannica.com/money/technical-indicator-types
// trendyways
// https://www.npmjs.com/package/trendyways
// trading signals
// https://www.npmjs.com/package/trading-signals


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
    server.eventBus.on('all-db-alive', initializationComplete); // All db are alive, proceed with workflow


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

async function initializationComplete(configData) {
    console.log(colors.infoLog + "______________________________________________");
    console.log(colors.infoLog + "MAIN - All DBs are alive, software runs fine. We can proceed at:", new Date().toUTCString())
    console.log(colors.serverLog + "MAIN - We are in mode: " + configData.mode);
    console.log(colors.infoLog + "MAIN - " + instructionalMessage(configData));

    // Check if we are backteting or anything else
    if (configData.mode == "BACKTEST") {
        await brain.handlePositionBacktesting(configData)
    } else {
        // Check for positions to OPEN and CLOSE
        setInterval(brain.handlePositionClosing, configData.tech.unixTimeToLookBack[configData.dcaSignalConfig.handleClosing.timerToClick], configData);
        setInterval(brain.handlePositionOpening, configData.tech.unixTimeToLookBack[configData.dcaSignalConfig.handleOpening.timerToClick], configData);
        // Chcek for coins that show signs of PUMP
        // TODO
        console.log(colors.infoLog + "MAIN - Registered opening and closing handle function.");
        console.log(colors.infoLog + "MAIN - Opening runs every:", configData.dcaSignalConfig.handleOpening.timerToClick);
        console.log(colors.infoLog + "MAIN - Closing runs every:", configData.dcaSignalConfig.handleClosing.timerToClick);

        brain.handlePositionOpening(configData) // Start with a run of OPENING
        brain.handlePositionClosing(configData) // Start with a run of CLOSING
    }
}

function instructionalMessage(configData) {
    let msg = "Stuck initializing..."
    switch (configData.mode) {
        case "PAPER":
            msg = "PAPER mode does not use actual money. Embertrades is live-simulating for the real experience but without risk."
            break
        case "LIVE":
            msg = "We are LIVE. Trading with real money. Let's try to get rich."
            break
        case "MIZAR":
            msg = "We are sending signals to MIZAR. Trading on CEX."
            break
        case "BACKTEST":
            msg = "We are in BACKTEST, trying to backtest our strategy."
            break
        default:
            msg = "Something went wrong..."
            break
    }
    return msg
}

function welcomeMessage(configData) {
    console.log(colors.helloLog + "______________________________________________")
    console.log(colors.helloLog + "Welcome to Embertrades. Version", configData.v)
    console.log(colors.helloLog + "Embertrades utilizes different buy and sell signal techniques.")
    console.log(colors.helloLog + "These include but are not limited to technical indicators, supports/resistances,")
    console.log(colors.helloLog + "fear and greed index, DCA buys, and others.")
    console.log(colors.helloLog + "Have fun trying to get rich.")
    console.log(colors.helloLog + "______________________________________________")
}


// --------------------------------------------------
// --------------- CALL MAIN ------------------------
// --------------------------------------------------

main();