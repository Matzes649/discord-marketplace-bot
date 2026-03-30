require("dotenv").config()

const { REST, Routes } = require("discord.js")
const fs = require("fs")

const commands = []
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"))

for (const file of commandFiles) {
  const command = require(`./commands/${file}`) // ✅ FIX
  commands.push(command.data.toJSON())
}

// ✅ REST Setup
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN)

;(async () => {
  try {
    console.log("🧹 Lösche alte Commands...")

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: [] }
    )

    console.log("✅ Alte Commands gelöscht")

    console.log("🚀 Lade neue Commands...")

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    )

    console.log("✅ Neue Commands registriert")

  } catch (error) {
    console.error("Deploy Fehler:", error)
  }
})()