'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { PURGE_PRIX } = require('../config.js');
const { getDB, saveDB, getUser, withLock } = require('../db.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription(`Supprimer ton malus actif (${PURGE_PRIX.toLocaleString()} VTX-Coins)`),

  async execute(interaction) {
    await withLock(interaction.user.id, async () => {
      const db   = getDB();
      const user = getUser(db, interaction.user.id);
      const now  = Date.now();

      if (!user.malusActif || user.malusActif.expireAt <= now)
        return interaction.reply({ content: 'Tu n\'as aucun malus actif en ce moment !', ephemeral: true });

      if (user.coins < PURGE_PRIX)
        return interaction.reply({
          content: `Il te faut **${PURGE_PRIX.toLocaleString()} VTX-Coins** pour purger. Tu en as **${user.coins.toLocaleString()}**.`,
          ephemeral: true,
        });

      user.coins     -= PURGE_PRIX;
      user.malusActif = null;
      saveDB(db);

      await interaction.reply({
        content: `✅ Malus supprimé ! **-${PURGE_PRIX.toLocaleString()} VTX-Coins**`,
        ephemeral: true,
      });
    });
  },
};