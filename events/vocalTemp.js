// ============================================================
//  vocalTemp.js — Salons vocaux temporaires + panel de contrôle
//  Placer dans backend/src/features/ ou backend/events/
// ============================================================

const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// ── Stockage en mémoire (remplace par DB si tu veux de la persistance) ──
const tempChannels = new Map(); // channelId → { ownerId, blacklist: Set, whitelist: Set, isPrivate }

// ── Config chargée depuis ton config.json (ou ta DB) ──
async function getConfig(guildId) {
  try {
    const res = await fetch("https://vtx-bot.alwaysdata.net/api/vocaltemp/config");
    return await res.json();
  } catch {
    return {};
  }
}

// ════════════════════════════════════════════════════════════
//  HELPER — construire le panel embed + boutons
// ════════════════════════════════════════════════════════════
function buildPanel(channel, data) {
  const { ownerId, isPrivate, blacklist, whitelist } = data;

  const embed = new EmbedBuilder()
    .setColor(isPrivate ? 0x7c3aed : 0x6366f1)
    .setTitle("🎙️ Panel — Ton salon vocal")
    .setDescription(`Propriétaire : <@${ownerId}>\nStatut : ${isPrivate ? "🔒 Privé" : "🔓 Public"}`)
    .addFields(
      {
        name: "🚫 Blacklist",
        value: blacklist.size ? [...blacklist].map((id) => `<@${id}>`).join(", ") : "*Personne*",
        inline: true,
      },
      {
        name: "✅ Whitelist",
        value: whitelist.size ? [...whitelist].map((id) => `<@${id}>`).join(", ") : "*Personne*",
        inline: true,
      }
    )
    .setFooter({ text: "Seul le propriétaire peut interagir avec ce panel." });

  // Row 1 — modération membres
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("vtmp_kick").setLabel("Expulser").setEmoji("👢").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("vtmp_blacklist").setLabel("Blacklist").setEmoji("🚫").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("vtmp_blacklist_absent").setLabel("BL Absent").setEmoji("➕").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("vtmp_unblacklist").setLabel("Unblacklist").setEmoji("↩️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vtmp_whitelist").setLabel("Whitelist").setEmoji("✅").setStyle(ButtonStyle.Success)
  );

  // Row 2 — gestion salon
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("vtmp_privacy")
      .setLabel(isPrivate ? "Public" : "Privé")
      .setEmoji(isPrivate ? "🔓" : "🔒")
      .setStyle(isPrivate ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("vtmp_rename").setLabel("Renommer").setEmoji("✏️").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("vtmp_limit").setLabel("Limite").setEmoji("🔢").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("vtmp_transfer").setLabel("Transférer").setEmoji("👑").setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [row1, row2] };
}

// ── Sélecteur de membres dans la voc ──
function buildMemberSelect(members, customId, placeholder) {
  const options = members.slice(0, 25).map((m) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(m.displayName)
      .setValue(m.id)
      .setDescription(m.user.tag)
  );
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .addOptions(options)
  );
}

// ════════════════════════════════════════════════════════════
//  EVENT — voiceStateUpdate : création / suppression auto
// ════════════════════════════════════════════════════════════
async function onVoiceStateUpdate(oldState, newState) {
  const guild = newState.guild || oldState.guild;

  // ── Quitter un salon temporaire → supprimer si vide (AVANT le check config) ──
  // "Vide" = plus aucun humain (le bot musique peut être resté connecté seul).
  if (oldState.channelId && tempChannels.has(oldState.channelId)) {
    const ch = oldState.channel;
    if (ch) {
      const humans = ch.members.filter((m) => !m.user.bot);
      if (humans.size === 0) {
        await ch.delete().catch(() => {});
        tempChannels.delete(oldState.channelId);
        return;
      }
    }
  }

  const cfg = await getConfig(guild.id);
  if (!cfg.joinChannelId) return;

  // ── Rejoindre le salon "créer ta voc" ──
  if (newState.channelId === cfg.joinChannelId) {
    const member = newState.member;
    const category = cfg.categoryId
      ? await guild.channels.fetch(cfg.categoryId).catch(() => null)
      : null;

    // Créer le salon vocal temporaire
    const permOverwrites = [
      {
        id: guild.roles.everyone,
        allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ViewChannel],
      },
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.MuteMembers,
          PermissionFlagsBits.DeafenMembers,
          PermissionFlagsBits.MoveMembers,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ];

    // Ajouter les perms staff si configuré
    if (cfg.staffRoleId) {
      permOverwrites.push({
        id: cfg.staffRoleId,
        allow: [
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.ViewChannel,
        ],
      });
    }

    const tempChannel = await guild.channels.create({
      name: `🎙️ ${member.displayName}`,
      type: ChannelType.GuildVoice,
      parent: category?.id || null,
      permissionOverwrites: permOverwrites,
    });

    // Déplacer le membre dans son salon
    await member.voice.setChannel(tempChannel).catch(() => {});

    // Stocker les données
    const data = {
      ownerId: member.id,
      isPrivate: false,
      blacklist: new Set(),
      whitelist: new Set(),
      panelMessageId: null,
    };
    tempChannels.set(tempChannel.id, data);

    // Envoyer le panel dans le salon textuel le plus proche (ou créer un thread si possible)
    // On envoie dans le salon vocal directement (Discord le supporte)
    const { embed, components } = buildPanel(tempChannel, data);
    const panelMsg = await tempChannel.send({ embeds: [embed], components }).catch(() => null);
    if (panelMsg) {
      data.panelMessageId = panelMsg.id;
      // Épingler le panel
      await panelMsg.pin().catch(() => {});
    }
  }

}

