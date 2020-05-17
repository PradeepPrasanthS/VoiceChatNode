'use strict'

//  Live Speech to Text client with node.js and socket.io

const express = require('express');
const fs = require('fs');
const environmentVars = require('dotenv').config();
// Google Cloud
const speech = require('@google-cloud/speech');
const app = require('./routes/chatbotController');
//app();
const port = process.env.PORT || 1338
const encoding = 'LINEAR16';
const sampleRateHertz = 16000;
const languageCode = 'en-IN'; //en-US
var WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({
        port: port
    });
const url = require('url');
// var assistant = require('./assistantAPI');

wss.on('connection', function(client, req) {
    console.log(req.headers)
    const speechClient = new speech.SpeechClient();
    const params = url.parse(req.url, true).query;

    const request = {
        config: {
            encoding: encoding,
            sampleRateHertz: sampleRateHertz,
            languageCode: params.lang,
            profanityFilter: false,
            enableWordTimeOffsets: true,
            enableAutomaticPunctuation: true,
            model: "command_and_search",

        },
        singleUtterance: true,
        interimResults: false // If you want interim results, set this to true
    };


    console.log("\x1b[32m", 'Client Connected to server', '\x1b[0m', params);
    let recognizeStream = null;

    client.on('message', async function(data) {

        if (data === "startGoogleCloudStream") {
            startRecognitionStream(client);
        } else if (data === "endGoogleCloudStream") {
            console.log("ending meeting");
            stopRecognitionStream();
        } else {
            if (recognizeStream !== null) {
                recognizeStream.write(data);
            }
        }

        function startRecognitionStream(client, data) {

            recognizeStream = speechClient.streamingRecognize(request)
                .on('error', (error) => {
                    if (error.code === 11) {
                        stopRecognitionStream();
                        startRecognitionStream(client);
                        console.log("\x1b[31m", "Long pause > 65 seconds detected!", '\x1b[0m');
                        console.log("\x1b[32m", 'restarted stream serverside after long pause.', '\x1b[0m');
                    } else {
                        console.log(error);
                    }
                })
                .on('data', async(tdata) => {

                    console.log("data recieved from transcribe is :", JSON.stringify(tdata));
                    if (!(tdata.speechEventType && tdata.speechEventType == 'END_OF_SINGLE_UTTERANCE')) {
                        // let re = {
                        //     "text": tdata.results[0].alternatives[0].transcript,
                        //     "question": false
                        // }
                        client.send(tdata.results[0].alternatives[0].transcript);
                        // var resp = await assistant.getAssistantResponse(tdata.results[0].alternatives[0].transcript, params.api_key, params.userID);
                        // console.log("response from assistant api : ", resp);
                        // client.send(JSON.stringify(resp));
                    }
                    // if end of utterance, let's restart stream
                    // this is a small hack. After 65 seconds of silence, the stream will still throw an error for speech length limit
                    if (tdata.results[0] && tdata.results[0].isFinal) {
                        //stopAssistantRecognitionStream();
                        startRecognitionStream(client);
                        console.log("\x1b[32m", 'restarted stream serverside after end of Utterance.', '\x1b[0m');
                    }
                });
        }

        function stopRecognitionStream() {
            if (recognizeStream) {
                recognizeStream.end();
                console.log('stopped');
            }
            recognizeStream = null;
        }
    })
});