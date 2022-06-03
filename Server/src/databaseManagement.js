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

    // Misc, config and history
    db.misc = new Datastore('./db/misc.db');
    db.misc.loadDatabase();

    // Misc, config and history
    db.signals = new Datastore('./db/signals.db');
    db.signals.loadDatabase();

    // Db for tracking markets
    db.markets = new Datastore('./db/markets.db');
    db.markets.loadDatabase();

    // Backtest Signals
    db.backtestSignals = new Datastore('./db/backtestSignals.db');
    db.backtestSignals.loadDatabase(function (err) {
        console.log("\u001B[35mEmitting event: loaded-backtest-signals.");    
        server.eventBus.emit("loaded-backtest-signals")
      });

    // Backtest Signals
    db.livetestOrderbook = new Datastore('./db/livetestOrderbook.db');
    db.livetestOrderbook.loadDatabase();

    // Count all documents in the datastore
    db.orderbook.count({}, function (err, count) {
        console.log("\u001b[0;0mLoaded orderbook database with", count, "entries");
    });
}

export function createNewDatabase(localDbPath) {
    return new Datastore({ filename: localDbPath});
}