import {app} from "./server.js"

app.post('/api/debug/sayHello', async function sayHello(req, res, next) {
    const r = "I AM ALIVE!";

    try {
        res.send(r);
    } catch(e) {}
});