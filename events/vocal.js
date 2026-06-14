const { Events } = require('discord.js');
const { getConfig } = require('../config')
const { sendLogCard } = require('../levels/logCard')

module.exports = (client) => {

    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        if (newState.member?.user.bot) return;

        const config = await getConfig()
        const logChannel = newState.guild?.channels.cache.get(config.log_vocal);
        if (!logChannel) return;

        const member = newState.member;
        const now = new Date();
        const guild = newState.guild;
        const channelName = (id) => guild.channels.cache.get(id)?.name ?? id;

        const formatDate = (date) =>
            date.toLocaleString('fr-FR', {
                timeZone: 'Europe/Paris',
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });

        const card = (title, rows) => sendLogCard(logChannel, {
            title,
            accent: '#a855f7',
            avatarURL: member.user.displayAvatarURL({ dynamic: true, size: 128 }),
            rows: [
                { label: 'Membre', value: `${member.user.tag} (${member.id})` },
                ...rows,
                { label: 'Date', value: formatDate(now) },
            ],
            footerExtra: `ID: ${member.id}`,
        });

        // ========== REJOINT UN SALON VOCAL ==========
        if (!oldState.channelId && newState.channelId) {
            await card('Salon vocal rejoint', [
                { label: 'Salon rejoint', value: channelName(newState.channelId) },
            ]);

        // ========== QUITTE UN SALON VOCAL ==========
        } else if (oldState.channelId && !newState.channelId) {
            await card('Salon vocal quitté', [
                { label: 'Salon quitté', value: channelName(oldState.channelId) },
            ]);

        // ========== CHANGE DE SALON VOCAL ==========
        } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            await card('Changement de salon vocal', [
                { label: 'Ancien salon', value: channelName(oldState.channelId) },
                { label: 'Nouveau salon', value: channelName(newState.channelId) },
            ]);

        // ========== MICRO COUPÉ / ACTIVÉ (soi-même) ==========
        } else if (oldState.selfMute !== newState.selfMute && newState.channelId) {
            await card(newState.selfMute ? 'Micro coupé' : 'Micro activé', [
                { label: 'Salon', value: channelName(newState.channelId) },
            ]);

        // ========== MICRO MUTE SUR LE SERVEUR (par un modo) ==========
        } else if (oldState.serverMute !== newState.serverMute && newState.channelId) {
            await card(newState.serverMute ? 'Micro mute sur le serveur' : 'Micro mute levé', [
                { label: 'Salon', value: channelName(newState.channelId) },
            ]);

        // ========== MUTE CASQUE (soi-même) ==========
        } else if (oldState.selfDeaf !== newState.selfDeaf && newState.channelId) {
            await card(newState.selfDeaf ? 'Mute casque activé' : 'Mute casque désactivé', [
                { label: 'Salon', value: channelName(newState.channelId) },
            ]);

        // ========== MIS EN SOURDINE SUR LE SERVEUR (par un modo) ==========
        } else if (oldState.serverDeaf !== newState.serverDeaf && newState.channelId) {
            await card(newState.serverDeaf ? 'Mis en sourdine sur le serveur' : 'Sourdine serveur levée', [
                { label: 'Salon', value: channelName(newState.channelId) },
            ]);
        }
    });

};
