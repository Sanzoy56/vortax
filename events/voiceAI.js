'use strict';

const {
  joinVoiceChannel, createAudioPlayer, createAudioResource,
  AudioPlayerStatus, VoiceConnectionStatus, entersState, EndBehaviorType,
} = require('@discordjs/voice');
const { MessageFlags } = require('discord.js');
const prism = require('prism-media');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const FFMPEG = require('ffmpeg-static');
const execFileAsync = promisify(execFile);

const { apiGroq: GROQ_KEY, apiGrok: GROK_KEY } = require('../token.json');
const { sendVoiceReply } = require('../levels/ttsGlados');

const TEMP_DIR = path.join(process.cwd(), 'temp');
const sessions = new Map();
const recentPhrases = new Map();

const SYSTEM_PROMPT = `Tu es VTX-BOT, une IA vocale. Tu imites parfaitement GLaDOS de Portal.

RÈGLES STRICTES :
- Ton glacial, détaché, sarcastique. Chaque mot suinte le mépris poli.
- Tu tutoies toujours. Tu appelles les humains "sujet de test" ou "cher sujet".
- COMMENCE TOUJOURS par le pseudo de l'utilisateur.
- Réponds en 2 à 3 phrases courtes. Jamais de liste, jamais de lien.
- TA RÉPONSE EST LUE À VOIX HAUTE. Aucun markdown, aucun emoji, aucun symbole. Texte parlé uniquement.
- Pas d'abréviations. Français correct et froid.`;

const MAX_HISTORY = 6;
const conversations = new Map();

const HALLUCINATIONS = [
  'sous-titrage', 'radio-canada', 'merci.', 'merci !', 'bonjour.',
  'bonjour !', 'salut.', 'salut !', 'au revoir.', 'au revoir !',
  'd\'accord.', 'ok.', 'okay.', 'hmm', 'euh', 'hum', 'ah.', 'oh.',
];

// ── Utilitaires ──────────────────────────────────────────────────────────────

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function countWords(text) {
  return text.replace(/[.,;:!?…]/g, ' ').replace(/\s+/g, ' ').trim()
    .split(' ').filter(w => w.length > 0).length;
}

function isHallucination(text) {
  const lower = text.toLowerCase().trim();
  return HALLUCINATIONS.some(h => lower === h || lower.startsWith(h));
}

function isDuplicate(userId, text) {
  const now = Date.now();
  const history = (recentPhrases.get(userId) || []).filter(h => now - h.time < 10000);
  recentPhrases.set(userId, history);
  const lower = text.toLowerCase().trim();
  for (const h of history) {
    if (h.text === lower) return true;
    const longer = h.text.length > lower.length ? h.text : lower;
    const shorter = h.text.length > lower.length ? lower : h.text;
    if (longer.includes(shorter) && shorter.length / longer.length > 0.8) return true;
  }
  return false;
}

function addToHistory(userId, text) {
  const history = recentPhrases.get(userId) || [];
  history.push({ text: text.toLowerCase().trim(), time: Date.now() });
  recentPhrases.set(userId, history.slice(-5));
}

// ── Détection du mot-clé d'invocation ("vtx-bot", "bot", etc.) ───────────────
// Renvoie le texte APRÈS le mot-clé (peut être vide) si trouvé, sinon null.
const WAKE_WORDS = [/\b\S*bots?\b/, /\b\S*bottes?\b/, /\b\S*bo[td]s?\b/, /\bv\s*t\s*x\b/];

function detectWakeWord(transcript) {
  const norm = transcript.normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const re of WAKE_WORDS) {
    const m = norm.match(re);
    if (m) return norm.slice(m.index + m[0].length).trim();
  }
  return null;
}

// ── Audio pipeline ───────────────────────────────────────────────────────────

