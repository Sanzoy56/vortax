const { Events, AuditLogEvent } = require('discord.js');
const { getConfig } = require('../config')
const { sendLogCard } = require('../levels/logCard')

const permissionNames = {
    AddReactions: 'Ajouter des réactions', Administrator: 'Administrateur',
    AttachFiles: 'Joindre des fichiers', BanMembers: 'Bannir des membres',
    ChangeNickname: 'Changer son pseudo', Connect: 'Rejoindre un salon vocal',
    CreateInstantInvite: 'Créer une invitation', CreatePrivateThreads: 'Créer des fils privés',
    CreatePublicThreads: 'Créer des fils publics', DeafenMembers: 'Mettre en sourdine',
    EmbedLinks: 'Intégrer des liens', KickMembers: 'Expulser des membres',
    ManageChannels: 'Gérer les salons', ManageEmojisAndStickers: 'Gérer les emojis et stickers',
    ManageEvents: 'Gérer les événements', ManageGuild: 'Gérer le serveur',
    ManageMessages: 'Gérer les messages', ManageNicknames: 'Gérer les pseudos',
    ManageRoles: 'Gérer les rôles', ManageThreads: 'Gérer les fils',
    ManageWebhooks: 'Gérer les webhooks', MentionEveryone: 'Mentionner @everyone',
    ModerateMembers: 'Mettre en timeout', MoveMembers: 'Déplacer des membres',
    MuteMembers: 'Rendre muet', PrioritySpeaker: 'Voix prioritaire',
    ReadMessageHistory: "Voir l'historique", RequestToSpeak: 'Demander à parler',
    SendMessages: 'Envoyer des messages', SendMessagesInThreads: 'Envoyer dans les fils',
    SendTTSMessages: 'Envoyer des messages TTS', Speak: 'Parler', Stream: 'Diffuser',
    UseApplicationCommands: 'Utiliser les commandes', UseEmbeddedActivities: 'Utiliser les activités',
    UseExternalEmojis: 'Utiliser des emojis externes', UseExternalStickers: 'Utiliser des stickers externes',
    UseVAD: 'Détection automatique de la voix', ViewAuditLog: 'Voir les logs',
    ViewChannel: 'Voir les salons', ViewGuildInsights: 'Voir les statistiques',
};

const formatPerms = (perms) =>
    perms.toArray().map(p => permissionNames[p] || p).join(', ') || 'Aucune';

const formatDate = (date) =>
    date.toLocaleString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

