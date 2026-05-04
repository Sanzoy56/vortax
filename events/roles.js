const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const config = require('../config.json');

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

module.exports = (client) => {

    // ========== RÔLE CRÉÉ ==========
    client.on(Events.GuildRoleCreate, async (role) => {
        const logChannel = role.guild.channels.cache.get(config.logs?.roles);
        if (!logChannel) return console.error('❌ [ROLE CREATE] Salon introuvable ! ID:', config.logs?.roles);

        const now = new Date();
        let createdBy = 'Inconnu';
        try {
            const fetchedLogs = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleCreate });
            const log = fetchedLogs.entries.first();
            if (log && Date.now() - log.createdTimestamp < 5000) createdBy = `${log.executor.username} (${log.executor.id})`;
        } catch {}

        const permsText = formatPerms(role.permissions).slice(0, 800);
        const embed = new EmbedBuilder()
            .setTitle('✅ Rôle Créé')
            .setColor(0x36393F)
            .addFields({ name: '\u200b', value: [
                `🎭 **Rôle :** <@&${role.id}> (${role.id})`,
                `🎨 **Couleur :** ${role.hexColor}`,
                `📌 **Affiché séparément :** ${role.hoist ? 'Oui' : 'Non'}`,
                `🔔 **Mentionnable :** ${role.mentionable ? 'Oui' : 'Non'}`,
                `🔒 **Permissions :** ${permsText}`,
                `👤 **Créé par :** ${createdBy}`,
                `📅 **Date :** ${now.toLocaleString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
            ].join('\n') })
            .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: role.guild.iconURL() })
            .setTimestamp(now);

        await logChannel.send({ embeds: [embed] });
    });

    // ========== RÔLE SUPPRIMÉ ==========
    client.on(Events.GuildRoleDelete, async (role) => {
        const logChannel = role.guild.channels.cache.get(config.logs?.roles);
        if (!logChannel) return console.error('❌ [ROLE DELETE] Salon introuvable ! ID:', config.logs?.roles);

        const now = new Date();
        let deletedBy = 'Inconnu';
        try {
            const fetchedLogs = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleDelete });
            const log = fetchedLogs.entries.first();
            if (log && Date.now() - log.createdTimestamp < 5000) deletedBy = `${log.executor.username} (${log.executor.id})`;
        } catch {}

        const permsText = formatPerms(role.permissions).slice(0, 800);
        const embed = new EmbedBuilder()
            .setTitle('❌ Rôle Supprimé')
            .setColor(0x36393F)
            .addFields({ name: '\u200b', value: [
                `🎭 **Rôle :** ${role.name} (${role.id})`,
                `🎨 **Couleur :** ${role.hexColor}`,
                `📌 **Affiché séparément :** ${role.hoist ? 'Oui' : 'Non'}`,
                `🔒 **Permissions :** ${permsText}`,
                `👤 **Supprimé par :** ${deletedBy}`,
                `📅 **Date :** ${now.toLocaleString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
            ].join('\n') })
            .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: role.guild.iconURL() })
            .setTimestamp(now);

        await logChannel.send({ embeds: [embed] });
    });

    // ========== RÔLE MODIFIÉ ==========
    client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
        const logChannel = newRole.guild.channels.cache.get(config.logs?.roles);
        if (!logChannel) return console.error('❌ [ROLE UPDATE] Salon introuvable ! ID:', config.logs?.roles);

        const now = new Date();
        let updatedBy = 'Inconnu';
        try {
            const fetchedLogs = await newRole.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleUpdate });
            const log = fetchedLogs.entries.first();
            if (log && Date.now() - log.createdTimestamp < 5000) updatedBy = `${log.executor.username} (${log.executor.id})`;
        } catch {}

        const changes = [];
        if (oldRole.name !== newRole.name) changes.push(`📝 **Nom :** ${oldRole.name} → ${newRole.name}`);
        if (oldRole.hexColor !== newRole.hexColor) changes.push(`🎨 **Couleur :** ${oldRole.hexColor} → ${newRole.hexColor}`);
        if (oldRole.hoist !== newRole.hoist) changes.push(`📌 **Affiché séparément :** ${oldRole.hoist ? 'Oui' : 'Non'} → ${newRole.hoist ? 'Oui' : 'Non'}`);
        if (oldRole.mentionable !== newRole.mentionable) changes.push(`🔔 **Mentionnable :** ${oldRole.mentionable ? 'Oui' : 'Non'} → ${newRole.mentionable ? 'Oui' : 'Non'}`);

        const addedPerms   = newRole.permissions.toArray().filter(p => !oldRole.permissions.has(p));
        const removedPerms = oldRole.permissions.toArray().filter(p => !newRole.permissions.has(p));
        for (const perm of addedPerms)   changes.push(`✅ **Permission ajoutée :** ${permissionNames[perm] || perm}`);
        for (const perm of removedPerms) changes.push(`❌ **Permission retirée :** ${permissionNames[perm] || perm}`);

        if (changes.length === 0) return;

        const changesText = changes.join('\n').slice(0, 1024);
        const embed = new EmbedBuilder()
            .setTitle('✏️ Rôle Modifié')
            .setColor(0x36393F)
            .addFields(
                { name: '\u200b', value: [`🎭 **Rôle :** <@&${newRole.id}> (${newRole.id})`, `👤 **Modifié par :** ${updatedBy}`, `📅 **Date :** ${now.toLocaleString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`].join('\n') },
                { name: '🔄 Modifications :', value: changesText }
            )
            .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: newRole.guild.iconURL() })
            .setTimestamp(now);

        await logChannel.send({ embeds: [embed] });
    });

    // ========== RÔLE AJOUTÉ / RETIRÉ ==========
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        if (!oldMember.guild) return;

        const logChannel = newMember.guild.channels.cache.get(config.logs?.roles);
        if (!logChannel) return console.error('❌ [ROLE MEMBER] Salon introuvable ! ID:', config.logs?.roles);

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
            const rolesInfo = addedRoles.map(r => [
                `🎭 **Rôle ajouté :** <@&${r.id}>`,
                `📌 **Affiché séparément :** ${r.hoist ? 'Oui' : 'Non'}`,
            ].join('\n')).join('\n\n').slice(0, 1024);
            if (rolesInfo.trim()) {
                const embed = new EmbedBuilder()
                    .setTitle('➕ Rôle Ajouté à un Membre')
                    .setColor(0x36393F)
                    .setThumbnail(newMember.user.displayAvatarURL())
                    .addFields(
                        { name: '\u200b', value: [`🧑 **Membre :** <@${newMember.id}> (${newMember.id})`, `👤 **Par :** ${updatedBy}`, `📅 **Date :** ${now.toLocaleString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`].join('\n') },
                        { name: '🎭 Détails du rôle :', value: rolesInfo }
                    )
                    .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: newMember.guild.iconURL() })
                    .setTimestamp(now);
                await logChannel.send({ embeds: [embed] });
            }
        }

        if (removedRoles.size > 0) {
            const rolesInfo = removedRoles.map(r => [
                `🎭 **Rôle retiré :** <@&${r.id}>`,
                `📌 **Affiché séparément :** ${r.hoist ? 'Oui' : 'Non'}`,
            ].join('\n')).join('\n\n').slice(0, 1024);
            if (rolesInfo.trim()) {
                const embed = new EmbedBuilder()
                    .setTitle('➖ Rôle Retiré à un Membre')
                    .setColor(0x36393F)
                    .setThumbnail(newMember.user.displayAvatarURL())
                    .addFields(
                        { name: '\u200b', value: [`🧑 **Membre :** <@${newMember.id}> (${newMember.id})`, `👤 **Par :** ${updatedBy}`, `📅 **Date :** ${now.toLocaleString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`].join('\n') },
                        { name: '🎭 Détails du rôle :', value: rolesInfo }
                    )
                    .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: newMember.guild.iconURL() })
                    .setTimestamp(now);
                await logChannel.send({ embeds: [embed] });
            }
        }
    });
};