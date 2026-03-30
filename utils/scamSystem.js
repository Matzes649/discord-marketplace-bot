module.exports = async (member, userData, channel) => {
  try {

    if (!member || !userData) return

    if ((userData.reports || 0) >= 3) {

      await member.timeout(24 * 60 * 60 * 1000, "Scam Verdacht").catch(() => {})

      if (channel) {
        channel.send(`🚨 Scam Alert: <@${member.id}> wurde temporär eingeschränkt.`).catch(() => {})
      }
    }

  } catch (err) {
    console.log("Scam Error:", err.message)
  }
}