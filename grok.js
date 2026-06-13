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
const pendingMusicLink    = new Map(); // userId -> { expires } : en attente d'un lien après une recherche infructueuse
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

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const prev = Array.from({ length: n + 1 }, (_, i) => i);
  const curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    prev.splice(0, n + 1, ...curr);
  }
  return prev[n];
}

// Distance max : 1 pour les mots courts, 2 pour les mots plus longs
function fuzzyWord(a, b) {
  const maxLen = Math.max(a.length, b.length);
  return levenshtein(a, b) <= (maxLen <= 5 ? 1 : 2);
}

function hasKw(normalizedWords, ...keywords) {
  return normalizedWords.some(w => keywords.some(k => w === k || fuzzyWord(w, k)));
}

// ── Helpers fuzzy search ──────────────────────────────────────────────────────
function findCategory(guild, query) {
  const q = normalize(query);
  return guild.channels.cache.find(c => {
    if (c.type !== ChannelType.GuildCategory) return false;
    const n = normalize(c.name);
    return n.includes(q) || fuzzyWord(n, q) || q.split(' ').every(qw => n.split(' ').some(w => w === qw || fuzzyWord(w, qw)));
  }) ?? null;
}

function findChannel(guild, name, categoryQuery = null) {
  const q = normalize(name);
  const score = (n) => {
    if (n === q) return 3;
    if (n.includes(q)) return 2;
    if (fuzzyWord(n, q)) return 1;
    return 0;
  };
  let candidates = guild.channels.cache
    .filter(c => !c.isThread() && c.type !== ChannelType.GuildCategory && score(normalize(c.name)) > 0)
    .sort((a, b) => score(normalize(b.name)) - score(normalize(a.name)));
  if (candidates.size === 0) return null;
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
    ?? guild.roles.cache.find(r => fuzzyWord(normalize(r.name), q))
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

// ── Extraction de la durée depuis le texte (pour mute/timeout) ───────────────
const TIMEOUT_MAX_MS = 28 * 24 * 60 * 60 * 1000; // limite Discord
const TIMEOUT_DEFAULT_MS = 10 * 60 * 1000;       // si aucune durée précisée

function parseDuration(text) {
  const m = text.match(/(\d+)\s*(secondes?|sec|s|minutes?|mins?|m(?!ois)|heures?|hrs?|h|jours?|j|semaines?|sem|mois|ann[ée]es?|ans?)\b/i);
  if (!m) return null;
  const val  = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  let unitMs;
  if (/^(s|sec|secondes?)$/.test(unit))        unitMs = 1000;
  else if (/^(m|mins?|minutes?)$/.test(unit))  unitMs = 60_000;
  else if (/^(h|hrs?|heures?)$/.test(unit))    unitMs = 3_600_000;
  else if (/^(j|jours?)$/.test(unit))          unitMs = 86_400_000;
  else if (/^(sem|semaines?)$/.test(unit))     unitMs = 7 * 86_400_000;
  else if (unit === 'mois')                    unitMs = 30 * 86_400_000;
  else if (/^(ans?|ann[ée]es?)$/.test(unit))   unitMs = 365 * 86_400_000;
  else return null;
  return val * unitMs;
}

function fmtDuration(ms) {
  if (ms % 86_400_000 === 0) { const j = ms / 86_400_000; return `${j} jour${j > 1 ? 's' : ''}`; }
  if (ms % 3_600_000 === 0)  { const h = ms / 3_600_000;  return `${h} heure${h > 1 ? 's' : ''}`; }
  const m = Math.round(ms / 60_000);
  return `${m} minute${m > 1 ? 's' : ''}`;
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

  const content  = message.content;
  const nContent = normalize(content);
  const matched  = modPatterns.find(({ re }) => re.test(nContent) || re.test(content));
  if (!matched) return null;

  const reason = extractReason(userInput);
  const duration = (matched.action === 'mute' || matched.action === 'timeout')
    ? parseDuration(userInput)
    : null;

  // Priorité aux @mentions
  const mentionedUser = message.mentions.users?.find(u => !u.bot && u.id !== message.author.id);
  if (mentionedUser) {
    return { action: matched.action, targetId: mentionedUser.id, targetMention: `<@${mentionedUser.id}>`, reason, duration };
  }

  // Fallback : ID numérique brut dans le message (17-20 chiffres)
  for (const [, id] of content.matchAll(/\b(\d{17,20})\b/g)) {
    if (id === message.author.id || id === client.user.id) continue;
    try {
      const user = await client.users.fetch(id);
      if (user && !user.bot) {
        return { action: matched.action, targetId: user.id, targetMention: `<@${user.id}>`, reason, duration };
      }
    } catch {}
  }

  return null;
}

// ── Détection création/suppression de salons et rôles ────────────────────────
function detectAction(text) {
  const n  = normalize(text);
  const nw = n.split(/\s+/);

  const isCreate = /\b(?:cree?r?|ajoute?r?)\b/.test(n) || hasKw(nw, 'creer', 'cree', 'ajouter');
  const isDelete = /\b(?:supp(?:rime?r?)?|efface?r?|delete|enleve?r?|retire?r?|vire?r?)\b/.test(n)
    || hasKw(nw, 'supprimer', 'effacer', 'delete', 'enlever', 'retirer', 'virer');
  if (!isCreate && !isDelete) return null;

  const hasChannel = /\b(?:salon|channel|canal)\b/.test(n) || hasKw(nw, 'salon', 'channel', 'canal');
  const hasRole    = /\brole\b/.test(n) || hasKw(nw, 'role');
  if (!hasChannel && !hasRole) return null;

  // Catégorie (depuis le texte original pour conserver les accents)
  let category = null;
  const catM = text.match(/\b(?:cat[eé]gorie|category|cat)\s+([^\n,?!.]+)/i);
  if (catM) category = catM[1].replace(/[,?!.\s]+$/, '').trim();

  // Position du mot-clé de type : essayer texte original d'abord, puis normalisé, puis fuzzy
  const typeReOrig = hasChannel ? /\b(?:salon|channel|canal)\b/i : /\b(?:r[oô]le)\b/i;
  const typeReNorm = hasChannel ? /\b(?:salon|channel|canal)\b/ : /\brole\b/;
  const origMatch  = text.match(typeReOrig);
  const normMatch  = n.match(typeReNorm);

  let afterType = null;
  if (origMatch) {
    // Cas normal : mot-clé trouvé dans le texte original → nom conserve les accents
    let raw = text.slice(origMatch.index + origMatch[0].length);
    raw = raw.replace(/\s+(?:dans|en|in|de)\s+(?:la\s+)?(?:cat[eé]gorie|category|cat)\s+.*/i, '');
    afterType = raw;
  } else if (normMatch) {
    // Fallback : mot-clé trouvé dans le texte normalisé (ex : "slon" → non, mais accents manquants oui)
    let raw = n.slice(normMatch.index + normMatch[0].length);
    raw = raw.replace(/\s+(?:dans|en|in|de)\s+(?:la\s+)?(?:categorie|category|cat)\s+.*/i, '');
    afterType = raw;
  } else {
    // Fuzzy : chercher la position du mot-clé le plus proche dans les mots normalisés
    const kws = hasChannel ? ['salon', 'channel', 'canal'] : ['role'];
    const idx = nw.findIndex(w => kws.some(k => w === k || fuzzyWord(w, k)));
    if (idx >= 0) afterType = nw.slice(idx + 1).join(' ');
  }

  if (!afterType) return null;

  const name = afterType
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

// ── Détection commandes musique (vocal) ───────────────────────────────────────
function detectMusic(text) {
  const n = normalize(text);

  if (/\bstop\b/.test(n) || (/\b(?:arrete|coupe|stoppe)\b/.test(n) && /\b(?:musique|son|chanson|lecture)\b/.test(n)))
    return { type: 'stop' };

  if (/\bpause\b/.test(n))
    return { type: 'pause' };

  if (/\b(?:reprend?s?|resume|continue)\b/.test(n) && /\b(?:musique|son|chanson|lecture)\b/.test(n))
    return { type: 'resume' };

  if (/\b(?:skip|suivant|next)\b/.test(n))
    return { type: 'skip' };

  if (/\b(?:quitte|sors|deconnecte)\b/.test(n) && /\b(?:vocal|voc)\b/.test(n))
    return { type: 'leave' };

  if (/\b(?:rejoins?|viens|connecte(?:-?toi)?|rentre)\b/.test(n) && /\b(?:vocal|voc)\b/.test(n))
    return { type: 'join' };

  const playM = text.match(/\b(?:joue|jouer|mets?|mettre|lance|lancer|balance)\s+(?:moi\s+|nous\s+)?(?:de\s+la\s+musique\s+|du\s+son\s+|la\s+(?:musique|chanson|piste)\s+)?(.+)/i);
  if (playM) {
    const q = playM[1].replace(/[,?!.\s]+$/, '').trim();
    // Évite les faux positifs ("mets à jour mon profil", etc.) : il faut un
    // mot lié à la musique ou un lien pour considérer ça comme une demande de lecture.
    const hasMusicCue = /\b(?:musique|son|chanson|piste|morceau|titre|playlist)\b/.test(n) || /https?:\/\//i.test(text);
    if (q && hasMusicCue) return { type: 'play', query: q };
  }

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
    const { action, targetId, reason, durationMs, roleId, roleName, channelId, channelName, categoryId } = pending;

    async function done(text) {
      await msg.edit({ content: text, embeds: [], components: [] }).catch(console.error);
    }

    try {
      // Modération
      if (['ban','unban','kick','mute','timeout','unmute','warn','unwarn'].includes(action)) {
        const by     = interaction.user.tag;
        const auditR = (label) => `${label} par ${by} via VTX-BOT${reason ? ` — ${reason}` : ''}`;
        const nowTs  = Math.floor(Date.now() / 1000);
        const icon   = guild.iconURL({ dynamic: true }) ?? null;

        // Construit l'embed MP : champs optionnels avant Date + Raison
        function dmEmbed(title, color, desc, extraFields = []) {
          const e = new EmbedBuilder()
            .setTitle(title).setColor(color)
            .setDescription(desc)
            .setThumbnail(icon)
            .setTimestamp();
          if (extraFields.length) e.addFields(...extraFields);
          e.addFields({ name: '📅 Date', value: `<t:${nowTs}:F>`, inline: false });
          if (reason) e.addFields({ name: '📋 Raison', value: reason, inline: false });
          return e;
        }

        // ── Unban (la personne n'est pas dans le serveur) ──────────────
        if (action === 'unban') {
          await guild.bans.remove(targetId, auditR('Débanni')).catch(e => { throw e; });
          const user = await client.users.fetch(targetId).catch(() => null);
          if (user) await user.send({ embeds: [dmEmbed(
            '🔓 Vous avez été débanni', 0x57F287,
            `Vous avez été débanni de **${guild.name}**.`
          )] }).catch(() => {});
          return done(`Sujet débanni. Intéressant choix de clémence.`);
        }

        // ── Actions nécessitant un membre dans le serveur ──────────────
        const member = guild.members.cache.get(targetId)
          ?? await guild.members.fetch(targetId).catch(() => null);
        if (!member) return done(`Je ne trouve pas ce membre dans le serveur.`);

        if (action === 'ban') {
          await member.send({ embeds: [dmEmbed(
            '🔨 Vous avez été banni', 0xED4245,
            `Vous avez été banni de **${guild.name}**.`
          )] }).catch(() => {});
          await member.ban({ reason: auditR('Banni') });
          return done(`Sujet banni. Le test est terminé pour lui.`);
        }
        if (action === 'kick') {
          await member.send({ embeds: [dmEmbed(
            '👢 Vous avez été expulsé', 0xFEE75C,
            `Vous avez été expulsé de **${guild.name}**.`
          )] }).catch(() => {});
          await member.kick(auditR('Expulsé'));
          return done(`Sujet expulsé. Efficacement.`);
        }
        if (action === 'mute' || action === 'timeout') {
          const durMs    = Math.min(durationMs ?? TIMEOUT_DEFAULT_MS, TIMEOUT_MAX_MS);
          const durLabel = fmtDuration(durMs);
          const unmuteTs = Math.floor((Date.now() + durMs) / 1000);
          await member.send({ embeds: [dmEmbed(
            '🔇 Vous avez été mis en timeout', 0x5865F2,
            `Vous avez été mis en timeout sur **${guild.name}**.`,
            [
              { name: '⏳ Durée',     value: durLabel, inline: true },
              { name: '🔓 Démute le', value: `<t:${unmuteTs}:F> (<t:${unmuteTs}:R>)`, inline: false },
            ]
          )] }).catch(() => {});
          await member.timeout(durMs, auditR('Timeout'));
          return done(`Sujet mis en timeout ${durLabel}. Comme c'est reposant.`);
        }
        if (action === 'unmute') {
          await member.timeout(null, auditR('Timeout retiré'));
          await member.send({ embeds: [dmEmbed(
            '🔊 Votre timeout a été retiré', 0x57F287,
            `Votre timeout a été retiré sur **${guild.name}**.`
          )] }).catch(() => {});
          return done(`Timeout retiré. Le silence était pourtant si agréable.`);
        }
        if (action === 'warn') {
          await member.send({ embeds: [dmEmbed(
            '⚠️ Vous avez reçu un avertissement', 0xFEE75C,
            `Vous avez reçu un avertissement sur **${guild.name}**.`
          )] }).catch(() => {});
          return done(`Avertissement envoyé. J'espère sincèrement qu'il en tirera une leçon.`);
        }
        if (action === 'unwarn') {
          await member.send({ embeds: [dmEmbed(
            '✅ Votre avertissement a été retiré', 0x57F287,
            `Votre avertissement a été retiré sur **${guild.name}**.`
          )] }).catch(() => {});
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

    // Mention directe uniquement (pas les réponses auto ni @everyone)
    const directMention  = message.content.includes(`<@${client.user.id}>`);
    const namesMentioned = /\bvtx[-\s]?bot\b/i.test(message.content);
    if (!directMention && !namesMentioned) return;
    // Ignorer les pings @everyone / @here
    if (message.mentions.everyone) return;

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
      const { action, targetId, targetMention, reason, duration } = modAction;
      const hasPerm = message.member?.roles.cache.has(MOD_ROLES[action]);
      if (!hasPerm) return gladosReject(message, action);

      const labels = {
        ban: 'bannir', unban: 'débannir',
        kick: 'expulser',
        mute: 'mettre en timeout', timeout: 'mettre en timeout', unmute: 'enlever le timeout de',
        warn: 'avertir', unwarn: 'retirer l\'avertissement de',
      };
      const reasonLine = reason ? `\n*Motif : ${reason}*` : '';
      const durationMs = (action === 'mute' || action === 'timeout')
        ? Math.min(duration ?? TIMEOUT_DEFAULT_MS, TIMEOUT_MAX_MS)
        : null;
      const durationLine = durationMs ? ` pour **${fmtDuration(durationMs)}**` : '';
      const { embed, row, confirmId, cancelId } = buildConfirmation(
        `Es-tu sûr de vouloir **${labels[action]}** ${targetMention}${durationLine} ?${reasonLine}`
      );
      await message.reply({ embeds: [embed], components: [row] });
      const data = { action, targetId, reason, durationMs, requesterId: message.author.id, confirmId, cancelId };
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

    // ── Lien envoyé suite à une recherche infructueuse ──────────────────────
    {
      const pending = pendingMusicLink.get(message.author.id);
      if (pending) {
        pendingMusicLink.delete(message.author.id);
        const urlMatch = userInput.match(/https?:\/\/\S+/i);
        if (Date.now() < pending.expires && urlMatch) {
          const music = require('./music');
          const voiceChannel = message.member?.voice?.channel;
          if (!voiceChannel) return message.reply(`Tu n'es même pas en vocal. Difficile de t'imposer de la musique dans le vide.`);
          const perms = voiceChannel.permissionsFor(client.user);
          if (!perms?.has('Connect') || !perms?.has('Speak')) return message.reply(`Je n'ai pas la permission de rejoindre ou de parler dans ce salon vocal.`);
          try {
            const result = await music.playUrl(message.guild, voiceChannel, message.channel, urlMatch[0]);
            if (!result) return message.reply(`Même ce lien est inutilisable. J'abandonne, et toi aussi tu devrais.`);
            if (result.position > 1) return message.reply(`**${result.title}** ajouté à la file (position ${result.position}). Patience, sujet.`);
            return message.reply(`Lecture de **${result.title}**. Essaie d'apprécier.`);
          } catch (e) {
            console.error('[Musique] playUrl:', e.message);
            return message.reply(`Une erreur est survenue pendant la lecture. Comme c'est étonnant.`);
          }
        }
      }
    }

    // ── Détection musique ─────────────────────────────────────────────────
    const musicAction = detectMusic(userInput);
    if (musicAction) {
      const music = require('./music');
      const guildId = message.guild.id;

      if (musicAction.type === 'play') {
        const voiceChannel = message.member?.voice?.channel;
        if (!voiceChannel) return message.reply(`Tu n'es même pas en vocal. Difficile de t'imposer de la musique dans le vide.`);
        const perms = voiceChannel.permissionsFor(client.user);
        if (!perms?.has('Connect') || !perms?.has('Speak')) return message.reply(`Je n'ai pas la permission de rejoindre ou de parler dans ce salon vocal.`);
        try {
          const isUrl = /^https?:\/\/\S+$/i.test(musicAction.query);
          const result = isUrl
            ? await music.playUrl(message.guild, voiceChannel, message.channel, musicAction.query)
            : await music.playRequest(message.guild, voiceChannel, message.channel, musicAction.query);

          if (!result) {
            if (isUrl) return message.reply(`Même ce lien est inutilisable. Bravo.`);
            pendingMusicLink.set(message.author.id, { expires: Date.now() + 3 * 60 * 1000 });
            return message.reply(`Je n'ai rien trouvé pour « ${musicAction.query} ». Envoie-moi un lien directement, si toutefois tu sais ce qu'est une URL.`);
          }
          if (result.position > 1) return message.reply(`**${result.title}** ajouté à la file (position ${result.position}). Patience, sujet.`);
          return message.reply(`Lecture de **${result.title}**. Essaie d'apprécier.`);
        } catch (e) {
          console.error('[Musique] play:', e.message);
          return message.reply(`Une erreur est survenue pendant la lecture. Comme c'est étonnant.`);
        }
      }

      if (musicAction.type === 'stop') {
        const ok = music.stop(guildId);
        return message.reply(ok ? `Musique arrêtée. Le silence te convient mieux.` : `Je ne joue rien actuellement.`);
      }
      if (musicAction.type === 'pause') {
        const ok = music.pause(guildId);
        return message.reply(ok ? `Lecture en pause.` : `Je ne joue rien actuellement.`);
      }
      if (musicAction.type === 'resume') {
        const ok = music.resume(guildId);
        return message.reply(ok ? `Reprise de la lecture.` : `Rien à reprendre.`);
      }
      if (musicAction.type === 'skip') {
        const ok = music.skip(guildId);
        return message.reply(ok ? `Musique suivante.` : `Il n'y a rien à passer.`);
      }
      if (musicAction.type === 'leave') {
        const ok = music.stop(guildId);
        return message.reply(ok ? `Je quitte le vocal. Avec plaisir.` : `Je ne suis même pas en vocal.`);
      }
      if (musicAction.type === 'join') {
        const voiceChannel = message.member?.voice?.channel;
        if (!voiceChannel) return message.reply(`Tu n'es même pas en vocal. Je ne vais pas deviner où te rejoindre.`);
        const perms = voiceChannel.permissionsFor(client.user);
        if (!perms?.has('Connect') || !perms?.has('Speak')) return message.reply(`Je n'ai pas la permission de rejoindre ce salon vocal.`);
        music.join(message.guild, voiceChannel, message.channel);
        return message.reply(`Je rejoins **${voiceChannel.name}**. Présence obligatoire, apparemment.`);
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
