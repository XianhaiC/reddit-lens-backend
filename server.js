import Pusher from 'pusher-js'
import { InboxStream, CommentStream, SubmissionStream } from "snoostorm";

const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const snoowrap = require('snoowrap')
const nodemailer = require('nodemailer')
const rockets = require('rockets')
const app = express()

const helpers = require('./helpers')
const filtersRoute = require('./routes/filter')
const Contact = require('./models/Contact')
const Token = require('./models/Token')
require('dotenv').config()

var db

// middleware
app.use(bodyParser.json())
app.set('view engine', 'ejs')

// pusher setup
const pusher = new Pusher("50ed18dd967b455393ed")
/*
var askredditChannel = pusher.subscribe("tifu")
askredditChannel.bind("new-listing", function(submission) {
  console.log(submission.selftext)
  handleSubmission(submission)
})
*/

// rockets setup
const feed = new rockets()


// setup reddit api
const reddit = new snoowrap({
  userAgent: 'reddit-lens:v1 (by u/Soap153)',
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  refreshToken: process.env.REDDIT_REFRESH_TOKEN,
})

// setup mail transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USERNAME,
      pass: process.env.GMAIL_PASSWORD,
    }
})

// create an init function that binds the server to subreddits for existing tokens
// in the database. In case the server must restart, this is necessary

// modify the create filter function to also bind to a new subreddit should the 
// new tokens pertains to one

// create a callback that handles new post submissions. perform the following
// query for all tokens that subscribe to that subreddit
// for each token:
//      check if it matches the content, considering whichever flags it has set
//      (match title, body, etc)
//      If a match is made, then fetch the coresponding contact
//      If the contact is email, send email via whatever // TODO
//      If the contact is reddit username, figure out how to send reddit pm // TODO

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
  // input sanitation
  req.body.subreddit = req.body.subreddit.toLowerCase()

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
          return
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
    res.json({ok:true});
  })

  // now create the subreddit stream
  const submissions = new SubmissionStream(reddit,
    { subreddit: req.body.subreddit, limit: 5, pollTime: 1000 })
  submissions.on("item", (sub) => {
    console.log(sub.selftext)
    handleSubmission(sub)
  })
})

const init = async () => {
  console.log("hey")
  //TODO figure out what to bind the new subscription to
  // query for all relevant subreddits here.
  const subreddits = await Token.distinct('subreddit')
  console.log(subreddits)

  //subreddits.forEach(subreddit => pusher.subscribe(subreddit).bind("new-listing", handleListing))
  /*
  subreddits.forEach(subreddit => {
    console.log("INIT SUB " + subreddit)
    const submissions = new SubmissionStream(reddit,
      { subreddit: subreddit, limit: 5, pollTime: 1000 })
    submissions.on("item", (sub) => {
      console.log(sub.selftext)
      handleSubmission(sub)
    })
  })
  */
  const include = {
    subreddit: subreddits,
  }
  feed.subscribe('posts', include)
    /*
  subreddits.forEach(subreddit => {
    const subscription = pusher.subscribe(subreddit)
    subscription.bind("new-listing", function(submission) {
      console.log(submission.selftext)
      handleSubmission(submission)
    })
  })
    */
}

const handleSubmission = async (submission) => {
  console.log(submission);
  return;
  // gather all tokens pertaining to the subreddit
  const tokens = await Token.find({ subreddit: submission.subreddit.toLowerCase() }).populate('contact')

  tokens.forEach(token => {
    // if isRegex, then perform a regex match with whichever fields specified
    const contact = token.contact
    console.log("CONT " + contact)
    console.log("CHECKING FOR TOKEN " + contact.content)
    if (token.isRegex) {
      console.log("REGEX " + token.content)
      var matched = false;
      if (token.matchTitle
        && submission.title.match(token.content)) {
          matched = true;
          console.log("Match title")
          console.log(submission.title)
      }

      if (token.matchBody && !matched) {
        // TODO: use the following for less newlines in the selftext
        //const body = await reddit.getSubmission(submission.id).selftext

        if (helpers.exists(submission.selftext) && submission.selftext.match(token.content)) {
          matched = true
          console.log("Match body")
          console.log(submission.selftext)
        }
      }

      if (token.matchFlair && !matched) {
        if (helpers.exists(submission.link_flair_text) && submission.link_flair_text.match(token.content)) {
          matched = true
          console.log("Match flair")
          console.log(submission.link_flair_text)
        }
      }

      if (matched) {
        switch (token.contact.contentType) {
          case 0:
            console.log("SENDING EMAIL TO " + contact.content)
            // email
            const mailOptions = {
              from: process.env.GMAIL_USERNAME,
              to: token.contact.content,
              subject: 'New submissions in ' + submission.subreddit_name_prefixed,
              text: 'Link to post ' + submission.url,
            }

            transporter.sendMail(mailOptions, function(err, info) {
              if (err) console.log(err)
              else console.log('Email sent: ' + info.response)
            })
            break
          case 1:
            // reddit pm
            break;
          case 2:
            // sms
            break;
          default:
            break;
        }
      }
    }
    else {
    }
  })

}

// bind rockets callbacks
feed.on('connect', function() { return })
feed.on('post', handleSubmission)

mongoose.connect('mongodb+srv://'
  + process.env.MONGO_DB_USER + ':'
  + process.env.MONGO_DB_PASS
  + '@cluster0-qbgzj.mongodb.net/reddit-lens?retryWrites=true&w=majority',
  { useNewUrlParser: true },
  () => {
    app.listen(3000, async () => {
      console.log('listening on 3000')
      console.log("PUSH " + pusher)
      feed.connect()
    })
  }
)
