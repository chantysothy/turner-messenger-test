"use strict";
const _ = require('lodash');
const async = require('async');
const request = require('request');
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
    return res.sendStatus(403);
});

app.post('/webhook', function (req, res) {

    const data = req.body;

    /**
     * Ignore updates that are not for the page.
     */
    if (!(data.object === 'page' && _.isArray(data.entry))) {

        return res.sendStatus(200);
    }

    async.each(data.entry, (entry, callback) => {

        if (_.isArray(entry.messaging)) {

            return async.each(entry.messaging, handleMessagingEvent, callback);
        }
        if (_.isArray(entry.changes)) {

            return async.each(entry.changes, handleChangeEvent, callback);
        }
        callback();

    }, (err) => {

        if (err) {
            return res.sendStatus(500);
        }
        // You must send back a 200, within 20 seconds, to let us know
        // you've successfully received the callback. Otherwise, the request
        // will time out and we will keep trying to resend.
        return res.sendStatus(200);
    });


});

function handleChangeEvent(changeEvent, callback) {

    console.log('change event');
    console.log(JSON.stringify(changeEvent));

    if (changeEvent.field !== 'feed' || !_.isPlainObject(changeEvent.value)) {
        return callback();
    }
    if (changeEvent.value.item === 'comment' && changeEvent.value.verb === 'add') {

        tryToBuy(changeEvent.value.sender_id, 'comment');

    } else if (changeEvent.value.item === 'like' && changeEvent.value.verb === 'add') {

        tryToBuy(changeEvent.value.sender_id, 'like');
    }
    callback();
}

function handleMessagingEvent(messagingEvent, callback) {

    console.log('messaging event');
    console.log(JSON.stringify(messagingEvent));
    callback();
}

function tryToBuy(userId, triggerType) {

    console.log('buy triggered by', triggerType);

    console.log('sending to', userId);

    const messageData = {
        "recipient":{
            "id": userId
        },
        "message":{
            "attachment":{
                "type":"template",
                "payload":{
                    "template_type":"generic",
                    "elements":[
                        {
                            "title":"#instabuy",
                            "image_url":"http://www.mysnuggiestore.com/content/images/thumbs/0001326_snuggie-blue.jpeg",
                            "subtitle":"#instabuy this snuggie",
                            "default_action": {
                                "type": "web_url",
                                "url": "http://www.mysnuggiestore.com/snuggie-up-blue-2",
                                "messenger_extensions": true,
                                "webview_height_ratio": "tall",
                                "fallback_url": "http://www.mysnuggiestore.com/snuggies"
                            },
                            "buttons":[
                                {
                                    "type":"payment",
                                    "title":"buy",
                                    "payload":"DEVELOPER_DEFINED_PAYLOAD",
                                    "payment_summary":{
                                        "currency":"USD",
                                        "payment_type":"FIXED_AMOUNT",
                                        "is_test_payment" : true,
                                        "merchant_name":"Shaun's Snuggies",
                                        "requested_user_info":[
                                            "shipping_address",
                                            "contact_name",
                                            "contact_phone",
                                            "contact_email"
                                        ],
                                        "price_list":[
                                            {
                                                "label":"Subtotal",
                                                "amount":"29.99"
                                            },
                                            {
                                                "label":"Taxes",
                                                "amount":"2.47"
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    ]
                }
            }
        }
    };

    callSendAPI(messageData);
}


/*
 * Call the Send API. The message data goes in the body. If successful, we'll 
 * get the message id in a response 
 *
 */
function callSendAPI(messageData) {
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: PAGE_TOKEN },
        method: 'POST',
        json: messageData

    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            const recipientId = body.recipient_id;
            const messageId = body.message_id;

            if (messageId) {
                console.log("Successfully sent message with id %s to recipient %s",
                    messageId, recipientId);
            } else {
                console.log("Successfully called Send API for recipient %s",
                    recipientId);
            }
        } else {
            console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
        }
    });
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