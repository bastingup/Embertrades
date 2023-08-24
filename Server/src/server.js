// ----------------------------------------------
// ------------------ IMPORTS
// ----------------------------------------------
import express from 'express';

// ONLY EXCEPTION FOR CONFIG NAME BECAUSE OF DOTENV
import * as con from "./config.js"
import * as bodyParser from "body-parser"
import * as qs from "qs";
import cors from 'cors';
import * as colors from "./colors.js"

// EVENT BUS
import EventBus from 'js-event-bus';
import { config } from 'dotenv';
export const eventBus = new EventBus();

// ----------------------------------------------
// ------------------ FIELDS
// ----------------------------------------------

// EXPRESS APP
export const app = express();

// ----------------------------------------------
// ------------------ API ROUTED FUNCTIONS
// ----------------------------------------------

app.post('/api/server/debug', async function mainDebug(req, res, next) {
    const r = "Debug function";
    try {
        res.send(r);
    } catch(e) {console.log(e)}
});

app.post('/api/server/alive', async function mainDebug(req, res, next) {
    try {
        res.send(true);
    } catch(e) {console.log(e)}
});

// ----------------------------------------------
// -------///-------- API ROUTED FUNCTIONS
// ----------------------------------------------

// Start app
export function startApp(port) {
    app.use(cors({
        origin: '*'
      }))
    app.listen(port);
    app.options('/api', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader("Access-Control-Allow-Headers", "*");
        res.end();
      });
    logServerStart(port);
}

// LOG AND INFO
function logServerStart(port) {
    console.log(colors.serverLog + "SERVER - App started and listening on Port:", port)
    console.log(colors.serverLog + "SERVER - Starting Server at:", new Date(Date.now()).toString());
}
