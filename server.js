const express = require('express')
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient
const app = express()

require('dotenv').config()

var db

// middleware
app.use(bodyParser.urlencoded({extended: true}))
app.set('view engine', 'ejs')


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

MongoClient.connect('mongodb+srv://'
  + process.env.MONGO_DB_USER + ':'
  + process.env.MONGO_DB_PASS
  + '@cluster0-qbgzj.mongodb.net/test?retryWrites=true&w=majority',
  (err, client) => {
    if (err) return console.log(err)
    db = client.db(process.env.MONGO_DB_NAME)

    app.listen(3000, () => {
      console.log('listening on 3000')
    })
  }
)
