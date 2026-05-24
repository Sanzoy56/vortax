const { EmbedBuilder } = require('discord.js');
async function getConfig() {
  try {
    const res = await fetch('http://localhost:3001/config')
    return await res.json()
  } catch { return {} }
}

// Liens Discord (invitations)
const DISCORD_INVITE = /(discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[a-zA-Z0-9]+/gi;

// Pub style "rejoins mon serveur"
const PUB_KEYWORDS = /\b(rejoins|rejoignez|join|venez sur|come to|mon serveur|my server|serveur discord|discord server)\b/gi;

// Liens p*rno / malveillants (uniquement les URLs)
const BANNED_DOMAINS = [
  'pornhub', 'xvideos', 'xnxx', 'xhamster', 'redtube', 'youporn',
  'porn', 'sex', 'xxx', 'onlyfans', 'fansly', 'brazzers',
  'cam4', 'chaturbate', 'livejasmin'
];
const BANNED_LINKS = new RegExp(`https?:\\/\\/(www\\.)?(${BANNED_DOMAINS.join('|')})\\.`, 'gi');

module.exports = (client) => {

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const content = message.content;
    const member = message.member;
    const config = await getConfig()
    const logSalon = message.guild.channels.cache.get(config.log_moderation);

    // ========== LIENS P*RNO → BAN ==========
    if (BANNED_LINKS.test(content)) {
      try {
        await message.delete();
        await message.guild.members.ban(member, { reason: 'Automod : lien interdit' });

        const embed = new EmbedBuilder()
          .setTitle('🔨 Automod — Ban automatique')
          .setColor(0x36393F)
          .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
          .setDescription(
            `👥 **Membre :** <@${message.author.id}> (\`${message.author.tag}\`)\n` +
            `📋 **Raison :** Lien interdit (contenu adulte)\n` +
            `💬 **Salon :** <#${message.channel.id}>\n` +
            `🗓️ **Date :** <t:${Math.floor(Date.now() / 1000)}:F>`
          )
          .setTimestamp()
          .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: message.guild.iconURL({ dynamic: true }) ?? null });

        if (logSalon) await logSalon.send({ embeds: [embed] });
      } catch (err) {
        console.error('Automod ban erreur:', err);
      }
      return;
    }

    // ========== LIENS DISCORD + PUB → TIMEOUT 7J ==========
    if (DISCORD_INVITE.test(content) || PUB_KEYWORDS.test(content)) {
      try {
        await message.delete();
        await member.timeout(7 * 24 * 60 * 60 * 1000, 'Automod : pub/invitation Discord'); // 7 jours

        const embed = new EmbedBuilder()
          .setTitle('⏱️ Automod — Timeout automatique')
          .setColor(0x36393F)
          .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
          .setDescription(
            `👥 **Membre :** <@${message.author.id}> (\`${message.author.tag}\`)\n` +
            `📋 **Raison :** Pub ou invitation Discord non autorisée\n` +
            `⏱️ **Durée :** 7 jours\n` +
            `💬 **Salon :** <#${message.channel.id}>\n` +
            `🗓️ **Date :** <t:${Math.floor(Date.now() / 1000)}:F>`
          )
          .setTimestamp()
          .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: message.guild.iconURL({ dynamic: true }) ?? null });

        if (logSalon) await logSalon.send({ embeds: [embed] });
      } catch (err) {
        console.error('Automod timeout erreur:', err);
      }
      return;
    }
  });
};