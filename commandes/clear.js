const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprime des messages dans le salon')
    .addIntegerOption(option =>
      option
        .setName('nombre')
        .setDescription('Nombre de messages à supprimer (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const nombre = interaction.options.getInteger('nombre');
    const salon = interaction.channel;

    // Vérification des permissions du bot
    if (!salon.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: '❌ Je n\'ai pas la permission de supprimer des messages dans ce salon.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const messagesSupprimes = await salon.bulkDelete(nombre, true);
      // Note : bulkDelete ignore les messages de plus de 14 jours

      await interaction.editReply({
        content: `✅ **${messagesSupprimes.size}** message(s) supprimé(s) avec succès.`,
      });

      // Suppression automatique de la confirmation après 5 secondes
      setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);

    } catch (error) {
      console.error('Erreur lors du clear :', error);
      await interaction.editReply({
        content: '❌ Une erreur est survenue. Les messages de plus de 14 jours ne peuvent pas être supprimés en masse.',
      });
    }
  },
};