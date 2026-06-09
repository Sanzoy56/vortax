'use strict';

const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { token } = require('./token.json');

const commands = [

    // ─── MODÉRATION ───────────────────────────────────────────────
    new SlashCommandBuilder()
        .setName('panel')
        .setDescription('Ouvre le panel de modération')
        .setDefaultMemberPermissions(0)
        .addUserOption(option =>
            option.setName('membre')
                .setDescription('Le membre à modérer')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('banni')
                .setDescription('Membre banni à débannir')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Supprime des messages dans le salon')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option =>
            option.setName('nombre')
                .setDescription('Nombre de messages à supprimer (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName('clear-salon')
        .setDescription('Vide complètement le salon (tous les messages, peu importe leur âge)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .toJSON(),

    // ─── ADMIN XP / MONEY ─────────────────────────────────────────
    new SlashCommandBuilder()
        .setName('adminexpajouter')
        .setDescription('[ADMIN] Ajouter de l\'XP à un membre')
        .setDefaultMemberPermissions(0)
        .addUserOption(option =>
            option.setName('membre').setDescription('Le membre ciblé').setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('somme').setDescription('Quantité d\'XP à ajouter').setMinValue(1).setRequired(true)
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName('adminexpretirer')
        .setDescription('[ADMIN] Retirer de l\'XP à un membre')
        .setDefaultMemberPermissions(0)
        .addUserOption(option =>
            option.setName('membre').setDescription('Le membre ciblé').setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('somme').setDescription('Quantité d\'XP à retirer').setMinValue(1).setRequired(true)
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName('adminmoneyajouter')
        .setDescription('[ADMIN] Ajouter des VTX-Coins à un membre')
        .setDefaultMemberPermissions(0)
        .addUserOption(option =>
            option.setName('membre').setDescription('Le membre ciblé').setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('somme').setDescription('Quantité de coins à ajouter').setMinValue(1).setRequired(true)
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName('adminmoneyretirer')
        .setDescription('[ADMIN] Retirer des VTX-Coins à un membre')
        .setDefaultMemberPermissions(0)
        .addUserOption(option =>
            option.setName('membre').setDescription('Le membre ciblé').setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('somme').setDescription('Quantité de coins à retirer').setMinValue(1).setRequired(true)
        )
        .toJSON(),

    // ─── GIVEAWAY ─────────────────────────────────────────────────
    new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Lancer un giveaway')
        .setDefaultMemberPermissions(0)
        .addStringOption(opt => opt.setName('lot').setDescription('Ce qu\'on gagne').setRequired(true))
        .addStringOption(opt => opt.setName('durée').setDescription('Durée : 10m, 2h, 1d').setRequired(true))
        .addIntegerOption(opt => opt.setName('gagnants').setDescription('Nombre de gagnants').setRequired(true).setMinValue(1))
        .addUserOption(opt => opt.setName('hote').setDescription('Membre qui organise le giveaway').setRequired(true))
        .addBooleanOption(opt => opt.setName('messages_actif').setDescription('Activer un minimum de messages pour être éligible ?').setRequired(true))
        .addBooleanOption(opt => opt.setName('vocal_actif').setDescription('Activer un minimum de minutes en vocal pour être éligible ?').setRequired(true))
        .addIntegerOption(opt => opt.setName('claim').setDescription('Minutes pour claim après avoir gagné (0 = pas de claim)').setRequired(true).setMinValue(0).setMaxValue(60))
        .addRoleOption(opt => opt.setName('role').setDescription('Rôle requis pour participer (vide = ouvert à tous)').setRequired(false))
        .addRoleOption(opt => opt.setName('role_blacklist').setDescription('Rôle interdit de participer (vide = aucun blacklist)').setRequired(false))
        .addRoleOption(opt => opt.setName('role_bypass').setDescription('Rôle qui bypass le rôle requis (vide = aucun bypass)').setRequired(false))
        .addIntegerOption(opt => opt.setName('messages').setDescription('Nombre de messages minimum (obligatoire si messages_actif = oui)').setRequired(false).setMinValue(1))
        .addIntegerOption(opt => opt.setName('vocal').setDescription('Nombre de minutes vocal minimum (obligatoire si vocal_actif = oui)').setRequired(false).setMinValue(1))
        .addStringOption(opt => opt.setName('image').setDescription('URL d\'une image pour illustrer le lot (élargit l\'embed)').setRequired(false))
        .toJSON(),

    // ─── Boutique personnages ─────────────────────────────────────
    new SlashCommandBuilder()
        .setName('boutique-persos')
        .setDescription('Achète des personnages pour débloquer des pouvoirs spéciaux')
        .toJSON(),

    // ─── Admin personnages ────────────────────────────────────────
    (() => {
        const { PERSOS } = require('./events/persos');
        const choices = Object.entries(PERSOS).map(([key, p]) => ({ name: `${p.name} (Tier ${p.tier})`, value: key }));
        return new SlashCommandBuilder()
            .setName('adminpersos')
            .setDescription('[ADMIN] Gérer les personnages des membres')
            .setDefaultMemberPermissions(0)
            .addSubcommand(sub => sub.setName('add').setDescription('Donner un personnage à un membre')
                .addUserOption(o => o.setName('membre').setDescription('Membre ciblé').setRequired(true))
                .addStringOption(o => o.setName('perso').setDescription('Personnage').setRequired(true).addChoices(...choices))
            )
            .addSubcommand(sub => sub.setName('remove').setDescription('Retirer un personnage à un membre')
                .addUserOption(o => o.setName('membre').setDescription('Membre ciblé').setRequired(true))
                .addStringOption(o => o.setName('perso').setDescription('Personnage').setRequired(true).addChoices(...choices))
            )
            .addSubcommand(sub => sub.setName('list').setDescription('Voir les personnages d\'un membre')
                .addUserOption(o => o.setName('membre').setDescription('Membre ciblé').setRequired(true))
            )
            .addSubcommand(sub => sub.setName('resetcd').setDescription('Réinitialiser les cooldowns d\'un membre')
                .addUserOption(o => o.setName('membre').setDescription('Membre ciblé').setRequired(true))
                .addStringOption(o => o.setName('perso').setDescription('Perso spécifique (vide = tous)').setRequired(false).addChoices(...choices))
            )
            .toJSON();
    })(),

    // ─── Boutique / Inventaire ────────────────────────────────────
    new SlashCommandBuilder()
        .setName('boutique')
        .setDescription('Accéder à la boutique')
        .addSubcommand(sub => sub.setName('boost').setDescription('Boosts temporaires d\'EXP / Coins'))
        .addSubcommand(sub => sub.setName('role').setDescription('Boosts permanents via rôle'))
        .toJSON(),

    new SlashCommandBuilder()
        .setName('inventaire')
        .setDescription('Voir et gérer ton inventaire de boosts')
        .toJSON(),

    // ─── SUGGESTION ───────────────────────────────────────────────
    new SlashCommandBuilder()
        .setName('suggestion')
        .setDescription('Soumettre une suggestion')
        .toJSON(),

    // ─── ADMIN SYNC ───────────────────────────────────────────
    new SlashCommandBuilder()
        .setName('syncranks')
        .setDescription('[ADMIN] Synchronise les rôles de rang de tous les membres avec leur XP actuelle')
        .setDefaultMemberPermissions(0)
        .toJSON(),

    // ─── BOT ──────────────────────────────────────────────────────
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Changer le statut du bot')
        .setDefaultMemberPermissions(0)
        .addStringOption(option =>
            option.setName('texte')
                .setDescription('Texte du statut')
                .setRequired(true)
                .setMaxLength(128)
        )
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type de statut')
                .setRequired(true)
                .addChoices(
                    { name: 'Playing',   value: 'PLAYING'   },
                    { name: 'Watching',  value: 'WATCHING'  },
                    { name: 'Listening', value: 'LISTENING' },
                    { name: 'Streaming', value: 'STREAMING' }
                )
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName('say')
        .setDescription('Faire parler le bot')
        .setDefaultMemberPermissions(0)
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type de message')
                .setRequired(true)
                .addChoices(
                    { name: '💬 Message normal', value: 'message' },
                    { name: '📋 Embed',          value: 'embed'   }
                )
        )
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Message normal à envoyer')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('titre')
                .setDescription('Titre de l\'embed')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Description de l\'embed')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('couleur')
                .setDescription('Couleur hex (#FF0000)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('image')
                .setDescription('URL de l\'image')
                .setRequired(false)
        )
        .toJSON(),

];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Enregistrement des commandes...');
        await rest.put(
            Routes.applicationCommands('1495864702457217271'),
            { body: commands }
        );
        console.log('Commandes enregistrées !');
    } catch (error) {
        console.error(error);
    }
})();