module.exports = async (guild, userId, score) => {
  try {
    const member = await guild.members.fetch(userId)

    if (score >= 15) {
      await member.roles.add(process.env.ELITE_ROLE_ID).catch(()=>{})
      await member.roles.remove(process.env.TRUSTED_ROLE_ID).catch(()=>{})
    }
    else if (score >= 5) {
      await member.roles.add(process.env.TRUSTED_ROLE_ID).catch(()=>{})
      await member.roles.remove(process.env.ELITE_ROLE_ID).catch(()=>{})
    }
    else {
      await member.roles.remove(process.env.TRUSTED_ROLE_ID).catch(()=>{})
      await member.roles.remove(process.env.ELITE_ROLE_ID).catch(()=>{})
    }

  } catch {}
}