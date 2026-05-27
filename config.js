async function getConfig() {
  try {
    const res = await fetch('https://vtx-bot.alwaysdata.net/config')
    return await res.json()
  } catch {
    return {}
  }
}

module.exports = { getConfig }