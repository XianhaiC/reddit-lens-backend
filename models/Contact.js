const mongoose = require('mongoose')

const ContactSchema = mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  contentType: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
})

module.exports = mongoose.model('Contacts', ContactSchema)
