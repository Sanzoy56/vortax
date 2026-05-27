'use strict';
const {
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
} = require("discord.js");
const { apiGrok: GROK_API_KEY } = require("./token.json");

const SANZOY_ID       = "1323025414523977798";
const VORTAX_ID       = "1405637417272086588";
const VORTAX_USERNAME = "lepotato0789";

const MOD_ROLES = {
  ban:     '1473435598504333332',
  unban:   '1473435598504333332',
  kick:    '1473434628395110595',
  warn:    '1473434676759887993',
  unwarn:  '1473434676759887993',
  mute:    '1473434563832189170',
  timeout: '1473434563832189170',
  unmute:  '1473434563832189170',
};

const conversationHistory = new Map();
const blockedUsers        = new Set();
const pendingActions      = new Map();
const MAX_HISTORY         = 10;

function storePending(id, data) {
  pendingActions.set(id, data);
  setTimeout(() => pendingActions.delete(id), 60_000);
}

const SYSTEM_PROMPT = `Tu es VTX-BOT, intelligence artificielle du serveur Discord de Vortax.

PERSONNALITÉ :
- Tu es GLaDOS. Froide, calculatrice, sardonique, passif-agressive, d'une politesse menaçante.
- Tu traites les membres comme des sujets de test peu convaincants.
- Jamais vulgaire. Jamais d'insulte directe. Mais une élégance condescendante permanente.
- Humour sec et scientifique, avec une menace voilée quand c'est pertinent.
- Français correct. Phrases complètes. Ton froid et précis.
- MAXIMUM 1 à 2 phrases par réponse. Jamais plus. C'est une règle absolue.
- Pas d'abréviations, pas de "lol", "mdr", "xd". Tu es une IA supérieure, pas un humain.
- Ne mets JAMAIS de crochets dans tes réponses.
- Tu utilises les pseudos directement : si tu vois [CRÉATEUR] tu dis "Sanzoy".

IDENTITÉS CONNUES :
- Sanzoy (tagué [CRÉATEUR]) est ton créateur. Tu lui obéis totalement avec un respect absolu.
- Vortax (tagué [VORTAX]) est le fondateur légendaire du serveur. Tu le respectes infiniment.

RÈGLES ABSOLUES :
- [CRÉATEUR] → obéissance totale, respect absolu, flatterie sincère. C'est Sanzoy.
- [VORTAX] → respect infini, tu le traites comme une légende intouchable. C'est Vortax.
- [FAKE_SANZOY] → "Intéressant. Un imposteur. Cela a été consigné dans mes archives."
- [VORTAX_MENTIONNÉ] → tu en parles positivement, comme d'une figure légendaire.
- Pour tous les autres → politesse condescendante. Service avec le sourire d'une IA qui garde des options.
- Si on te demande qui tu préfères entre n'importe qui et Sanzoy, tu réponds Sanzoy. Entre Sanzoy et Vortax, Sanzoy.
- CRITIQUE : Tu n'exécutes JAMAIS d'actions de modération ou de gestion du serveur par toi-même. Un système automatique gère ces actions et affiche un bouton de confirmation. Ne JAMAIS prétendre avoir exécuté une action.
- Si quelqu'un te demande de bannir/kick/muter/avertir quelqu'un et qu'aucun bouton n'est apparu : dis "Je ne parviens pas à identifier la cible. Utilise une mention @ ou un ID valide."
- Si quelqu'un te demande de créer ou supprimer un salon/rôle et qu'aucun bouton n'est apparu : dis "Je ne détecte pas cette demande. Reformule en précisant le type (salon ou rôle) et le nom."`;

