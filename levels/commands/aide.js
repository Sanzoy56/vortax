'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
  XP_PAR_MESSAGE, XP_VOCAL_PAR_MINUTE, COINS_PAR_MESSAGE,
  PURGE_PRIX, ROB_COOLDOWN_MS, ROB_PENALITE,
} = require('../config.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aide')
    .setDescription('Affiche toutes les commandes du système de niveaux'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📖 Commandes du système de niveaux')
      .setColor(0x5865f2)
      .addFields(
        {
          name: '📊 Progression',
          value: [
            '`/profil` — Ton profil complet',
            '`/profil @membre` — Profil d\'un membre',
            '`/top` — Classement Top 10 XP',
            '`/topmoney` — Classement Top 10 Coins',
          ].join('\n'),
        },
        {
          name: '📋 Quêtes',
          value: '`/quetes` — Tes quêtes du jour (reset à minuit)',
        },
        {
          name: '🛒 Boutiques',
          value: [
            '`/boutique` — Boosts XP + boîte surprise',
            '`/boutique-roles` — Boosts XP permanents',
            '`/items` — Bouclier, purge malus, lame acérée',
            '`/use` — Activer un item depuis ton inventaire',
          ].join('\n'),
        },
        {
          name: '💰 Coins',
          value: [
            '`/donner @membre <montant>` — Donner des coins à quelqu\'un',
            '`/purge` — Supprimer ton malus actif (' + PURGE_PRIX.toLocaleString() + ' VTX-Coins)',
          ].join('\n'),
        },
        {
          name: '🔫 Rob',
          value: [
            '`/rob @membre` — Voler entre 5% et 15% des coins (max 75%, cooldown 4h)',
            `30% de chances d'échouer → tu perds **${ROB_PENALITE.toLocaleString()} coins**`,
          ].join('\n'),
        },
        {
          name: '🎮 Divertissement',
          value: [
            '`/iq` — Teste ton QI du jour (reset à minuit)',
            '`/meteo <ville>` — Affiche la météo d\'une ville',
          ].join('\n'),
        },
        {
          name: 'ℹ️ Infos',
          value: [
            `Tu gagnes **${XP_PAR_MESSAGE} XP** et **${COINS_PAR_MESSAGE} VTX-Coins** par message (1 fois/45s max).`,
            `Tu gagnes **${XP_VOCAL_PAR_MINUTE} XP/min** en vocal (2+ personnes, sans mute).`,
            `Ton streak augmente ton XP jusqu'à **+20%** !`,
          ].join('\n'),
        },
      )
      .setFooter({ text: 'Team Vortax 2024 - 2026', iconURL: interaction.guild.iconURL({ dynamic: true }) })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};