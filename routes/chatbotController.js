'use strict'

var express = require('express');
var bodyParser = require('body-parser');
var rasaservice = require('./rasaservice');
const elasticsearch = require('elasticsearch')
var texttospeechservice = require('./texttospeechservice');
var constants = require('./../constants/constants');
const path = require('path');
const htmlToText = require('html-to-text');

var router = express.Router();
var app = express();

const config = require('./config.json');
const finalConfig = config.development;

const client = new elasticsearch.Client({
    hosts: ['http://localhost:9200']
});

client.ping({
}, function (error) {
    if (error) {
        console.error('elasticsearch cluster is down!');
        console.log(error)
    } else {
        console.log('Everything is ok');
    }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, lang');
    res.header('Access-Control-Allow-Methods', 'GET, POST');
    next();
});

async function checkString(user_response) {
    var str = user_response.toString();
    if (str.includes("get_invoice_status supply")) {
        let newstr = str.replace("get_invoice_status supply ", '');
        console.log(str);
        var result = await invoice_number_supply(newstr);
        console.log(result, "Invoice func");
        return result;
    }
    else if (str.includes("get_invoice_status service")) {
        let newstr = str.replace("get_invoice_status service ", '');
        console.log(str);
        var result = await invoice_number_service(newstr);
        console.log(result, "Invoice func");
        return result;
    }
    else if (str.includes("get_po_status")) {
        let newstr = str.replace("get_po_status ", '');
        var result = await po_number(newstr);
        console.log(str);
        console.log(result, "PO func");
        return result;
    }
    // else if (str.includes("get_payment_status")) {
    //     let newstr = str.replace("get_payment_status ", '');
    //     var result = await payment_status(newstr);
    //     console.log(str);
    //     console.log(result, "PO func");
    //     return result;
    // }
    // else if (str.includes("get_document_status")) {
    //     let newstr = str.replace("get_document_status ", '');
    //     var result = await document_status(newstr);
    //     console.log(str);
    //     console.log(result, "PO func");
    //     return result;
    // }
    // else if (str.includes("get_service_status")) {
    //     let newstr = str.replace("get_service_status ", '');
    //     var result = await service_status(newstr);
    //     console.log(str);
    //     console.log(result, "PO func");
    //     return result;
    // }
    else {
        return user_response
    }
}

async function invoice_number_supply(str) {
    console.log(str, "Invoice number Supply")
    return new Promise(async resolve => {
        await client.search({
            index: finalConfig.index_ebr,
            body: {
                query: {
                    match: {
                        Invoice_Number: str
                    }
                }
            }
        }).then(body => {
            if (str.length != 30) {
                var res =
                    "Please enter the valid Invoice number"
                resolve(res);
            }
            else if (body.hits.total.value == 0) {
                var res =
                    "Invoice number is not available"
                resolve(res);
            }
            else {
                var body = body.hits.hits[0]._source
                var res =
                    "The status of the EBR number is " + body.Invoice_Status_Desc
                    + " for the PO Number " + body.PO_Number
                console.log(body)
                resolve(res);
            }
        }).catch(err => {
            resolve("Please try again later. Trouble connecting to our database")
        })
    })
}

async function invoice_number_service(str) {
    console.log(str, "Invoice number Service")
    return new Promise(async resolve => {
        await client.search({
            index: finalConfig.index_wo,
            body: {
                query: {
                    match: {
                        Invoice_Number: str
                    }
                }
            }
        }).then(body => {
            if (str.length != 30) {
                var res =
                    "Please enter the valid Invoice number"
                resolve(res);
            }
            else if (body.hits.total.value == 0) {
                var res =
                    "Invoice number is not available"
                resolve(res);
            }
            else {
                var body = body.hits.hits[0]._source
                var res =
                    "The status of the EBR number is " + body.Invoice_Status_Desc
                    + " for the WO Number " + body.WO_Number
                console.log(body)
                resolve(res);
            }
        }).catch(err => {
            resolve("Please try again later. Trouble connecting to our database")
        })
    })
}

