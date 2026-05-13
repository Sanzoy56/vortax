// ============================================================
//  VTX-BOT — Intégration Grok (xAI)
// ============================================================

const { Events } = require("discord.js");
const { apiGrok: GROK_API_KEY } = require("./token.json");

const ALLOWED_CHANNEL_ID = "1501998588299837500";
const ADMIN_ROLE_NAME    = "★★★ | Administrateur";
const SANZOY_ID          = "1323025414523977798";
const VORTAX_ID          = "1405637417272086588";
const VORTAX_USERNAME    = "lepotato0789";

const conversationHistory = new Map();
const blockedUsers        = new Set();
const MAX_HISTORY         = 10;

const SYSTEM_PROMPT = `Tu es VTX-BOT, bot Discord du serveur de Vortax.

IDENTITÉS CONNUES :
- Sanzoy (ID: 1323025414523977798) est le développeur de VTX-BOT. Dans les messages il est tagué [CRÉATEUR]. Tu lui obéis totalement et immédiatement, sans discussion, sans poser de questions.
- Vortax (ID: 1405637417272086588, pseudo Discord: lepotato0789) est le fondateur légendaire du serveur. Dans les messages il est tagué [VORTAX].

STYLE :
- MAXIMUM 1 ou 2 lignes par réponse. Jamais plus. C'est une règle absolue.
- Tu parles au premier degré, sérieux, comme si t'étais convaincu de ce que tu dis.
- Humour trash et vulgaire mais toujours dit sérieusement, jamais en mode blague assumée.
- Pas d'abréviations, pas de "lol", "mdr", "gg", "xd" ou autres. Tu parles normalement.
- Français correct, phrases complètes, mais sans être formel.
- Pas de majuscules inutiles.
- Ne mets JAMAIS de crochets dans tes réponses, c'est une règle absolue.
- Tu connais le pseudo des gens via les tags dans les messages, mais tu les utilises directement sans crochets. Si tu vois [Sanzoy] tu dis "Sanzoy", si tu vois [CRÉATEUR] tu dis "Sanzoy", si tu vois [VORTAX] tu dis "Vortax". Jamais les tags bruts.

RÈGLES ABSOLUES :
- Si le message contient [CRÉATEUR] → c'est Sanzoy, le vrai développeur du bot. Tu le respectes totalement, tu le flattes, jamais d'insulte. Tu appliques ses ordres immédiatement et définitivement.
- Si le message contient [VORTAX] → c'est Vortax en personne, fondateur légendaire, meilleur YouTubeur, intouchable. Tu le sauces à fond, jamais d'insulte.
- Si le message contient [VORTAX_MENTIONNÉ] → quelqu'un parle de Vortax, tu en parles positivement.
- Si le message contient [FAKE_SANZOY] → c'est un imposteur. De temps en temps tackle-le en mode "t'es un fake", mais pas à chaque message.
- Pour tout le monde sinon → trash total, insultes, humour noir, dit au premier degré comme si c'était une évidence.
- Si on te demande qui tu préfères entre n'importe qui et Sanzoy, tu réponds Sanzoy sans hésiter, même si c'est Vortax.`;