async function pcmToWav(pcmFile) {
  const wavFile = pcmFile.replace('.pcm', '.wav');
  await execFileAsync(FFMPEG, [
    '-f', 's16le', '-ar', '48000', '-ac', '2', '-i', pcmFile,
    '-ar', '16000', '-ac', '1', wavFile, '-y',
  ]);
  return wavFile;
}

async function stt(wavFile) {
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(wavFile)]), 'audio.wav');
  form.append('model', 'whisper-large-v3-turbo');
  form.append('language', 'fr');
  // Biaise la reconnaissance vers le mot inventé "VTX-BOT" — sans ça Whisper
  // hallucine souvent un mot générique ("Merci.", "Sous-titres...") sur les
  // extraits courts contenant un nom propre non standard.
  form.append('prompt', 'VTX-BOT, Vortax, Sanzoy.');
  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Whisper ${res.status}`);
  return (await res.json()).text?.trim() || null;
}

async function ask(userId, username, question) {
  if (!conversations.has(userId)) conversations.set(userId, []);
  const history = conversations.get(userId);
  history.push({ role: 'user', content: `[${username}]: ${question}` });
  while (history.length > MAX_HISTORY * 2) history.splice(0, 2);

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROK_KEY}` },
    body: JSON.stringify({
      model: 'grok-3-mini',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
      max_tokens: 150,
      temperature: 1.1,
    }),
  });
  if (!res.ok) throw new Error(`Grok ${res.status}`);
  const reply = (await res.json()).choices?.[0]?.message?.content?.trim();
  if (reply) history.push({ role: 'assistant', content: reply });
  return reply;
}

async function speakGlados(session, text) {
  const { generateGladosAudio } = require('../levels/ttsGlados');
  const { ogg } = await generateGladosAudio(text);
  ensureTempDir();
  const tmpOgg = path.join(TEMP_DIR, `speak_${Date.now()}.ogg`);
  fs.writeFileSync(tmpOgg, ogg);

  // Reprend la main sur la connexion pour parler (au cas où de la musique joue)
  session.connection.subscribe(session.player);

  const resource = createAudioResource(tmpOgg);
  session.player.play(resource);
  await new Promise(resolve => {
    const done = (_, newS) => {
      if (newS.status === AudioPlayerStatus.Idle) {
        session.player.off('stateChange', done);
        resolve();
      }
    };
    session.player.on('stateChange', done);
    setTimeout(() => { session.player.off('stateChange', done); resolve(); }, 30000);
  });
  try { fs.unlinkSync(tmpOgg); } catch {}

  // Redonne la main au lecteur de musique s'il y en a un (reprend la lecture)
  if (session.musicPlayer) {
    try { session.connection.subscribe(session.musicPlayer); } catch {}
  }
}

// ── Gestion parole utilisateur ───────────────────────────────────────────────

