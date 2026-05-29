const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, saveUser } = require('../db');
const { fmt } = require('../levels');
const { updateQuestProgress } = require('../quests');
const COIN = '<:49c1a23b876841ce87e5aa7dbeacada9:1509174658321223691>';
function re(color, desc) { return { embeds: [new EmbedBuilder().setColor(color).setDescription(desc)] }; }

// ─── /dep ────────────────────────────────────────────────────
const dep = {
  data: new SlashCommandBuilder()
    .setName('dep')
    .setDescription('Déposer de l\'argent en banque')
    .addStringOption(o =>
      o.setName('montant')
       .setDescription('Montant à déposer ou "all"')
       .setRequired(true)
    ),

  async execute(interaction) {
    const user  = getUser(interaction.user.id);
    const input = interaction.options.getString('montant').toLowerCase();

    let amount;
    if (input === 'all') {
      amount = user.wallet;
    } else {
      amount = parseInt(input, 10);
      if (isNaN(amount) || amount <= 0) return interaction.reply({ content: '❌ Montant invalide.', ephemeral: true });
    }

    if (amount === 0)            return interaction.reply({ content: '❌ Tu n\'as pas d\'argent sur toi.', ephemeral: true });
    if (amount > user.wallet)    return interaction.reply({ content: `❌ Tu n'as que **${fmt(user.wallet)} VTX-Coins** sur toi.`, ephemeral: true });

    user.wallet -= amount;
    user.bank   += amount;
    saveUser(user);

    // Quête : déposer en banque (Investisseur, Banquier)
    await updateQuestProgress(interaction.guild, interaction.user.id, 'bank', 1);

    // Quête : avoir X coins en banque (Économe, Banquier suprême)
    await updateQuestProgress(interaction.guild, interaction.user.id, 'bank_amount', user.bank);

    // Quête : utiliser des commandes
    await updateQuestProgress(interaction.guild, interaction.user.id, 'commands', 1);

    return interaction.reply(re(0x6366f1, `🏦 +**${fmt(amount)}** en banque ${COIN} · Portefeuille : **${fmt(user.wallet)}** · Banque : **${fmt(user.bank)}**`));
  },
};

// ─── /with ───────────────────────────────────────────────────
const withCmd = {
  data: new SlashCommandBuilder()
    .setName('with')
    .setDescription('Retirer de l\'argent de la banque')
    .addStringOption(o =>
      o.setName('montant')
       .setDescription('Montant à retirer ou "all"')
       .setRequired(true)
    ),

  async execute(interaction) {
    const user  = getUser(interaction.user.id);
    const input = interaction.options.getString('montant').toLowerCase();

    let amount;
    if (input === 'all') {
      amount = user.bank;
    } else {
      amount = parseInt(input, 10);
      if (isNaN(amount) || amount <= 0) return interaction.reply({ content: '❌ Montant invalide.', ephemeral: true });
    }

    if (amount === 0)         return interaction.reply({ content: '❌ Tu n\'as rien en banque.', ephemeral: true });
    if (amount > user.bank)   return interaction.reply({ content: `❌ Tu n'as que **${fmt(user.bank)} VTX-Coins** en banque.`, ephemeral: true });

    user.bank   -= amount;
    user.wallet += amount;
    saveUser(user);

    // Quête : utiliser des commandes (Banquier, Visiteur, Explorateur...)
    await updateQuestProgress(interaction.guild, interaction.user.id, 'bank', 1);
    await updateQuestProgress(interaction.guild, interaction.user.id, 'commands', 1);

    return interaction.reply(re(0x6366f1, `💸 +**${fmt(amount)}** sur toi ${COIN} · Portefeuille : **${fmt(user.wallet)}** · Banque : **${fmt(user.bank)}**`));
  },
};

module.exports = { dep, withCmd };