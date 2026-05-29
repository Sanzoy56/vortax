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

    // ─── ADMIN XP / MONEY ─────────────────────────────────────────
    new SlashCommandBuilder()
        .setName('adminexpajouter')
        .setDescription('[ADMIN] Ajouter de l\'XP à un membre')
        .setDefaultMemberPermissions(0)
        .addUserOption(option =>
            option.setName('membre')
                .setDescription('Le membre ciblé')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('somme')
                .setDescription('Quantité d\'XP à ajouter')
                .setMinValue(1)
                .setRequired(true)
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName('adminexpretirer')
        .setDescription('[ADMIN] Retirer de l\'XP à un membre')
        .setDefaultMemberPermissions(0)
        .addUserOption(option =>
            option.setName('membre')
                .setDescription('Le membre ciblé')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('somme')
                .setDescription('Quantité d\'XP à retirer')
                .setMinValue(1)
                .setRequired(true)
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName('adminmoneyajouter')
        .setDescription('[ADMIN] Ajouter des VTX-Coins à un membre')
        .setDefaultMemberPermissions(0)
        .addUserOption(option =>
            option.setName('membre')
                .setDescription('Le membre ciblé')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('somme')
                .setDescription('Quantité de coins à ajouter')
                .setMinValue(1)
                .setRequired(true)
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName('adminmoneyretirer')
        .setDescription('[ADMIN] Retirer des VTX-Coins à un membre')
        .setDefaultMemberPermissions(0)
        .addUserOption(option =>
            option.setName('membre')
                .setDescription('Le membre ciblé')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('somme')
                .setDescription('Quantité de coins à retirer')
                .setMinValue(1)
                .setRequired(true)
        )
        .toJSON(),

    // ─── GIVEAWAY ─────────────────────────────────────────────────
    new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Lancer un giveaway')
        .setDefaultMemberPermissions(0)
        .addStringOption(opt =>
            opt.setName('lot')
                .setDescription('Ce qu\'on gagne')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('durée')
                .setDescription('Durée : 10m, 2h, 1d')
                .setRequired(true)
        )
        .addIntegerOption(opt =>
            opt.setName('gagnants')
                .setDescription('Nombre de gagnants')
                .setRequired(true)
                .setMinValue(1)
        )
        .addRoleOption(opt =>
            opt.setName('role')
                .setDescription('Rôle requis pour participer (optionnel)')
                .setRequired(false)
        )
        .toJSON(),

    // ─── VOCAL ────────────────────────────────────────────────────
    new SlashCommandBuilder()
        .setName('vocal')
        .setDescription('Gérer le bot vocal IA')
        .addSubcommand(sub =>
            sub.setName('join')
                .setDescription('Le bot rejoint un salon vocal')
                .addChannelOption(opt =>
                    opt.setName('salon')
                        .setDescription('Le salon vocal à rejoindre')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('leave')
                .setDescription('Le bot quitte le salon vocal')
        )
        .toJSON(),

    // ─── Commandes conservées en slash ───────────────────────────
    new SlashCommandBuilder()
        .setName('boutique')
        .setDescription('Accéder à la boutique')
        .addSubcommand(sub => sub.setName('boost').setDescription('Boosts temporaires d\'EXP / Coins (max 1h)'))
        .addSubcommand(sub => sub.setName('role').setDescription('Boosts permanents via rôle (min 1M VTX-Coins)'))
        .toJSON(),

    new SlashCommandBuilder()
        .setName('inventaire')
        .setDescription('Voir et gérer ton inventaire de boosts')
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