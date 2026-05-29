'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const COIN = '<:49c1a23b876841ce87e5aa7dbeacada9:1509174658321223691>';
function re(color, desc) { return { embeds: [new EmbedBuilder().setColor(color).setDescription(desc)] }; }
const { getDB, saveDB, getUser, withLock } = require('../db.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('donner')
    .setDescription('Donner des VTX-Coins à un membre')
    .addUserOption(opt =>
      opt.setName('membre')
        .setDescription('Le membre à qui donner des coins')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('montant')
        .setDescription('Montant à donner')
        .setMinValue(1)
        .setRequired(true)
    ),

  async execute(interaction) {
    const cible   = interaction.options.getUser('membre');
    const montant = interaction.options.getInteger('montant');

    if (cible.id === interaction.user.id)
      return interaction.reply({ content: 'Tu ne peux pas te donner des coins à toi-même.', ephemeral: true });
    if (cible.bot)
      return interaction.reply({ content: 'Tu ne peux pas donner des coins à un bot.', ephemeral: true });

    const lockKey = [interaction.user.id, cible.id].sort().join('_');

    await withLock(lockKey, async () => {
      const db       = getDB();
      const donneur  = getUser(db, interaction.user.id);
      const receveur = getUser(db, cible.id);

      if (donneur.coins < montant)
        return interaction.reply({
          content: `Tu n'as pas assez de coins ! Ton solde : **${donneur.coins.toLocaleString()} VTX-Coins**`,
          ephemeral: true,
        });

      donneur.coins  -= montant;
      receveur.coins += montant;
      saveDB(db);

      await interaction.reply(re(0x22c55e,
        `💸 <@${interaction.user.id}> → <@${cible.id}> **${montant.toLocaleString()}** ${COIN} · Ton solde : **${donneur.coins.toLocaleString()}**`));
    });
  },
};