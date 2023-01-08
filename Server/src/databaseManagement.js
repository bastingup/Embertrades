import {default as Datastore} from 'nedb'
import * as server from "./server.js"

export let db = null

export function setUpDatabase() {

    // Load database
    var localDbPath = './db/local.db'
    db = createNewDatabase(localDbPath);

    // Orderbook
    db.orderbook = new Datastore('./db/orderbook.db');
    db.orderbook.loadDatabase();

    // Db for tracking markets
    db.markets = new Datastore('./db/markets.db');
    db.markets.loadDatabase();

    // Backtest Signals
    db.testOrderbook = new Datastore('./db/livetestOrderbook.db');
    db.testOrderbook.loadDatabase();

    // Count all documents in the datastore
    db.orderbook.count({}, function (err, count) {
        console.log("\u001b[0;0mLoaded orderbook database with", count, "entries");
    });
}

export function createNewDatabase(localDbPath) {
    return new Datastore({ filename: localDbPath});
}
