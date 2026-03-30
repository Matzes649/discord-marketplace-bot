const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const User = require("../models/User")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profil")
    .setDescription("Profil anzeigen")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("Welcher User?")
        .setRequired(false)
    ),

  async execute(interaction) {

    await interaction.deferReply()

    const target = interaction.options.getUser("user") || interaction.user

    let data = await User.findOne({ userId: target.id })

    if (!data) {
      data = await User.create({
        userId: target.id,
        trustScore: 0,
        totalStars: 0,
        starCount: 0,
        positive: 0,
        negative: 0,
        trades: []
      })
    }

    // 🏆 RANG
    let rank = "🔴 Anfänger"
    if (data.trustScore >= 10) rank = "🟢 Trusted"
    if (data.trustScore >= 25) rank = "🔵 Elite"

    // 📦 TRADES
    let trades = "Keine Trades"

    if (data.trades.length > 0) {
      const lastTrades = data.trades.slice(-5).reverse()

      trades = lastTrades.map(t => {
        const sign = t.rating > 0 ? "(+1)" : "(-1)"
        return `• <@${t.withUser}> ${sign}`
      }).join("\n")
    }

    // 🎨 EMBED
    const embed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setTitle(`📊 Profil von ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        {
          name: "🏆 Rang",
          value: `${rank}\n\n`, // 👈 sauberer Abstand nach Rang
          inline: false
        },
        {
          name: "📊 TrustScore",
          value: `${data.trustScore}`,
          inline: true
        },
        {
          name: "👍 Positiv",
          value: `${data.positive}`,
          inline: true
        },
        {
          name: "👎 Negativ",
          value: `${data.negative}`,
          inline: true
        },
        {
          name: "📦 Letzte Trades",
          value: trades,
          inline: false
        }
      )

    await interaction.editReply({
      embeds: [embed]
    })
  }
}