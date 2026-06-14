const { getConfig } = require('../config')
const { sendMemberCard } = require('../levels/logCard')

module.exports = (client) => {

    // ========== MEMBRE REJOINT ==========
    client.on('guildMemberAdd', async (member) => {
        const config = await getConfig()
        const logSalon = member.guild.channels.cache.get(config.log_welcome);
        if (!logSalon) return;

        const ageCompte = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));

        await sendMemberCard(logSalon, {
            title: 'Bienvenue sur le serveur !',
            accent: '#22c55e',
            avatarURL: member.user.displayAvatarURL(),
            username: `${member.user.username} (${member.id})`,
            stats: [
                { label: 'Compte créé le', value: new Date(member.user.createdTimestamp).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }) },
                { label: 'Âge du compte', value: `${ageCompte} jour${ageCompte === 1 ? '' : 's'}` },
                { label: 'Membres', value: `${member.guild.memberCount}` },
            ],
            footerExtra: `ID: ${member.id}`,
        });
    });

    // ========== MEMBRE PARTI ==========
    client.on('guildMemberRemove', async (member) => {
        const config = await getConfig()
        const logSalon = member.guild.channels.cache.get(config.log_welcome);
        if (!logSalon) return;

        const duree = Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24));
        const roles = member.roles.cache
            .filter(r => r.id !== member.guild.id)
            .map(r => r.name)
            .join(', ') || 'Aucun';

        await sendMemberCard(logSalon, {
            title: 'Un membre a quitté le serveur',
            accent: '#ef4444',
            avatarURL: member.user.displayAvatarURL(),
            username: `${member.user.username} (${member.id})`,
            stats: [
                { label: 'Arrivé le', value: new Date(member.joinedTimestamp).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }) },
                { label: 'Durée sur le serveur', value: `${duree} jour${duree === 1 ? '' : 's'}` },
                { label: 'Membres', value: `${member.guild.memberCount}` },
            ],
            longText: { label: 'Rôles', value: roles },
            footerExtra: `ID: ${member.id}`,
        });
    });
};
