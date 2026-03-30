const {
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js")

const User = require("../models/User")

const tradeRatings = new Map()

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {

    // COMMANDS
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName)
      if (!command) return
      return command.execute(interaction)
    }

    if (!interaction.isButton()) return

    const [action, sellerId] = interaction.customId.split("-")
    const msg = interaction.message

    // 🟢 INTERESSE
    if (action === "interest") {

      await interaction.deferReply({ ephemeral: true })

      let content = msg.content || "👥 Interessiert:"

      if (content.includes(`<@${interaction.user.id}>`)) {
        return interaction.editReply("❌ Schon eingetragen!")
      }

      await msg.edit({
        content: content + `\n• <@${interaction.user.id}>`
      })

      try {
        const seller = await interaction.client.users.fetch(sellerId)

        await seller.send(
          `📩 Interesse an deinem Angebot!\n\n👤 Käufer: <@${interaction.user.id}>\n👉 Klärt alles per Direktnachricht.`
        )
      } catch {}

      return interaction.editReply("✅ Interesse gesendet!")
    }

    // 🟡 TEIL
    if (action === "partial") {

      await interaction.deferReply({ ephemeral: true })

      if (interaction.user.id !== sellerId) {
        return interaction.editReply("❌ Nur Verkäufer!")
      }

      return interaction.editReply("🟡 Teil gespeichert!")
    }

    // 🔴 VERKAUFT
    if (action === "sold") {

      await interaction.deferReply({ ephemeral: true })

      if (interaction.user.id !== sellerId) {
        return interaction.editReply("❌ Nur Verkäufer!")
      }

      const content = msg.content || ""
      const users = [...content.matchAll(/<@(\d+)>/g)]

      if (!users.length) {
        return interaction.editReply("❌ Kein Käufer!")
      }

      const buyerId = users[0][1]
      const tradeId = msg.id

      tradeRatings.set(tradeId, {
        seller: sellerId,
        buyer: buyerId,
        rated: []
      })

      await interaction.editReply("✅ Verkauf abgeschlossen!")

      setTimeout(async () => {
        try {
          if (msg.deletable) await msg.delete()

          if (msg.reference?.messageId) {
            const original = await msg.channel.messages.fetch(msg.reference.messageId)
            if (original?.deletable) await original.delete()
          }
        } catch {}
      }, 1000)

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`rate-${tradeId}-seller-1`).setLabel("⭐ +1 Verkäufer").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`rate-${tradeId}-seller-neg`).setLabel("⭐ -1 Verkäufer").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`rate-${tradeId}-buyer-1`).setLabel("⭐ +1 Käufer").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`rate-${tradeId}-buyer-neg`).setLabel("⭐ -1 Käufer").setStyle(ButtonStyle.Danger)
      )

      return interaction.channel.send({
        content: `⭐ Bewertung:\nVerkäufer: <@${sellerId}>\nKäufer: <@${buyerId}>`,
        components: [row]
      })
    }

    // ⭐ BEWERTUNG (OPTION 3 FIX)
    if (action === "rate") {

      await interaction.deferReply({ ephemeral: true })

      const [, tradeId, role, value] = interaction.customId.split("-")
      const trade = tradeRatings.get(tradeId)

      if (!trade) return interaction.editReply("❌ Trade nicht gefunden!")

      const userId = interaction.user.id

      if (![trade.seller, trade.buyer].includes(userId)) {
        return interaction.editReply("❌ Nicht beteiligt!")
      }

      if (trade.rated.includes(userId)) {
        return interaction.editReply("❌ Schon bewertet!")
      }

      const targetId = role === "seller" ? trade.seller : trade.buyer

      if (userId === targetId) {
        return interaction.editReply("❌ Selbstbewertung!")
      }

      const rating = value === "1" ? 1 : -1

      let user = await User.findOne({ userId: targetId })
      if (!user) user = await User.create({ userId: targetId })

      if (rating === 1) user.positive++
      else user.negative++

      user.trustScore += rating

      user.trades.push({
        withUser: userId,
        rating
      })

      await user.save()

      trade.rated.push(userId)

      // =========================
      // 🔥 OPTION 3 LOGIK
      // =========================

      try {

        const message = interaction.message

        // 🟡 Einer hat bewertet
        if (trade.rated.length === 1) {

          const newRows = message.components.map(row =>
            new ActionRowBuilder().addComponents(
              row.components.map(btn => {

                if (btn.customId.includes(userId)) {
                  return new ButtonBuilder()
                    .setCustomId(btn.customId)
                    .setLabel(btn.label)
                    .setStyle(btn.style)
                    .setDisabled(true)
                }

                return new ButtonBuilder()
                  .setCustomId(btn.customId)
                  .setLabel(btn.label)
                  .setStyle(btn.style)
              })
            )
          )

          await message.edit({ components: newRows })
        }

        // 🟢 Beide bewertet
        if (trade.rated.length === 2) {

          const newRows = message.components.map(row =>
            new ActionRowBuilder().addComponents(
              row.components.map(btn =>
                new ButtonBuilder()
                  .setCustomId(btn.customId)
                  .setLabel(btn.label)
                  .setStyle(btn.style)
                  .setDisabled(true)
              )
            )
          )

          await message.edit({
            content: "✅ Trade abgeschlossen",
            components: newRows
          })

          tradeRatings.delete(tradeId)
        }

      } catch (err) {
        console.log("Option3 Fehler:", err.message)
      }

      return interaction.editReply("✅ Bewertung gespeichert!")
    }
  }
}