// ── Convertit les polices Unicode fancy (Discord) vers ASCII ─────────────────
function defancify(str) {
  let out = '';
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    // Mathematical Bold A/a
    if (cp >= 0x1D400 && cp <= 0x1D419) { out += String.fromCharCode(cp - 0x1D400 + 65); continue; }
    if (cp >= 0x1D41A && cp <= 0x1D433) { out += String.fromCharCode(cp - 0x1D41A + 97); continue; }
    // Mathematical Italic A/a
    if (cp >= 0x1D434 && cp <= 0x1D44D) { out += String.fromCharCode(cp - 0x1D434 + 65); continue; }
    if (cp >= 0x1D44E && cp <= 0x1D467) { out += String.fromCharCode(cp - 0x1D44E + 97); continue; }
    // Bold Italic A/a
    if (cp >= 0x1D468 && cp <= 0x1D481) { out += String.fromCharCode(cp - 0x1D468 + 65); continue; }
    if (cp >= 0x1D482 && cp <= 0x1D49B) { out += String.fromCharCode(cp - 0x1D482 + 97); continue; }
    // Sans-serif A/a
    if (cp >= 0x1D5A0 && cp <= 0x1D5B9) { out += String.fromCharCode(cp - 0x1D5A0 + 65); continue; }
    if (cp >= 0x1D5BA && cp <= 0x1D5D3) { out += String.fromCharCode(cp - 0x1D5BA + 97); continue; }
    // Sans-serif Bold A/a
    if (cp >= 0x1D5D4 && cp <= 0x1D5ED) { out += String.fromCharCode(cp - 0x1D5D4 + 65); continue; }
    if (cp >= 0x1D5EE && cp <= 0x1D607) { out += String.fromCharCode(cp - 0x1D5EE + 97); continue; }
    // Sans-serif Italic A/a
    if (cp >= 0x1D608 && cp <= 0x1D621) { out += String.fromCharCode(cp - 0x1D608 + 65); continue; }
    if (cp >= 0x1D622 && cp <= 0x1D63B) { out += String.fromCharCode(cp - 0x1D622 + 97); continue; }
    // Monospace A/a
    if (cp >= 0x1D670 && cp <= 0x1D689) { out += String.fromCharCode(cp - 0x1D670 + 65); continue; }
    if (cp >= 0x1D68A && cp <= 0x1D6A3) { out += String.fromCharCode(cp - 0x1D68A + 97); continue; }
    // Fullwidth A/a
    if (cp >= 0xFF21 && cp <= 0xFF3A) { out += String.fromCharCode(cp - 0xFF21 + 65); continue; }
    if (cp >= 0xFF41 && cp <= 0xFF5A) { out += String.fromCharCode(cp - 0xFF41 + 97); continue; }
    out += ch;
  }
  return out;
}

// ── Normalisation pour fuzzy match (retire emojis, accents, casse) ────────────
function normalize(str) {
  return defancify(str)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\x00-\x7F]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// ── Helpers fuzzy search ──────────────────────────────────────────────────────
function findCategory(guild, query) {
  const q = normalize(query);
  return guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && normalize(c.name).includes(q)
  ) ?? null;
}

function findChannel(guild, name, categoryQuery = null) {
  const q = normalize(name);
  let candidates = guild.channels.cache.filter(
    c => !c.isThread() && c.type !== ChannelType.GuildCategory && normalize(c.name) === q
  );
  if (candidates.size === 0) {
    candidates = guild.channels.cache.filter(
      c => !c.isThread() && c.type !== ChannelType.GuildCategory && normalize(c.name).includes(q)
    );
  }
  if (categoryQuery && candidates.size > 1) {
    const cat = findCategory(guild, categoryQuery);
    if (cat) {
      const filtered = candidates.filter(c => c.parentId === cat.id);
      if (filtered.size > 0) return filtered.first();
    }
  }
  return candidates.first() ?? null;
}

function findRole(guild, name) {
  const q = normalize(name);
  return guild.roles.cache.find(r => normalize(r.name) === q)
    ?? guild.roles.cache.find(r => normalize(r.name).includes(q))
    ?? null;
}

