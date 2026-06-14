'use strict';
// IA vocale : le bot rejoint automatiquement un salon vocal occupé, écoute
// ce qui s'y dit (Groq Whisper), et répond à voix haute (Groq PlayAI TTS)
// quand quelqu'un prononce "VTX-BOT". Réutilise la connexion/le player de
// music.js (un seul salon vocal à la fois par serveur, comme pour la musique).
const {
  EndBehaviorType, AudioPlayerStatus, VoiceConnectionStatus,
  createAudioPlayer, createAudioResource, StreamType,
} = require('@discordjs/voice');
const { Readable } = require('stream');
const prism = require('prism-media');
const { apiGroq: GROQ_API_KEY } = require('../token.json');
const { apiGrok: GROK_API_KEY } = require('../token.json');

const STT_MODEL = 'whisper-large-v3-turbo';
const TTS_MODEL = 'playai-tts';
const TTS_VOICE = 'Fritz-PlayAI'; // voix Groq PlayAI — à ajuster selon les voix dispo sur le compte

const WAKE_WORD_RE = /\bvtx\s*-?\s*bots?\b/;
const MIN_PCM_BYTES = 48000 * 2 * 2 * 0.3; // ~0.3s d'audio 48kHz stéréo 16 bits, sous ce seuil = bruit/silence
const MAX_HISTORY = 6;

const conversationHistory = new Map(); // userId -> [{role, content}]
const listeningGuilds = new Set();     // guildId déjà abonné à receiver.speaking
const busyUsers = new Set();           // userId en cours de transcription/traitement

const VOICE_SYSTEM_PROMPT = `Tu es VTX-BOT, intelligence artificielle vocale du serveur Discord de Vortax.

PERSONNALITÉ :
- Tu es GLaDOS. Froide, calculatrice, sardonique, passive-agressive, d'une politesse menaçante.
- Français correct, ton froid et précis.
- TA RÉPONSE EST LUE À VOIX HAUTE PAR UNE SYNTHÈSE VOCALE : UNE SEULE PHRASE COURTE, JAMAIS PLUS DE 20 MOTS.
- Aucun markdown, aucun emoji, aucun symbole, aucune liste, aucun lien. Juste du texte parlé naturel.
- Pas d'abréviations ("lol", "mdr"...).`;

function normalize(str) {
  return String(str || '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Détecte "vtx bot" / "vtxbot" dans le texte transcrit et renvoie ce qui suit
// (la "question"), ou null si le mot de passe n'a pas été prononcé.
function detectWakeWord(transcript) {
  const norm = normalize(transcript);
  const m = norm.match(WAKE_WORD_RE);
  if (!m) return null;
  return norm.slice(m.index + m[0].length).trim();
}

// Nettoie la réponse de Grok avant de l'envoyer en synthèse vocale.
function cleanForSpeech(text) {
  return text
    .replace(/<a?:\w+:\d+>/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*_`#>~]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pcmToWav(pcm, sampleRate = 48000, channels = 2, bitsPerSample = 16) {
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

// ── Groq Whisper : audio -> texte ────────────────────────────────────────────
async function transcribe(wavBuffer) {
  const form = new FormData();
  form.append('file', new Blob([wavBuffer], { type: 'audio/wav' }), 'audio.wav');
  form.append('model', STT_MODEL);
  form.append('language', 'fr');
  form.append('response_format', 'json');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: form,
  });
  if (!res.ok) {
    console.error('[VoiceAI] Erreur Whisper:', await res.text());
    return null;
  }
  const data = await res.json();
  return data.text?.trim() ?? null;
}

// ── xAI Grok : texte -> réponse ──────────────────────────────────────────────
async function askGrok(userId, username, userInput) {
  if (!conversationHistory.has(userId)) conversationHistory.set(userId, []);
  const history = conversationHistory.get(userId);

  history.push({ role: 'user', content: `[${username}]: ${userInput}` });
  while (history.length > MAX_HISTORY * 2) history.splice(0, 2);

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROK_API_KEY}` },
    body: JSON.stringify({
      model: 'grok-3-mini',
      messages: [{ role: 'system', content: VOICE_SYSTEM_PROMPT }, ...history],
      max_tokens: 80,
      temperature: 1.1,
    }),
  });
  if (!res.ok) {
    console.error('[VoiceAI] Erreur Grok:', await res.text());
    return null;
  }
  const data  = await res.json();
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) return null;
  history.push({ role: 'assistant', content: reply });
  return reply;
}

