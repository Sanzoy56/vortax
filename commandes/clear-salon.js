const { PermissionFlagsBits } = require('discord.js');

const ALLOWED_ROLES = [
  '1491458130322919435', // Sanzoy
  '1473460100210360370', // Vortax
  '1361408552664568100', // Admin
];

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'clear-salon') return;

    const hasAnyPerm = ALLOWED_ROLES.some(id => interaction.member.roles.cache.has(id));
    if (!hasAnyPerm) return interaction.reply({ content: '❌ Tu n\'as pas la permission.', ephemeral: true });

    const salon = interaction.channel;

    if (!salon.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: '❌ Je n\'ai pas la permission de gérer ce salon.', ephemeral: true });
    }

    await interaction.reply({ content: '🧹 Vidage du salon en cours…', flags: 64 });

    try {
      // bulkDelete est limité (100 messages, < 14 jours) : on clone le salon
      // puis on supprime l'original — le salon est instantanément vide,
      // avec les mêmes permissions, position et catégorie.
      const clone = await salon.clone();
      await clone.setPosition(salon.position);
      await salon.delete('Vidage complet du salon (/clear-salon)');
      await clone.send('🧹 **Salon vidé.**');
    } catch (error) {
      console.error('Erreur clear-salon :', error);
      await interaction.followUp({ content: '❌ Erreur lors du vidage du salon.', flags: 64 }).catch(() => {});
    }
  });
};
