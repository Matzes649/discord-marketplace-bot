const { 
  Events, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require("discord.js")

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    if (!message || message.author.bot || !message.guild) return

    // ================= 🔤 NORMALIZE =================
    const normalize = (text) => {
      return text
        .toLowerCase()
        .replace(/[^a-z0-9äöüß]/gi, "")
    }

    const normalizedContent = normalize(message.content)

    // ================= 🚫 BAD WORD FILTER =================
    const badWords = [
      "hurensohn","arschloch","fickdich","fuckyou","bastard",
      "behindert","idiot","opfer","spast","verpissdich",
      "haltdiefresse","lappen",
    ]

    const detected = badWords.find(word => 
      normalizedContent.includes(word)
    )

    const isCapsSpam =
      message.content.length > 10 &&
      message.content === message.content.toUpperCase()

    if (detected || isCapsSpam) {
      try { await message.delete() } catch {}

      const embed = {
        color: 0xff0000,
        title: "⚠️ Verwarnung",
        description: `⚠️ <@${message.author.id}>, bitte keine Beleidigungen!\nAchte auf einen respektvollen Umgangston.`,
        fields: [{
          name: "📝 Grund",
          value: detected ? detected : "Caps Spam",
          inline: true
        }],
        image: { url: "attachment://warning.jpg" },
        timestamp: new Date()
      }

      await message.channel.send({
        embeds: [embed],
        files: [{
          attachment: "./images/warning.jpg",
          name: "warning.jpg"
        }]
      })

      return
    }

    // ================= 🚫 BUY ONLY ROLE =================
    const BUY_ONLY_ROLE_ID = "1486148513573376132"

    const saleKeywords = [
      "verkaufe","verkauf","biete","angebote",
      "zu verkaufen","selling","wts","vb","€"
    ]

    const member = message.member || 
      await message.guild.members.fetch(message.author.id).catch(() => null)

    if (!member) return

    if (member.roles.cache.has(BUY_ONLY_ROLE_ID)) {
      const isSelling = saleKeywords.some(word => 
        normalizedContent.includes(word)
      )

      if (isSelling) {
        try { await message.delete() } catch {}

        const embed = {
          color: 0x00ff00,
          title: "👀 Fehler: Verkaufsversuch",
          description: `👀 <@${message.author.id}> wurde schön beim Verkauf erwischt!
❗ Lass es lieber sein.

➡️ Dafür brauchst du erstmal eine Freischaltung.
👉 Bitte wende dich an die Admins 🤓`,
          image: { url: "attachment://warning.jpg" },
          timestamp: new Date()
        }

        await message.channel.send({
          embeds: [embed],
          files: [{
            attachment: "./images/warning.jpg",
            name: "warning.jpg"
          }]
        })

        return
      }
    }

    // ================= 🛒 MARKETPLACE BUTTONS =================
    const allowedChannels = [
      "1486067292625174681",
      "1486070036199244060",
      "1487913271448178890" // ✅ SHOP
    ] 

    if (!allowedChannels.includes(message.channel.id)) return

    const isSale = [
      "1486067292625174681", // Verkauf
      "1487913271448178890"  // Shop
    ].includes(message.channel.id)

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`interest-${message.author.id}`)
        .setLabel("🟢 Interesse")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`partial-${message.author.id}`)
        .setLabel(isSale ? "🟡 Teil verkauft" : "🟡 Teil getauscht")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId(`sold-${message.author.id}`)
        .setLabel(isSale ? "🔒 Verkauft" : "🔁 Getauscht")
        .setStyle(ButtonStyle.Danger)
    )

    await message.reply({ components: [row] })
  }
}