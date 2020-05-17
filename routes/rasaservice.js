'use strict'
const axios = require('axios');

const rasaFunctions = {
    getRasaResponse: async function(rasaUrl, req) {
        let rasaResponse = await axios.post(rasaUrl, {
            message: req.body.message,
            sender: req.body.sender
        });
        return rasaResponse;
    }
}

module.exports = rasaFunctions;