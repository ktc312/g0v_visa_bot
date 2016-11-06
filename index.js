'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
    res.send('Hello world, I am a chat bot')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === 'visa_bot_token') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})

function CSVToArray( strData, strDelimiter ){
	strDelimiter = (strDelimiter || ",");
        var objPattern = new RegExp(
            (
                "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
                "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
                "([^\"\\" + strDelimiter + "\\r\\n]*))"
            ),
            "gi"
            );
        var arrData = [[]];

        var arrMatches = null;
        while (arrMatches = objPattern.exec( strData )){
            var strMatchedDelimiter = arrMatches[ 1 ];

            if (
                strMatchedDelimiter.length &&
                (strMatchedDelimiter != strDelimiter)
                ){
                arrData.push( [] );
            }
            if (arrMatches[ 2 ]){
                var strMatchedValue = arrMatches[ 2 ].replace(
                    new RegExp( "\"\"", "g" ),
                    "\""
                    );
            } else {
                var strMatchedValue = arrMatches[ 3 ];
            }
            arrData[ arrData.length - 1 ].push( strMatchedValue );
        }
        return( arrData );
    }



app.post('/webhook/', function (req, res) {
    var pathname = window.location.pathname; 
    answer_string = pathname + 'visa_bot_questions_list.csv';
    var test = "'string, duppi, du', 23, lala";
    let answers_list = CSVToArray(test,',')
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id
        if (event.message && event.message.text) {
            let text = event.message.text
            if (text === 'test') {
                sendTextMessage(sender,answers_list.slice(1, 1))
                continue
            }
            sendTextMessage(sender, "哈囉，你好！我是VISA BOT<3 我可以回答你簽證相關的問題唷～ 請使用你的簽證類別當作開頭，再說「我想問......」就可以了！例如「F1, 我想問OPT如何申請？」。 如果不知道要問些什麼，可以問我「你可以做什麼？」" )
        }
    }
    res.sendStatus(200)
})

const token = "EAAJ4Q1IzEp4BAKyS4MFEbfWbzq1zNEjMU83Mggt94JZBAMjNvwLYbQo7LaxenZAqq08lUOJrg2ZBZAOE3HxqDsyLT9NA3OkoVZC5ScrB60mEKjTORjSou5B60incCPZCM5JoUZCM3L9Ts9PWpWgyqA0xwnOtdbJ1qin5UtoqefopgZDZD"

function sendTextMessage(sender, text) {
    let messageData = { text:text }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}