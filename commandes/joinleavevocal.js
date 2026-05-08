'use strict';
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const { startVocalIA, stopVocalIA } = require('../grokVocal.js');

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'vocal') return;

    const sub = interaction.options.getSubcommand();

    if (sub === 'join') {
      const channel = interaction.options.getChannel('salon');
      if (!channel) {
        return interaction.reply({ content: '❌ Sélectionne un salon vocal.', ephemeral: true });
      }

      const existingConnection = getVoiceConnection(interaction.guild.id);
      if (existingConnection) {
        return interaction.reply({ content: '❌ Je suis déjà dans un salon vocal.', ephemeral: true });
      }

      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId:   interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      startVocalIA(connection, interaction.guild.id);

      await interaction.reply({ content: `✅ J'ai rejoint **${channel.name}** !`, ephemeral: true });

    } else if (sub === 'leave') {
      const connection = getVoiceConnection(interaction.guild.id);
      if (!connection) {
        return interaction.reply({ content: '❌ Je ne suis dans aucun salon vocal.', ephemeral: true });
      }

      stopVocalIA(interaction.guild.id);
      connection.destroy();

      await interaction.reply({ content: '✅ J\'ai quitté le salon vocal.', ephemeral: true });
    }
  });
};