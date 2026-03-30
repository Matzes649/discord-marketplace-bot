const Transaction = require("../models/transaction")

// ❌ Diese Channels werden NICHT gelöscht
const EXCLUDED_CHANNELS = [
  "1487913271448178890" // 🛒 Dein Shop Channel
]

module.exports = async (client) => {
  setInterval(async () => {
    const now = Date.now()

    const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000

    const listings = await Transaction.find()

    for (const listing of listings) {

      if (!listing.createdAt) continue

      // 🔥 SHOP IGNORIEREN
      if (EXCLUDED_CHANNELS.includes(listing.channelId)) continue

      // ⏳ Nur alte Listings löschen
      if (now - listing.createdAt > FIVE_DAYS) {

        try {
          const channel = await client.channels.fetch(listing.channelId)
          const msg = await channel.messages.fetch(listing.listingId)

          if (msg) await msg.delete()

          await Transaction.deleteOne({ listingId: listing.listingId })

        } catch (err) {
          console.log("Cleanup Fehler:", err.message)
        }
      }
    }

  }, 60 * 60 * 1000) // jede Stunde prüfen
}