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

function buildSelectMenu(ownedKeys = []) {
  const available = Object.entries(PERSOS).filter(([k]) => !ownedKeys.includes(k));
  if (!available.length) return null;

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('bperso_select')
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
    const row      = buildSelectMenu(charData.owned);

    await interaction.reply({
      embeds: [embed],
      components: row ? [row] : [],
      flags: 64,
    });
  },

  // ─── Select menu : confirmation d'achat ────────────────────
  async handleSelect(interaction) {
    const key   = interaction.values[0];
    const perso = PERSOS[key];
    if (!perso) return;

    const price = SHOP_PRICES[perso.tier];
    const user  = getUser(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(TIER_COLORS[perso.tier])
      .setTitle(`${perso.emoji} ${perso.name}`)
      .addFields(
        { name: 'Anime',  value: perso.anime,                inline: true },
        { name: 'Tier',   value: `Tier ${perso.tier}`,       inline: true },
        { name: 'Prix',   value: `🪙 ${fmtCoins(price)}`,    inline: true },
      )
      .setDescription(`Confirmes-tu l'achat de **${perso.name}** ?`)
      .setFooter({ text: `Ton solde : ${fmtCoins(user.wallet)} coins` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`bperso_buy_${key}`)
        .setLabel('Acheter')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('bperso_back')
        .setLabel('Retour')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.update({ embeds: [embed], components: [row] });
  },

  // ─── Boutons : achat / retour ───────────────────────────────
  async handleButton(interaction) {
    const id = interaction.customId;

    // Retour à la boutique
    if (id === 'bperso_back') {
      const user     = getUser(interaction.user.id);
      const charData = getCharData(user);
      const embed    = buildShopEmbed(charData.owned);
      const row      = buildSelectMenu(charData.owned);
      return interaction.update({ embeds: [embed], components: row ? [row] : [] });
    }

    // Achat confirmé
    if (id.startsWith('bperso_buy_')) {
      const key   = id.slice('bperso_buy_'.length);
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