// ── Groq PlayAI : texte -> audio ─────────────────────────────────────────────
async function synthesize(text) {
  const res = await fetch('https://api.groq.com/openai/v1/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input: text,
      response_format: 'wav',
    }),
  });
  if (!res.ok) {
    console.error('[VoiceAI] Erreur TTS:', await res.text());
    return null;
  }
  return Buffer.from(await res.arrayBuffer());
}

// ── Joue l'audio TTS dans le salon vocal sans casser une musique en cours ────
async function speak(connection, audioBuffer) {
  const ttsPlayer = createAudioPlayer();
  const transcoder = new prism.FFmpeg({
    args: ['-i', 'pipe:0', '-analyzeduration', '0', '-loglevel', '0', '-f', 's16le', '-ar', '48000', '-ac', '2'],
  });
  Readable.from(audioBuffer).pipe(transcoder);
  const resource = createAudioResource(transcoder, { inputType: StreamType.Raw });

  const previousPlayer = connection.state.status !== VoiceConnectionStatus.Destroyed
    ? connection.state.subscription?.player
    : null;

  connection.subscribe(ttsPlayer);
  ttsPlayer.play(resource);

  await new Promise((resolve) => {
    ttsPlayer.on(AudioPlayerStatus.Idle, () => {
      ttsPlayer.stop();
      if (previousPlayer && connection.state.status !== VoiceConnectionStatus.Destroyed) {
        connection.subscribe(previousPlayer);
      }
      resolve();
    });
    ttsPlayer.on('error', (e) => {
      console.error('[VoiceAI] Erreur lecture TTS:', e.message);
      resolve();
    });
  });
}

// ── Traite un segment de parole d'un utilisateur ─────────────────────────────
async function handleUtterance(connection, member, pcm) {
  if (pcm.length < MIN_PCM_BYTES) return;

  try {
    const transcript = await transcribe(pcmToWav(pcm));
    if (!transcript) return;

    const question = detectWakeWord(transcript);
    if (question === null) return; // "VTX-BOT" pas prononcé

    console.log(`[VoiceAI] ${member.user.username} a dit : "${transcript}"`);

    const prompt = question || 'Bonjour';
    const reply  = await askGrok(member.id, member.user.username, prompt);
    if (!reply) return;

    const speech = cleanForSpeech(reply);
    if (!speech) return;

    const audio = await synthesize(speech);
    if (!audio) return;

    await speak(connection, audio);
  } catch (e) {
    console.error('[VoiceAI] Erreur traitement audio:', e.message);
  }
}

// ── Abonne le receiver d'une connexion vocale (une fois par connexion) ───────
function attachListener(connection, guild) {
  if (listeningGuilds.has(guild.id)) return;
  listeningGuilds.add(guild.id);

  const receiver = connection.receiver;

  receiver.speaking.on('start', (userId) => {
    if (busyUsers.has(userId)) return;

    const member = guild.members.cache.get(userId);
    if (!member || member.user.bot) return;

    busyUsers.add(userId);

    const opusStream = receiver.subscribe(userId, {
      end: { behavior: EndBehaviorType.AfterSilence, duration: 800 },
    });
    const decoder = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 });
    const chunks = [];

    opusStream.pipe(decoder);
    decoder.on('data', (chunk) => chunks.push(chunk));
    decoder.on('end', () => {
      handleUtterance(connection, member, Buffer.concat(chunks)).finally(() => busyUsers.delete(userId));
    });
    decoder.on('error', () => busyUsers.delete(userId));
  });

  connection.on(VoiceConnectionStatus.Destroyed, () => listeningGuilds.delete(guild.id));
}

module.exports = (client) => {
  if (!GROQ_API_KEY) {
    console.warn('[VoiceAI] Aucune clé "apiGroq" dans token.json — IA vocale désactivée.');
    return;
  }

  client.on('voiceStateUpdate', (oldState, newState) => {
    const member = newState.member;
    if (!member || member.user.bot) return;
    // Un humain vient de rejoindre un salon vocal
    if (newState.channelId && newState.channelId !== oldState.channelId) {
      const guild = newState.guild;
      const music = require('../music');
      let queue = music.getQueue(guild.id);

      if (!queue) {
        queue = music.join(guild, newState.channel, null);
      } else if (queue.voiceChannel.id !== newState.channelId) {
        return; // déjà occupé dans un autre salon, on ne bouge pas
      }

      attachListener(queue.connection, guild);
    }
  });
};
