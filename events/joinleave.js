const { getConfig } = require('../config')
const { sendLogCard } = require('../levels/logCard')

module.exports = (client) => {

    // ========== MEMBRE REJOINT ==========
    client.on('guildMemberAdd', async (member) => {
        const config = await getConfig()
        const logSalon = member.guild.channels.cache.get(config.log_welcome);
        if (!logSalon) return;

        const ageCompte = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));

        await sendLogCard(logSalon, {
            title: 'Membre rejoint',
            accent: '#22c55e',
            avatarURL: member.user.displayAvatarURL(),
            rows: [
                { label: 'Membre', value: `${member.user.username} (${member.id})` },
                { label: 'Compte créé le', value: new Date(member.user.createdTimestamp).toLocaleString('fr-FR') },
                { label: 'Âge du compte', value: `${ageCompte} jours` },
                { label: 'Arrivée le', value: new Date().toLocaleString('fr-FR') },
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

        await sendLogCard(logSalon, {
            title: 'Membre parti',
            accent: '#ef4444',
            avatarURL: member.user.displayAvatarURL(),
            rows: [
                { label: 'Membre', value: `${member.user.username} (${member.id})` },
                { label: 'Arrivé le', value: new Date(member.joinedTimestamp).toLocaleString('fr-FR') },
                { label: 'Durée sur le serveur', value: `${duree} jours` },
                { label: 'Membres', value: `${member.guild.memberCount}` },
            ],
            longText: { label: 'Rôles', value: roles },
            footerExtra: `ID: ${member.id}`,
        });
    });
};
