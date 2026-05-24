const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
async function getConfig() {
  try {
    const res = await fetch('http://localhost:3001/config')
    return await res.json()
  } catch {
    return {}
  }
}

module.exports = (client) => {

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
        // ✅ On ne bloque plus les bots ni les messages sans contenu
        if (message.partial) {
            // Message pas en cache : on log quand même avec les infos disponibles
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

        const deletedAt = new Date();

        const formatDate = (date) =>
            date.toLocaleString('fr-FR', {
                weekday: 'long', day: '2-digit', month: 'long',
                year: 'numeric', hour: '2-digit', minute: '2-digit',
            });

        // ✅ Auteur : affiche l'ID même si bot ou inconnu
        const auteurDisplay = message.author
            ? `<@${message.author.id}> (${message.author.id})${message.author.bot ? ' 🤖' : ''}`
            : 'Inconnu';

        const avatarURL = message.author?.displayAvatarURL({ dynamic: true, size: 128 }) ?? null;

        let deletedBy = 'Inconnu';
        try {
            const fetchedLogs = await message.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MessageDelete });
            const log = fetchedLogs.entries.first();
            if (log && log.target?.id === message.author?.id && Date.now() - log.createdTimestamp < 5000) {
                deletedBy = `${log.executor.tag} (${log.executor.id})`;
            }
        } catch {}

        // ✅ Contenu : affiche "(embed / fichier)" si pas de texte
        const contenu = message.content?.slice(0, 1000)
            || (message.embeds.length ? '(embed)' : '')
            || (message.attachments.size ? '(fichier)' : '')
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
                        `📅 **Date de création du message :** ${formatDate(message.createdAt)}`,
                        `🕐 **Heure de suppression :** ${formatDate(deletedAt)}`,
                        `🔧 **Supprimé par :** ${deletedBy}`,
                    ].join('\n'),
                },
                { name: '🗒️ Contenu du message :', value: `\`\`\`\n${contenu}\n\`\`\`` },
            )
            .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp(deletedAt);

        if (avatarURL) embed.setThumbnail(avatarURL);

        await logChannel.send({ embeds: [embed] });
    });
};