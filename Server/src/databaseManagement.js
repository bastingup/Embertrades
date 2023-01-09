import {default as Datastore} from 'nedb'
import * as server from "./server.js"
import * as colors from "./colors.js"

export let db = null
let registeredDatabases = 0

export function loadDatabase(configData) {

    // Load database
    var localDbPath = './db/local.db'
    db = createNewDatabase(localDbPath);

    // Orderbook
    db.orderbook = new Datastore('./db/orderbook.db');
    db.markets = new Datastore('./db/markets.db');
    db.testOrderbook = new Datastore('./db/testOrderbook.db');

    db.orderbook.loadDatabase(function (err) { giveFeedbackDBAlive(configData);});
    db.markets.loadDatabase(function (err) { giveFeedbackDBAlive(configData);});
    db.testOrderbook.loadDatabase(function (err) { giveFeedbackDBAlive(configData);});
}

export function giveFeedbackDBAlive(configData) {
    registeredDatabases = registeredDatabases + 1
    if (registeredDatabases === 3) {
        server.eventBus.emit("all-db-alive", null, configData)
        registeredDatabases = 0
    }
}

function createNewDatabase(localDbPath) {
    return new Datastore({ filename: localDbPath});
}

