import {default as Datastore} from 'nedb'
import * as server from "./server.js"
import * as colors from "./colors.js"

export let db = null
let registeredDatabases = 0
const dataBases = [
    "paperPositions", "livePositions"
]

export function loadDatabase(configData) {

    // Load database
    var localDbPath = './db/main.db'
    db = createNewDatabase(localDbPath);

    // Initialize all databases
    dataBases.forEach(function(dbName) {
        db[dbName] = new Datastore('./db/' + dbName + '.db');
        db[dbName].loadDatabase(function (err) { giveFeedbackDBAlive(configData);});
    })
}

export function giveFeedbackDBAlive(configData) {
    registeredDatabases = registeredDatabases + 1
    if (registeredDatabases === dataBases.length) {
        server.eventBus.emit("all-db-alive", null, configData)
        registeredDatabases = 0
    }
}

function createNewDatabase(localDbPath) {
    return new Datastore({ filename: localDbPath});
}
