'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, saveUser } = require('../db');
const { PROTECTED_USERS, ROB } = require('../config');

const PERDU = '<:26643crossmark:1510067005066055690>';

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
  return n.toLocaleString('fr-FR');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Vole de l\'argent à un membre')
    .addUserOption(o => o.setName('cible').setDescription('Membre à voler').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('cible');
    const userId = interaction.user.id;

    if (target.id === userId)
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xef4444).setDescription(`${PERDU} Tu ne peux pas te voler toi-même.`)], ephemeral: true });
    if (PROTECTED_USERS.includes(target.id))
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5a5a7a).setDescription('🛡️ Cette personne est protégée.')], ephemeral: true });

    const robber = getUser(userId);
    const victim = getUser(target.id);

    // Cooldown
    const now  = Date.now();
    const diff = now - (robber.rob?.lastUsed || 0);
    if (diff < ROB.COOLDOWN_MS) {
      const remaining = Math.ceil((ROB.COOLDOWN_MS - diff) / 60_000);
      const hrs  = Math.floor(remaining / 60);
      const mins = remaining % 60;
      const label = hrs > 0 ? `${hrs}h ${mins}min` : `${mins} min`;
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription(`⏳ Attends encore **${label}** avant de re-voler.`)], ephemeral: true });
    }

    if (!robber.rob) robber.rob = {};
    robber.rob.lastUsed = now;

    // Victime sans argent
    if (victim.wallet <= 0) {
      saveUser(robber);
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x5a5a7a).setDescription(`💸 **${target.username}** n'a rien sur lui, tout est en banque !`)],
      });
    }

    // Vol (toujours réussi)
    const percent = ROB.MIN_PERCENT + Math.random() * (ROB.MAX_PERCENT - ROB.MIN_PERCENT);
    const stolen  = Math.max(1, Math.floor(victim.wallet * percent));

    victim.wallet -= stolen;
    robber.wallet += stolen;
    saveUser(robber);
    saveUser(victim);

    const emojiSuccess = ROB.EMOJI_SUCCESS;
    const emojiCoin    = ROB.EMOJI_COIN;

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x22c55e)
          .setDescription(`${emojiSuccess} Tu as volé ${emojiCoin} **${fmt(stolen)}** à **${target.username}** !`),
      ],
    });
  },
};
