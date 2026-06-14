const { AuditLogEvent } = require('discord.js');
const { getConfig } = require('../config')
const { sendLogCard } = require('../levels/logCard')

module.exports = (client) => {

    // ========== BAN ==========
    client.on('guildBanAdd', async (ban) => {
        const guild = ban.guild;
        const user  = ban.user;

        const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 }).catch(() => null);
        const entry     = auditLogs?.entries.first();
        const executeur = entry?.executor;
        const raison    = entry?.reason ?? 'Aucune raison fournie';

        const config = await getConfig()
        const logSalon = guild.channels.cache.get(config.log_moderation);
        if (!logSalon) return console.error('❌ [BAN] Salon introuvable ! ID:', config.logs?.moderation);
        await sendLogCard(logSalon, {
            title: 'Membre banni',
            accent: '#ef4444',
            avatarURL: user.displayAvatarURL(),
            rows: [
                { label: 'Sanctionné', value: `${user.tag ?? user.username} (${user.id})` },
                { label: 'Sanctionné par', value: executeur ? `${executeur.tag ?? executeur.username}` : 'Inconnu' },
                { label: 'Date', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) },
            ],
            longText: { label: 'Motif', value: raison },
            footerExtra: `ID: ${user.id}`,
        });
    });

    // ========== UNBAN ==========
    client.on('guildBanRemove', async (ban) => {
        const guild = ban.guild;
        const user  = ban.user;

        const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanRemove, limit: 1 }).catch(() => null);
        const entry     = auditLogs?.entries.first();
        const executeur = entry?.executor;

        const config = await getConfig()
        const logSalon = guild.channels.cache.get(config.log_moderation);
        if (!logSalon) return console.error('❌ [UNBAN] Salon introuvable ! ID:', config.logs?.moderation);
        await sendLogCard(logSalon, {
            title: 'Membre débanni',
            accent: '#22c55e',
            avatarURL: user.displayAvatarURL(),
            rows: [
                { label: 'Débanni', value: `${user.tag ?? user.username} (${user.id})` },
                { label: 'Débanni par', value: executeur ? `${executeur.tag ?? executeur.username}` : 'Inconnu' },
                { label: 'Date', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) },
            ],
            footerExtra: `ID: ${user.id}`,
        });
    });

    // ========== KICK ==========
    client.on('guildMemberRemove', async (member) => {
        const auditLogs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 1 }).catch(() => null);
        const entry     = auditLogs?.entries.first();

        if (!entry || entry.target.id !== member.id) return;
        if (Date.now() - entry.createdTimestamp > 5000) return;

        const executeur = entry.executor;
        const raison    = entry.reason ?? 'Aucune raison fournie';

        const config = await getConfig()
        const logSalon = member.guild.channels.cache.get(config.log_moderation);
        if (!logSalon) return console.error('❌ [KICK] Salon introuvable ! ID:', config.logs?.moderation);
        await sendLogCard(logSalon, {
            title: 'Membre kické',
            accent: '#ef4444',
            avatarURL: member.user.displayAvatarURL(),
            rows: [
                { label: 'Sanctionné', value: `${member.user.tag ?? member.user.username} (${member.id})` },
                { label: 'Sanctionné par', value: executeur ? `${executeur.tag ?? executeur.username}` : 'Inconnu' },
                { label: 'Date', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) },
            ],
            longText: { label: 'Motif', value: raison },
            footerExtra: `ID: ${member.id}`,
        });
    });

    // ========== TIMEOUT ==========
    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        const guild       = newMember.guild;
        const wasTimedOut = oldMember.communicationDisabledUntil;
        const isTimedOut  = newMember.communicationDisabledUntil;

        const config = await getConfig()
        const logSalon = guild.channels.cache.get(config.log_moderation);
        if (!logSalon) return console.error('❌ [TIMEOUT] Salon introuvable ! ID:', config.logs?.moderation);

        // Timeout ajouté — uniquement si le nouveau timeout est dans le futur ET différent de l'ancien
        const now = new Date();
        if (isTimedOut && isTimedOut > now && (!wasTimedOut || wasTimedOut.getTime() !== isTimedOut.getTime())) {
            const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 1 }).catch(() => null);
            const entry     = auditLogs?.entries.first();
            const executeur = entry?.executor;
            const raison    = entry?.reason ?? 'Aucune raison fournie';

            await sendLogCard(logSalon, {
                title: 'Membre mis en timeout',
                accent: '#ef4444',
                avatarURL: newMember.user.displayAvatarURL(),
                rows: [
                    { label: 'Sanctionné', value: `${newMember.user.tag ?? newMember.user.username} (${newMember.id})` },
                    { label: 'Sanctionné par', value: executeur ? `${executeur.tag ?? executeur.username}` : 'Inconnu' },
                    { label: 'Fin du timeout', value: isTimedOut.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) },
                    { label: 'Date', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) },
                ],
                longText: { label: 'Motif', value: raison },
                footerExtra: `ID: ${newMember.id}`,
            }).catch(err => console.error('❌ [TIMEOUT] Erreur envoi:', err.message));
        }

        // Timeout retiré
        if (wasTimedOut && !isTimedOut) {
            await sendLogCard(logSalon, {
                title: 'Timeout retiré',
                accent: '#22c55e',
                avatarURL: newMember.user.displayAvatarURL(),
                rows: [
                    { label: 'Membre', value: `${newMember.user.tag ?? newMember.user.username} (${newMember.id})` },
                    { label: 'Date', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) },
                ],
                footerExtra: `ID: ${newMember.id}`,
            }).catch(err => console.error('❌ [TIMEOUT RETIRÉ] Erreur envoi:', err.message));
        }
    });

};
