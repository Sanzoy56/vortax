const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { getConfig } = require('../config')

// Cache local : stocke les messages récents pour les retrouver en cas de suppression
// même s'ils ne sont plus dans le cache Discord.js (redémarrage, eviction)
const MSG_CACHE = new Map(); // messageId → { content, authorId, authorTag, authorAvatar, channelId, createdAt }
const MSG_CACHE_MAX = 2000;

module.exports = (client) => {

    // ========== MISE EN CACHE DES MESSAGES ==========
    client.on(Events.MessageCreate, (message) => {
        if (!message.guild) return;
        MSG_CACHE.set(message.id, {
            content:      message.content || null,
            authorId:     message.author?.id,
            authorTag:    message.author?.tag,
            authorAvatar: message.author?.displayAvatarURL({ dynamic: true, size: 128 }) ?? null,
            channelId:    message.channelId,
            createdAt:    message.createdAt,
            embeds:       message.embeds.length > 0,
            attachments:  message.attachments.size > 0,
        });
        // Limiter la taille du cache : supprimer la plus ancienne entrée
        if (MSG_CACHE.size > MSG_CACHE_MAX) {
            MSG_CACHE.delete(MSG_CACHE.keys().next().value);
        }
    });

    // ========== MESSAGE MODIFIÉ ==========
    client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
        if (newMessage.partial) return;
        if (newMessage.author?.bot) return;
        if (!oldMessage.content || !newMessage.content) return;
        if (oldMessage.content === newMessage.content) return;

        const config = await getConfig()
        const logChannel = newMessage.guild?.channels.cache.get(config.log_messages);
        if (!logChannel) return;

        const createdAt = oldMessage.createdAt;
        const editedAt = newMessage.editedAt ?? new Date();
        const delaySeconds = Math.round((editedAt - createdAt) / 1000);

        const formatDate = (date) =>
            date.toLocaleString('fr-FR', {
                weekday: 'long', day: '2-digit', month: 'long',
                year: 'numeric', hour: '2-digit', minute: '2-digit',
            });

        const embed = new EmbedBuilder()
            .setTitle('📋 Message Modifié')
            .setColor(0x2b2d31)
            .setThumbnail(newMessage.author.displayAvatarURL({ dynamic: true, size: 128 }))
            .addFields(
                {
                    name: '\u200b',
                    value: [
                        `🧑 **Auteur :** <@${newMessage.author.id}> (${newMessage.author.id})`,
                        `💬 **Salon :** <#${newMessage.channelId}> (${newMessage.channelId})`,
                        `📅 **Date de création du message :** ${formatDate(createdAt)}`,
                        `🕐 **Heure de modification :** ${formatDate(editedAt)}`,
                        `⏳ **Durée avant modification :** ${delaySeconds} seconde(s)`,
                    ].join('\n'),
                },
                { name: '🖊️ Ancien message :', value: `\`\`\`\n${oldMessage.content.slice(0, 1000) || '(vide)'}\n\`\`\`` },
                { name: '🔄 Nouveau message :', value: `\`\`\`\n${newMessage.content.slice(0, 1000) || '(vide)'}\n\`\`\`` },
            )
            .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: newMessage.guild.iconURL({ dynamic: true }) })
            .setTimestamp(editedAt);

        await logChannel.send({ embeds: [embed] });
    });

    // ========== MESSAGE SUPPRIMÉ ==========
    client.on(Events.MessageDelete, async (message) => {
        // Récupérer depuis le cache local si Discord.js n'a pas le message
        const cached = MSG_CACHE.get(message.id);
        MSG_CACHE.delete(message.id);

        // Si le message est partial ET absent du cache local → log minimal
        if (message.partial && !cached) {
            // Reconstruire depuis le cache local si disponible
            const config = await getConfig()
            const logChannel = message.guild?.channels.cache.get(config.log_messages);
            if (!logChannel) return;

            const deletedAt = new Date();
            let deletedBy = 'Inconnu';
            try {
                const fetchedLogs = await message.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MessageDelete });
                const log = fetchedLogs.entries.first();
                if (log && Date.now() - log.createdTimestamp < 5000) {
                    deletedBy = `${log.executor.tag} (${log.executor.id})`;
                }
            } catch {}

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Message Supprimé')
                .setColor(0x2b2d31)
                .addFields({
                    name: '\u200b',
                    value: [
                        `💬 **Salon :** <#${message.channelId}> (${message.channelId})`,
                        `🕐 **Heure de suppression :** ${new Date().toLocaleString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
                        `🔧 **Supprimé par :** ${deletedBy}`,
                        `⚠️ **Contenu :** Message non mis en cache (trop ancien ou hors cache)`,
                    ].join('\n'),
                })
                .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: message.guild.iconURL({ dynamic: true }) })
                .setTimestamp();

            return logChannel.send({ embeds: [embed] });
        }

        const config = await getConfig()
        const logChannel = message.guild?.channels.cache.get(config.log_messages);
        if (!logChannel) return;

        const formatDate = (date) =>
            date.toLocaleString('fr-FR', {
                weekday: 'long', day: '2-digit', month: 'long',
                year: 'numeric', hour: '2-digit', minute: '2-digit',
            });

        // Priorité : données Discord.js > cache local
        const authorId     = message.author?.id     ?? cached?.authorId;
        const authorTag    = message.author?.tag     ?? cached?.authorTag;
        const authorAvatar = message.author?.displayAvatarURL({ dynamic: true, size: 128 }) ?? cached?.authorAvatar ?? null;
        const createdAt    = message.createdAt       ?? cached?.createdAt;

        const auteurDisplay = authorId
            ? `<@${authorId}> (${authorId})${message.author?.bot ? ' 🤖' : ''}`
            : 'Inconnu';

        let deletedBy = 'Inconnu';
        try {
            const fetchedLogs = await message.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MessageDelete });
            const log = fetchedLogs.entries.first();
            if (log && log.target?.id === authorId && Date.now() - log.createdTimestamp < 5000) {
                deletedBy = `${log.executor.tag} (${log.executor.id})`;
            }
        } catch {}

        // Contenu : Discord.js en priorité, sinon cache local
        const contenu = message.content?.slice(0, 1000)
            || cached?.content?.slice(0, 1000)
            || (message.embeds?.length || cached?.embeds ? '(embed)' : '')
            || (message.attachments?.size || cached?.attachments ? '(fichier)' : '')
            || '(vide)';

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Message Supprimé')
            .setColor(0x2b2d31)
            .addFields(
                {
                    name: '\u200b',
                    value: [
                        `🧑 **Auteur :** ${auteurDisplay}`,
                        `💬 **Salon :** <#${message.channelId}> (${message.channelId})`,
                        `📅 **Date de création du message :** ${createdAt ? formatDate(createdAt) : 'Inconnue'}`,
                        `🕐 **Heure de suppression :** ${formatDate(new Date())}`,
                        `🔧 **Supprimé par :** ${deletedBy}`,
                    ].join('\n'),
                },
                { name: '🗒️ Contenu du message :', value: `\`\`\`\n${contenu}\n\`\`\`` },
            )
            .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

        if (authorAvatar) embed.setThumbnail(authorAvatar);

        await logChannel.send({ embeds: [embed] });
    });
};