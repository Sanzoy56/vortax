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

// ── Emojis (déjà utilisés ailleurs dans le bot, cf. levels/config.js) ──
const CHECK = "<:592053verified:1510069208661098546>";
const CROSS = "<:26643crossmark:1510067005066055690>";
const ICON  = "<a:vortax:1515519231238602802>";

// ── Stockage en mémoire, persisté sur disque (cf. levels/db.js) : sans ça,
// un redémarrage du bot vide la liste et les salons temporaires déjà créés
// deviennent "orphelins" — plus jamais supprimés automatiquement quand ils
// se vident, d'où les suppressions manuelles.
const tempChannels = new Map(); // channelId → { ownerId, blacklist: Set, whitelist: Set, isPrivate, panelMessageId }

const DATA_DIR  = path.join(__dirname, "..", "..", "vortax-data");
const TEMP_FILE = path.join(DATA_DIR, "vocaltemp_channels.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadTempChannels() {
  try {
    const raw = JSON.parse(fs.readFileSync(TEMP_FILE, "utf8"));
    for (const [id, d] of Object.entries(raw)) {
      tempChannels.set(id, {
        ownerId: d.ownerId,
        isPrivate: !!d.isPrivate,
        micDisabled: !!d.micDisabled,
        videoDisabled: !!d.videoDisabled,
        soundboardDisabled: !!d.soundboardDisabled,
        limitEnabled: !!d.limitEnabled,
        savedLimit: d.savedLimit || 5,
        blacklist: new Set(d.blacklist || []),
        whitelist: new Set(d.whitelist || []),
        panelMessageId: d.panelMessageId || null,
      });
    }
  } catch {}
}

function saveTempChannels() {
  const obj = {};
  for (const [id, d] of tempChannels.entries()) {
    obj[id] = {
      ownerId: d.ownerId,
      isPrivate: d.isPrivate,
      micDisabled: d.micDisabled,
      videoDisabled: d.videoDisabled,
      soundboardDisabled: d.soundboardDisabled,
      limitEnabled: d.limitEnabled,
      savedLimit: d.savedLimit,
      blacklist: [...d.blacklist],
      whitelist: [...d.whitelist],
      panelMessageId: d.panelMessageId,
    };
  }
  try { fs.writeFileSync(TEMP_FILE, JSON.stringify(obj, null, 2)); } catch {}
}

