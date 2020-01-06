const mongoose = require('mongoose')

const TokenSchema = mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  isRegex: {
    type: Boolean,
    required: true
  },
  matchTitle: {
    type: Boolean,
    required: true
  },
  matchBody: {
    type: Boolean,
    required: true
  },
  matchFlair: {
    type: Boolean,
    required: true
  },
  includeComments: {
    type: Boolean,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
})

module.exports = mongoose.model('Tokens', TokenSchema)
