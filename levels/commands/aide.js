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
          value: '`/quetes` — Voir tes quêtes journalières + réclamer les récompenses',
        },
        {
          name: '💰 Économie',
          value: [
            '`/bal [membre]` — Voir son solde (wallet + banque)',
            '`/dep <montant|all>` — Déposer en banque',
            '`/with <montant|all>` — Retirer de la banque',
            '`/donner <@membre> <montant>` — Donner des coins à un membre',
            '`/rob <@membre>` — Voler un membre (cooldown 4h, wallet uniquement)',
          ].join('\n'),
        },
        {
          name: '🛒 Boutique & Inventaire',
          value: [
            '`/boutique boost` — Acheter des boosts temporaires (XP / Coins)',
            '`/boutique role` — Acheter des boosts permanents',
            '`/inventaire` — Gérer et équiper tes boosts',
          ].join('\n'),
        },
        {
          name: '🎙️ Salon vocal temporaire',
          value: [
            'Rejoins le salon **"Créer ta voc"** pour ouvrir ton salon vocal privé.',
            'Un panel s\'envoie dans le salon — boutons : **Expulser, Blacklist, Whitelist, Privé, Renommer, Limite, Transférer**.',
            'Le salon se supprime automatiquement quand tout le monde part.',
          ].join('\n'),
        },
        {
          name: '🎫 Tickets',
          value: [
            'Clique sur le bouton de création de ticket pour ouvrir un ticket de support.',
            '`-delete` — Génère le transcript + supprime le ticket (staff uniquement)',
          ].join('\n'),
        },
        {
          name: '🤖 IA (VTX-BOT)',
          value: [
            'Mentionne le bot en langage naturel pour des actions de modération :',
            '> *"vtxbot mute @membre 10 minutes pour spam"*',
            '> *"vtxbot crée le salon #général"*',
            '> *"vtxbot donne le rôle Membre à @pseudo"*',
            'Le bot comprend les fautes de frappe et accents manquants.',
          ].join('\n'),
        },
        {
          name: '🔥 Streak',
          value: [
            'Parle chaque jour pour maintenir ton streak.',
            'Chaque jour = **+2% EXP** bonus (max +50%).',
            'Tu perds ton streak si tu n\'écris pas le lendemain.',
          ].join('\n'),
        },
        {
          name: '🏅 Rangs automatiques',
          value: 'Rôles attribués automatiquement selon ton niveau : Plastique → Carton → Bronze → Fer → Or → Diamant → Émeraude → Rubis → Légendaire → Mythique → **GOAT**',
        },
        {
          name: '🛡️ Administration',
          value: [
            '`/adminexpajouter <@membre> <xp>` — Ajouter de l\'XP',
            '`/adminexpretirer <@membre> <xp>` — Retirer de l\'XP',
            '`/adminmoneyajouter <@membre> <coins>` — Ajouter des coins',
            '`/adminmoneyretirer <@membre> <coins>` — Retirer des coins',
          ].join('\n'),
        },
      )
      .setFooter({ text: 'Bot développé pour le serveur Vortax • Les gains d\'XP et Coins sont configurables depuis le panel' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};