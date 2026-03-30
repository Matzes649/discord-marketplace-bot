require("dotenv").config()

const { Client, Collection, GatewayIntentBits } = require("discord.js")
const mongoose = require("mongoose")
const fs = require("fs")

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

// READY EVENT (optional modern fix)
client.once("clientReady", () => {
  console.log(`✅ Bot online: ${client.user.tag}`)
})

// ✅ DB FIX (WICHTIG → ohne Optionen!)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB verbunden"))
  .catch(err => console.log("❌ DB Fehler:", err))

client.login(process.env.TOKEN)