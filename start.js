"use strict";

const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = 'EmbnhP2tMuG1UQDscaX0GrXXzbebec3PVoxJljXWfIaFU5FNI1';

app.get('/', function(req, res) {

    res.send('hello');
});

app.get('/webhook', function(req, res) {

    if (req.query['hub.verify_token'] === VERIFY_TOKEN) {

        return res.send(req.query['hub.challenge']);

    }
    res.send('Error, wrong validation token');
});

app.listen(PORT, () => {

    console.log(`Listening on port ${PORT}`);
});