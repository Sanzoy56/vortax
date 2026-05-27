const { Events, EmbedBuilder } = require('discord.js');
const { getConfig } = require('../config')

module.exports = (client) => {

    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        if (newState.member?.user.bot) return;

        const config = await getConfig()
        const logChannel = newState.guild?.channels.cache.get(config.log_vocal);
        if (!logChannel) return;

        const member = newState.member;
        const now = new Date();

        const formatDate = (date) =>
            date.toLocaleString('fr-FR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });

        const footer = {
            text: `Team Vortax © 2024 - 2026`,
            iconURL: newState.guild.iconURL({ dynamic: true }),
        };

        // ========== REJOINT UN SALON VOCAL ==========
        if (!oldState.channelId && newState.channelId) {
            const embed = new EmbedBuilder()
                .setTitle('🔊 Salon Vocal Rejoint')
                .setColor(0x2b2d31)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
                .addFields({
                    name: '\u200b',
                    value: [
                        `🧑 **Membre :** <@${member.id}> (${member.id})`,
                        `🔊 **Salon rejoint :** <#${newState.channelId}> (${newState.channelId})`,
                        `📅 **Date :** ${formatDate(now)}`,
                    ].join('\n'),
                })
                .setFooter(footer)
                .setTimestamp(now);

            await logChannel.send({ embeds: [embed] });

        // ========== QUITTE UN SALON VOCAL ==========
        } else if (oldState.channelId && !newState.channelId) {
            const embed = new EmbedBuilder()
                .setTitle('🔇 Salon Vocal Quitté')
                .setColor(0x2b2d31)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
                .addFields({
                    name: '\u200b',
                    value: [
                        `🧑 **Membre :** <@${member.id}> (${member.id})`,
                        `🔇 **Salon quitté :** <#${oldState.channelId}> (${oldState.channelId})`,
                        `📅 **Date :** ${formatDate(now)}`,
                    ].join('\n'),
                })
                .setFooter(footer)
                .setTimestamp(now);

            await logChannel.send({ embeds: [embed] });

        // ========== CHANGE DE SALON VOCAL ==========
        } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            const embed = new EmbedBuilder()
                .setTitle('🔀 Changement de Salon Vocal')
                .setColor(0x2b2d31)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
                .addFields({
                    name: '\u200b',
                    value: [
                        `🧑 **Membre :** <@${member.id}> (${member.id})`,
                        `🔇 **Ancien salon :** <#${oldState.channelId}> (${oldState.channelId})`,
                        `🔊 **Nouveau salon :** <#${newState.channelId}> (${newState.channelId})`,
                        `📅 **Date :** ${formatDate(now)}`,
                    ].join('\n'),
                })
                .setFooter(footer)
                .setTimestamp(now);

            await logChannel.send({ embeds: [embed] });

        // ========== MICRO COUPÉ / ACTIVÉ (soi-même) ==========
        } else if (oldState.selfMute !== newState.selfMute && newState.channelId) {
            const title = newState.selfMute ? '🔇 Micro Coupé' : '🎤 Micro Activé';
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setColor(0x2b2d31)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
                .addFields({
                    name: '\u200b',
                    value: [
                        `🧑 **Membre :** <@${member.id}> (${member.id})`,
                        `🔊 **Salon :** <#${newState.channelId}> (${newState.channelId})`,
                        `📅 **Date :** ${formatDate(now)}`,
                    ].join('\n'),
                })
                .setFooter(footer)
                .setTimestamp(now);

            await logChannel.send({ embeds: [embed] });

        // ========== MICRO MUTE SUR LE SERVEUR (par un modo) ==========
        } else if (oldState.serverMute !== newState.serverMute && newState.channelId) {
            const title = newState.serverMute ? '📵 Micro Mute sur le Serveur' : '🎤 Micro Mute Levé';
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setColor(0x2b2d31)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
                .addFields({
                    name: '\u200b',
                    value: [
                        `🧑 **Membre :** <@${member.id}> (${member.id})`,
                        `🔊 **Salon :** <#${newState.channelId}> (${newState.channelId})`,
                        `📅 **Date :** ${formatDate(now)}`,
                    ].join('\n'),
                })
                .setFooter(footer)
                .setTimestamp(now);

            await logChannel.send({ embeds: [embed] });

        // ========== MUTE CASQUE (soi-même) ==========
        } else if (oldState.selfDeaf !== newState.selfDeaf && newState.channelId) {
            const title = newState.selfDeaf ? '🎧 Mute Casque Activé' : '🎧 Mute Casque Désactivé';
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setColor(0x2b2d31)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
                .addFields({
                    name: '\u200b',
                    value: [
                        `🧑 **Membre :** <@${member.id}> (${member.id})`,
                        `🔊 **Salon :** <#${newState.channelId}> (${newState.channelId})`,
                        `📅 **Date :** ${formatDate(now)}`,
                    ].join('\n'),
                })
                .setFooter(footer)
                .setTimestamp(now);

            await logChannel.send({ embeds: [embed] });

        // ========== MIS EN SOURDINE SUR LE SERVEUR (par un modo) ==========
        } else if (oldState.serverDeaf !== newState.serverDeaf && newState.channelId) {
            const title = newState.serverDeaf ? '📵 Mis en Sourdine sur le Serveur' : '🔊 Sourdine Serveur Levée';
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setColor(0x2b2d31)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
                .addFields({
                    name: '\u200b',
                    value: [
                        `🧑 **Membre :** <@${member.id}> (${member.id})`,
                        `🔊 **Salon :** <#${newState.channelId}> (${newState.channelId})`,
                        `📅 **Date :** ${formatDate(now)}`,
                    ].join('\n'),
                })
                .setFooter(footer)
                .setTimestamp(now);

            await logChannel.send({ embeds: [embed] });
        }
    });

};