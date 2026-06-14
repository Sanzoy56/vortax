const { EmbedBuilder } = require('discord.js');
const { sendLogCard } = require('../levels/logCard');

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

    if (logSalon) await sendLogCard(logSalon, {
      title: 'Automod',
      accent: '#f97316',
      avatarURL: message.author.displayAvatarURL({ dynamic: true }),
      rows: [
        { label: 'Membre', value: `${message.author.tag} (${message.author.id})` },
        { label: 'Sanction', value: SANCTION_LABELS[sanction] || sanction },
        { label: 'Salon', value: message.channel.name },
        { label: 'Date', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) },
      ],
      longText: { label: 'Raison', value: raison },
      footerExtra: `ID: ${message.author.id}`,
    })

    const DM_CONFIGS = {
      timeout_1h:  { title: '🔇 Vous avez été mis en timeout', color: 0x5865F2, desc: `Vous avez été mis en timeout sur **${guild.name}**.`, dur: '1 heure',   ms: 60 * 60 * 1000 },
      timeout_24h: { title: '🔇 Vous avez été mis en timeout', color: 0x5865F2, desc: `Vous avez été mis en timeout sur **${guild.name}**.`, dur: '24 heures', ms: 24 * 60 * 60 * 1000 },
      timeout_7j:  { title: '🔇 Vous avez été mis en timeout', color: 0x5865F2, desc: `Vous avez été mis en timeout sur **${guild.name}**.`, dur: '7 jours',   ms: 7 * 24 * 60 * 60 * 1000 },
      kick:        { title: '👢 Vous avez été expulsé',         color: 0xFEE75C, desc: `Vous avez été expulsé de **${guild.name}**.` },
      ban:         { title: '🔨 Vous avez été banni',           color: 0xED4245, desc: `Vous avez été banni de **${guild.name}**.` },
      warn:        { title: '⚠️ Vous avez reçu un avertissement', color: 0xFEE75C, desc: `Vous avez reçu un avertissement sur **${guild.name}**.` },
    }
    const dmCfg = DM_CONFIGS[sanction]
    if (dmCfg) {
      const nowTs = Math.floor(Date.now() / 1000)
      const dmEmbed = new EmbedBuilder()
        .setTitle(dmCfg.title)
        .setColor(dmCfg.color)
        .setDescription(dmCfg.desc)
        .setThumbnail(guild.iconURL({ dynamic: true }) ?? null)
        .setTimestamp()
      if (dmCfg.dur) {
        const unmuteTs = Math.floor((Date.now() + dmCfg.ms) / 1000)
        dmEmbed.addFields(
          { name: '⏳ Durée',     value: dmCfg.dur, inline: true },
          { name: '🔓 Démute le', value: `<t:${unmuteTs}:F> (<t:${unmuteTs}:R>)`, inline: false },
        )
      }
      dmEmbed.addFields({ name: '📅 Date', value: `<t:${nowTs}:F>`, inline: false })
      if (raison) dmEmbed.addFields({ name: '📋 Raison', value: raison, inline: false })
      await member.send({ embeds: [dmEmbed] }).catch(() => {})
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