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
    var test = " test1, test2, test3, test4";
    var answers_list = CSVToArray(test,',')
    let answered = false;
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id
        if (event.message && event.message.text) {
            let text = event.message.text
            if (text === 'test') {
                sendTextMessage(sender,answers_list.toString());
                answered = true;
                continue
            }
            if (text.toLowerCase().includes('bye') || text.includes('謝')|| text.includes('掰') ){
            	sendTextMessage(sender,"謝謝你！下次還有關於簽證的問題，歡迎再來找我唷<3");
                answered = true;
                continue
            }
            if (text.includes('你可以做什麼')){
            	sendTextMessage(sender, "我知道各式各樣關於簽證的問題，想知道關於OPT的資訊嗎？你可以試試看對我說「我想問OPT」，或是其他簽證類別，像是F1、F2、J1、J2、M1、M2、H1B等等，我會盡力找資料給你哦～");
            	answered = true;
            	continue
            }
            sendTextMessage(sender, "哈囉，你好！我是VISA BOT<3 我可以回答你簽證相關的問題唷～ 請使用你的簽證類別當作開頭，再說「我想問......」就可以了！例如「F1, 我想問OPT如何申請？」。 如果不知道要問些什麼，可以問我「你可以做什麼？」" )
        }
        if(!answered){
             sendTextMessage(sender, "我不太清楚你在說什麼哦～ 請先告訴我你想問的簽證類別，再說「我想問......」就可以了！例如「OPT, 我想問什麼是OPT？」，或輸入「幫助」。 如果不知道要問些什麼，可以問我「你可以做什麼？」");
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