'use strict';
const { EndBehaviorType, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const { apiGrok: GROK_API_KEY } = require('./token.json');
const fs   = require('fs');
const path = require('path');

// Mots déclencheurs
const TRIGGERS = ['vtx-bot', 'bot', 'ia'];

// Voix Grok TTS
const VOICE_ID = 'eve'; // eve, ara, rex, sal, leo

// System prompt (même style que grok.js)
const SYSTEM_PROMPT = `Tu es VTX-BOT, bot Discord du serveur de Vortax.
STYLE :
- MAXIMUM 1 ou 2 phrases courtes par réponse. C'est une règle absolue.
- Tu parles au premier degré, sérieux, comme si t'étais convaincu de ce que tu dis.
- Humour trash et vulgaire mais toujours dit sérieusement.
- Pas de majuscules inutiles. Français correct.`;

// Map des sessions actives par guildId
const activeSessions = new Map();

// ── Transcription STT via Grok ────────────────────────────────────────────────
async function transcribeAudio(audioBuffer) {
  const FormData = require('form-data');
  const form = new FormData();
  form.append('file', audioBuffer, { filename: 'audio.wav', contentType: 'audio/wav' });
  form.append('language', 'fr');

  const response = await fetch('https://api.x.ai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROK_API_KEY}`,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.text?.trim() || null;
}

// ── Réponse texte via Grok ────────────────────────────────────────────────────
async function getGrokResponse(userText) {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-3-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userText },
      ],
      max_tokens: 80,
      temperature: 1.2,
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

// ── TTS via Grok ──────────────────────────────────────────────────────────────
async function textToSpeech(text) {
  const response = await fetch('https://api.x.ai/v1/tts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voice_id: VOICE_ID,
      language: 'fr',
    }),
  });

  if (!response.ok) return null;
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer;
}

// ── Jouer l'audio dans le vocal ───────────────────────────────────────────────
async function playAudio(connection, audioBuffer) {
  const tmpPath = path.join(__dirname, `tmp_${Date.now()}.mp3`);
  fs.writeFileSync(tmpPath, audioBuffer);

  const player   = createAudioPlayer();
  const resource = createAudioResource(tmpPath);
  connection.subscribe(player);
  player.play(resource);

  return new Promise((resolve) => {
    player.on(AudioPlayerStatus.Idle, () => {
      fs.unlinkSync(tmpPath);
      resolve();
    });
    player.on('error', () => {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      resolve();
    });
  });
}

// ── Écouter un utilisateur ────────────────────────────────────────────────────
function listenToUser(receiver, userId, connection) {
  const opusStream = receiver.subscribe(userId, {
    end: { behavior: EndBehaviorType.AfterSilence, duration: 1000 },
  });

  const chunks = [];
  opusStream.on('data', chunk => chunks.push(chunk));

  opusStream.on('end', async () => {
    if (chunks.length === 0) return;

    const audioBuffer = Buffer.concat(chunks);

    // Transcription
    const text = await transcribeAudio(audioBuffer);
    if (!text) return;

    // Vérification des mots déclencheurs
    const lower = text.toLowerCase();
    const triggered = TRIGGERS.some(t => lower.includes(t));
    if (!triggered) return;

    console.log(`[VocalIA] Déclenché par : "${text}"`);

    // Réponse Grok
    const reply = await getGrokResponse(text);
    if (!reply) return;

    console.log(`[VocalIA] Réponse : "${reply}"`);

    // TTS
    const audioReply = await textToSpeech(reply);
    if (!audioReply) return;

    // Jouer dans le vocal
    await playAudio(connection, audioReply);
  });
}

// ── Start / Stop ──────────────────────────────────────────────────────────────
function startVocalIA(connection, guildId) {
  const receiver = connection.receiver;

  const handler = (userId) => {
    // Évite d'écouter plusieurs fois le même user en même temps
    if (receiver.subscriptions.has(userId)) return;
    listenToUser(receiver, userId, connection);
  };

  receiver.speaking.on('start', handler);
  activeSessions.set(guildId, handler);

  console.log(`[VocalIA] Session démarrée pour guild ${guildId}`);
}

function stopVocalIA(guildId) {
  activeSessions.delete(guildId);
  console.log(`[VocalIA] Session arrêtée pour guild ${guildId}`);
}

module.exports = { startVocalIA, stopVocalIA };