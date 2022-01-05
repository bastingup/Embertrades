import {default as Datastore} from 'nedb'

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

    // Count all documents in the datastore
    db.orderbook.count({}, function (err, count) {
        console.log("\u001b[0;0mLoaded orderbook database with", count, "entries");
    });
}

export function createNewDatabase(localDbPath) {
    return new Datastore({ filename: localDbPath});
}