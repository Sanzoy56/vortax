const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aide')
    .setDescription('Affiche toutes les commandes disponibles'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📖 Aide — Commandes disponibles')
      .setColor(0x7c5cfc)
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .addFields(
        {
          name: '👤 Profil & Niveaux',
          value: [
            '`/profil [membre]` — Voir le profil d\'un membre (image)',
            '`/top [exp|coins]` — Classement des 10 premiers',
          ].join('\n'),
        },
        {
          name: '🎯 Quêtes',
          value: [
            '`/quetes` — Voir tes quêtes journalières + réclamer les récompenses',
          ].join('\n'),
        },
        {
          name: '💰 Économie',
          value: [
            '`/dep <montant|all>` — Déposer en banque',
            '`/with <montant|all>` — Retirer de la banque',
            '`/rob <@membre>` — Voler un membre (cooldown 4h, argent sur soi uniquement)',
          ].join('\n'),
        },
        {
          name: '🛒 Boutique & Inventaire',
          value: [
            '`/boutique boost` — Acheter des boosts temporaires (max 1h)',
            '`/boutique role` — Acheter des boosts permanents (min 1M VTX-Coins)',
            '`/inventaire` — Gérer et équiper tes boosts',
          ].join('\n'),
        },
        {
          name: '🔥 Système de Streak',
          value: [
            'Parle chaque jour pour maintenir ton streak.',
            'Chaque jour de streak = **+2% EXP** (max +50%).',
            'Tu perds ton streak si tu ne parles pas le lendemain.',
          ].join('\n'),
        },
        {
          name: '🏅 Rangs',
          value: 'Les rôles sont attribués automatiquement selon ton niveau. Progresse pour débloquer Plastique, Carton, Bronze... jusqu\'au **GOAT** !',
        },
        {
          name: '🪙 VTX-Coins',
          value: [
            'Gagnes des VTX-Coins en envoyant des messages.',
            'Utilise `/dep` pour mettre tes coins en sécurité à la banque.',
            'L\'argent en banque ne peut pas être volé.',
          ].join('\n'),
        },
      )
      .setFooter({ text: 'Bot développé pour le serveur Vortax' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};