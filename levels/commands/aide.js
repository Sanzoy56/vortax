const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aide')
    .setDescription('Affiche toutes les commandes disponibles'),

  async execute(interaction) {
    const isStaff = interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)
      || interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)
      || interaction.memberPermissions.has(PermissionFlagsBits.Administrator)
    const isAdmin = interaction.memberPermissions.has(PermissionFlagsBits.Administrator)

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
            '`/boutique-persos` — Acheter des personnages (visible par tous)',
          ].join('\n'),
        },
        {
          name: '⚔️ Personnages & Pouvoirs',
          value: [
            '`=persos` — Liste tous les personnages disponibles par tier',
            '`=attaques <nom>` — Voir les techniques d\'un personnage',
            '`=shop` — Boutique des personnages (prefix)',
            '`=acheter <nom>` — Acheter un personnage avec ton wallet',
            '`=equiper <nom>` — Équiper un personnage possédé',
            '`=cd` — Voir les cooldowns de tes personnages équipés',
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
          value: isStaff
            ? 'Clique sur le bouton de création de ticket pour ouvrir un ticket.\n`-delete` — Génère le transcript + supprime le ticket *(staff)*'
            : 'Clique sur le bouton de création de ticket pour ouvrir un ticket de support.',
        },
        ...(isStaff ? [{
          name: '🤖 IA (VTX-BOT) — Staff',
          value: [
            'Mentionne le bot en langage naturel pour des actions de modération :',
            '> *"vtxbot mute @membre 10 minutes pour spam"*',
            '> *"vtxbot ban @membre pour publicité"*',
            '> *"vtxbot crée le salon #général"*',
            '> *"vtxbot donne le rôle Membre à @pseudo"*',
          ].join('\n'),
        }] : []),
        {
          name: '🎰 Casino',
          value: [
            '`/coinflip <mise> <pile|face>` — 50/50, double ou perds ta mise (cooldown 15s)',
            '`/slots <mise>` — Machine à sous : 🍒🍋🍊🍇🔔💎7️⃣ avec multiplicateurs jusqu\'à x50 (cooldown 20s)',
            '`/work` — Travaille pour gagner 500–1 500 💵 (cooldown 4h)',
          ].join('\n'),
        },
        {
          name: '🏅 Rangs automatiques',
          value: 'Rôles attribués automatiquement selon ton niveau : Plastique → Carton → Bronze → Fer → Or → Diamant → Émeraude → Rubis → Légendaire → Mythique → **GOAT**',
        },
        ...(isAdmin ? [{
          name: '🛡️ Administration',
          value: [
            '`/adminexpajouter <@membre> <xp>` — Ajouter de l\'XP',
            '`/adminexpretirer <@membre> <xp>` — Retirer de l\'XP',
            '`/adminmoneyajouter <@membre> <coins>` — Ajouter des coins',
            '`/adminmoneyretirer <@membre> <coins>` — Retirer des coins',
            '`/adminpersos add <@membre> <perso>` — Donner un personnage',
            '`/adminpersos remove <@membre> <perso>` — Retirer un personnage',
            '`/adminpersos list <@membre>` — Voir les personnages d\'un membre',
            '`/adminpersos resetcd <@membre> [perso]` — Reset cooldowns (1 perso ou tous)',
          ].join('\n'),
        }] : []),
      )
      .setFooter({ text: 'Bot développé pour le serveur Vortax • Les gains d\'XP et Coins sont configurables depuis le panel' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};