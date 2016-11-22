'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const request = require('request');
const app = express();
const Wit = require('node-wit').Wit;
const log = require('node-wit').log;
const WIT_TOKEN = process.env.WIT_TOKEN;
const token = process.env.FB_TOKEN;

app.set('port', (process.env.PORT || 5000));

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

// ----------------------------------------------------------------------------
// Wit.ai bot specific code

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
const sessions = {};

const findOrCreateSession = (fbid) => {
  let sessionId;
  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(k => {
    if (sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k;
    }
  });
  if (!sessionId) {
    // No session found for user fbid, let's create a new one
    sessionId = new Date().toISOString();
    sessions[sessionId] = {fbid: fbid, context: {}};
  }
  return sessionId;
};

const fbMessage = (id, text, quickReplies) => {
  console.log(quickReplies);
  const body = JSON.stringify({
    recipient: { id },
    message: { 
        text, 
        quick_replies: []
    },
  });
  const qs = 'access_token=' + encodeURIComponent(token);
  return fetch('https://graph.facebook.com/me/messages?' + qs, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body,
  })
  .then(rsp => rsp.json())
  .then(json => {
    if (json.error && json.error.message) {
      throw new Error(json.error.message);
    }
    return json;
  });
};

// Our bot actions
const actions = {
  send(sender, message) {

    const sessionId = sender.sessionId;
    const text = message.text;
    const quickReplies = message.quickreplies;
    // Our bot has something to say!
    // Let's retrieve the Facebook user whose session belongs to
    const recipientId = sessions[sessionId].fbid;
    if (recipientId) {
      // Yay, we found our recipient!
      // Let's forward our bot response to her.
      // We return a promise to let our bot know when we're done sending
      return fbMessage(recipientId, text, quickReplies)
      .then(() => null)
      .catch((err) => {
        console.error(
          'Oops! An error occurred while forwarding the response to',
          recipientId,
          ':',
          err.stack || err
        );
      });
    } else {
      console.error('Oops! Couldn\'t find user for session:', sessionId);
      // Giving the wheel back to our bot
      return Promise.resolve()
    }
  }
  // You should implement your custom actions here
  // See https://wit.ai/docs/quickstart
};

// Setting up our bot
const wit = new Wit({
  accessToken: WIT_TOKEN,
  actions,
  logger: new log.Logger(log.INFO)
});

app.post('/webhook/', function (req, res) {
    // var test = " test1, test2, test3, test4";
    // var answers_list = CSVToArray(test,',')
    // let answered = false;
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id
        if (event.message && event.message.text) {

            // We retrieve the user's current session, or create one if it doesn't exist
            // This is needed for our bot to figure out the conversation history
            const sessionId = findOrCreateSession(sender);

            // We retrieve the message content
            const text = event.message.text;
            const attachments = event.message.attachments;

            if (attachments) {
                // We received an attachment
                // Let's reply with an automatic message
                fbMessage(sender, 'Sorry I can only process text messages for now.')
                .catch(console.error);
              } else if (text) {
                // We received a text message

                // Let's forward the message to the Wit.ai Bot Engine
                // This will run all actions until our bot has nothing left to do
                wit.runActions(
                  sessionId, // the user's current session
                  text, // the user's message
                  sessions[sessionId].context // the user's current session state
                ).then((context) => {
                  // Our bot did everything it has to do.
                  // Now it's waiting for further messages to proceed.
                  console.log('Waiting for next user messages');

                  // Based on the session state, you might want to reset the session.
                  // This depends heavily on the business logic of your bot.
                  // Example:
                  // if (context['done']) {
                  //   delete sessions[sessionId];
                  // }

                  // Updating the user's current session state
                  sessions[sessionId].context = context;
                })
                .catch((err) => {
                      console.error('Oops! Got an error from Wit: ', err.stack || err);
                })
            }
            // let text = event.message.text
            // if (text === 'test') {
            //     sendTextMessage(sender,answers_list.toString());
            //     answered = true;
            //     continue
            // }
            // if (text.includes('哈囉') || text.includes('嗨') || text.toLowerCase().includes('hi') || text.toLowerCase().includes('hello')){
            // 	sendTextMessage(sender, "哈囉，你好！我是VISA BOT<3 我可以回答你簽證相關的問題唷～ 請使用你的簽證類別當作開頭，再說「我想問......」就可以了！例如「F1, 我想問OPT如何申請？」。 如果不知道要問些什麼，可以問我「你可以做什麼？」" );
            // 	answered = true;
            //     continue
            // }
            // if (text.toLowerCase().includes('bye') || text.includes('謝')|| text.includes('掰') ){
            // 	sendTextMessage(sender,"謝謝你！下次還有關於簽證的問題，歡迎再來找我唷<3");
            //     answered = true;
            //     continue
            // }
            // if (text.includes('你可以做什麼')){
            // 	sendTextMessage(sender, "我知道各式各樣關於簽證的問題，想知道關於OPT的資訊嗎？你可以試試看對我說「我想問OPT」，或是其他簽證類別，像是F1、F2、J1、J2、M1、M2、H1B等等，我會盡力找資料給你哦～");
            // 	answered = true;
            // 	continue
            // }
            // else{
            // 	sendTextMessage(sender, "我不太清楚你在說什麼哦～ 請先告訴我你想問的簽證類別，再說「我想問......」就可以了！例如「OPT, 我想問什麼是OPT？」，或輸入「幫助」。 如果不知道要問些什麼，可以問我「你可以做什麼？」");
            // }
        }
    }
    res.sendStatus(200)
})
