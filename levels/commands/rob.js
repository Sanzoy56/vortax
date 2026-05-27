'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, saveUser } = require('../db');
const { PROTECTED_USERS, ROB } = require('../config');

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
      return interaction.reply({ content: '❌ Tu ne peux pas te voler toi-même.', ephemeral: true });
    if (PROTECTED_USERS.includes(target.id))
      return interaction.reply({ content: '🛡️ Cette personne est protégée.', ephemeral: true });

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
      return interaction.reply({ content: `⏳ Attends encore **${label}** avant de re-voler.`, ephemeral: true });
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

    const emojiSuccess = interaction.guild.emojis.cache.get(ROB.EMOJI_SUCCESS)?.toString() ?? '🤑';
    const emojiCoin    = interaction.guild.emojis.cache.get(ROB.EMOJI_COIN)?.toString()    ?? '🪙';

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x22c55e)
          .setDescription(`${emojiSuccess} Tu as volé ${emojiCoin} **${fmt(stolen)}** à **${target.username}** !`),
      ],
    });
  },
};
