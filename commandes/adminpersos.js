'use strict';
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getUser, saveUser } = require('../levels/db');
const { PERSOS, TIER_COLORS } = require('../events/persos');

const CHECK = '<:592053verified:1510069208661098546>';
const PERDU = '<:26643crossmark:1510067005066055690>';

const PERSO_CHOICES = Object.entries(PERSOS).map(([key, p]) => ({
  name: `${p.name} (Tier ${p.tier})`,
  value: key,
}));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adminpersos')
    .setDescription('[ADMIN] Gérer les personnages des membres')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // ── /adminpersos add ────────────────────────────────────────
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Donner un personnage à un membre')
      .addUserOption(opt => opt.setName('membre').setDescription('Membre ciblé').setRequired(true))
      .addStringOption(opt => opt
        .setName('perso').setDescription('Personnage à donner').setRequired(true)
        .addChoices(...PERSO_CHOICES)
      )
    )

    // ── /adminpersos remove ─────────────────────────────────────
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Retirer un personnage à un membre')
      .addUserOption(opt => opt.setName('membre').setDescription('Membre ciblé').setRequired(true))
      .addStringOption(opt => opt
        .setName('perso').setDescription('Personnage à retirer').setRequired(true)
        .addChoices(...PERSO_CHOICES)
      )
    )

    // ── /adminpersos list ───────────────────────────────────────
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('Voir les personnages d\'un membre')
      .addUserOption(opt => opt.setName('membre').setDescription('Membre ciblé').setRequired(true))
    )

    // ── /adminpersos resetcd ────────────────────────────────────
    .addSubcommand(sub => sub
      .setName('resetcd')
      .setDescription('Réinitialiser les cooldowns d\'un membre')
      .addUserOption(opt => opt.setName('membre').setDescription('Membre ciblé').setRequired(true))
      .addStringOption(opt => opt
        .setName('perso').setDescription('Personnage spécifique (laisser vide = tous)').setRequired(false)
        .addChoices(...PERSO_CHOICES)
      )
    ),

  async execute(interaction) {
    const sub    = interaction.options.getSubcommand();
    const target = interaction.options.getMember('membre');

    if (!target) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xef4444).setDescription(`${PERDU} Membre introuvable.`)], flags: 64 });

    const user = getUser(target.id);
    if (!user.characters) user.characters = { owned: [], equipped: null, cooldowns: {}, activeEffects: {} };
    const cd = user.characters;

    // ── ADD ──────────────────────────────────────────────────────
    if (sub === 'add') {
      const key   = interaction.options.getString('perso');
      const perso = PERSOS[key];

      if (cd.owned.includes(key))
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xef4444).setDescription(`${PERDU} **${target.displayName}** possède déjà **${perso.name}**.`)], flags: 64 });

      cd.owned.push(key);
      saveUser(user);

      return interaction.reply({ embeds: [new EmbedBuilder()
        .setColor(TIER_COLORS[perso.tier])
        .setTitle(`${CHECK} Personnage ajouté`)
        .setDescription(`**${perso.emoji} ${perso.name}** [Tier ${perso.tier}] ajouté à l'inventaire de **${target.displayName}**.`)
      ]});
    }

    // ── REMOVE ───────────────────────────────────────────────────
    if (sub === 'remove') {
      const key   = interaction.options.getString('perso');
      const perso = PERSOS[key];

      if (!cd.owned.includes(key))
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xef4444).setDescription(`${PERDU} **${target.displayName}** ne possède pas **${perso.name}**.`)], flags: 64 });

      cd.owned    = cd.owned.filter(k => k !== key);
      if (cd.equipped === key) cd.equipped = null;
      // Supprime aussi cooldowns et effets actifs de ce perso
      for (const t of perso.techniques) {
        const cmdKey = t.cmd.replace('=', '').split(' ')[0];
        delete cd.cooldowns[cmdKey];
        delete cd.activeEffects[cmdKey];
      }
      saveUser(user);

      return interaction.reply({ embeds: [new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle('🗑️ Personnage retiré')
        .setDescription(`**${perso.emoji} ${perso.name}** retiré de l'inventaire de **${target.displayName}**.`)
      ]});
    }

    // ── LIST ─────────────────────────────────────────────────────
    if (sub === 'list') {
      if (!cd.owned.length)
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xef4444).setDescription(`${PERDU} **${target.displayName}** ne possède aucun personnage.`)], flags: 64 });

      const lines = cd.owned.map(k => {
        const p = PERSOS[k];
        if (!p) return `❓ \`${k}\``;
        return `${p.emoji} **${p.name}** [Tier ${p.tier}]${cd.equipped === k ? ' · ⚔️ Équipé' : ''}`;
      });

      return interaction.reply({ embeds: [new EmbedBuilder()
        .setColor(0x6366f1)
        .setTitle(`📋 Personnages de ${target.displayName}`)
        .setDescription(lines.join('\n'))
        .setFooter({ text: `${cd.owned.length} personnage(s)` })
      ]});
    }

    // ── RESETCD ──────────────────────────────────────────────────
    if (sub === 'resetcd') {
      const key = interaction.options.getString('perso');

      if (key) {
        // Reset d'un seul perso
        const perso = PERSOS[key];
        for (const t of perso.techniques) {
          const cmdKey = t.cmd.replace('=', '').split(' ')[0];
          delete cd.cooldowns[cmdKey];
          delete cd.activeEffects[cmdKey];
        }
        saveUser(user);
        return interaction.reply({ embeds: [new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle('🔄 Cooldowns réinitialisés')
          .setDescription(`Tous les cooldowns de **${PERSOS[key].emoji} ${PERSOS[key].name}** pour **${target.displayName}** ont été remis à zéro.`)
        ]});
      } else {
        // Reset de tous les cooldowns
        cd.cooldowns    = {};
        cd.activeEffects = {};
        saveUser(user);
        return interaction.reply({ embeds: [new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle('🔄 Tous les cooldowns réinitialisés')
          .setDescription(`Tous les cooldowns de tous les personnages de **${target.displayName}** ont été remis à zéro.`)
        ]});
      }
    }
  },
};