async function po_number(str) {
    var response;
    return new Promise(async resolve => {
        await client.search({
            index: finalConfig.index_po,
            body: {
                query: {
                    match: {
                        PO_Number: str
                    }
                }
            }
        }).then(body => {
            if (str.length != 14) {
                var res =
                    "Please enter the valid PO number"
                resolve(res);
            }
            else if (body.hits.total.value == 0) {
                var res =
                    "PO number is not available"
                resolve(res);
            }
            else {
                console.log(body.hits)
                var body = body.hits
                response =
                    "<html> You have total " + body.total.value
                    + " materials in the PO." + "<br>"
            }
        })
        await client.search({
            index: finalConfig.index_ebr,
            body: {
                query: {
                    match: {
                        PO_Number: str
                    }
                }
            }
        }).then(body => {
            if (!str.length != 30 && body.hits.total.value == 0)
                console.log(body.hits)
            var body = body.hits
            var gin_date = new Array();
            var count;
            for (var i = 0; i < body.hits.length; i++) {
                gin_date.push(body.hits[i]._source.GIN_Date);
            }
            console.log(gin_date.toString());
            let is_gin_date_all_null = true;
            let is_gin_date_partial_null = true;
            gin_date.map(res => {
                if (res != "NULL") {
                    is_gin_date_all_null = false;
                } else if (res === "NULL") {
                    is_gin_date_partial_null = false;
                }
            })
            console.log(is_gin_date_all_null + " " + is_gin_date_partial_null);
            if (is_gin_date_all_null) {
                response =
                    response + "You are yet to supply Material(s)"
                resolve(response);
            }
            else if (!is_gin_date_all_null && !is_gin_date_partial_null) {
                response =
                    response + "You have partially supplied your Material(s) on " + max_date(gin_date)
                resolve(response);
            }
            else {
                response =
                    response + "You have supplied your Material(s) on " + max_date(gin_date)
                resolve(response);
            }
        }).catch(err => {
            resolve("Please try again later. Trouble connecting to our database")
        })
    })
}

async function payment_status(str) {
    //     return new Promise(async resolve => {
    //         await client.search({
    //             index: finalConfig.index_ebr,
    //             body: {
    //                 query: {
    //                     match: {
    //                         Invoice_Number: str
    //                     }
    //                 }
    //             }
    //         }).then(body => {
    //             console.log(body)
    //             var body = body.hits
    //             if(body.hits[0]._source.GIN_Date!=null){
    //                 var res =
    //                 "<html> You have total " + body.total.value
    //                 + " materials in the PO." + "<br>"
    //                 + "You have supplied material(s) on " + body.hits[0]._source.GIN_Date + "</html>"
    //                 resolve(res);
    //             }
    //             else{
    //                 var res =
    //                 "You have total " + body.total.value
    //                 + " materials in the PO." + "<br>"
    //                 + "You are yet to supply Material(s)"
    //                 resolve(res);
    //             }
    //         }).catch(err => {
    //              resolve("Please try again later. Trouble connecting to our database")
    //         })
    //     })
}

async function document_status(str) {
    //     return new Promise(async resolve => {
    //         await client.search({
    //             index: finalConfig.index_ebr,
    //             body: {
    //                 query: {
    //                     match: {
    //                         Invoice_Number: str
    //                     }
    //                 }
    //             }
    //         }).then(body => {
    //             console.log(body)
    //             var body = body.hits
    //             if(body.hits[0]._source.GIN_Date!=null){
    //                 var res =
    //                 "<html> You have total " + body.total.value
    //                 + " materials in the PO." + "<br>"
    //                 + "You have supplied material(s) on " + body.hits[0]._source.GIN_Date + "</html>"
    //                 resolve(res);
    //             }
    //             else{
    //                 var res =
    //                 "You have total " + body.total.value
    //                 + " materials in the PO." + "<br>"
    //                 + "You are yet to supply Material(s)"
    //                 resolve(res);
    //             }
    //         }).catch(err => {
    //              resolve("Please try again later. Trouble connecting to our database")
    //         })
    //     })
}

