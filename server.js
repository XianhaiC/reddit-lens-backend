const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const app = express()

const filtersRoute = require('./routes/filter')
const Contact = require('./models/Contact')
require('dotenv').config()

var db

// middleware
app.use(bodyParser.json())
app.set('view engine', 'ejs')
//TODO decide to use or not
//app.use('/filters', filtersRoute)

// doesnt use mongoose
/*
app.get('/', (req, res) => {
  db.collection('quotes').find().toArray((err, results) => {
    if (err) return console.log(err)
    res.render('index.ejs', { quotes: results })
  })
})

app.post('/quotes', (req, res) => {
  db.collection('quotes').save(req.body, (err, result) => {
    if (err) return console.log(err)
    console.log('saved to database')
    res.redirect('/')
  })
})
*/

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

app.post('/create-filter', async (req, res) => {
  console.log(req.body)
  // search for existing contact
  var query = await Contact.find({ content: req.body.content, contentType: req.body.contentType })
  var existingTokens = [];
  var contact = null;
  console.log(query)
  if (!query.length) {
    // create new contact
    const contact = new Contact({
      content: req.body.contact.content,
      contentType: req.body.contact.contentType
    })

    //TODO yse async await instead
    contact.save()
      .then(data => {
        res.json(data)
      })
      .catch(err => {
        res.json({ message: err })
      })

  }
  else {
    contact = query[0];
    // find existing tokens under this contact
    existingTokens = await Token.find({ contact: contact._id })
  }

  // if the contact exists, then search through existing tokens to see if one already exists
  req.body.tokens.forEach(token => {
    var found == false;
    for (var i = 0; i < existingTokens.length; i++) {
      if (token.content == existingTokens[i].content
        && token.isRegex == existingToken[i].isRegex) {
        // update existing token
        found = true;
        break;
      }
    }

    if (!found) {
      const newToken = new Token({
        content: token.content,
        isRegex: token.isRegex,
        matchTitle: token.matchTitle,
        matchBody: token.matchBody,
        matchFlair: token.matchFlair,
        includeComments: token.includeComments,
        contact: contact._id
      })

      contact.save()
        .then(data => {
          res.json(data)
        })
        .catch(err => {
          res.json({ message: err })
        })

    }
  })

  // create new token entry for each in the token list
  // set a token's contact foreign id afterwards
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
