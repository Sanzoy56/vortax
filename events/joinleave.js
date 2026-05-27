const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('../config')

module.exports = (client) => {

    // ========== MEMBRE REJOINT ==========
    client.on('guildMemberAdd', async (member) => {
        const config = await getConfig()
        const logSalon = member.guild.channels.cache.get(config.log_welcome);
        if (!logSalon) return;

        const compteCreeLe = Math.floor(member.user.createdTimestamp / 1000);
        const ageCompte    = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));

        const embed = new EmbedBuilder()
            .setTitle('📥 Membre Rejoint')
            .setColor(0x36393F)
            .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
            .setThumbnail(member.user.displayAvatarURL())
            .setDescription(
                `👥 **Membre :** <@${member.id}> (\`${member.id}\`)\n` +
                `📅 **Compte créé le :** <t:${compteCreeLe}:F>\n` +
                `⏱️ **Âge du compte :** \`${ageCompte} jours\`\n` +
                `🗓️ **Arrivée le :** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
                `👤 **Membres :** \`${member.guild.memberCount}\``
            )
            .setTimestamp()
            .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: member.guild.iconURL() ?? null });

        await logSalon.send({ embeds: [embed] });
    });

    // ========== MEMBRE PARTI ==========
    client.on('guildMemberRemove', async (member) => {
        const config = await getConfig()
        const logSalon = member.guild.channels.cache.get(config.log_welcome);
        if (!logSalon) return;

        const arrivedAt = Math.floor(member.joinedTimestamp / 1000);
        const duree     = Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24));
        const roles     = member.roles.cache
            .filter(r => r.id !== member.guild.id)
            .map(r => `<@&${r.id}>`)
            .join(', ') || 'Aucun';

        const embed = new EmbedBuilder()
            .setTitle('📤 Membre Parti')
            .setColor(0x36393F)
            .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
            .setThumbnail(member.user.displayAvatarURL())
            .setDescription(
                `👥 **Membre :** <@${member.id}> (\`${member.id}\`)\n` +
                `🗓️ **Arrivé le :** <t:${arrivedAt}:F>\n` +
                `⏱️ **Durée sur le serveur :** \`${duree} jours\`\n` +
                `🎭 **Rôles :** ${roles}\n` +
                `👤 **Membres :** \`${member.guild.memberCount}\``
            )
            .setTimestamp()
            .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: member.guild.iconURL() ?? null });

        await logSalon.send({ embeds: [embed] });
    });
};