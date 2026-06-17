const { Events, AuditLogEvent, MessageFlags, AttachmentBuilder } = require('discord.js');
const { getConfig } = require('../config')
const { sendLogCard } = require('../levels/logCard')

// Cache local : stocke les messages récents pour les retrouver en cas de suppression
// même s'ils ne sont plus dans le cache Discord.js (redémarrage, eviction)
const MSG_CACHE = new Map(); // messageId → { content, authorId, authorTag, authorAvatar, channelId, createdAt }
const MSG_CACHE_MAX = 2000;

module.exports = (client) => {

    // ========== MISE EN CACHE DES MESSAGES ==========
    client.on(Events.MessageCreate, (message) => {
        if (!message.guild) return;
        const isVoice = message.flags.has(MessageFlags.IsVoiceMessage);
        MSG_CACHE.set(message.id, {
            content:      message.content || null,
            authorId:     message.author?.id,
            authorTag:    message.author?.tag,
            authorAvatar: message.author?.displayAvatarURL({ dynamic: true, size: 128 }) ?? null,
            channelId:    message.channelId,
            createdAt:    message.createdAt,
            embeds:       message.embeds.length > 0,
            attachments:  message.attachments.size > 0,
            isVoiceMessage: isVoice,
            voiceUrl:     isVoice ? message.attachments.first()?.url : null,
            voiceDuration: isVoice ? (message.attachments.first()?.duration || 0) : 0,
        });
        // Limiter la taille du cache : supprimer la plus ancienne entrée
        if (MSG_CACHE.size > MSG_CACHE_MAX) {
            MSG_CACHE.delete(MSG_CACHE.keys().next().value);
        }
    });

    // ========== MESSAGE VOCAL ENVOYÉ (log vidéo avec barre de progression) ==========
    client.on(Events.MessageCreate, async (message) => {
        if (!message.guild || message.author?.bot) return;
        if (!message.flags.has(MessageFlags.IsVoiceMessage)) return;

        const config = await getConfig();
        const logChannel = message.guild.channels.cache.get(config.log_messages);
        if (!logChannel) return;

        const attachment = message.attachments.first();
        if (!attachment) return;

        try {
            const { buildVoiceLogVideo } = require('../levels/voiceLogVideo');
            const mp4 = await buildVoiceLogVideo({
                authorTag: message.author.tag,
                authorId: message.author.id,
                avatarURL: message.author.displayAvatarURL({ dynamic: true, size: 128 }),
                channelName: message.channel?.name ?? message.channelId,
                date: message.createdAt,
                audioURL: attachment.url,
                durationSecs: attachment.duration || 3,
            });
            const file = new AttachmentBuilder(mp4, { name: 'vocal_log.mp4' });
            await logChannel.send({ files: [file] });
        } catch (e) {
            console.error('[Messages] Erreur log vocal vidéo:', e.message);
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
                timeZone: 'Europe/Paris',
            });

        await sendLogCard(logChannel, {
            title: 'Message modifié',
            accent: '#3b82f6',
            avatarURL: newMessage.author.displayAvatarURL({ dynamic: true, size: 128 }),
            rows: [
                { label: 'Auteur', value: `${newMessage.author.tag} (${newMessage.author.id})` },
                { label: 'Salon', value: newMessage.channel?.name ?? newMessage.channelId },
                { label: 'Créé le', value: formatDate(createdAt) },
                { label: 'Modifié le', value: formatDate(editedAt) },
                { label: 'Délai', value: `${delaySeconds} seconde(s)` },
            ],
            longText: {
                label: 'Modification',
                value: `Avant : ${oldMessage.content.slice(0, 300) || '(vide)'}\nAprès : ${newMessage.content.slice(0, 300) || '(vide)'}`,
            },
            footerExtra: `ID: ${newMessage.author.id}`,
        });
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

            let deletedBy = 'Inconnu';
            try {
                const fetchedLogs = await message.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MessageDelete });
                const log = fetchedLogs.entries.first();
                if (log && Date.now() - log.createdTimestamp < 5000) {
                    deletedBy = `${log.executor.tag} (${log.executor.id})`;
                }
            } catch {}

            return sendLogCard(logChannel, {
                title: 'Message supprimé',
                accent: '#ef4444',
                rows: [
                    { label: 'Salon', value: message.channel?.name ?? message.channelId },
                    { label: 'Heure de suppression', value: new Date().toLocaleString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }) },
                    { label: 'Supprimé par', value: deletedBy },
                ],
                longText: { label: 'Contenu', value: 'Message non mis en cache (trop ancien ou hors cache)' },
            });
        }

        const config = await getConfig()
        const logChannel = message.guild?.channels.cache.get(config.log_messages);
        if (!logChannel) return;

        const formatDate = (date) =>
            date.toLocaleString('fr-FR', {
                weekday: 'long', day: '2-digit', month: 'long',
                year: 'numeric', hour: '2-digit', minute: '2-digit',
                timeZone: 'Europe/Paris',
            });

        // Priorité : données Discord.js > cache local
        const authorId     = message.author?.id     ?? cached?.authorId;
        const authorTag    = message.author?.tag     ?? cached?.authorTag;
        const authorAvatar = message.author?.displayAvatarURL({ dynamic: true, size: 128 }) ?? cached?.authorAvatar ?? null;
        const createdAt    = message.createdAt       ?? cached?.createdAt;

        const auteurDisplay = authorId
            ? `${authorTag ?? authorId} (${authorId})${message.author?.bot ? ' [bot]' : ''}`
            : 'Inconnu';

        let deletedBy = 'Inconnu';
        try {
            const fetchedLogs = await message.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MessageDelete });
            const log = fetchedLogs.entries.first();
            if (log && log.target?.id === authorId && Date.now() - log.createdTimestamp < 5000) {
                deletedBy = `${log.executor.tag} (${log.executor.id})`;
            }
        } catch {}

        // Message vocal supprimé → log spéciale
        const wasVoice = cached?.isVoiceMessage || message.flags?.has(MessageFlags.IsVoiceMessage);
        if (wasVoice) {
            const durSecs = cached?.voiceDuration || 0;
            return sendLogCard(logChannel, {
                title: 'Message vocal supprimé',
                accent: '#ef4444',
                avatarURL: authorAvatar,
                rows: [
                    { label: 'Auteur', value: auteurDisplay },
                    { label: 'Salon', value: message.channel?.name ?? message.channelId },
                    { label: 'Créé le', value: createdAt ? formatDate(createdAt) : 'Inconnue' },
                    { label: 'Supprimé le', value: formatDate(new Date()) },
                    { label: 'Supprimé par', value: deletedBy },
                    { label: 'Durée', value: durSecs > 0 ? `${Math.round(durSecs)}s` : 'Inconnue' },
                ],
                footerExtra: authorId ? `ID: ${authorId}` : undefined,
            });
        }

        // Contenu : Discord.js en priorité, sinon cache local
        const contenu = message.content?.slice(0, 1000)
            || cached?.content?.slice(0, 1000)
            || (message.embeds?.length || cached?.embeds ? '(embed)' : '')
            || (message.attachments?.size || cached?.attachments ? '(fichier)' : '')
            || '(vide)';

        await sendLogCard(logChannel, {
            title: 'Message supprimé',
            accent: '#ef4444',
            avatarURL: authorAvatar,
            rows: [
                { label: 'Auteur', value: auteurDisplay },
                { label: 'Salon', value: message.channel?.name ?? message.channelId },
                { label: 'Créé le', value: createdAt ? formatDate(createdAt) : 'Inconnue' },
                { label: 'Supprimé le', value: formatDate(new Date()) },
                { label: 'Supprimé par', value: deletedBy },
            ],
            longText: { label: 'Contenu', value: contenu },
            footerExtra: authorId ? `ID: ${authorId}` : undefined,
        });
    });
};
