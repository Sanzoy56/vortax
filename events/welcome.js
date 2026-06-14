const { getConfig } = require('../config')
const { sendWelcomeCard } = require('../levels/welcomeCard')

module.exports = (client) => {
  client.on('guildMemberAdd', async (member) => {
    const config = await getConfig()
    const channel = member.guild.channels.cache.get(config.welcome);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const fetchedMember = await member.guild.members.fetch({ user: member.id, force: true });

      await sendWelcomeCard(channel, 'welcome', fetchedMember);

      if (fetchedMember.user.bot) {
        const botRole = config.roles?.auto_bot;
        if (botRole) await fetchedMember.roles.add(botRole).catch(err => console.error('❌ Erreur ajout rôle bot:', err.message));
      } else {
        const autoRoles = config.welcomeRole ? [config.welcomeRole] : [];
        for (const roleId of autoRoles) {
          await fetchedMember.roles.add(roleId).catch(err => console.error('❌ Erreur ajout rôle:', err.message));
        }
      }
    } catch (err) {
      console.error('❌ Erreur welcome:', err);
    }
  });

  client.on('guildMemberRemove', async (member) => {
    const config = await getConfig()
    const channel = member.guild.channels.cache.get(config.leave);
    try {
      await sendWelcomeCard(channel, 'leave', member);
    } catch (err) {
      console.error('❌ Erreur leave:', err);
    }
  });
};
