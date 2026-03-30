const mongoose = require("mongoose")

module.exports = mongoose.model("Transaction", new mongoose.Schema({
  listingId: String,
  sellerId: String,
  interested: [String], // 🔥 mehrere Käufer
}))