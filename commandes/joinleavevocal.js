'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const { startVocalIA, stopVocalIA } = require('../../grokVocal.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vocal')
    .setDescription('Gérer le bot vocal IA')
    .addSubcommand(sub =>
      sub.setName('join')
        .setDescription('Le bot rejoint ton salon vocal')
    )
    .addSubcommand(sub =>
      sub.setName('leave')
        .setDescription('Le bot quitte le salon vocal')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'join') {
      const channel = interaction.member?.voice?.channel;
      if (!channel) {
        return interaction.reply({ content: '❌ Tu dois être dans un salon vocal.', ephemeral: true });
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
  },
};