'use strict'

// Imports the Google Cloud client library
const textToSpeech = require('@google-cloud/text-to-speech');

// Import other required libraries
const fs = require('fs');
const util = require('util');

const textToSpeechFunctions = {
    textToSpeechConverter: async function(lang, text) {
        // Creates a client
        const client = new textToSpeech.TextToSpeechClient();

        const [result] = await client.listVoices({});
        const voices = result.voices;

        // Construct the request
        const request = {
            input: { text: text },
            // Select the language and SSML Voice Gender (optional)
            voice: { languageCode: lang, ssmlGender: 'NEUTRAL' },
            // Select the type of audio encoding
            audioConfig: { audioEncoding: 'MP3' },
        };
        console.log("TextToSpeech START");
        // Performs the Text-to-Speech request
        const [response] = await client.synthesizeSpeech(request);
        console.log("TextToSpeech RESPONSE RECEIVED");

        //Write the binary audio content to a local file
        //const writeFile = util.promisify(fs.writeFile);
        //await writeFile('D:/output.mp3', response.audioContent, 'binary');
        //console.log('Audio content written to file: output.mp3');
        // console.log("textToSpeech Response:: {}", response);

        return response.audioContent;
    }
};
module.exports = textToSpeechFunctions;