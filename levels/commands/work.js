'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const COIN = '<:49c1a23b876841ce87e5aa7dbeacada9:1509174658321223691>';
const { getUser, saveUser } = require('../db');

const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h
const MIN_EARN    = 500;
const MAX_EARN    = 1500;

const JOBS = [
  'Tu as livré des colis pour Amazon',
  'Tu as codé une feature pour un client',
  'Tu as streamé et reçu des donations',
  'Tu as vendu des NFT douteux',
  'Tu as gardé le chien du voisin',
  'Tu as fait du babysitting',
  'Tu as livré des pizzas',
  'Tu as réparé des PC',
  'Tu as gagné un tournoi de jeux vidéo',
  'Tu as travaillé comme caissier',
  'Tu as vendu des stickers sur Etsy',
  'Tu as fait du déménagement',
];

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
  return n.toLocaleString('fr-FR');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Travaille pour gagner des coins (cooldown 4h)'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const user   = getUser(userId);

    const now  = Date.now();
    const last = user.work?.lastUsed || 0;
    const diff = now - last;

    if (diff < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - diff;
      const h = Math.floor(remaining / 3_600_000);
      const m = Math.floor((remaining % 3_600_000) / 60_000);
      return interaction.reply({
        content: `⏳ Prochaine prise de poste dans **${h}h ${m}min**.`,
        ephemeral: true,
      });
    }

    const earned = Math.floor(Math.random() * (MAX_EARN - MIN_EARN + 1)) + MIN_EARN;
    const job    = JOBS[Math.floor(Math.random() * JOBS.length)];

    if (!user.work) user.work = {};
    user.work.lastUsed = now;
    user.wallet       += earned;
    saveUser(user);

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x6366f1)
      .setDescription(`💼 ${job} — +**${fmt(earned)}** ${COIN} · Solde : **${fmt(user.wallet)}** ${COIN}`)] });
  },
};
