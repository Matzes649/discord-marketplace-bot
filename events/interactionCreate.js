const {
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js")

const User = require("../models/User")

const tradeRatings = new Map()

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    try {

      const safeReply = async (content) => {
        try {
          if (interaction.replied || interaction.deferred) {
            return await interaction.followUp({ content, flags: 64 })
          } else {
            return await interaction.reply({ content, flags: 64 })
          }
        } catch (err) {
          console.error("❌ Reply Fehler:", err.message)
        }
      }

      // COMMANDS
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName)
        if (!command) return
        try {
          return command.execute(interaction)
        } catch (err) {
          console.error("❌ Command Fehler:", err)
          return safeReply("❌ Fehler beim Command!")
        }
      }

      // 👉 WICHTIG (NEU)
      if (!interaction.isButton() && !interaction.isStringSelectMenu()) return

      const msg = interaction.message

      // ================= 🧠 KÄUFER AUSWAHL =================
      if (interaction.isStringSelectMenu()) {

        if (interaction.customId.startsWith("selectbuyer-")) {

          await interaction.deferReply({ flags: 64 })

          const [, tradeId, sellerId] = interaction.customId.split("-")
          const buyerId = interaction.values[0]

          tradeRatings.set(tradeId, {
            seller: sellerId,
            buyer: buyerId,
            rated: []
          })

          await interaction.editReply(`✅ Verkauf an <@${buyerId}> abgeschlossen!`)

          setTimeout(async () => {
            try {
              if (msg.deletable) await msg.delete()
            } catch {}
          }, 1000)

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`rate-${tradeId}-seller-1`).setLabel("⭐ +1 Verkäufer").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`rate-${tradeId}-seller-neg`).setLabel("⭐ -1 Verkäufer").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`rate-${tradeId}-buyer-1`).setLabel("⭐ +1 Käufer").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`rate-${tradeId}-buyer-neg`).setLabel("⭐ -1 Käufer").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`changebuyer-${tradeId}-${sellerId}`).setLabel("🔄 Anderen Käufer wählen").setStyle(ButtonStyle.Secondary)
          )

          return interaction.channel.send({
            content: `⭐ Bewertung:\nVerkäufer: <@${sellerId}>\nKäufer: <@${buyerId}>`,
            components: [row]
          })
        }
      }

      // ================= BUTTONS =================
      if (!interaction.isButton()) return

      const [action, sellerId] = interaction.customId.split("-")

      // 🟢 INTERESSE
      if (action === "interest") {

        await interaction.deferReply({ flags: 64 })

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

        await interaction.deferReply({ flags: 64 })

        if (interaction.user.id !== sellerId) {
          return interaction.editReply("❌ Nur Verkäufer!")
        }

        return interaction.editReply("🟡 Teil gespeichert!")
      }

      // 🔄 ANDEREN KÄUFER WÄHLEN
      if (action === "changebuyer") {

        await interaction.deferReply({ flags: 64 })

        if (interaction.user.id !== sellerId) {
          return interaction.editReply("❌ Nur Verkäufer!")
        }

        const content = msg.content || ""
        const users = [...content.matchAll(/<@(\d+)>/g)]

        if (!users.length) {
          return interaction.editReply("❌ Keine Interessenten!")
        }

        const menu = new StringSelectMenuBuilder()
          .setCustomId(`selectbuyer-${msg.id}-${sellerId}`)
          .setPlaceholder("👤 Neuen Käufer wählen")

        users.forEach((u, index) => {
          menu.addOptions({
            label: `Käufer ${index + 1}`,
            value: u[1]
          })
        })

        const row = new ActionRowBuilder().addComponents(menu)

        return interaction.editReply({
          content: "🔄 Wähle neuen Käufer:",
          components: [row]
        })
      }

      // 🔴 VERKAUFT (JETZT MIT AUSWAHL)
      if (action === "sold") {

        await interaction.deferReply({ flags: 64 })

        if (interaction.user.id !== sellerId) {
          return interaction.editReply("❌ Nur Verkäufer!")
        }

        const content = msg.content || ""
        const users = [...content.matchAll(/<@(\d+)>/g)]

        if (!users.length) {
          return interaction.editReply("❌ Keine Interessenten!")
        }

        const menu = new StringSelectMenuBuilder()
          .setCustomId(`selectbuyer-${msg.id}-${sellerId}`)
          .setPlaceholder("👤 Käufer auswählen")

        users.forEach((u, index) => {
          menu.addOptions({
            label: `Käufer ${index + 1}`,
            value: u[1]
          })
        })

        const row = new ActionRowBuilder().addComponents(menu)

        return interaction.editReply({
          content: "👤 Wähle den Käufer:",
          components: [row]
        })
      }

      // ⭐ BEWERTUNG
      if (action === "rate") {

        await interaction.deferReply({ flags: 64 })

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

        try {
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
        } catch (err) {
          console.error("❌ Mongo Fehler:", err)
          return interaction.editReply("❌ Datenbank Fehler!")
        }

        trade.rated.push(userId)

        try {

          const message = interaction.message

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

    } catch (err) {
      console.error("❌ GLOBAL Interaction Fehler:", err)

      try {
        if (!interaction.replied) {
          await interaction.reply({ content: "❌ Unerwarteter Fehler!", flags: 64 })
        }
      } catch {}
    }
  }
}