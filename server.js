const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
import Pusher from 'pusher-js'
const app = express()

const filtersRoute = require('./routes/filter')
const Contact = require('./models/Contact')
const Token = require('./models/Token')
require('dotenv').config()

var db

// middleware
app.use(bodyParser.json())
app.set('view engine', 'ejs')

// pusher setup
/*
var pusher = new Pusher({
    appId: '927461',
    key: 'fde444a61c5f34c78026',
    secret: 'cfe03ce621ae7db5ed29',
    cluster: 'us3',
    encrypted: true
});

pusher.trigger('my-channel', 'my-event', {
    "message": "hello world"
});
*/
var pusher = new Pusher("50ed18dd967b455393ed")
var askredditChannel = pusher.subscribe("askreddit")
askredditChannel.bind("new-listing", function(listing) {
  console.log("NEW LISTING")
  console.log(listing)
})

app.post('/contacts', (req, res) => {
  console.log(req.body)
  const contact = new Contact({
    content: req.body.content,
    contentType: req.body.contentType
  })

  contact.save()
    .then(data => {
      res.json(data)
    })
    .catch(err => {
      res.json({ message: err })
    })
})

app.get('/contacts', async (req, res) => {
  const contacts = await Contact.find()
  res.json(contacts)
})

app.get('/tokens', async (req, res) => {
  const tokens = await Token.find()
  res.json(tokens)
})

app.post('/create-filter', async (req, res) => {
  console.log(req.body)
  // search for existing contact
  var query = await Contact.find({ content: req.body.contact.content, contentType: req.body.contact.contentType })
  var existingTokens = [];
  var contact = null;
  console.log(query)
  if (!query.length) {
    // create new contact
    contact = new Contact({
      content: req.body.contact.content,
      contentType: req.body.contact.contentType
    })

    console.log("NEW CONT " + contact)
    // save the contact
    try {
      await contact.save()
    } catch (err) {
      res.json({ message: err.message })
      console.log(err.message)
      return
    }
  }
  else {
    contact = query[0];
    // find existing tokens under this contact
    existingTokens = await Token.find({ contact: contact._id })
    console.log("EXISTING TOKENS " + existingTokens.length)
  }

  // if the contact exists, then search through existing tokens to see if one already exists
  req.body.tokens.forEach(async token => {
    var found = false;
    for (var i = 0; i < existingTokens.length; i++) {
      var existingToken = existingTokens[i]
      if (token.content == existingToken.content
        && req.body.subreddit == existingToken.subreddit
        && token.isRegex == existingToken.isRegex) {
        // update existing token
        existingToken.matchTitle = token.matchTitle
        existingToken.matchBody = token.matchBody
        existingToken.matchFlair = token.matchFlair
        existingToken.includeComments = token.includeComments
        try {
          await existingToken.save()
        } catch (err) {
          res.json({ message: err.message })
          console.log(err.message)
        }
        found = true;
        break;
      }
    }

    if (!found) {
      console.log("Created new token")
      const newToken = new Token({...token,
        subreddit: req.body.subreddit,
        contact: contact._id
      })

      try {
        await newToken.save()
      } catch (err) {
        res.json({ message: err.message })
        console.log(err.message)
        return
      }
    }
  })
})

mongoose.connect('mongodb+srv://'
  + process.env.MONGO_DB_USER + ':'
  + process.env.MONGO_DB_PASS
  + '@cluster0-qbgzj.mongodb.net/reddit-lens?retryWrites=true&w=majority',
  { useNewUrlParser: true },
  () => {
    app.listen(3000, () => {
      console.log('listening on 3000')
    })
  }
)
