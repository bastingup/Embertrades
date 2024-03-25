import {default as Datastore} from 'nedb'
import * as server from "./server.js"
import * as colors from "./colors.js"

export let db = null
let registeredDatabases = 0

export function loadDatabase(configData) {

    // Load database
    var localDbPath = './db/main.db'
    db = createNewDatabase(localDbPath);

    // Orderbook
    db.openPositions = new Datastore('./db/openPositions.db');
    db.closedPositions = new Datastore('./db/closedPositions.db');

    db.openPositions.loadDatabase(function (err) { giveFeedbackDBAlive(configData);});
    db.closedPositions.loadDatabase(function (err) { giveFeedbackDBAlive(configData);});
}

export function giveFeedbackDBAlive(configData) {
    registeredDatabases = registeredDatabases + 1
    if (registeredDatabases === 2) {
        server.eventBus.emit("all-db-alive", null, configData)
        registeredDatabases = 0
    }
}

function createNewDatabase(localDbPath) {
    return new Datastore({ filename: localDbPath});
}
