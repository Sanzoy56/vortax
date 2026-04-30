const { Events, EmbedBuilder } = require('discord.js');
const { logs } = require('../config.json');

module.exports = (client) => {

    // ========== MESSAGE MODIFIÉ ==========
    client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
        if (newMessage.partial) return;
        if (newMessage.author?.bot) return;
        if (!oldMessage.content || !newMessage.content) return;
        if (oldMessage.content === newMessage.content) return;

        const logChannel = newMessage.guild?.channels.cache.get(logs.messages);
        if (!logChannel) return;

        const createdAt = oldMessage.createdAt;
        const editedAt = newMessage.editedAt ?? new Date();
        const delaySeconds = Math.round((editedAt - createdAt) / 1000);

        const formatDate = (date) =>
            date.toLocaleString('fr-FR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });

        let modifiedBy = `${newMessage.author.tag} (${newMessage.author.id})`;

        try {
            const fetchedLogs = await newMessage.guild.fetchAuditLogs({ limit: 1, type: 72 });
            const log = fetchedLogs.entries.first();
            if (log && log.target.id === newMessage.author.id && Date.now() - log.createdTimestamp < 5000) {
                modifiedBy = `${log.executor.tag} (${log.executor.id})`;
            }
        } catch {}

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
                        `🔧 **Modifié par :** ${modifiedBy}`,
                    ].join('\n'),
                },
                {
                    name: '🖊️ Ancien message :',
                    value: `\`\`\`\n${oldMessage.content.slice(0, 1000) || '(vide)'}\n\`\`\``,
                },
                {
                    name: '🔄 Nouveau message :',
                    value: `\`\`\`\n${newMessage.content.slice(0, 1000) || '(vide)'}\n\`\`\``,
                },
            )
            .setFooter({
                text: `Team jaune © 2024 - 2026 • Aujourd'hui à ${editedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
                iconURL: newMessage.guild.iconURL({ dynamic: true }),
            })
            .setTimestamp(editedAt);

        await logChannel.send({ embeds: [embed] });
    });

    // ========== MESSAGE SUPPRIMÉ ==========
    client.on(Events.MessageDelete, async (message) => {
        if (message.partial) return;
        if (message.author?.bot) return;
        if (!message.content) return;

        const logChannel = message.guild?.channels.cache.get(logs.messages);
        if (!logChannel) return;

        const deletedAt = new Date();

        const formatDate = (date) =>
            date.toLocaleString('fr-FR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });

        let deletedBy = `Inconnu`;

        try {
            const fetchedLogs = await message.guild.fetchAuditLogs({ limit: 1, type: 72 });
            const log = fetchedLogs.entries.first();
            if (log && log.target.id === message.author.id && Date.now() - log.createdTimestamp < 5000) {
                deletedBy = `${log.executor.tag} (${log.executor.id})`;
            }
        } catch {}

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Message Supprimé')
            .setColor(0x2b2d31)
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 128 }))
            .addFields(
                {
                    name: '\u200b',
                    value: [
                        `🧑 **Auteur :** <@${message.author.id}> (${message.author.id})`,
                        `💬 **Salon :** <#${message.channelId}> (${message.channelId})`,
                        `📅 **Date de création du message :** ${formatDate(message.createdAt)}`,
                        `🕐 **Heure de suppression :** ${formatDate(deletedAt)}`,
                        `🔧 **Supprimé par :** ${deletedBy}`,
                    ].join('\n'),
                },
                {
                    name: '🗒️ Contenu du message :',
                    value: `\`\`\`\n${message.content.slice(0, 1000) || '(vide)'}\n\`\`\``,
                },
            )
            .setFooter({
                text: `Team jaune © 2024 - 2026 • Aujourd'hui à ${deletedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
                iconURL: message.guild.iconURL({ dynamic: true }),
            })
            .setTimestamp(deletedAt);

        await logChannel.send({ embeds: [embed] });
    });

};