// ── Supprime les salons temporaires connus devenus vides (au démarrage et
// périodiquement, pour récupérer les salons orphelins après un restart) ──
async function sweepEmptyChannels(client) {
  for (const [channelId, data] of [...tempChannels.entries()]) {
    let ch = null;
    try { ch = await client.channels.fetch(channelId); } catch {}
    if (!ch) {
      tempChannels.delete(channelId);
      saveTempChannels();
      continue;
    }
    const humans = ch.members.filter((m) => !m.user.bot);
    if (humans.size === 0) {
      await ch.delete().catch(() => {});
      tempChannels.delete(channelId);
      saveTempChannels();
    }
  }
}

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
  const { ownerId, isPrivate, micDisabled, videoDisabled, soundboardDisabled, limitEnabled, savedLimit, blacklist, whitelist } = data;
  const status = (active) => (active ? `${CHECK} Activé` : `${CROSS} Désactivé`);

  const embed = new EmbedBuilder()
    .setColor(isPrivate ? 0x7c3aed : 0x6366f1)
    .setTitle(`${ICON} Options du canal vocal`)
    .setDescription(
      `Ah, regardez qui est là. J'espère que votre intelligence est suffisamment avancée pour comprendre comment utiliser les boutons ci-dessous. Sinon, je suppose que je devrais m'attendre à des résultats décevants, n'est-ce pas ? Oui, je parle de vous, <@${ownerId}>.`
    )
    .addFields(
      { name: "🔒 Privé", value: status(isPrivate), inline: true },
      { name: "🎙️ Microphone", value: status(!micDisabled), inline: true },
      { name: "🎥 Vidéo", value: status(!videoDisabled), inline: true },
      { name: "🎶 Soundboards", value: status(!soundboardDisabled), inline: true },
      { name: `🔢 Limite d'utilisateurs${limitEnabled ? ` (${savedLimit})` : ""}`, value: status(limitEnabled), inline: true },
      { name: "👑 Propriétaire", value: `<@${ownerId}>`, inline: true },
      {
        name: "🚫 Blacklist",
        value: blacklist.size ? [...blacklist].map((id) => `<@${id}>`).join(", ") : "*Personne*",
        inline: false,
      },
      {
        name: "✅ Whitelist",
        value: whitelist.size ? [...whitelist].map((id) => `<@${id}>`).join(", ") : "*Personne*",
        inline: false,
      }
    )
    .setFooter({ text: "Utilisez les boutons ci-dessous pour modifier les paramètres." });

  // Row 1 — bascules canal vocal
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("vtmp_privacy")
      .setLabel(isPrivate ? "Désactiver le privé" : "Activer le privé")
      .setStyle(isPrivate ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("vtmp_mic")
      .setLabel(micDisabled ? "Activer le microphone" : "Désactiver le microphone")
      .setStyle(micDisabled ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("vtmp_video")
      .setLabel(videoDisabled ? "Activer la vidéo" : "Désactiver la vidéo")
      .setStyle(videoDisabled ? ButtonStyle.Success : ButtonStyle.Danger)
  );

  // Row 2 — soundboards / limite / ajout d'utilisateurs
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("vtmp_soundboard")
      .setLabel(soundboardDisabled ? "Activer les soundboards" : "Désactiver les soundboards")
      .setStyle(soundboardDisabled ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("vtmp_limit_toggle")
      .setLabel(limitEnabled ? "Désactiver la limite" : "Activer la limite")
      .setStyle(limitEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder().setCustomId("vtmp_whitelist").setLabel("Ajouter des utilisateurs").setEmoji("👤").setStyle(ButtonStyle.Primary)
  );

  // Row 3 — modération membres
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("vtmp_kick").setLabel("Expulser").setEmoji("👢").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("vtmp_blacklist").setLabel("Blacklist").setEmoji("🚫").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("vtmp_blacklist_absent").setLabel("BL Absent").setEmoji("➕").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("vtmp_unblacklist").setLabel("Unblacklist").setEmoji("↩️").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("vtmp_transfer").setLabel("Transférer").setEmoji("👑").setStyle(ButtonStyle.Primary)
  );

  // Row 4 — gestion salon
  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("vtmp_rename").setLabel("Renommer").setEmoji("✏️").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("vtmp_limit").setLabel("Définir la limite").setEmoji("🔢").setStyle(ButtonStyle.Primary)
  );

  return { embed, components: [row1, row2, row3, row4] };
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
        saveTempChannels();
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
      micDisabled: false,
      videoDisabled: false,
      soundboardDisabled: false,
      limitEnabled: false,
      savedLimit: 5,
      blacklist: new Set(),
      whitelist: new Set(),
      panelMessageId: null,
    };
    tempChannels.set(tempChannel.id, data);
    saveTempChannels();

    // Envoyer le panel dans le salon textuel le plus proche (ou créer un thread si possible)
    // On envoie dans le salon vocal directement (Discord le supporte)
    const { embed, components } = buildPanel(tempChannel, data);
    const panelMsg = await tempChannel.send({ embeds: [embed], components }).catch(() => null);
    if (panelMsg) {
      data.panelMessageId = panelMsg.id;
      // Épingler le panel
      await panelMsg.pin().catch(() => {});
      saveTempChannels();
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
      const cfg = await getConfig(channel.guild.id);
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
      saveTempChannels();
      return interaction.reply({
        content: data.isPrivate ? "🔒 Salon mis en privé." : "🔓 Salon mis en public.",
        ephemeral: true,
      });
    }

    // ─ Microphone toggle ─
    if (action === "mic") {
      data.micDisabled = !data.micDisabled;
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
        Speak: !data.micDisabled,
      });
      await updatePanel(channel, data);
      saveTempChannels();
      return interaction.reply({
        content: data.micDisabled ? "🎙️ Microphone désactivé pour les membres." : "🎙️ Microphone réactivé pour les membres.",
        ephemeral: true,
      });
    }

    // ─ Vidéo toggle ─
    if (action === "video") {
      data.videoDisabled = !data.videoDisabled;
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
        Stream: !data.videoDisabled,
      });
      await updatePanel(channel, data);
      saveTempChannels();
      return interaction.reply({
        content: data.videoDisabled ? "🎥 Vidéo désactivée pour les membres." : "🎥 Vidéo réactivée pour les membres.",
        ephemeral: true,
      });
    }

    // ─ Soundboards toggle ─
    if (action === "soundboard") {
      data.soundboardDisabled = !data.soundboardDisabled;
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
        UseSoundboard: !data.soundboardDisabled,
        UseExternalSounds: !data.soundboardDisabled,
      });
      await updatePanel(channel, data);
      saveTempChannels();
      return interaction.reply({
        content: data.soundboardDisabled ? "🔇 Soundboards désactivés." : "🔊 Soundboards réactivés.",
        ephemeral: true,
      });
    }

    // ─ Limite toggle (active/désactive la limite enregistrée) ─
    if (action === "limit_toggle") {
      data.limitEnabled = !data.limitEnabled;
      await channel.setUserLimit(data.limitEnabled ? data.savedLimit : 0).catch(() => {});
      await updatePanel(channel, data);
      saveTempChannels();
      return interaction.reply({
        content: data.limitEnabled ? `🔢 Limite activée (${data.savedLimit}).` : "🔢 Limite désactivée.",
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
      saveTempChannels();
      await interaction.reply({ content: `🚫 <@${targetId}> ajouté à la blacklist.`, ephemeral: true });
    } else if (action === "whitelist") {
      data.whitelist.add(targetId);
      await channel.permissionOverwrites.edit(targetId, { Connect: true, ViewChannel: true, Speak: true });
      await updatePanel(channel, data);
      saveTempChannels();
      await interaction.reply({ content: `✅ <@${targetId}> ajouté à la whitelist.`, ephemeral: true });
    } else if (action === "unblacklist") {
      data.blacklist.delete(targetId);
      await channel.permissionOverwrites.delete(targetId).catch(() => {});
      await updatePanel(channel, data);
      saveTempChannels();
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
      saveTempChannels();
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
      saveTempChannels();
      return interaction.reply({ content: `🚫 <@${userId}> ajouté à la blacklist — ne pourra pas rejoindre.`, ephemeral: true });
    }

    if (interaction.customId === "vtmp_modal_limit") {
      const val = parseInt(interaction.fields.getTextInputValue("vtmp_new_limit"), 10);
      if (isNaN(val) || val < 0 || val > 99)
        return interaction.reply({ content: "❌ Valeur invalide (0–99).", ephemeral: true });
      await channel.setUserLimit(val).catch(() => {});
      data.limitEnabled = val > 0;
      if (val > 0) data.savedLimit = val;
      await updatePanel(channel, data);
      saveTempChannels();
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
    loadTempChannels();
    client.on("voiceStateUpdate", onVoiceStateUpdate);
    client.on("interactionCreate", onInteractionCreate);
    client.once("ready", () => sweepEmptyChannels(client));
    setInterval(() => sweepEmptyChannels(client), 5 * 60 * 1000);
    if (app) registerRoutes(app, client);
    console.log("[VocalTemp] ✅ Système vocal temporaire chargé (persistance + nettoyage auto).");
  },

  // Expose pour tests unitaires
  tempChannels,
  onVoiceStateUpdate,
  onInteractionCreate,
};