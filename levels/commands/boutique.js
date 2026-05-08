'use strict';
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDB, getUser, withLock, saveDB } = require('../db');
const { avancerQuete }                    = require('../quetes');
const { BOOSTS, BOITE_PRIX, BOITE_RECOMPENSES, PURGE_PRIX } = require('../config');

function ouvrirBoite() {
  const total = BOITE_RECOMPENSES.reduce((a, b) => a + b.chance, 0);
  let rand = Math.random() * total;
  for (const r of BOITE_RECOMPENSES) { rand -= r.chance; if (rand <= 0) return r; }
  return BOITE_RECOMPENSES[0];
}

function labelBoost(b) {
  const bonus = `+${Math.round(b.bonus * 100)}%`;
  const min   = b.duree / 60000;
  const dur   = min >= 60 ? `${min / 60}h` : `${min}min`;
  const prix  = b.prix >= 1000 ? `${b.prix / 1000}k` : b.prix;
  return `${bonus} - ${dur} - ${prix}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boutique')
    .setDescription('Boutique des boosts XP et boîte surprise'),

  async execute(interaction) {
    await withLock(interaction.user.id, async () => {
      const db   = getDB();
      const user = getUser(db, interaction.user.id);
      avancerQuete(user, 'spe_boutique', 1, interaction.guild, interaction.user.id);
      saveDB(db);
    });

    const db   = getDB();
    const user = getUser(db, interaction.user.id);

    const buttons = [
      ...BOOSTS.map(b => new ButtonBuilder().setCustomId(`boutique_boost_${b.id}`).setLabel(labelBoost(b)).setStyle(ButtonStyle.Primary)),
      new ButtonBuilder().setCustomId('boutique_boost_boite').setLabel('Boîte - 50k').setStyle(ButtonStyle.Secondary),
    ];
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5)
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));

    const embed = new EmbedBuilder()
      .setTitle('Boutique Boosts VTX')
      .setColor(0xffd700)
      .setDescription(`Ton solde : **${user.coins.toLocaleString()} VTX-Coins**\n> Tu peux aussi acheter des items avec **/items**`)
      .addFields(
        { name: 'Boosts XP', value: BOOSTS.map(b => `**${b.nom}** — ${b.prix.toLocaleString()} VTX-Coins`).join('\n') },
        { name: 'Boîte Surprise', value: `**50 000 VTX-Coins** — Gain ou malus aléatoire !\nUtilise **/purge** (${PURGE_PRIX.toLocaleString()} coins) pour annuler un malus.` },
      )
      .setFooter({ text: 'Team Vortax 2024 - 2026', iconURL: interaction.guild.iconURL({ dynamic: true }) })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
  },

  // Handler boutons boutique boosts (appelé depuis index.js)
  async handleButton(interaction) {
    const action = interaction.customId.replace('boutique_boost_', '');

    await withLock(interaction.user.id, async () => {
      const db   = getDB();
      const user = getUser(db, interaction.user.id);
      const now  = Date.now();

      // Achat boost
      const boost = BOOSTS.find(b => b.id === action);
      if (boost) {
        if (user.coins < boost.prix)
          return interaction.reply({ content: `Il te faut **${boost.prix.toLocaleString()} coins**. Tu en as **${user.coins.toLocaleString()}**.`, ephemeral: true });
        user.coins -= boost.prix;
        user.inventaire.push({ type: 'boost', boostId: boost.id, nom: boost.nom, bonus: boost.bonus, duree: boost.duree });
        avancerQuete(user, 'prog_boost', 1, interaction.guild, interaction.user.id);
        saveDB(db);
        return interaction.reply({ content: `**${boost.nom}** ajouté à ton inventaire ! Utilise **/use** pour l'activer.`, ephemeral: true });
      }

      // Boite
      if (action === 'boite') {
        if (user.coins < BOITE_PRIX)
          return interaction.reply({ content: `Il te faut **${BOITE_PRIX.toLocaleString()} coins**. Tu en as **${user.coins.toLocaleString()}**.`, ephemeral: true });
        user.coins -= BOITE_PRIX;
        const r = ouvrirBoite();
        let msg = '';
        if (r.type === 'boost') {
          const b = BOOSTS.find(b => b.id === r.boostId);
          user.inventaire.push({ type: 'boost', boostId: b.id, nom: b.nom, bonus: b.bonus, duree: b.duree });
          msg = `Tu as gagné : **${r.label}** ! Ajouté à ton inventaire. Utilise **/use** pour l'activer.`;
        } else if (r.type === 'malus') {
          user.malusActif = { bonus: r.bonus, expireAt: now + r.duree };
          msg = `Malus : **${r.label}** ! Expire <t:${Math.floor((now + r.duree) / 1000)}:R>\nUtilise **/purge** (${PURGE_PRIX.toLocaleString()} coins) pour l'annuler.`;
        } else if (r.type === 'coins') {
          user.coins = Math.max(0, user.coins + r.montant);
          msg = `Malus : **${r.label}** !`;
        }
        saveDB(db);
        return interaction.reply({ content: msg, ephemeral: true });
      }
    });
  },
};