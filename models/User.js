const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
  userId: String,
  positive: { type: Number, default: 0 },
  negative: { type: Number, default: 0 },
  trustScore: { type: Number, default: 0 },
  trades: [
    {
      withUser: String,
      rating: Number
    }
  ]
})

module.exports = mongoose.model("User", userSchema)