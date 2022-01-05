import express from 'express';
import * as bodyParser from "body-parser"



export const app = express();

import EventBus from 'js-event-bus';
export const eventBus = new EventBus();

export function startApp(port) {
    app.listen(port);
    app.use(bodyParser.json());
    console.log("App started and listening on Port:", port)

    logServerStart();
}

function logServerStart() {
    console.log("\u001b[0;36m__________________________________________");
    console.log("\u001b[0;36mStarting Server at:", new Date(Date.now()));
    console.log("\u001b[0;36m__________________________________________");
}
  