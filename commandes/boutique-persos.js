'use strict';
const {
  SlashCommandBuilder, EmbedBuilder,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const { getUser, saveUser } = require('../levels/db');
const {
  PERSOS, TIER_COLORS, TIER_LABELS, SHOP_PRICES, fmtCoins, getCharData,
} = require('../events/persos');

// ─── Helpers visuels ────────────────────────────────────────────
function buildShopEmbed(ownedKeys = []) {
  const tiers = { S: [], A: [], B: [], C: [] };
  for (const [key, p] of Object.entries(PERSOS)) tiers[p.tier].push({ key, ...p });

  return new EmbedBuilder()
    .setColor(0x6366f1)
    .setTitle('🛒 Boutique — Personnages')
    .addFields(
      Object.entries(tiers).map(([tier, list]) => ({
        name: TIER_LABELS[tier],
        value: list.map(p => {
          const owned = ownedKeys.includes(p.key);
          return `${p.emoji} **${p.name}** — ${owned ? '✅ Possédé' : `🪙 ${fmtCoins(SHOP_PRICES[tier])}`}`;
        }).join('\n'),
        inline: false,
      }))
    )
    .setFooter({ text: 'Sélectionne un personnage dans le menu pour l\'acheter' });
}

function buildSelectMenu(ownedKeys = [], userId) {
  const available = Object.entries(PERSOS).filter(([k]) => !ownedKeys.includes(k));
  if (!available.length) return null;

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`bperso_select_${userId}`)
      .setPlaceholder('Sélectionne un personnage à acheter…')
      .addOptions(
        available.map(([key, p]) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(p.name)
            .setValue(key)
            .setDescription(`Tier ${p.tier} — ${fmtCoins(SHOP_PRICES[p.tier])} coins`)
            .setEmoji(p.emoji)
        )
      )
  );
}

// ─── Slash command ──────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('boutique-persos')
    .setDescription('Achète des personnages pour débloquer des pouvoirs spéciaux'),

  async execute(interaction) {
    const user     = getUser(interaction.user.id);
    const charData = getCharData(user);
    const embed    = buildShopEmbed(charData.owned);
    const row      = buildSelectMenu(charData.owned, interaction.user.id);

    await interaction.reply({
      embeds: [embed],
      components: row ? [row] : [],
    });
  },

  // ─── Select menu : confirmation d'achat ────────────────────
  async handleSelect(interaction) {
    const parts    = interaction.customId.split('_'); // ['bperso','select',userId]
    const ownerId  = parts[2];

    if (interaction.user.id !== ownerId)
      return interaction.reply({ content: '❌ Ce n\'est pas ta boutique !', flags: 64 });

    const key   = interaction.values[0];
    const perso = PERSOS[key];
    if (!perso) return;

    const price = SHOP_PRICES[perso.tier];
    const user  = getUser(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(TIER_COLORS[perso.tier])
      .setTitle(`${perso.emoji} ${perso.name}`)
      .addFields(
        { name: 'Anime',  value: perso.anime,             inline: true },
        { name: 'Tier',   value: `Tier ${perso.tier}`,    inline: true },
        { name: 'Prix',   value: `🪙 ${fmtCoins(price)}`, inline: true },
      )
      .setDescription(`Confirmes-tu l'achat de **${perso.name}** ?`)
      .setFooter({ text: `Ton solde : ${fmtCoins(user.wallet)} coins` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`bperso_buy_${key}_${ownerId}`)
        .setLabel('Acheter')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`bperso_back_${ownerId}`)
        .setLabel('Retour')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.update({ embeds: [embed], components: [row] });
  },

  // ─── Boutons : achat / retour ───────────────────────────────
  async handleButton(interaction) {
    const id      = interaction.customId;
    const ownerId = id.split('_').at(-1);

    if (interaction.user.id !== ownerId)
      return interaction.reply({ content: '❌ Ce n\'est pas ta boutique !', flags: 64 });

    // Retour à la boutique
    if (id.startsWith('bperso_back_')) {
      const user     = getUser(interaction.user.id);
      const charData = getCharData(user);
      const embed    = buildShopEmbed(charData.owned);
      const row      = buildSelectMenu(charData.owned, ownerId);
      return interaction.update({ embeds: [embed], components: row ? [row] : [] });
    }

    // Achat confirmé — format : bperso_buy_<key>_<userId>
    if (id.startsWith('bperso_buy_')) {
      // key = tout ce qui est entre 'bperso_buy_' et '_<userId>'
      const key = id.slice('bperso_buy_'.length, id.lastIndexOf('_'));
      const perso = PERSOS[key];
      if (!perso) return;

      const user     = getUser(interaction.user.id);
      const charData = getCharData(user);
      const price    = SHOP_PRICES[perso.tier];

      if (charData.owned.includes(key)) {
        return interaction.update({
          embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Tu possèdes déjà ce personnage.')],
          components: [],
        });
      }

      if (user.wallet < price) {
        return interaction.update({
          embeds: [new EmbedBuilder()
            .setColor(0xff4444)
            .setDescription(`❌ Fonds insuffisants.\n🪙 Prix : **${fmtCoins(price)}** · Ton solde : **${fmtCoins(user.wallet)}**`)
          ],
          components: [],
        });
      }

      user.wallet -= price;
      charData.owned.push(key);
      saveUser(user);

      return interaction.update({
        embeds: [new EmbedBuilder()
          .setColor(TIER_COLORS[perso.tier])
          .setTitle('✅ Achat confirmé !')
          .setDescription(`Tu as acheté **${perso.emoji} ${perso.name}** pour **${fmtCoins(price)}** 🪙\nUtilise \`=equiper ${key}\` pour l'équiper, \`=cd\` pour voir ses techniques.`)
          .setFooter({ text: `Solde restant : ${fmtCoins(user.wallet)} coins` })
        ],
        components: [],
      });
    }
  },
};
