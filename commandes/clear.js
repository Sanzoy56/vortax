const { PermissionFlagsBits } = require('discord.js');

const ALLOWED_ROLES = [
  '1491458130322919435', // Sanzoy
  '1473460100210360370', // Vortax
  '1361408552664568100', // Admin
];

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'clear') return;

    const hasAnyPerm = ALLOWED_ROLES.some(id => interaction.member.roles.cache.has(id));
    if (!hasAnyPerm) return interaction.reply({ content: '❌ Tu n\'as pas la permission.', ephemeral: true });

    const nombre = interaction.options.getInteger('nombre');
    const salon = interaction.channel;

    if (!salon.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: '❌ Je n\'ai pas la permission de supprimer des messages ici.', ephemeral: true });
    }

    await interaction.deferReply({ flags: 64 });

    try {
      const supprimes = await salon.bulkDelete(nombre, true);
      await interaction.editReply({ content: `✅ **${supprimes.size}** message(s) supprimé(s).` });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
    } catch (error) {
      console.error('Erreur clear :', error);
      await interaction.editReply({ content: '❌ Erreur. Les messages de plus de 14 jours ne peuvent pas être supprimés en masse.' });
    }
  });
};