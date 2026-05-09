'use strict';

const {
  SlashCommandBuilder,
  ChannelType
} = require('discord.js');

const {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
  entersState
} = require('@discordjs/voice');

const {
  startVocalIA,
  stopVocalIA
} = require('../../grokVocal.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vocal')
    .setDescription('Gestion vocal IA')
    .addSubcommand(sub =>
      sub
        .setName('join')
        .setDescription('Rejoindre un salon vocal')
        .addChannelOption(option =>
          option
            .setName('salon')
            .setDescription('Salon vocal à rejoindre')
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('leave')
        .setDescription('Quitter le salon vocal')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ─────────────────────────────────────────
    // /vocal join
    // ─────────────────────────────────────────
    if (sub === 'join') {
      const channel = interaction.options.getChannel('salon');

      // Vérif synchrone AVANT deferReply → réponse immédiate
      if (getVoiceConnection(interaction.guild.id)) {
        return interaction.reply({
          content: '❌ Je suis déjà connecté à un vocal.',
          flags: 64
        });
      }

      // Defer immédiat — si l'interaction a expiré on abandonne proprement
      try {
        await interaction.deferReply({ flags: 64 });
      } catch {
        console.warn('[VOCAL] Interaction expirée avant deferReply (/join)');
        return;
      }

      try {
        const connection = joinVoiceChannel({
          channelId: channel.id,
          guildId: interaction.guild.id,
          adapterCreator: interaction.guild.voiceAdapterCreator,
          selfDeaf: false,
          selfMute: false
        });

        await entersState(connection, VoiceConnectionStatus.Ready, 20_000);

        startVocalIA(connection, interaction.guild.id);

        return interaction.editReply({
          content: `✅ Connecté à **${channel.name}** — IA vocale active.`
        });

      } catch (err) {
        console.error('[VOCAL JOIN ERROR]', err);
        return interaction.editReply({
          content: '❌ Impossible de rejoindre le vocal. Vérifie les permissions ou réessaie.'
        });
      }
    }

    // ─────────────────────────────────────────
    // /vocal leave
    // ─────────────────────────────────────────
    if (sub === 'leave') {
      const connection = getVoiceConnection(interaction.guild.id);

      // Vérif synchrone AVANT deferReply → réponse immédiate
      if (!connection) {
        return interaction.reply({
          content: '❌ Je ne suis connecté à aucun vocal.',
          flags: 64
        });
      }

      try {
        await interaction.deferReply({ flags: 64 });
      } catch {
        console.warn('[VOCAL] Interaction expirée avant deferReply (/leave)');
        return;
      }

      stopVocalIA(interaction.guild.id);
      connection.destroy();

      return interaction.editReply({
        content: '✅ Déconnecté du vocal.'
      });
    }
  }
};