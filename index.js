require("dotenv").config()

const { Client, Collection, GatewayIntentBits } = require("discord.js")
const mongoose = require("mongoose")
const fs = require("fs")

// ================= GLOBAL ERROR HANDLER =================

const ERROR_CHANNEL_ID = "1488174153428111502"

// Uncaught Errors (crash → restart durch Railway)
process.on("uncaughtException", async (err) => {
  console.error("❌ Uncaught Exception:", err)

  try {
    const channel = await client.channels.fetch(ERROR_CHANNEL_ID)
    if (channel) {
      channel.send("❌ Bot Fehler! Schau in Railway Logs.")
    }
  } catch {}

  process.exit(1)
})

// Promise Errors
process.on("unhandledRejection", async (reason) => {
  console.error("❌ Unhandled Rejection:", reason)

  try {
    const channel = await client.channels.fetch(ERROR_CHANNEL_ID)
    if (channel) {
      channel.send("❌ Bot Fehler! Schau in Railway Logs.")
    }
  } catch {}

  process.exit(1)
})

// Warnings (optional)
process.on("warning", (warning) => {
  console.warn("⚠️ Warning:", warning)
})


// ❗ ENV CHECK (wichtig für Railway)
if (!process.env.TOKEN) {
  console.error("❌ TOKEN fehlt!")
  process.exit(1)
}

if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI fehlt!")
  process.exit(1)
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
})

client.commands = new Collection()

// COMMANDS
const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"))

for (const file of commandFiles) {
  const command = require(`./commands/${file}`)
  client.commands.set(command.data.name, command)
  console.log("Command geladen:", command.data.name)
}

// EVENTS (FIX für once Events)
const eventFiles = fs.readdirSync("./events").filter(f => f.endsWith(".js"))

for (const file of eventFiles) {
  const event = require(`./events/${file}`)

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client))
  } else {
    client.on(event.name, (...args) => event.execute(...args, client))
  }

  console.log("Event geladen:", event.name)
}

// READY EVENT
client.once("clientReady", () => {
  console.log(`✅ Bot online: ${client.user.tag}`)
})

// DB CONNECT
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB verbunden"))
  .catch(err => {
    console.log("❌ DB Fehler:", err)
    process.exit(1)
  })

client.login(process.env.TOKEN)