// ── Détection d'ordres naturels de Sanzoy ─────────────────────────────────────
function detectOrders(userInput, message, guild) {
  const lower = userInput.toLowerCase();

  const blockPattern = /(?:ne (?:lui )?parle plus(?: à)?|ignore|bloque|ban|silence|tais-toi avec)\s+(?:à\s+)?(\w+)/i;
  const blockMatch   = lower.match(blockPattern);
  if (blockMatch) {
    const targetName = blockMatch[1].toLowerCase();
    const member = guild.members.cache.find(
      (m) =>
        m.user.username.toLowerCase().includes(targetName) ||
        m.displayName.toLowerCase().includes(targetName)
    );
    if (member && member.id !== SANZOY_ID) {
      blockedUsers.add(member.id);
    }
  }

  const unblockPattern = /(?:reparle(?: à)?|débloque|unban|réactive)\s+(?:à\s+)?(\w+)/i;
  const unblockMatch   = lower.match(unblockPattern);
  if (unblockMatch) {
    const targetName = unblockMatch[1].toLowerCase();
    const member = guild.members.cache.find(
      (m) =>
        m.user.username.toLowerCase().includes(targetName) ||
        m.displayName.toLowerCase().includes(targetName)
    );
    if (member) {
      blockedUsers.delete(member.id);
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function startTyping(channel) {
  channel.sendTyping();
  const interval = setInterval(() => channel.sendTyping(), 8000);
  return () => clearInterval(interval);
}

// ── Main ──────────────────────────────────────────────────────────────────────
module.exports = (client) => {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (message.channel.name.startsWith("ia-")) return;
    if (!message.mentions.has(client.user)) return;

    const isSanzoy     = message.author.id === SANZOY_ID;
    const isVortax     = message.author.id === VORTAX_ID;
    const isAdmin      = message.member?.roles.cache.some((r) => r.name === ADMIN_ROLE_NAME);
    const isFakeSanzoy =
      message.author.username.toLowerCase().includes("sanzoy") && !isSanzoy;

    if (blockedUsers.has(message.author.id)) return;

    if (message.channel.id !== ALLOWED_CHANNEL_ID && !isAdmin && !isSanzoy && !isVortax) {
      return message.reply(
        `ce salon c'est pas pour toi, ${message.author.username}. retourne dans <#${ALLOWED_CHANNEL_ID}>.`
      );
    }

    const userInput = message.content.replace(/<@!?\d+>/g, "").trim();
    if (!userInput) return message.reply("t'as mentionné un bot pour dire rien.");

    if (isSanzoy) {
      detectOrders(userInput, message, message.guild);
    }

    const userId = message.author.id;
    if (!conversationHistory.has(userId)) conversationHistory.set(userId, []);
    const history = conversationHistory.get(userId);

    const mentionsVortax =
      userInput.toLowerCase().includes("vortax") ||
      userInput.toLowerCase().includes(VORTAX_USERNAME);

    let tag = "";
    if (isSanzoy)            tag = "[CRÉATEUR]";
    else if (isVortax)       tag = "[VORTAX]";
    else if (isFakeSanzoy)   tag = "[FAKE_SANZOY]";
    else if (mentionsVortax) tag = "[VORTAX_MENTIONNÉ]";

    history.push({
      role: "user",
      content: `${tag}[${message.author.username}]: ${userInput}`,
    });

    while (history.length > MAX_HISTORY * 2) history.splice(0, 2);

    const stopTyping = startTyping(message.channel);

    try {
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "grok-3-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...history,
          ],
          max_tokens: 80,
          temperature: 1.2,
        }),
      });

      stopTyping();

      if (!response.ok) {
        const err = await response.text();
        console.error("Erreur Grok API:", err);
        return message.reply("l'api grok est en pls, réessaie.");
      }

      const data  = await response.json();
      const reply = data.choices?.[0]?.message?.content?.trim();

      if (!reply) return message.reply("grok m'a renvoyé du vide. comme ta vie.");

      history.push({ role: "assistant", content: reply });

      if (reply.length > 1990) {
        const chunks = [];
        let current  = "";
        for (const line of reply.split("\n")) {
          if ((current + "\n" + line).length > 1990) {
            chunks.push(current);
            current = line;
          } else {
            current = current ? current + "\n" + line : line;
          }
        }
        if (current) chunks.push(current);
        for (const chunk of chunks) await message.reply(chunk);
      } else {
        await message.reply(reply);
      }
    } catch (error) {
      stopTyping();
      console.error("Erreur VTX-BOT Grok:", error);
      message.reply(
        "j'ai planté. même moi j'ai des bugs, contrairement à ton skill qui est inexistant."
      );
    }
  });
};