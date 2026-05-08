'use strict';

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { BOOSTS_PERMANENTS } = require('../config.js');
const { getDB, saveDB, getUser, withLock } = require('../db.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('use')
    .setDescription('Activer un item depuis ton inventaire'),

  async execute(interaction) {
    const db   = getDB();
    const user = getUser(db, interaction.user.id);
    const now  = Date.now();

    if (!user.inventaire || user.inventaire.length === 0)
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🎒 Inventaire vide')
            .setColor(0x36393f)
            .setDescription('Tu n\'as aucun item dans ton inventaire. Achètes-en un avec `/boutique` ou `/items` !')
            .setTimestamp(),
        ],
        ephemeral: true,
      });

    const boostActifInfo = user.boostActif && user.boostActif.expireAt > now
      ? `🚀 Boost actif : **+${Math.round(user.boostActif.bonus * 100)}% XP** — expire <t:${Math.floor(user.boostActif.expireAt / 1000)}:R>`
      : '❌ Aucun boost actif';

    const malusInfo = user.malusActif && user.malusActif.expireAt > now
      ? `\n☠️ Malus : **${Math.round(user.malusActif.bonus * 100)}% XP** — expire <t:${Math.floor(user.malusActif.expireAt / 1000)}:R> — utilise **/purge**`
      : '';

    const boostPermActuel = BOOSTS_PERMANENTS.find(b => b.id === user.boostPermanent);
    const boostPermInfo = boostPermActuel
      ? `\n⭐ Boost permanent : **${boostPermActuel.nom}** (+${Math.round(boostPermActuel.bonus * 100)}%)`
      : '';

    const embed = new EmbedBuilder()
      .setTitle(`🎒 Inventaire de ${interaction.user.username}`)
      .setColor(0x5865f2)
      .setDescription(`${boostActifInfo}${malusInfo}${boostPermInfo}\n\nClique sur un item pour l'activer :`)
      .setTimestamp();

    const buttons = user.inventaire.slice(0, 25).map((item, index) =>
      new ButtonBuilder()
        .setCustomId(`use_item_${index}`)
        .setLabel(item.nom.length > 80 ? item.nom.slice(0, 77) + '...' : item.nom)
        .setStyle(item.type === 'boostPermanent' ? ButtonStyle.Primary : ButtonStyle.Success)
    );

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5)
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));

    await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
  },

  // Gestion des boutons (appelé depuis index.js)
  async handleButton(interaction) {
    const index = parseInt(interaction.customId.replace('use_item_', ''));

    await withLock(interaction.user.id, async () => {
      const db   = getDB();
      const user = getUser(db, interaction.user.id);
      const now  = Date.now();

      if (!user.inventaire[index])
        return interaction.reply({ content: 'Item introuvable dans ton inventaire.', ephemeral: true });

      const item = user.inventaire[index];

      // ── Boost permanent ──
      if (item.type === 'boostPermanent') {
        const ancienBoost  = BOOSTS_PERMANENTS.find(b => b.id === user.boostPermanent);
        const nouveauBoost = BOOSTS_PERMANENTS.find(b => b.id === item.boostPermId);
        if (!nouveauBoost)
          return interaction.reply({ content: 'Boost introuvable.', ephemeral: true });

        const membre = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

        if (ancienBoost && membre) {
          await membre.roles.remove(ancienBoost.roleId).catch(() => null);
          user.inventaire.push({
            type:        'boostPermanent',
            boostPermId: ancienBoost.id,
            nom:         ancienBoost.nom + ' (permanent)',
            bonus:       ancienBoost.bonus,
            roleId:      ancienBoost.roleId,
          });
        }

        user.boostPermanent = nouveauBoost.id;
        user.inventaire.splice(index, 1);
        if (membre) await membre.roles.add(nouveauBoost.roleId).catch(() => null);
        saveDB(db);

        return interaction.reply({
          content: `⭐ **${nouveauBoost.nom}** réequipé ! (+${Math.round(nouveauBoost.bonus * 100)}% XP permanent)`,
          ephemeral: true,
        });
      }

      // ── Boost temporaire ──
      if (item.type === 'boost' || !item.type) {
        if (user.boostActif && user.boostActif.expireAt > now)
          return interaction.reply({
            content: '⚠️ Tu as déjà un boost actif ! Attends qu\'il expire.',
            ephemeral: true,
          });

        user.boostActif = { bonus: item.bonus, expireAt: now + item.duree };
        user.inventaire.splice(index, 1);
        saveDB(db);

        return interaction.reply({
          content: `🚀 Boost **${item.nom}** activé ! Il expire <t:${Math.floor((now + item.duree) / 1000)}:R>`,
          ephemeral: true,
        });
      }

      return interaction.reply({ content: 'Type d\'item non reconnu.', ephemeral: true });
    });
  },
};