// ════════════════════════════════════════════════════════════
//  EVENT — interactionCreate : gestion des boutons
// ════════════════════════════════════════════════════════════
async function onInteractionCreate(interaction) {
  // ── Boutons du panel ──
  if (interaction.isButton() && interaction.customId.startsWith("vtmp_")) {
    const channel = interaction.channel;
    const data = tempChannels.get(channel.id);

    if (!data) return interaction.reply({ content: "❌ Ce salon n'est pas un salon temporaire.", ephemeral: true });

    // Vérification owner
    if (interaction.user.id !== data.ownerId) {
      return interaction.reply({ content: "❌ Seul le propriétaire du salon peut utiliser ce panel.", ephemeral: true });
    }

    const action = interaction.customId.replace("vtmp_", "");

    // ─ Actions nécessitant un sélecteur de membres ─
    // Blacklist absent → modal
    if (action === "blacklist_absent") {
      const modal = new ModalBuilder()
        .setCustomId("vtmp_modal_blacklist_absent")
        .setTitle("Blacklister un membre absent")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("vtmp_bl_user_id")
              .setLabel("ID du membre (ou @mention)")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("ex: 123456789012345678")
              .setRequired(true)
          )
        );
      return interaction.showModal(modal);
    }

    const memberSelectActions = ["kick", "blacklist", "whitelist", "unblacklist", "transfer"];
    if (memberSelectActions.includes(action)) {
      const voiceMembers = channel.members.filter((m) => !m.user.bot && m.id !== data.ownerId);

      const placeholders = {
        kick: "Choisir qui expulser",
        blacklist: "Choisir qui blacklister",
        whitelist: "Choisir qui whitelister",
        unblacklist: "Choisir qui retirer de la blacklist",
        transfer: "Choisir le nouveau propriétaire",
      };

      let members;
      if (action === "unblacklist") {
        if (data.blacklist.size === 0)
          return interaction.reply({ content: "❌ La blacklist est vide.", ephemeral: true });
        members = await Promise.all([...data.blacklist].map((id) => channel.guild.members.fetch(id).catch(() => null)));
        members = members.filter(Boolean);
      } else {
        if (voiceMembers.size === 0)
          return interaction.reply({ content: "❌ Aucun autre membre dans la voc.", ephemeral: true });
        members = [...voiceMembers.values()];
      }

      const row = buildMemberSelect(members, `vtmp_select_${action}`, placeholders[action]);
      return interaction.reply({ content: "👇 Sélectionne un membre :", components: [row], ephemeral: true });
    }

    // ─ Privacy toggle ─
    if (action === "privacy") {
      data.isPrivate = !data.isPrivate;
      const cfg = getConfig(channel.guild.id);
      // @everyone : bloquer si privé
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
        Connect: !data.isPrivate,
        ViewChannel: !data.isPrivate,
      });
      // Le rôle staff garde toujours l'accès
      if (cfg.staffRoleId) {
        await channel.permissionOverwrites.edit(cfg.staffRoleId, {
          Connect: true,
          ViewChannel: true,
          Speak: true,
        });
      }
      await updatePanel(channel, data);
      return interaction.reply({
        content: data.isPrivate ? "🔒 Salon mis en privé." : "🔓 Salon mis en public.",
        ephemeral: true,
      });
    }

    // ─ Rename modal ─
    if (action === "rename") {
      const modal = new ModalBuilder()
        .setCustomId("vtmp_modal_rename")
        .setTitle("Renommer le salon")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("vtmp_new_name")
              .setLabel("Nouveau nom")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("ex: Gaming Time 🎮")
              .setMaxLength(50)
              .setRequired(true)
          )
        );
      return interaction.showModal(modal);
    }

    // ─ Limit modal ─
    if (action === "limit") {
      const modal = new ModalBuilder()
        .setCustomId("vtmp_modal_limit")
        .setTitle("Limite de membres")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("vtmp_new_limit")
              .setLabel("Limite (0 = illimité, max 99)")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("ex: 5")
              .setMaxLength(2)
              .setRequired(true)
          )
        );
      return interaction.showModal(modal);
    }
  }

  // ── Sélecteurs ──
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith("vtmp_select_")) {
    const channel = interaction.channel;
    const data = tempChannels.get(channel.id);
    if (!data || interaction.user.id !== data.ownerId)
      return interaction.reply({ content: "❌ Action non autorisée.", ephemeral: true });

    const action = interaction.customId.replace("vtmp_select_", "");
    const targetId = interaction.values[0];
    const targetMember = await channel.guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });

    if (action === "kick") {
      await targetMember.voice.disconnect().catch(() => {});
      await interaction.reply({ content: `👢 <@${targetId}> a été expulsé.`, ephemeral: true });
    } else if (action === "blacklist") {
      data.blacklist.add(targetId);
      await channel.permissionOverwrites.edit(targetId, { Connect: false, ViewChannel: false });
      if (targetMember.voice.channelId === channel.id) await targetMember.voice.disconnect().catch(() => {});
      await updatePanel(channel, data);
      await interaction.reply({ content: `🚫 <@${targetId}> ajouté à la blacklist.`, ephemeral: true });
    } else if (action === "whitelist") {
      data.whitelist.add(targetId);
      await channel.permissionOverwrites.edit(targetId, { Connect: true, ViewChannel: true, Speak: true });
      await updatePanel(channel, data);
      await interaction.reply({ content: `✅ <@${targetId}> ajouté à la whitelist.`, ephemeral: true });
    } else if (action === "unblacklist") {
      data.blacklist.delete(targetId);
      await channel.permissionOverwrites.delete(targetId).catch(() => {});
      await updatePanel(channel, data);
      await interaction.reply({ content: `↩️ <@${targetId}> retiré de la blacklist.`, ephemeral: true });
    } else if (action === "transfer") {
      // Retirer les perms owner à l'ancien
      await channel.permissionOverwrites.edit(data.ownerId, {
        MuteMembers: false,
        DeafenMembers: false,
        MoveMembers: false,
        ManageChannels: false,
      });
      // Donner les perms au nouveau
      data.ownerId = targetId;
      await channel.permissionOverwrites.edit(targetId, {
        Connect: true,
        Speak: true,
        ViewChannel: true,
        MuteMembers: true,
        DeafenMembers: true,
        MoveMembers: true,
        ManageChannels: true,
      });
      await updatePanel(channel, data);
      await interaction.reply({ content: `👑 Ownership transféré à <@${targetId}>.`, ephemeral: false });
    }
  }

  // ── Modals ──
  if (interaction.isModalSubmit()) {
    const channel = interaction.channel;
    const data = tempChannels.get(channel.id);
    if (!data || interaction.user.id !== data.ownerId)
      return interaction.reply({ content: "❌ Action non autorisée.", ephemeral: true });

    if (interaction.customId === "vtmp_modal_rename") {
      const newName = interaction.fields.getTextInputValue("vtmp_new_name");
      await channel.setName(newName).catch(() => {});
      await interaction.reply({ content: `✏️ Salon renommé en **${newName}**.`, ephemeral: true });
    }

    if (interaction.customId === "vtmp_modal_blacklist_absent") {
      let input = interaction.fields.getTextInputValue("vtmp_bl_user_id").trim();
      const match = input.match(/^<@!?(\d+)>$/) || input.match(/^(\d+)$/);
      if (!match)
        return interaction.reply({ content: "❌ Format invalide. Utilise un ID ou une mention `<@ID>`.", ephemeral: true });
      const userId = match[1];
      if (userId === data.ownerId)
        return interaction.reply({ content: "❌ Tu ne peux pas te blacklister toi-même.", ephemeral: true });
      const target = await channel.guild.members.fetch(userId).catch(() => null);
      if (!target)
        return interaction.reply({ content: "❌ Membre introuvable sur le serveur.", ephemeral: true });
      data.blacklist.add(userId);
      await channel.permissionOverwrites.edit(userId, { Connect: false, ViewChannel: false }).catch(() => {});
      if (target.voice.channelId === channel.id) await target.voice.disconnect().catch(() => {});
      await updatePanel(channel, data);
      return interaction.reply({ content: `🚫 <@${userId}> ajouté à la blacklist — ne pourra pas rejoindre.`, ephemeral: true });
    }

    if (interaction.customId === "vtmp_modal_limit") {
      const val = parseInt(interaction.fields.getTextInputValue("vtmp_new_limit"), 10);
      if (isNaN(val) || val < 0 || val > 99)
        return interaction.reply({ content: "❌ Valeur invalide (0–99).", ephemeral: true });
      await channel.setUserLimit(val).catch(() => {});
      await interaction.reply({
        content: val === 0 ? "🔢 Limite retirée." : `🔢 Limite fixée à **${val}** membres.`,
        ephemeral: true,
      });
    }
  }
}