async function service_status(str) {
    //     return new Promise(async resolve => {
    //         await client.search({
    //             index: finalConfig.index_ebr,
    //             body: {
    //                 query: {
    //                     match: {
    //                         Invoice_Number: str
    //                     }
    //                 }
    //             }
    //         }).then(body => {
    //             console.log(body)
    //             var body = body.hits
    //             if(body.hits[0]._source.GIN_Date!=null){
    //                 var res =
    //                 "<html> You have total " + body.total.value
    //                 + " materials in the PO." + "<br>"
    //                 + "You have supplied material(s) on " + body.hits[0]._source.GIN_Date + "</html>"
    //                 resolve(res);
    //             }
    //             else{
    //                 var res =
    //                 "You have total " + body.total.value
    //                 + " materials in the PO." + "<br>"
    //                 + "You are yet to supply Material(s)"
    //                 resolve(res);
    //             }
    //         }).catch(err => {
    //              resolve("Please try again later. Trouble connecting to our database")
    //         })
    //     })
}

app.post('/api/bot', async (req, res) => {

    let langCode = req.header('lang');
    console.log("Lang Code {}", langCode);
    console.log(req.body.message);
    console.log(req.body.sender);

    let rasaResp = {};

    if (langCode === 'en-IN') {
        rasaResp = await rasaservice.getRasaResponse(constants.RASA_EN_URI, req);
        rasaResp.data[0].text = await checkString(rasaResp.data[0].text);
    } else if (langCode === 'hi-IN') {
        rasaResp = await rasaservice.getRasaResponse(constants.RASA_HI_URI, req);
    } else {
        res.status(500).send(JSON.stringify("Language is not Supported...!"));
    }
    if (rasaResp.status == 200) {
        res.status(200).send(JSON.stringify(rasaResp.data));
    } else {
        res.status(500).send(JSON.stringify("Looks like bot is busy doing something else...!"));
    }
});

app.post('/api/bot/texttospeech', async (req, res) => {

    let langCode = req.header('lang');
    // console.log("texttospeech Api Lang Code {}", langCode);

    let texttospeechResponse;

    if (langCode === 'en-IN' || langCode === 'hi-IN') {
        const text = htmlToText.fromString(req.body.textmessage);
        console.log(text);
        texttospeechResponse = await texttospeechservice.textToSpeechConverter(langCode, text)
    } else {
        res.status(500).send(JSON.stringify("Language is not Supported...!"));
    }
    var base64data = Buffer.from(texttospeechResponse, 'binary').toString('base64');
    //console.log("base64data::", base64data);
    // res.setHeader("Content-Type", "audio/mpeg");
    // res.setHeader('Content-Disposition', 'attachment; filename=temp.mp3');
    // res.setHeader('Content-Length', texttospeechResponse.length)
    res.status(200).send(base64data);
});

function max_date(all_dates) {
    var max_dt = all_dates[0],
        max_dtObj = new Date(all_dates[0]);
    all_dates.forEach(function (dt, index) {
        if (new Date(dt) > max_dtObj && dt != 'NULL') {
            max_dt = dt;
            max_dtObj = new Date(dt);
        }
    });
    return max_dt;
}

app.get('/api/bot', (req, res) => {
    res.status(200).send("DIATOZ, a registered Ministry of Micro, Small & Medium Enterprises (M/o MSME) under government of India," +
        " is born to disrupt IT in India with ongoing products like real-estate automation, first of its kind agricultural market " +
        "place, providing high quality software and digital services. Founded by Monuranjan Borgohain, DIATOZ is at head count of " +
        "47 employees within 1 year of its inceptions and growing exponentially to become a power house of talents that produce " +
        "innovative products and services alongside Digital India initiatives. Few of our upcoming innovations in the fields of" +
        " agriculture and real-estate will create revolutions in the way we use technology to solve daily problems faced by billions of common people.")
});

app.listen(finalConfig.node_port, () => {
    console.log("Server running on port " + finalConfig.node_port);
});

module.exports = app;