module.exports = (client) => {

    client.on(Events.GuildRoleCreate, async (role) => {
        const config = await getConfig()
        const logChannel = role.guild.channels.cache.get(config.log_roles);
        if (!logChannel) return;

        const now = new Date();
        let createdBy = 'Inconnu';
        try {
            const fetchedLogs = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleCreate });
            const log = fetchedLogs.entries.first();
            if (log && Date.now() - log.createdTimestamp < 5000) createdBy = `${log.executor.username} (${log.executor.id})`;
        } catch {}

        await sendLogCard(logChannel, {
            title: 'Rôle créé',
            accent: '#22c55e',
            rows: [
                { label: 'Rôle', value: `${role.name} (${role.id})` },
                { label: 'Couleur', value: role.hexColor },
                { label: 'Affiché séparément', value: role.hoist ? 'Oui' : 'Non' },
                { label: 'Mentionnable', value: role.mentionable ? 'Oui' : 'Non' },
                { label: 'Créé par', value: createdBy },
                { label: 'Date', value: formatDate(now) },
            ],
            longText: { label: 'Permissions', value: formatPerms(role.permissions) },
            footerExtra: `ID: ${role.id}`,
        });
    });

    client.on(Events.GuildRoleDelete, async (role) => {
        const config = await getConfig()
        const logChannel = role.guild.channels.cache.get(config.log_roles);
        if (!logChannel) return;

        const now = new Date();
        let deletedBy = 'Inconnu';
        try {
            const fetchedLogs = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleDelete });
            const log = fetchedLogs.entries.first();
            if (log && Date.now() - log.createdTimestamp < 5000) deletedBy = `${log.executor.username} (${log.executor.id})`;
        } catch {}

        await sendLogCard(logChannel, {
            title: 'Rôle supprimé',
            accent: '#ef4444',
            rows: [
                { label: 'Rôle', value: `${role.name} (${role.id})` },
                { label: 'Couleur', value: role.hexColor },
                { label: 'Affiché séparément', value: role.hoist ? 'Oui' : 'Non' },
                { label: 'Supprimé par', value: deletedBy },
                { label: 'Date', value: formatDate(now) },
            ],
            longText: { label: 'Permissions', value: formatPerms(role.permissions) },
            footerExtra: `ID: ${role.id}`,
        });
    });

    client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
        const config = await getConfig()
        const logChannel = newRole.guild.channels.cache.get(config.log_roles);
        if (!logChannel) return;

        const now = new Date();
        let updatedBy = 'Inconnu';
        try {
            const fetchedLogs = await newRole.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleUpdate });
            const log = fetchedLogs.entries.first();
            if (log && Date.now() - log.createdTimestamp < 5000) updatedBy = `${log.executor.username} (${log.executor.id})`;
        } catch {}

        const changes = [];
        if (oldRole.name !== newRole.name) changes.push(`Nom : ${oldRole.name} → ${newRole.name}`);
        if (oldRole.hexColor !== newRole.hexColor) changes.push(`Couleur : ${oldRole.hexColor} → ${newRole.hexColor}`);
        if (oldRole.hoist !== newRole.hoist) changes.push(`Affiché séparément : ${oldRole.hoist ? 'Oui' : 'Non'} → ${newRole.hoist ? 'Oui' : 'Non'}`);
        if (oldRole.mentionable !== newRole.mentionable) changes.push(`Mentionnable : ${oldRole.mentionable ? 'Oui' : 'Non'} → ${newRole.mentionable ? 'Oui' : 'Non'}`);

        const addedPerms   = newRole.permissions.toArray().filter(p => !oldRole.permissions.has(p));
        const removedPerms = oldRole.permissions.toArray().filter(p => !newRole.permissions.has(p));
        for (const perm of addedPerms)   changes.push(`Permission ajoutée : ${permissionNames[perm] || perm}`);
        for (const perm of removedPerms) changes.push(`Permission retirée : ${permissionNames[perm] || perm}`);

        if (changes.length === 0) return;

        await sendLogCard(logChannel, {
            title: 'Rôle modifié',
            accent: '#3b82f6',
            rows: [
                { label: 'Rôle', value: `${newRole.name} (${newRole.id})` },
                { label: 'Modifié par', value: updatedBy },
                { label: 'Date', value: formatDate(now) },
            ],
            longText: { label: 'Modifications', value: changes.join('\n') },
            footerExtra: `ID: ${newRole.id}`,
        });
    });

    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        if (!oldMember.guild) return;

        const config = await getConfig()
        const logChannel = newMember.guild.channels.cache.get(config.log_roles);
        if (!logChannel) return;

        const addedRoles   = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
        const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
        if (addedRoles.size === 0 && removedRoles.size === 0) return;

        const now = new Date();
        let updatedBy = 'Inconnu';
        try {
            const fetchedLogs = await newMember.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberRoleUpdate });
            const log = fetchedLogs.entries.first();
            if (log && Date.now() - log.createdTimestamp < 5000) updatedBy = `${log.executor.username} (${log.executor.id})`;
        } catch {}

        if (addedRoles.size > 0) {
            const rolesInfo = addedRoles.map(r => `${r.name} (séparé : ${r.hoist ? 'Oui' : 'Non'})`).join('\n');
            await sendLogCard(logChannel, {
                title: 'Rôle ajouté à un membre',
                accent: '#22c55e',
                avatarURL: newMember.user.displayAvatarURL(),
                rows: [
                    { label: 'Membre', value: `${newMember.user.tag} (${newMember.id})` },
                    { label: 'Par', value: updatedBy },
                    { label: 'Date', value: formatDate(now) },
                ],
                longText: { label: 'Rôles ajoutés', value: rolesInfo },
                footerExtra: `ID: ${newMember.id}`,
            });
        }

        if (removedRoles.size > 0) {
            const rolesInfo = removedRoles.map(r => `${r.name} (séparé : ${r.hoist ? 'Oui' : 'Non'})`).join('\n');
            await sendLogCard(logChannel, {
                title: 'Rôle retiré à un membre',
                accent: '#ef4444',
                avatarURL: newMember.user.displayAvatarURL(),
                rows: [
                    { label: 'Membre', value: `${newMember.user.tag} (${newMember.id})` },
                    { label: 'Par', value: updatedBy },
                    { label: 'Date', value: formatDate(now) },
                ],
                longText: { label: 'Rôles retirés', value: rolesInfo },
                footerExtra: `ID: ${newMember.id}`,
            });
        }
    });
};