// ── Mettre à jour le panel épinglé ──
async function updatePanel(channel, data) {
  if (!data.panelMessageId) return;
  const msg = await channel.messages.fetch(data.panelMessageId).catch(() => null);
  if (!msg) return;
  const { embed, components } = buildPanel(channel, data);
  await msg.edit({ embeds: [embed], components }).catch(() => {});
}

// ════════════════════════════════════════════════════════════
//  ROUTE API — backend Express (ajouter dans ton index.js)
// ════════════════════════════════════════════════════════════
function registerRoutes(app, client) {
  // GET config
  app.get("/api/vocaltemp/config", (req, res) => {
    const guildId = req.query.guildId || process.env.GUILD_ID;
    const cfg = getConfig(guildId);
    res.json(cfg);
  });

  // POST config
  app.post("/api/vocaltemp/config", (req, res) => {
    const guildId = req.query.guildId || process.env.GUILD_ID;
    const { joinChannelId, categoryId, staffRoleId } = req.body;
    try {
      const cfgPath = path.join(__dirname, "../../config.json");
      const raw = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      if (!raw.vocalTemp) raw.vocalTemp = {};
      raw.vocalTemp[guildId] = { joinChannelId, categoryId, staffRoleId: staffRoleId || null };
      fs.writeFileSync(cfgPath, JSON.stringify(raw, null, 2));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET rôles du guild
  app.get("/api/roles", async (req, res) => {
    const guildId = req.query.guildId || process.env.GUILD_ID;
    try {
      const guild = await client.guilds.fetch(guildId);
      const roles = await guild.roles.fetch();
      const list = [...roles.values()]
        .filter((r) => r.id !== guildId) // exclure @everyone
        .sort((a, b) => b.position - a.position)
        .map((r) => ({ id: r.id, name: r.name, color: r.color, position: r.position }));
      res.json(list);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET salons vocaux du guild
  app.get("/api/channels", async (req, res) => {
    const guildId = req.query.guildId || process.env.GUILD_ID;
    const type = req.query.type; // "voice" | "category"
    try {
      const guild = await client.guilds.fetch(guildId);
      const channels = await guild.channels.fetch();
      const typeMap = { voice: ChannelType.GuildVoice, category: ChannelType.GuildCategory };
      const filtered = channels
        .filter((c) => !type || c.type === typeMap[type])
        .map((c) => ({ id: c.id, name: c.name, type: c.type }));
      res.json(filtered);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

// ════════════════════════════════════════════════════════════
//  EXPORT — à brancher dans ton index.js bot
// ════════════════════════════════════════════════════════════
module.exports = {
  /**
   * Appelle cette fonction dans ton index.js :
   *
   *   const vocalTemp = require('./features/vocalTemp');
   *   vocalTemp.init(client, app); // app = ton Express app
   */
  init(client, app) {
    client.on("voiceStateUpdate", onVoiceStateUpdate);
    client.on("interactionCreate", onInteractionCreate);
    if (app) registerRoutes(app, client);
    console.log("[VocalTemp] ✅ Système vocal temporaire chargé.");
  },

  // Expose pour tests unitaires
  tempChannels,
  onVoiceStateUpdate,
  onInteractionCreate,
};