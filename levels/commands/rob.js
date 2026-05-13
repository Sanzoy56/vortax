const { SlashCommandBuilder } = require('discord.js');
const { getUser, saveUser } = require('../db');
const { PROTECTED_USERS, ROB } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Tente de voler de l\'argent à un membre')
    .addUserOption(o => o.setName('cible').setDescription('Membre à voler').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('cible');
    const userId = interaction.user.id;

    // Protection
    if (target.id === userId) return interaction.reply({ content: '❌ Tu ne peux pas te voler toi-même.', ephemeral: true });
    if (PROTECTED_USERS.includes(target.id)) return interaction.reply({ content: '🛡️ Cette personne est protégée et ne peut pas être volée.', ephemeral: true });

    const robber = getUser(userId);
    const victim = getUser(target.id);

    // Cooldown 4h
    const now  = Date.now();
    const diff = now - (robber.rob?.lastUsed || 0);
    if (diff < ROB.COOLDOWN_MS) {
      const remaining = Math.ceil((ROB.COOLDOWN_MS - diff) / 60_000);
      return interaction.reply({ content: `⏳ Tu dois attendre encore **${remaining} minute(s)** avant de re-voler.`, ephemeral: true });
    }

    // Victime doit avoir de l'argent sur soi (pas en banque)
    if (victim.wallet <= 0) {
      robber.rob.lastUsed = now;
      saveUser(robber);
      return interaction.reply({ content: `💸 <@${target.id}> n'a pas d'argent sur lui, tout est en banque !` });
    }

    robber.rob.lastUsed = now;

    // 60% de réussite
    const success = Math.random() < ROB.SUCCESS_RATE;
    if (success) {
      const percent = ROB.MIN_PERCENT + Math.random() * (ROB.MAX_PERCENT - ROB.MIN_PERCENT);
      const stolen  = Math.max(1, Math.floor(victim.wallet * percent));

      victim.wallet -= stolen;
      robber.wallet += stolen;

      saveUser(robber);
      saveUser(victim);

      return interaction.reply({
        content: `🦹 **${interaction.user.username}** a volé **${stolen} VTX-Coins** à <@${target.id}> ! 💰`,
      });
    } else {
      // Échec : pénalité sur le voleur
      const penalty = Math.floor(victim.wallet * 0.05);
      robber.wallet = Math.max(0, robber.wallet - penalty);
      saveUser(robber);

      return interaction.reply({
        content: `🚔 **${interaction.user.username}** s'est fait attraper en essayant de voler <@${target.id}> ! Il a perdu **${penalty} VTX-Coins**.`,
      });
    }
  },
};