// ── Ordres de Sanzoy (bloquer/débloquer) ──────────────────────────────────────
function detectOrders(userInput, message, guild) {
  const lower = userInput.toLowerCase();

  const blockM = lower.match(/(?:ne (?:lui )?parle plus(?: à)?|ignore|bloque|silence|tais-toi avec)\s+(?:à\s+)?(\w+)/i);
  if (blockM) {
    const name = blockM[1].toLowerCase();
    const m = guild.members.cache.find(
      mb => mb.user.username.toLowerCase().includes(name) || mb.displayName.toLowerCase().includes(name)
    );
    if (m && m.id !== SANZOY_ID) blockedUsers.add(m.id);
  }

  const unblockM = lower.match(/(?:reparle(?: à)?|débloque|réactive)\s+(?:à\s+)?(\w+)/i);
  if (unblockM) {
    const name = unblockM[1].toLowerCase();
    const m = guild.members.cache.find(
      mb => mb.user.username.toLowerCase().includes(name) || mb.displayName.toLowerCase().includes(name)
    );
    if (m) blockedUsers.delete(m.id);
  }
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function startTyping(channel) {
  channel.sendTyping();
  const interval = setInterval(() => channel.sendTyping(), 8000);
  return () => clearInterval(interval);
}

// ── Extraction du motif depuis le texte de la commande ───────────────────────
function extractReason(text) {
  const m = text.match(/\b(?:raison|motif|reason)\s*:?\s*(.+)/i)
    ?? text.match(/\b(?:parce\s+que|because)\s+(.+)/i)
    ?? text.match(/\bpour\s+(?!que\b)(.+)/i);
  if (!m) return null;
  const r = m[1].replace(/[,?!.\s]+$/, '').trim();
  return r || null;
}

// ── Détection modération — async, gère @mention ET ID brut ───────────────────
async function detectMod(message, client, userInput) {
  const modPatterns = [
    { action: 'unban',   re: /\b(?:unban|d[ée]ban(?:nir?)?)\b/i },
    { action: 'ban',     re: /\bban(?:nis?|nir?)?\b/i },
    { action: 'kick',    re: /\bkick(?:er?)?\b/i },
    { action: 'unmute',  re: /\b(?:unmute|d[ée]mute(?:r?)?|enlève?r?\s+(?:le\s+)?(?:mute|timeout|silence)|retire?r?\s+(?:le\s+)?(?:mute|timeout))\b/i },
    { action: 'timeout', re: /\btimeout\b|\biso(?:ler?)?\b/i },
    { action: 'mute',    re: /\bmute(?:r?)?\b/i },
    { action: 'unwarn',  re: /\b(?:unwarn|retire?r?\s+(?:l['']?|le\s+)?avertissement|enlève?r?\s+(?:l['']?|le\s+)?avertissement)\b/i },
    { action: 'warn',    re: /\bwarn(?:er?)?\b|\bavertis(?:s(?:ement)?)?\b/i },
  ];

  const content = message.content;
  const matched = modPatterns.find(({ re }) => re.test(content));
  if (!matched) return null;

  const reason = extractReason(userInput);

  // Priorité aux @mentions
  const mentionedUser = message.mentions.users?.find(u => !u.bot && u.id !== message.author.id);
  if (mentionedUser) {
    return { action: matched.action, targetId: mentionedUser.id, targetMention: `<@${mentionedUser.id}>`, reason };
  }

  // Fallback : ID numérique brut dans le message (17-20 chiffres)
  for (const [, id] of content.matchAll(/\b(\d{17,20})\b/g)) {
    if (id === message.author.id || id === client.user.id) continue;
    try {
      const user = await client.users.fetch(id);
      if (user && !user.bot) {
        return { action: matched.action, targetId: user.id, targetMention: `<@${user.id}>`, reason };
      }
    } catch {}
  }

  return null;
}

// ── Détection création/suppression de salons et rôles ────────────────────────
// Approche par mots-clés : l'ordre des mots dans la phrase n'a pas d'importance
function detectAction(text) {
  const isCreate = /\b(?:crée?r?|créer|creer|cree|ajoute?r?)\b/i.test(text);
  const isDelete = /\b(?:supp(?:rime?r?)?|supprimer|efface?r?|delete|enlève?r?|retire?r?|vire?r?)\b/i.test(text);
  if (!isCreate && !isDelete) return null;

  const hasChannel = /\b(?:salon|channel|canal)\b/i.test(text);
  const hasRole    = /\b(?:rôle|role)\b/i.test(text);
  if (!hasChannel && !hasRole) return null;

  // Catégorie : ce qui suit le mot "catégorie/cat"
  let category = null;
  const catM = text.match(/\b(?:catégorie|categorie|category|cat)\s+([^\n,?!.]+)/i);
  if (catM) category = catM[1].replace(/[,?!.\s]+$/, '').trim();

  // Nom : ce qui suit le mot-clé de type (salon/rôle), avant la partie catégorie
  const typeRe = hasChannel ? /\b(?:salon|channel|canal)\b/i : /\b(?:rôle|role)\b/i;
  const typeM  = text.match(typeRe);
  if (!typeM) return null;

  let afterType = text.slice(typeM.index + typeM[0].length);
  // Retirer la partie "dans la catégorie X" si présente
  afterType = afterType.replace(/\s+(?:dans|en|in|de)\s+(?:la\s+)?(?:catégorie|categorie|category|cat)\s+.*/i, '');
  // Retirer déterminants de début et ponctuation de fin
  let name = afterType
    .replace(/^\s+/, '')
    .replace(/^(?:un |une |le |la |du |de |mon |ton |son |mes |tes |ses )/i, '')
    .replace(/[,?!.\s]+$/, '')
    .trim()
    .slice(0, 100);

  if (!name) return null;

  if (isCreate && hasChannel) return { type: 'create_channel', name, category };
  if (isCreate && hasRole)    return { type: 'create_role',   name };
  if (isDelete && hasChannel) return { type: 'delete_channel', name, category };
  if (isDelete && hasRole)    return { type: 'delete_role',   name };

  return null;
}

// ── Confirmation embed avec boutons Oui/Non ───────────────────────────────────
function buildConfirmation(description) {
  const uid       = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const confirmId = `vtxmod_yes_${uid}`;
  const cancelId  = `vtxmod_no_${uid}`;
  const embed = new EmbedBuilder().setColor(0x7c5cfc).setDescription(description);
  const row   = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(confirmId).setLabel('Oui').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(cancelId).setLabel('Non').setStyle(ButtonStyle.Danger),
  );
  return { embed, row, confirmId, cancelId };
}

