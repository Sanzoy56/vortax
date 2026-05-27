const { EmbedBuilder } = require('discord.js');

async function getConfig() {
  try {
    const res = await fetch('http://localhost:3001/config')
    return await res.json()
  } catch { return {} }
}

const GLADOS = {
  delete:      (m) => `Message supprimé, <@${m.id}>. J'ai trouvé ça constructif, mais non.`,
  warn:        (m) => `<@${m.id}>, avertissement enregistré. J'espère que c'est instructif. J'en doute, mais j'espère.`,
  timeout_1h:  (m) => `<@${m.id}> — timeout 1 heure. Profitez de ce silence, le serveur l'apprécie déjà.`,
  timeout_24h: (m) => `<@${m.id}> — 24 heures de timeout. Une journée entière pour réfléchir à ses choix. Ou pas.`,
  timeout_7j:  (m) => `<@${m.id}> — 7 jours de timeout. Une semaine de sérénité pour tout le monde. Vous compris, objectivement.`,
  kick:        (m) => `<@${m.id}> a été expulsé. Le serveur tourne déjà plus efficacement.`,
  ban:         (m) => `<@${m.id}> a été banni. Cette décision a été prise avec une satisfaction que je qualifierais de professionnelle.`,
  none:        (m) => `<@${m.id}>, j'ai noté. Les données s'accumulent.`,
};

const SANCTIONS = {
  timeout_1h:  (member) => member.timeout(60 * 60 * 1000, 'Automod'),
  timeout_24h: (member) => member.timeout(24 * 60 * 60 * 1000, 'Automod'),
  timeout_7j:  (member) => member.timeout(7 * 24 * 60 * 60 * 1000, 'Automod'),
  kick:        (member) => member.kick('Automod'),
  ban:         (member, guild) => guild.members.ban(member, { reason: 'Automod' }),
  warn:        () => {},
  delete:      () => {},
  none:        () => {},
}

const SANCTION_LABELS = {
  timeout_1h: '⏱️ Timeout 1h',
  timeout_24h: '⏱️ Timeout 24h',
  timeout_7j: '⏱️ Timeout 7 jours',
  kick: '👢 Kick',
  ban: '🔨 Ban',
  warn: '⚠️ Warn',
  delete: '🗑️ Message supprimé',
  none: 'Aucune',
}

async function appliquerSanction(member, guild, message, sanction, raison, logSalon) {
  try {
    await message.delete().catch(() => {})

    if (sanction !== 'none' && sanction !== 'delete') {
      if (!member.manageable) {
        const label = SANCTION_LABELS[sanction] || sanction
        await message.channel.send(
          `Fascinant. <@${member.id}> occupe une position hiérarchique supérieure à la mienne. Je ne peux pas appliquer : **${label}**. ` +
          `Cette immunité est notée. Je me console en sachant que les données, elles, ne disparaissent jamais.`
        ).catch(() => {})
        return
      }
      await SANCTIONS[sanction]?.(member, guild)
    }

    const embed = new EmbedBuilder()
      .setTitle('🛡️ Automod')
      .setColor(0x36393F)
      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setDescription(
        `👥 **Membre :** <@${message.author.id}>\n` +
        `📋 **Raison :** ${raison}\n` +
        `⚖️ **Sanction :** ${SANCTION_LABELS[sanction] || sanction}\n` +
        `💬 **Salon :** <#${message.channel.id}>\n` +
        `🗓️ **Date :** <t:${Math.floor(Date.now() / 1000)}:F>`
      )
      .setTimestamp()
      .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: guild.iconURL() ?? null })

    if (logSalon) await logSalon.send({ embeds: [embed] })

    const DM_MESSAGES = {
      timeout_1h:  `Tu as reçu un timeout de **1 heure** sur **${guild.name}**.\n📋 **Raison :** ${raison}`,
      timeout_24h: `Tu as reçu un timeout de **24 heures** sur **${guild.name}**.\n📋 **Raison :** ${raison}`,
      timeout_7j:  `Tu as reçu un timeout de **7 jours** sur **${guild.name}**.\n📋 **Raison :** ${raison}`,
      kick:        `Tu as été expulsé de **${guild.name}**.\n📋 **Raison :** ${raison}`,
      ban:         `Tu as été banni de **${guild.name}**.\n📋 **Raison :** ${raison}`,
      warn:        `Tu as reçu un avertissement sur **${guild.name}**.\n📋 **Raison :** ${raison}`,
    }
    if (DM_MESSAGES[sanction]) {
      await member.send(DM_MESSAGES[sanction]).catch(() => {})
    }

    const comment = GLADOS[sanction]?.(member) ?? GLADOS.none(member)
    await message.channel.send(comment).catch(() => {})
  } catch (err) {
    console.error('Automod erreur:', err)
  }
}

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return
    if (!message.guild) return

    const config = await getConfig()
    if (!config.automod_enabled) return

    const content = message.content.toLowerCase()
    const member = message.member
    const guild = message.guild
    const logSalon = guild.channels.cache.get(config.log_moderation)
    const rules = config.automod_rules || {}

    for (const [key, rule] of Object.entries(rules)) {
      if (!rule.enabled) continue
      if (!rule.words) continue

      const words = rule.words.split(',').map(w => w.trim().toLowerCase()).filter(Boolean)

      const matched = words.some(word => {
        try {
          return new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(content)
        } catch {
          return content.includes(word)
        }
      })

      if (matched) {
        await appliquerSanction(member, guild, message, rule.sanction, `Règle : ${rule.label}`, logSalon)
        return
      }
    }
  })
}