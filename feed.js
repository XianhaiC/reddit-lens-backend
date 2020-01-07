const Token = require('./models/Token')

var functions = {}

functions.init = async (pusher) => {
  //TODO figure out what to bind the new subscription to
  // query for all relevant subreddits here.
  const subreddits = await Token.distinct('subreddit')
  console.log(subreddits)

  subreddits.forEach(subreddit => pusher.subscribe(subreddit))
}

module.exports = functions
