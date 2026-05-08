'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDB, getUser, withLock, saveDB }  = require('../db');
const { ADMINS_ROLES, VORTAX_ID, ROB_COOLDOWN_MS, ROB_ECHEC_CHANCE, ROB_PENALITE } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Voler des VTX-Coins à un membre')
    .addUserOption(o => o.setName('membre').setDescription('Membre à voler').setRequired(true)),

  async execute(interaction) {
    const cible = interaction.options.getUser('membre');

    if (cible.id === interaction.user.id)
      return interaction.reply({ content: 'Tu ne peux pas te voler toi-même.', ephemeral: true });
    if (cible.bot)
      return interaction.reply({ content: 'Tu ne peux pas voler un bot.', ephemeral: true });

    const lockKey = [interaction.user.id, cible.id].sort().join('_');

    await withLock(lockKey, async () => {
      const db      = getDB();
      const voleur  = getUser(db, interaction.user.id);
      const victime = getUser(db, cible.id);
      const now     = Date.now();

      const membreVoleur   = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
      const voleurEstAdmin = membreVoleur?.roles.cache.some(r => ADMINS_ROLES.includes(r.id));
      const voleurExempt   = VORTAX_ID === interaction.user.id || voleurEstAdmin;

      const membreCible   = await interaction.guild.members.fetch(cible.id).catch(() => null);
      const cibleEstAdmin = membreCible?.roles.cache.some(r => ADMINS_ROLES.includes(r.id));
      const cibleExempt   = VORTAX_ID === cible.id || cibleEstAdmin;

      if (cibleExempt && !voleurExempt)
        return interaction.reply({ content: `<@${cible.id}> ne peut pas être volé. 🛡️`, ephemeral: true });

      if (!voleurExempt && voleur.dernierRob && now - voleur.dernierRob < ROB_COOLDOWN_MS) {
        const resteMs = ROB_COOLDOWN_MS - (now - voleur.dernierRob);
        return interaction.reply({
          content: `Tu dois attendre encore <t:${Math.floor((now + resteMs) / 1000)}:R> avant de pouvoir voler à nouveau.`,
          ephemeral: true,
        });
      }

      if (victime.coins <= 0)
        return interaction.reply({ content: `Impossible de voler <@${cible.id}>, il n'a pas un seul VTX-Coin !`, ephemeral: true });

      if (victime.shieldActif && victime.shieldActif > now) {
        if (!voleurExempt) voleur.dernierRob = now;
        saveDB(db);
        return interaction.reply({
          content: `<@${cible.id}> est protégé par un **Bouclier Anti-Rob** ! Tu repars les mains vides${!voleurExempt ? ' et ton cooldown est réinitialisé' : ''}.`,
          ephemeral: true,
        });
      }

      if (!voleurExempt) voleur.dernierRob = now;

      // Échec
      if (Math.random() < ROB_ECHEC_CHANCE) {
        const perte  = Math.min(ROB_PENALITE, voleur.coins);
        voleur.coins = Math.max(0, voleur.coins - perte);
        saveDB(db);
        return interaction.reply({
          content: `Le vol a échoué ! Tu t'es fait attraper et tu as perdu **${perte.toLocaleString()} VTX-Coins**.\nTon solde : **${voleur.coins.toLocaleString()} VTX-Coins**`,
          ephemeral: true,
        });
      }

      // Succès
      let montant = Math.floor(victime.coins * (0.05 + Math.random() * 0.10));
      montant     = Math.min(montant, Math.floor(victime.coins * 0.75), 500000);

      if (voleur.lameProchaineRob) {
        montant = Math.min(montant * 2, Math.floor(victime.coins * 0.75));
        voleur.lameProchaineRob = false;
      }

      victime.coins -= montant;
      voleur.coins  += montant;
      saveDB(db);

      const embed = new EmbedBuilder()
        .setTitle('Vol réussi !')
        .setColor(0xe74c3c)
        .setDescription(
          `<@${interaction.user.id}> a volé **${montant.toLocaleString()} VTX-Coins** à <@${cible.id}> !\n\n` +
          `Ton solde : **${voleur.coins.toLocaleString()}**\n` +
          `Solde de <@${cible.id}> : **${victime.coins.toLocaleString()}**`
        )
        .setFooter({ text: voleurExempt ? 'Aucun cooldown appliqué' : 'Prochain rob disponible dans 4h' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    });
  },
};