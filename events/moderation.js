const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { getConfig } = require('../config')

module.exports = (client) => {

    // ========== BAN ==========
    client.on('guildBanAdd', async (ban) => {
        const guild = ban.guild;
        const user  = ban.user;

        const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 }).catch(() => null);
        const entry     = auditLogs?.entries.first();
        const executeur = entry?.executor;
        const raison    = entry?.reason ?? 'Aucune raison fournie';

        const embed = new EmbedBuilder()
            .setTitle('🔨 Membre banni')
            .setColor(0x36393F)
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
            .setThumbnail(user.displayAvatarURL())
            .setDescription(
                `👥 **Sanctionné :** <@${user.id}> (\`${user.username}\`)\n` +
                `🛡️ **Sanctionné par :** <@${executeur?.id}> (\`${executeur?.username ?? 'Inconnu'}\`)\n` +
                `🗓️ **Date :** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
                `🏷️ **ID :** \`${user.id}\``
            )
            .addFields({ name: '📋 Motif', value: `\`\`\`${raison}\`\`\`` })
            .setTimestamp()
            .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: guild.iconURL() ?? null });

        const config = await getConfig()
        const logSalon = guild.channels.cache.get(config.log_moderation);
        if (!logSalon) return console.error('❌ [BAN] Salon introuvable ! ID:', config.logs?.moderation);
        await logSalon.send({ embeds: [embed] });
    });

    // ========== UNBAN ==========
    client.on('guildBanRemove', async (ban) => {
        const guild = ban.guild;
        const user  = ban.user;

        const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanRemove, limit: 1 }).catch(() => null);
        const entry     = auditLogs?.entries.first();
        const executeur = entry?.executor;

        const embed = new EmbedBuilder()
            .setTitle('🔓 Membre débanni')
            .setColor(0x36393F)
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
            .setThumbnail(user.displayAvatarURL())
            .setDescription(
                `👥 **Débanni :** <@${user.id}> (\`${user.username}\`)\n` +
                `🛡️ **Débanni par :** <@${executeur?.id}> (\`${executeur?.username ?? 'Inconnu'}\`)\n` +
                `🗓️ **Date :** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
                `🏷️ **ID :** \`${user.id}\``
            )
            .setTimestamp()
            .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: guild.iconURL() ?? null });

        const config = await getConfig()
        const logSalon = guild.channels.cache.get(config.log_moderation);
        if (!logSalon) return console.error('❌ [UNBAN] Salon introuvable ! ID:', config.logs?.moderation);
        await logSalon.send({ embeds: [embed] });
    });

    // ========== KICK ==========
    client.on('guildMemberRemove', async (member) => {
        const auditLogs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 1 }).catch(() => null);
        const entry     = auditLogs?.entries.first();

        if (!entry || entry.target.id !== member.id) return;
        if (Date.now() - entry.createdTimestamp > 5000) return;

        const executeur = entry.executor;
        const raison    = entry.reason ?? 'Aucune raison fournie';

        const embed = new EmbedBuilder()
            .setTitle('👢 Membre kické')
            .setColor(0x36393F)
            .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
            .setThumbnail(member.user.displayAvatarURL())
            .setDescription(
                `👥 **Sanctionné :** <@${member.id}> (\`${member.user.username}\`)\n` +
                `🛡️ **Sanctionné par :** <@${executeur?.id}> (\`${executeur?.username ?? 'Inconnu'}\`)\n` +
                `🗓️ **Date :** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
                `🏷️ **ID :** \`${member.id}\``
            )
            .addFields({ name: '📋 Motif', value: `\`\`\`${raison}\`\`\`` })
            .setTimestamp()
            .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: member.guild.iconURL() ?? null });

        const config = await getConfig()
        const logSalon = member.guild.channels.cache.get(config.log_moderation); 
        if (!logSalon) return console.error('❌ [KICK] Salon introuvable ! ID:', config.logs?.moderation);
        await logSalon.send({ embeds: [embed] });
    });

    // ========== TIMEOUT ==========
    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        const guild       = newMember.guild;
        const wasTimedOut = oldMember.communicationDisabledUntil;
        const isTimedOut  = newMember.communicationDisabledUntil;

        const config = await getConfig()
        const logSalon = guild.channels.cache.get(config.log_moderation);
        if (!logSalon) return console.error('❌ [TIMEOUT] Salon introuvable ! ID:', config.logs?.moderation);

        // Timeout ajouté
        if (isTimedOut && (!wasTimedOut || wasTimedOut < new Date())) {
            const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 1 }).catch(() => null);
            const entry     = auditLogs?.entries.first();
            const executeur = entry?.executor;
            const raison    = entry?.reason ?? 'Aucune raison fournie';

            await logSalon.send({
                embeds: [new EmbedBuilder()
                    .setTitle('🔇 Membre mis en timeout')
                    .setColor(0x36393F)
                    .setAuthor({ name: newMember.user.username, iconURL: newMember.user.displayAvatarURL() })
                    .setThumbnail(newMember.user.displayAvatarURL())
                    .setDescription(
                        `👥 **Sanctionné :** <@${newMember.id}> (\`${newMember.user.username}\`)\n` +
                        `🛡️ **Sanctionné par :** ${executeur ? `<@${executeur.id}> (\`${executeur.username}\`)` : '`Inconnu`'}\n` +
                        `⏱️ **Fin du timeout :** <t:${Math.floor(isTimedOut.getTime() / 1000)}:F>\n` +
                        `🗓️ **Date :** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
                        `🏷️ **ID :** \`${newMember.id}\``
                    )
                    .addFields({ name: '📋 Motif', value: `\`\`\`${raison}\`\`\`` })
                    .setTimestamp()
                    .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: guild.iconURL() ?? null })
                ]
            }).catch(err => console.error('❌ [TIMEOUT] Erreur envoi:', err.message));
        }

        // Timeout retiré
        if (wasTimedOut && !isTimedOut) {
            await logSalon.send({
                embeds: [new EmbedBuilder()
                    .setTitle('🔊 Timeout retiré')
                    .setColor(0x36393F)
                    .setAuthor({ name: newMember.user.username, iconURL: newMember.user.displayAvatarURL() })
                    .setThumbnail(newMember.user.displayAvatarURL())
                    .setDescription(
                        `👥 **Membre :** <@${newMember.id}> (\`${newMember.user.username}\`)\n` +
                        `🗓️ **Date :** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
                        `🏷️ **ID :** \`${newMember.id}\``
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Team Vortax © 2024 - 2026', iconURL: guild.iconURL() ?? null })
                ]
            }).catch(err => console.error('❌ [TIMEOUT RETIRÉ] Erreur envoi:', err.message));
        }
    });

};