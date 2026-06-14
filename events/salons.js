const { AuditLogEvent, ChannelType } = require('discord.js');
const { getConfig } = require('../config')
const { sendLogCard } = require('../levels/logCard')

const getType = (type) => {
    const types = {
        [ChannelType.GuildText]: 'Texte',
        [ChannelType.GuildVoice]: 'Vocal',
        [ChannelType.GuildCategory]: 'Catégorie',
        [ChannelType.GuildAnnouncement]: 'Annonce',
        [ChannelType.GuildStageVoice]: 'Stage',
        [ChannelType.GuildForum]: 'Forum',
    };
    return types[type] ?? 'Inconnu';
};

const getPermissions = (channel) => {
    const perms = new Set();
    channel.permissionOverwrites.cache.forEach(overwrite => {
        overwrite.allow.toArray().forEach(perm => perms.add(perm));
    });
    return perms.size > 0 ? [...perms].join(', ') : 'Public';
};

module.exports = (client) => {

    // ========== SALON CRÉÉ ==========
    client.on('channelCreate', async (channel) => {
        if (!channel.guild) return;

        const logs      = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelCreate, limit: 1 }).catch(() => null);
        const entry     = logs?.entries.first();
        const executeur = entry?.executor;

        const config = await getConfig()
        const logSalon = channel.guild.channels.cache.get(config.log_salons);
        if (!logSalon) return;

        await sendLogCard(logSalon, {
            title: `Salon ${getType(channel.type)} créé`,
            accent: '#22c55e',
            avatarURL: executeur?.displayAvatarURL(),
            rows: [
                { label: 'Auteur', value: executeur ? `${executeur.username} (${executeur.id})` : 'Inconnu' },
                { label: 'Date', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) },
                { label: 'Salon', value: channel.name },
                { label: 'Catégorie', value: channel.parent?.name ?? 'Aucune' },
            ],
            longText: { label: 'Permissions', value: getPermissions(channel) },
            footerExtra: `ID: ${channel.id}`,
        });
    });

    // ========== SALON SUPPRIMÉ ==========
    client.on('channelDelete', async (channel) => {
        if (!channel.guild) return;

        const logs      = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 }).catch(() => null);
        const entry     = logs?.entries.first();
        const executeur = entry?.executor;

        const config = await getConfig()
        const logSalon = channel.guild.channels.cache.get(config.log_salons);
        if (!logSalon) return;

        await sendLogCard(logSalon, {
            title: `Salon ${getType(channel.type)} supprimé`,
            accent: '#ef4444',
            avatarURL: executeur?.displayAvatarURL(),
            rows: [
                { label: 'Auteur', value: executeur ? `${executeur.username} (${executeur.id})` : 'Inconnu' },
                { label: 'Date', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) },
                { label: 'Salon', value: channel.name },
                { label: 'Catégorie', value: channel.parent?.name ?? 'Aucune' },
            ],
            footerExtra: `ID: ${channel.id}`,
        });
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
            changements.push(`Nom : ${oldChannel.name} → ${newChannel.name}`);
        if (oldChannel.topic !== newChannel.topic)
            changements.push(`Sujet : ${oldChannel.topic ?? 'Aucun'} → ${newChannel.topic ?? 'Aucun'}`);
        if (oldChannel.nsfw !== newChannel.nsfw)
            changements.push(`NSFW : ${oldChannel.nsfw} → ${newChannel.nsfw}`);
        if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser)
            changements.push(`Slowmode : ${oldChannel.rateLimitPerUser}s → ${newChannel.rateLimitPerUser}s`);
        if (oldChannel.parent?.id !== newChannel.parent?.id)
            changements.push(`Catégorie : ${oldChannel.parent?.name ?? 'Aucune'} → ${newChannel.parent?.name ?? 'Aucune'}`);

        if (changements.length === 0) return;

        const config = await getConfig()
        const logSalon = newChannel.guild.channels.cache.get(config.log_salons);
        if (!logSalon) return;

        await sendLogCard(logSalon, {
            title: `Salon ${getType(newChannel.type)} modifié`,
            accent: '#3b82f6',
            avatarURL: executeur?.displayAvatarURL(),
            rows: [
                { label: 'Modifié par', value: executeur ? `${executeur.username} (${executeur.id})` : 'Inconnu' },
                { label: 'Date', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) },
                { label: 'Salon', value: newChannel.name },
                { label: 'Catégorie', value: newChannel.parent?.name ?? 'Aucune' },
            ],
            longText: { label: 'Changements', value: changements.join('\n') },
            footerExtra: `ID: ${newChannel.id}`,
        });
    });
};
