"use strict";

const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();

app.use(bodyParser.json({ verify: verifyRequestSignature }));


const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = 'EmbnhP2tMuG1UQDscaX0GrXXzbebec3PVoxJljXWfIaFU5FNI1';
const PAGE_TOKEN = 'EAADcZBBJyxP0BAKwrxisgMvewalZBNc2atXnE9cKNziPYQObyTPfRy56U6TXD0ZCiSGKmMkj2c9drQlvlC7biu1ZCzoVoXbqZBfmPO9WXBR9ZC10Qy9b29jaB56eTOfAoW6knhfMJZCRXUtlxI6mENLSSZCZB2zajhoO4mMZCLAQ4NIgZDZD';
const APP_SECRET = 'f1fe035a41452301b87acaf667d14478';

app.get('/', function(req, res) {

    res.send('hello');
});

app.get('/webhook', function(req, res) {

    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
        console.log('Validating webhook');
        return res.status(200).send(req.query['hub.challenge']);
    }
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
});

app.post('/webhook', function (req, res) {

    const data = req.body;

    // Make sure this is a page subscription
    if (data.object === 'page') {

        // Iterate over each entry - there may be multiple if batched
        data.entry.forEach(function(entry) {
            const pageID = entry.id;
            const timeOfEvent = entry.time;

            // Iterate over each messaging event
            entry.messaging.forEach(function(event) {
                if (event.message) {
                    receivedMessage(event);
                } else {
                    console.log("Webhook received unknown event: ", event);
                }
            });
        });

        // Assume all went well.
        //
        // You must send back a 200, within 20 seconds, to let us know
        // you've successfully received the callback. Otherwise, the request
        // will time out and we will keep trying to resend.
        res.sendStatus(200);
    }
});

function receivedMessage(event) {
    // Putting a stub for now, we'll expand it in the following steps
    console.log("Message data: ", event.message);
}

/*
 * Verify that the callback came from Facebook. Using the App Secret from 
 * the App Dashboard, we can verify the signature that is sent with each 
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {

    const signature = req.headers['x-hub-signature'];

    if (!signature) {
        // For testing, let's log an error. In production, you should throw an 
        // error.
        console.error("Couldn't validate the signature.");
    } else {
        const elements = signature.split('=');
        const method = elements[0];
        const signatureHash = elements[1];

        const expectedHash = crypto.createHmac('sha1', APP_SECRET)
            .update(buf)
            .digest('hex');

        if (signatureHash !== expectedHash) {
            throw new Error("Couldn't validate the request signature.");
        }
    }
}



app.listen(PORT, () => {

    console.log(`Listening on port ${PORT}`);
});