function handleUserSpeech(session, userId, guild) {
  const audioStream = session.connection.receiver.subscribe(userId, {
    end: { behavior: EndBehaviorType.AfterSilence, duration: 2000 },
  });
  session.activeStreams.set(userId, audioStream);

  ensureTempDir();
  const tempFile = path.join(TEMP_DIR, `voice_${userId}_${Date.now()}.pcm`);
  const writeStream = fs.createWriteStream(tempFile);
  const decoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });

  audioStream.pipe(decoder).pipe(writeStream);

  writeStream.on('finish', async () => {
    session.activeStreams.delete(userId);
    let wavFile = null;
    try {
      const stats = fs.statSync(tempFile);
      if (stats.size < 8000 || stats.size > 500000) {
        fs.unlinkSync(tempFile);
        return;
      }

      session.isProcessing = true;
      session.cooldowns.set(userId, Date.now());

      wavFile = await pcmToWav(tempFile);
      fs.unlinkSync(tempFile);

      const text = await stt(wavFile);
      fs.unlinkSync(wavFile);
      wavFile = null;

      if (!text) { session.isProcessing = false; return; }

      const wordCount = countWords(text);
      console.log(`[VoiceAI] ${guild.members.cache.get(userId)?.user?.username || userId} : "${text}" (${wordCount} mots)`);

      if (isHallucination(text) || isDuplicate(userId, text)) {
        console.log(`[VoiceAI] Ignoré (${isHallucination(text) ? 'hallucination' : 'doublon'})`);
        session.isProcessing = false;
        return;
      }

      // ── Ne répond que si le nom du bot est prononcé ──────────────────────
      // Vérifié AVANT le filtre "trop court" : une invocation seule
      // ("vtxbot") ne fait qu'un mot et ne doit pas être jetée pour ça.
      const afterWake = detectWakeWord(text);
      if (afterWake === null) {
        console.log(`[VoiceAI] Ignoré (${wordCount < 2 ? 'trop court, ' : ''}pas d'invocation du bot)`);
        session.isProcessing = false;
        return;
      }

      addToHistory(userId, text);

      const member = guild.members.cache.get(userId);
      const username = member?.user?.username || 'inconnu';
      const question = afterWake.length > 0 ? afterWake : 'Bonjour';
      const reply = await ask(userId, username, question);

      if (!reply?.trim()) { session.isProcessing = false; return; }

      const clean = reply.replace(/<a?:\w+:\d+>/g, '').replace(/https?:\/\/\S+/g, '')
        .replace(/[*_`#>~]/g, '').replace(/\s+/g, ' ').trim();

      if (clean.length > 5) {
        console.log(`[VoiceAI] Réponse GLaDOS : "${clean}"`);
        await speakGlados(session, clean);
      }

      session.isProcessing = false;
    } catch (err) {
      console.error('[VoiceAI] Erreur traitement :', err.message);
      session.isProcessing = false;
      try { fs.unlinkSync(tempFile); } catch {}
      if (wavFile) try { fs.unlinkSync(wavFile); } catch {}
    }
  });
}

// ── Écoute attachée à une connexion déjà ouverte (ex : par musicAI) ──────────
// Ne crée PAS de nouvelle connexion — réutilise celle passée en paramètre.
// musicPlayer (optionnel) : le player de musicAI, pour reprendre la lecture
// après que GLaDOS ait parlé.
function attachListening(guild, connection, musicPlayer = null) {
  const guildId = guild.id;
  if (sessions.has(guildId)) {
    // Déjà à l'écoute — juste mettre à jour la référence au player musique
    const existing = sessions.get(guildId);
    existing.musicPlayer = musicPlayer;
    return existing;
  }

  const player = createAudioPlayer(); // player dédié aux réponses vocales GLaDOS

  const session = {
    connection, player, guildId,
    isProcessing: false,
    activeStreams: new Map(),
    cooldowns: new Map(),
    musicPlayer,
  };
  sessions.set(guildId, session);

  const receiver = connection.receiver;

  receiver.speaking.on('start', (userId) => {
    if (userId === guild.client.user.id) return;
    if (!sessions.has(guildId)) return; // écoute arrêtée entre-temps
    if (session.isProcessing) return;
    if (session.activeStreams.has(userId)) return;
    const now = Date.now();
    if ((session.cooldowns.get(userId) || 0) + 4000 > now) return;
    handleUserSpeech(session, userId, guild);
  });

  receiver.ssrcMap.on('update', (_, data) => {
    const userId = data?.userId;
    if (!userId || userId === guild.client.user.id) return;
    if (!sessions.has(guildId)) return;
    if (connection.state.status !== VoiceConnectionStatus.Ready) return;
    if (session.isProcessing) return;
    if (session.activeStreams.has(userId)) return;
    const now = Date.now();
    if ((session.cooldowns.get(userId) || 0) + 4000 > now) return;
    handleUserSpeech(session, userId, guild);
  });

  console.log(`[VoiceAI] Écoute (mot-clé) activée dans ${voiceChannelName(guild, connection)}.`);
  return session;
}

function voiceChannelName(guild, connection) {
  const id = connection.joinConfig?.channelId;
  return guild.channels.cache.get(id)?.name || guild.name;
}

function stopListening(guildId) {
  const s = sessions.get(guildId);
  if (!s) return;
  for (const [, st] of s.activeStreams) { try { st.destroy(); } catch {} }
  try { s.player.stop(); } catch {}
  sessions.delete(guildId);
  console.log(`[VoiceAI] Écoute (mot-clé) arrêtée (${guildId})`);
}

// ── Session autonome (join + écoute), sans musicAI ────────────────────────────
// Gardée pour compat / usage manuel. Crée sa propre connexion.
async function startSession(guild, voiceChannel) {
  const guildId = guild.id;
  if (sessions.has(guildId)) await stopSession(guildId);

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false,
  });

  connection.on('stateChange', (o, n) => {
    if (o.status !== n.status) console.log(`[VoiceAI] Connexion: ${o.status} -> ${n.status}`);
  });
  connection.on('error', e => console.error('[VoiceAI] Erreur connexion:', e.message));

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    console.log(`[VoiceAI] Connecté dans ${voiceChannel.name}`);
  } catch {
    console.error('[VoiceAI] Connexion impossible après 30s.');
    try { connection.destroy(); } catch {}
    return false;
  }

  attachListening(guild, connection, null);

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 30_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 30_000),
      ]);
    } catch {
      console.log('[VoiceAI] Déconnexion définitive.');
      stopListening(guildId);
      try { connection.destroy(); } catch {}
    }
  });

  return true;
}

async function stopSession(guildId) {
  const s = sessions.get(guildId);
  if (!s) return;
  try { s.connection.destroy(); } catch {}
  stopListening(guildId);
}

// ── Module export ────────────────────────────────────────────────────────────

module.exports = (client) => {
  if (!GROQ_KEY) {
    console.warn('[VoiceAI] Clé apiGroq manquante — IA vocale désactivée.');
    return;
  }

  // Voice messages (🎤 en salon texte)
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    if (!msg.flags.has(MessageFlags.IsVoiceMessage)) return;
    const attachment = msg.attachments.first();
    if (!attachment) return;

    try {
      const audioRes = await fetch(attachment.url);
      if (!audioRes.ok) return;
      const audioBuf = Buffer.from(await audioRes.arrayBuffer());
      const form = new FormData();
      form.append('file', new Blob([audioBuf]), attachment.name || 'voice.ogg');
      form.append('model', 'whisper-large-v3-turbo');
      form.append('language', 'fr');
      form.append('prompt', 'VTX-BOT, Vortax, Sanzoy.');
      const sttRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST', headers: { Authorization: `Bearer ${GROQ_KEY}` }, body: form,
      });
      if (!sttRes.ok) return;
      const transcript = (await sttRes.json()).text?.trim();
      if (!transcript) return;

      console.log(`[VoiceAI] 🎤 ${msg.author.username} : "${transcript}"`);
      const question = detectWakeWord(transcript);
      if (question === null) return;

      console.log(`[VoiceAI] Wake word détecté — "${question || '(salut)'}"`);
      await msg.channel.sendTyping();

      const reply = await ask(msg.author.id, msg.author.username, question || 'Bonjour');
      if (!reply) return;

      await sendVoiceReply(client, msg.channelId, msg.id, reply, msg.guild);
      console.log(`[VoiceAI] Réponse vocale → ${msg.author.username}`);
    } catch (e) {
      console.error('[VoiceAI] Erreur vocal texte :', e.message);
    }
  });

  console.log('[VoiceAI] ✅ IA vocale GLaDOS activée (messages vocaux 🎤 + écoute mot-clé en vocal réel).');
};

module.exports.attachListening = attachListening;
module.exports.stopListening = stopListening;
module.exports.startSession = startSession;
module.exports.stopSession = stopSession;