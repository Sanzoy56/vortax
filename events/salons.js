const { EmbedBuilder, AuditLogEvent, ChannelType } = require('discord.js');
const { getConfig } = require('../config')

const getType = (type) => {
    const types = {
        [ChannelType.GuildText]: '💬 Texte',
        [ChannelType.GuildVoice]: '🔊 Vocal',
        [ChannelType.GuildCategory]: '📁 Catégorie',
        [ChannelType.GuildAnnouncement]: '📢 Annonce',
        [ChannelType.GuildStageVoice]: '🎙️ Stage',
        [ChannelType.GuildForum]: '💬 Forum',
    };
    return types[type] ?? 'Inconnu';
};

const getPermissions = (channel) => {
    const perms = new Set();
    channel.permissionOverwrites.cache.forEach(overwrite => {
        overwrite.allow.toArray().forEach(perm => perms.add(`✅ ${perm}`));
    });
    return perms.size > 0 ? [...perms].join('\n') : '✅ Public';
};

module.exports = (client) => {

    // ========== SALON CRÉÉ ==========
    client.on('channelCreate', async (channel) => {
        if (!channel.guild) return;

        const logs      = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelCreate, limit: 1 }).catch(() => null);
        const entry     = logs?.entries.first();
        const executeur = entry?.executor;

        const embed = new EmbedBuilder()
            .setTitle(`✅ Salon ${getType(channel.type)} créé`)
            .setColor(0x36393F)
            .setAuthor({ name: executeur?.username ?? 'Inconnu', iconURL: executeur?.displayAvatarURL() ?? null })
            .setDescription(
                `👥 **Auteur de la création :** <@${executeur?.id}> (\`${executeur?.username ?? 'Inconnu'}\`)\n` +
                `🗓️ **Date de création :** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
                `🏷️ **ID du salon :** \`${channel.id}\`\n` +
                `🔔 **Salon :** <#${channel.id}>\n` +
                `📂 **Catégorie :** ${channel.parent ? `<#${channel.parent.id}>` : 'Aucune'}\n` +
                `🔐 **Permissions :**\n${getPermissions(channel)}`
            )
            .setTimestamp()
            .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: channel.guild.iconURL() ?? null });

        const config = await getConfig()
        const logSalon = channel.guild.channels.cache.get(config.log_salons);
        if (!logSalon) return;
        await logSalon.send({ embeds: [embed] });
    });

    // ========== SALON SUPPRIMÉ ==========
    client.on('channelDelete', async (channel) => {
        if (!channel.guild) return;

        const logs      = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 }).catch(() => null);
        const entry     = logs?.entries.first();
        const executeur = entry?.executor;

        const embed = new EmbedBuilder()
            .setTitle(`🛑 Salon ${getType(channel.type)} supprimé`)
            .setColor(0x36393F)
            .setAuthor({ name: executeur?.username ?? 'Inconnu', iconURL: executeur?.displayAvatarURL() ?? null })
            .setDescription(
                `👥 **Auteur de la suppression :** <@${executeur?.id}> (\`${executeur?.username ?? 'Inconnu'}\`)\n` +
                `🗓️ **Date de suppression :** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
                `🏷️ **ID du salon :** \`${channel.id}\`\n` +
                `📂 **Catégorie :** \`${channel.parent?.name ?? 'Aucune'}\``
            )
            .setTimestamp()
            .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: channel.guild.iconURL() ?? null });

        const config = await getConfig()
        const logSalon = channel.guild.channels.cache.get(config.log_salons);
        if (!logSalon) return;
        await logSalon.send({ embeds: [embed] });
    });

    // ========== SALON MODIFIÉ ==========
    client.on('channelUpdate', async (oldChannel, newChannel) => {
        if (!newChannel.guild) return;
        if (Date.now() - newChannel.createdTimestamp < 5000) return;

        const logs      = await newChannel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelUpdate, limit: 1 }).catch(() => null);
        const entry     = logs?.entries.first();
        const executeur = entry?.executor;

        const changements = [];
        if (oldChannel.name !== newChannel.name)
            changements.push(`📝 **Nom :** \`${oldChannel.name}\` → \`${newChannel.name}\``);
        if (oldChannel.topic !== newChannel.topic)
            changements.push(`📝 **Sujet :** \`${oldChannel.topic ?? 'Aucun'}\` → \`${newChannel.topic ?? 'Aucun'}\``);
        if (oldChannel.nsfw !== newChannel.nsfw)
            changements.push(`🔞 **NSFW :** \`${oldChannel.nsfw}\` → \`${newChannel.nsfw}\``);
        if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser)
            changements.push(`⏱️ **Slowmode :** \`${oldChannel.rateLimitPerUser}s\` → \`${newChannel.rateLimitPerUser}s\``);
        if (oldChannel.parent?.id !== newChannel.parent?.id)
            changements.push(`📂 **Catégorie :** \`${oldChannel.parent?.name ?? 'Aucune'}\` → \`${newChannel.parent?.name ?? 'Aucune'}\``);

        if (changements.length === 0) return;

        const embed = new EmbedBuilder()
            .setTitle(`✏️ Salon ${getType(newChannel.type)} modifié`)
            .setColor(0x36393F)
            .setAuthor({ name: executeur?.username ?? 'Inconnu', iconURL: executeur?.displayAvatarURL() ?? null })
            .setDescription(
                `👥 **Modifié par :** <@${executeur?.id}> (\`${executeur?.username ?? 'Inconnu'}\`)\n` +
                `🗓️ **Date :** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
                `🏷️ **ID du salon :** \`${newChannel.id}\`\n` +
                `🔔 **Salon :** <#${newChannel.id}>\n` +
                `📂 **Catégorie :** ${newChannel.parent ? `<#${newChannel.parent.id}>` : 'Aucune'}\n\n` +
                `**Changements :**\n${changements.join('\n')}`
            )
            .setTimestamp()
            .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: newChannel.guild.iconURL() ?? null });

        const config = await getConfig()
        const logSalon = newChannel.guild.channels.cache.get(config.log_salons);
        if (!logSalon) return;
        await logSalon.send({ embeds: [embed] });
    });
};