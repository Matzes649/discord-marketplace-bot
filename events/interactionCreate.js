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

      if (!interaction.isButton() && !interaction.isStringSelectMenu()) return 

      // =========================
      // 🧠 SELECT BUYER
      // =========================
      if (interaction.isStringSelectMenu()) {

        const [type, tradeId, sellerId] = interaction.customId.split("-")

        if (type !== "selectBuyer") return

        if (interaction.user.id !== sellerId) {
          return interaction.reply({ content: "❌ Nur Verkäufer!", flags: 64 })
        }

        const buyerId = interaction.values[0]
        const msg = await interaction.channel.messages.fetch(tradeId)

        tradeRatings.set(tradeId, {
          seller: sellerId,
          buyer: buyerId,
          rated: []
        })

        await interaction.update({
          content: "✅ Käufer ausgewählt & Verkauf abgeschlossen!",
          components: []
        })

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

      // =========================
      // BUTTONS
      // =========================
      const [action, sellerId] = interaction.customId.split("-") 
      const msg = interaction.message 

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

      // 🔴 VERKAUFT (NEU MIT DROPDOWN)
      if (action === "sold") { 

        if (interaction.user.id !== sellerId) {
          return interaction.reply({ content: "❌ Nur Verkäufer!", flags: 64 })
        }

        const content = msg.content || ""
        const users = [...content.matchAll(/<@(\d+)>/g)]

        if (!users.length) {
          return interaction.reply({ content: "❌ Kein Käufer!", flags: 64 })
        }

        const options = await Promise.all(users.map(async (u) => {
          try {
            const user = await interaction.client.users.fetch(u[1])
            return {
              label: user.username,
              value: user.id
            }
          } catch {
            return null
          }
        }))

        const validOptions = options.filter(Boolean)

        const select = new StringSelectMenuBuilder()
          .setCustomId(`selectBuyer-${msg.id}-${sellerId}`)
          .setPlaceholder("Wähle den Käufer aus")
          .addOptions(validOptions)

        const row = new ActionRowBuilder().addComponents(select)

        return interaction.reply({
          content: "👤 Wähle den Käufer:",
          components: [row],
          flags: 64
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