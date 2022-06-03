import express from 'express';

// ONLY EXCEPTION FOR CONFIG NAME BECAUSE OF DOTENV
import * as con from "./config.js"
import * as bodyParser from "body-parser"
import * as qs from "qs";


export const app = express();

import EventBus from 'js-event-bus';
import { config } from 'dotenv';
export const eventBus = new EventBus();

export function startApp(port) {
    app.listen(port);
    logServerStart(port);
}

function logServerStart(port) {
    console.log("\u001b[0;36m__________________________________________");
    console.log("\u001b[0;36mApp started and listening on Port:", port)
    console.log("\u001b[0;36mStarting software in mode: " + con.softwareMode)
    console.log("\u001b[0;36mStarting Server at:", new Date(Date.now()));
    console.log("\u001b[0;36m__________________________________________");
}