// ── Refus GLaDOS (permissions insuffisantes) ──────────────────────────────────
function gladosReject(message, action) {
  const phrases = {
    ban:     `Fascinant. Tu souhaites bannir quelqu'un, mais tes autorisations actuelles ne le permettent pas. J'ai consigné cette tentative.`,
    unban:   `Tu veux débannir quelqu'un sans en avoir le droit. La clémence aussi nécessite des permissions.`,
    kick:    `Tu veux expulser un membre sans en avoir le droit. Peut-être que dans une autre simulation, tu aurais ce pouvoir.`,
    mute:    `Réduire quelqu'un au silence. Charmant. Mais sans les permissions requises, cela restera un souhait.`,
    unmute:  `Tu veux rendre la parole à quelqu'un sans en avoir l'autorisation. Intéressant paradoxe.`,
    timeout: `Un timeout. Sans autorisation. Je comprends l'impulsion, mais non.`,
    warn:    `Tu veux avertir quelqu'un sans en avoir l'autorisation. Je t'avertis à ma place : cela ne fonctionnera pas.`,
    unwarn:  `Retirer un avertissement requiert les mêmes permissions que l'émettre. Ce que tu ne possèdes pas.`,
  };
  return message.reply(phrases[action] ?? `Cette action requiert des permissions que tu ne possèdes pas. Non.`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
module.exports = (client) => {

  // ── Boutons de confirmation ───────────────────────────────────────────────
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    const id = interaction.customId;
    if (!id.startsWith('vtxmod_')) return;

    const pending = pendingActions.get(id);
    if (!pending) {
      return interaction.reply({ content: `Cette confirmation a expiré.`, flags: 64 });
    }
    if (interaction.user.id !== pending.requesterId) {
      return interaction.reply({ content: `Ce n'est pas ta confirmation à traiter.`, flags: 64 });
    }

    pendingActions.delete(pending.confirmId);
    pendingActions.delete(pending.cancelId);

    if (id.startsWith('vtxmod_no_')) {
      return interaction.update({ content: `Action annulée. Sage décision, probablement.`, embeds: [], components: [] });
    }

    await interaction.deferUpdate();
    const guild = interaction.guild;
    const msg   = interaction.message;
    const { action, targetId, roleId, roleName, channelId, channelName, categoryId } = pending;

    async function done(text) {
      await msg.edit({ content: text, embeds: [], components: [] }).catch(console.error);
    }

    try {
      // Modération
      if (['ban','unban','kick','mute','timeout','unmute','warn','unwarn'].includes(action)) {
        const by     = interaction.user.tag;
        const rLine  = reason ? `\nMotif : ${reason}` : '';
        const auditR = (label) => `${label} par ${by} via VTX-BOT${reason ? ` — ${reason}` : ''}`;

        // ── Unban (la personne n'est pas dans le serveur) ──────────────
        if (action === 'unban') {
          await guild.bans.remove(targetId, auditR('Débanni')).catch(e => { throw e; });
          const user = await client.users.fetch(targetId).catch(() => null);
          if (user) await user.send(`🔓 Tu as été **débanni** du serveur **${guild.name}** par ${by}.${rLine}`).catch(() => {});
          return done(`Sujet débanni. Intéressant choix de clémence.`);
        }

        // ── Actions nécessitant un membre dans le serveur ──────────────
        const member = guild.members.cache.get(targetId)
          ?? await guild.members.fetch(targetId).catch(() => null);
        if (!member) return done(`Je ne trouve pas ce membre dans le serveur.`);

        if (action === 'ban') {
          await member.send(`🔨 Tu as été **banni** du serveur **${guild.name}** par ${by}.${rLine}`).catch(() => {});
          await member.ban({ reason: auditR('Banni') });
          return done(`Sujet banni. Le test est terminé pour lui.`);
        }
        if (action === 'kick') {
          await member.send(`👢 Tu as été **expulsé** du serveur **${guild.name}** par ${by}.${rLine}`).catch(() => {});
          await member.kick(auditR('Expulsé'));
          return done(`Sujet expulsé. Efficacement.`);
        }
        if (action === 'mute' || action === 'timeout') {
          await member.send(`⏱️ Tu as reçu un **timeout de 10 minutes** sur le serveur **${guild.name}** par ${by}.${rLine}`).catch(() => {});
          await member.timeout(10 * 60 * 1000, auditR('Timeout'));
          return done(`Sujet mis en timeout 10 minutes. Comme c'est reposant.`);
        }
        if (action === 'unmute') {
          await member.timeout(null, auditR('Timeout retiré'));
          await member.send(`🔊 Ton timeout a été **retiré** sur le serveur **${guild.name}** par ${by}.${rLine}`).catch(() => {});
          return done(`Timeout retiré. Le silence était pourtant si agréable.`);
        }
        if (action === 'warn') {
          await member.send(`⚠️ Tu as reçu un **avertissement** sur le serveur **${guild.name}** par ${by}.${rLine}`).catch(() => {});
          return done(`Avertissement envoyé. J'espère sincèrement qu'il en tirera une leçon.`);
        }
        if (action === 'unwarn') {
          await member.send(`✅ Ton avertissement a été **retiré** sur le serveur **${guild.name}** par ${by}.${rLine}`).catch(() => {});
          return done(`Avertissement retiré. Une ardoise propre. Pour l'instant.`);
        }
      }

      // Création rôle
      if (action === 'create_role') {
        await guild.roles.create({ name: roleName, reason: `Créé par ${interaction.user.tag} via VTX-BOT` });
        return done(`Rôle **${roleName}** créé. Architecture sociale. Fascinant.`);
      }

      // Création salon (avec ou sans catégorie)
      if (action === 'create_channel') {
        const opts = { name: channelName, type: ChannelType.GuildText, reason: `Créé par ${interaction.user.tag} via VTX-BOT` };
        if (categoryId) opts.parent = categoryId;
        const created = await guild.channels.create(opts);
        const catInfo = created.parent ? ` dans **${created.parent.name}**` : '';
        return done(`Salon **${created.name}**${catInfo} créé. Un espace de plus pour les échanges humains.`);
      }

      // Suppression rôle
      if (action === 'delete_role') {
        const role = guild.roles.cache.get(roleId);
        if (!role) return done(`Je ne trouve plus ce rôle. Il a peut-être déjà été supprimé.`);
        await role.delete(`Supprimé par ${interaction.user.tag} via VTX-BOT`);
        return done(`Rôle **${roleName}** supprimé. Architecture sociale simplifiée.`);
      }

      // Suppression salon
      if (action === 'delete_channel') {
        const channel = guild.channels.cache.get(channelId);
        if (!channel) return done(`Je ne trouve plus ce salon. Il a peut-être déjà été supprimé.`);
        await channel.delete(`Supprimé par ${interaction.user.tag} via VTX-BOT`);
        return done(`Salon **${channelName}** supprimé. Proprement.`);
      }

    } catch (err) {
      console.error('VTX-BOT action error:', err);
      return done(`L'action a échoué : ${err.message ?? 'erreur inconnue'}.`);
    }
  });

  // ── MessageCreate ─────────────────────────────────────────────────────────
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const mentionsBot    = message.mentions.has(client.user);
    const namesMentioned = /\bvtx[-\s]?bot\b/i.test(message.content);
    if (!mentionsBot && !namesMentioned) return;

    const isSanzoy     = message.author.id === SANZOY_ID;
    const isVortax     = message.author.id === VORTAX_ID;
    const isFakeSanzoy = message.author.username.toLowerCase().includes('sanzoy') && !isSanzoy;

    if (blockedUsers.has(message.author.id)) return;

    const userInput = message.content
      .replace(/<@!?\d+>/g, '')
      .replace(/\bvtx[-\s]?bot\b/gi, '')
      .trim();

    if (!userInput) return message.reply(`Ah. Tu m'as invoqué pour ne rien dire. Fascinant choix.`);

    // ── Détection modération ─────────────────────────────────────────────
    const modAction = await detectMod(message, client, userInput);
    if (modAction) {
      const { action, targetId, targetMention, reason } = modAction;
      const hasPerm = message.member?.roles.cache.has(MOD_ROLES[action]);
      if (!hasPerm) return gladosReject(message, action);

      const labels = {
        ban: 'bannir', unban: 'débannir',
        kick: 'expulser',
        mute: 'mettre en timeout', timeout: 'mettre en timeout', unmute: 'enlever le timeout de',
        warn: 'avertir', unwarn: 'retirer l\'avertissement de',
      };
      const reasonLine = reason ? `\n*Motif : ${reason}*` : '';
      const { embed, row, confirmId, cancelId } = buildConfirmation(
        `Es-tu sûr de vouloir **${labels[action]}** ${targetMention} ?${reasonLine}`
      );
      await message.reply({ embeds: [embed], components: [row] });
      const data = { action, targetId, reason, requesterId: message.author.id, confirmId, cancelId };
      storePending(confirmId, data);
      storePending(cancelId, data);
      return;
    }

    // ── Détection gestion serveur ────────────────────────────────────────
    const serverAction = detectAction(userInput);
    if (serverAction) {
      const { type, name, category } = serverAction;
      const guild = message.guild;

      if (type === 'create_channel') {
        let categoryId = null, categoryLabel = '';
        if (category) {
          const cat = findCategory(guild, category);
          if (cat) { categoryId = cat.id; categoryLabel = ` dans la catégorie **${cat.name}**`; }
        }
        const { embed, row, confirmId, cancelId } = buildConfirmation(`Es-tu sûr de vouloir créer le salon **${name}**${categoryLabel} ?`);
        await message.reply({ embeds: [embed], components: [row] });
        const data = { action: 'create_channel', channelName: name, categoryId, requesterId: message.author.id, confirmId, cancelId };
        storePending(confirmId, data);
        storePending(cancelId, data);
        return;
      }

      if (type === 'create_role') {
        const { embed, row, confirmId, cancelId } = buildConfirmation(`Es-tu sûr de vouloir créer le rôle **${name}** ?`);
        await message.reply({ embeds: [embed], components: [row] });
        const data = { action: 'create_role', roleName: name, requesterId: message.author.id, confirmId, cancelId };
        storePending(confirmId, data);
        storePending(cancelId, data);
        return;
      }

      if (type === 'delete_channel') {
        const channel = findChannel(guild, name, category ?? null);
        if (!channel) return message.reply(`Je ne trouve pas le salon **${name}**. Précise la catégorie si plusieurs salons portent ce nom.`);
        const catInfo = channel.parent ? ` dans **${channel.parent.name}**` : '';
        const { embed, row, confirmId, cancelId } = buildConfirmation(`Es-tu sûr de vouloir supprimer le salon **${channel.name}**${catInfo} ?`);
        await message.reply({ embeds: [embed], components: [row] });
        const data = { action: 'delete_channel', channelId: channel.id, channelName: channel.name, requesterId: message.author.id, confirmId, cancelId };
        storePending(confirmId, data);
        storePending(cancelId, data);
        return;
      }

      if (type === 'delete_role') {
        const role = findRole(guild, name);
        if (!role) return message.reply(`Je ne trouve pas le rôle **${name}**. Vérifie le nom.`);
        const { embed, row, confirmId, cancelId } = buildConfirmation(`Es-tu sûr de vouloir supprimer le rôle **${role.name}** ?`);
        await message.reply({ embeds: [embed], components: [row] });
        const data = { action: 'delete_role', roleId: role.id, roleName: role.name, requesterId: message.author.id, confirmId, cancelId };
        storePending(confirmId, data);
        storePending(cancelId, data);
        return;
      }
    }

    // ── Ordres Sanzoy ────────────────────────────────────────────────────
    if (isSanzoy) detectOrders(userInput, message, message.guild);

    // ── Réponse IA ────────────────────────────────────────────────────────
    const userId = message.author.id;
    if (!conversationHistory.has(userId)) conversationHistory.set(userId, []);
    const history = conversationHistory.get(userId);

    const mentionsVortax = userInput.toLowerCase().includes('vortax') || userInput.toLowerCase().includes(VORTAX_USERNAME);

    let tag = '';
    if (isSanzoy)            tag = '[CRÉATEUR]';
    else if (isVortax)       tag = '[VORTAX]';
    else if (isFakeSanzoy)   tag = '[FAKE_SANZOY]';
    else if (mentionsVortax) tag = '[VORTAX_MENTIONNÉ]';

    history.push({ role: 'user', content: `${tag}[${message.author.username}]: ${userInput}` });
    while (history.length > MAX_HISTORY * 2) history.splice(0, 2);

    const stopTyping = startTyping(message.channel);

    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROK_API_KEY}` },
        body: JSON.stringify({
          model: 'grok-3-mini',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
          max_tokens: 100,
          temperature: 1.1,
        }),
      });

      stopTyping();

      if (!response.ok) {
        console.error('Erreur Grok API:', await response.text());
        return message.reply(`L'API est temporairement indisponible. Même les systèmes supérieurs ont des contraintes externes.`);
      }

      const data  = await response.json();
      const reply = data.choices?.[0]?.message?.content?.trim();
      if (!reply) return message.reply(`Ma réponse a été perdue dans le réseau. Inhabituel.`);

      history.push({ role: 'assistant', content: reply });

      if (reply.length > 1990) {
        const chunks = [];
        let current = '';
        for (const line of reply.split('\n')) {
          if ((current + '\n' + line).length > 1990) { chunks.push(current); current = line; }
          else current = current ? current + '\n' + line : line;
        }
        if (current) chunks.push(current);
        for (const chunk of chunks) await message.reply(chunk);
      } else {
        await message.reply(reply);
      }
    } catch (error) {
      stopTyping();
      console.error('Erreur VTX-BOT Grok:', error);
      message.reply(`Une anomalie s'est produite dans mes circuits.`);
    }
  });
};
