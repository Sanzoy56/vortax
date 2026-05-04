const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ALLOWED_ROLES = [
  '1491458130322919435', // Sanzoy
  '1473460100210360370', // Vortax
  '1361408552664568100', // Admin
];

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'say') return;

    const hasAnyPerm = ALLOWED_ROLES.some(id => interaction.member.roles.cache.has(id));
    if (!hasAnyPerm) return interaction.reply({ content: '❌ Tu n\'as pas la permission.', ephemeral: true });

    const type = interaction.options.getString('type');

    // ========== MESSAGE NORMAL ==========
    if (type === 'message') {
      const message = interaction.options.getString('message');
      if (!message) return interaction.reply({ content: '❌ Tu dois renseigner un message !', ephemeral: true });
      await interaction.channel.send(message);
      await interaction.reply({ content: '✅ Message envoyé !', ephemeral: true });
    }

    // ========== EMBED ==========
    if (type === 'embed') {
      const titre = interaction.options.getString('titre');
      const description = interaction.options.getString('description');
      const couleur = interaction.options.getString('couleur') ?? '#747f8d';
      const image = interaction.options.getString('image') ?? null;

      if (!titre) return interaction.reply({ content: '❌ Tu dois renseigner un titre !', ephemeral: true });
      if (!description) return interaction.reply({ content: '❌ Tu dois renseigner une description !', ephemeral: true });

      const hexRegex = /^#([0-9A-Fa-f]{6})$/;
      if (!hexRegex.test(couleur)) {
        return interaction.reply({ content: '❌ Couleur invalide ! Format : `#FF0000`', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle(titre)
        .setDescription(description)
        .setColor(couleur);

      if (image) embed.setImage(image);

      await interaction.channel.send({ embeds: [embed] });
      await interaction.reply({ content: '✅ Embed envoyé !', ephemeral: true });
    }
  });
};