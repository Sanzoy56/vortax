'use strict';

const {
  EndBehaviorType,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType
} = require('@discordjs/voice');

const prism = require('prism-media');
const fs = require('fs');
const path = require('path');

const { apiGrok: GROK_API_KEY } = require('./token.json');

const TRIGGERS = ['vtx-bot', 'bot', 'ia'];
const VOICE_ID = 'eve';

const SYSTEM_PROMPT = `
Tu es VTX-BOT, bot Discord du serveur de Vortax.

RÈGLES :
- Réponse courte (1 ou 2 phrases max)
- Français
- Sérieux
- Humour trash / vulgaire
- Jamais trop long
`;

// guildId → { receiver, handler, isSpeaking }
const activeSessions = new Map();

// ─────────────────────────────────────────────────
// Transcription audio (PCM → WAV → xAI)
// ─────────────────────────────────────────────────

function pcmToWav(pcmBuffer, sampleRate = 48000, channels = 2) {
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;
  const dataSize = pcmBuffer.length;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);          // PCM
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);         // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(buffer, 44);

  return buffer;
}

async function transcribeAudio(pcmBuffer) {
  try {
    const wavBuffer = pcmToWav(pcmBuffer);
    const tmpPath = path.join(__dirname, `stt_${Date.now()}.wav`);
    fs.writeFileSync(tmpPath, wavBuffer);

    const { FormData, File } = await import('node:buffer').catch(() => null)
      .then(() => globalThis);

    // Utilise node-fetch ou fetch natif (Node 18+)
    const formData = new globalThis.FormData();
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    formData.append('file', blob, 'audio.wav');
    formData.append('language', 'fr');

    const response = await fetch(
      'https://api.x.ai/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROK_API_KEY}`
        },
        body: formData
      }
    );

    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);

    if (!response.ok) {
      console.error('[STT ERROR]', await response.text());
      return null;
    }

    const data = await response.json();
    return data.text?.trim() || null;

  } catch (err) {
    console.error('[STT ERROR]', err);
    return null;
  }
}

// ─────────────────────────────────────────────────
// Réponse Grok
// ─────────────────────────────────────────────────

async function getGrokResponse(text) {
  try {
    const response = await fetch(
      'https://api.x.ai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'grok-3-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: text }
          ],
          max_tokens: 80,
          temperature: 1.1
        })
      }
    );

    if (!response.ok) {
      console.error('[GROK ERROR]', await response.text());
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;

  } catch (err) {
    console.error('[GROK ERROR]', err);
    return null;
  }
}

// ─────────────────────────────────────────────────
// Text-to-speech
// ─────────────────────────────────────────────────

async function textToSpeech(text) {
  try {
    const response = await fetch(
      'https://api.x.ai/v1/audio/speech',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'grok-3-mini-tts',
          voice: VOICE_ID,
          input: text
        })
      }
    );

    if (!response.ok) {
      console.error('[TTS ERROR]', await response.text());
      return null;
    }

    return Buffer.from(await response.arrayBuffer());

  } catch (err) {
    console.error('[TTS ERROR]', err);
    return null;
  }
}

// ─────────────────────────────────────────────────
// Lecture audio dans le vocal
// ─────────────────────────────────────────────────

async function playAudio(connection, buffer, session) {
  const filePath = path.join(__dirname, `tts_${Date.now()}.mp3`);

  try {
    fs.writeFileSync(filePath, buffer);

    const player = createAudioPlayer();
    const resource = createAudioResource(filePath, {
      inputType: StreamType.Arbitrary
    });

    // Indique que le bot parle pour éviter qu'il se déclenche lui-même
    if (session) session.isSpeaking = true;

    connection.subscribe(player);
    player.play(resource);

    await new Promise((resolve) => {
      player.once(AudioPlayerStatus.Idle, resolve);
      player.once('error', (err) => {
        console.error('[PLAYER ERROR]', err);
        resolve();
      });
    });

  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (session) session.isSpeaking = false;
  }
}

// ─────────────────────────────────────────────────
// Écoute d'un utilisateur
// ─────────────────────────────────────────────────

function listenToUser(receiver, userId, connection, session) {
  // Évite de s'abonner deux fois au même user
  if (receiver.subscriptions.has(userId)) return;

  // Ignore le bot lui-même
  if (session?.isSpeaking) return;

  const opusStream = receiver.subscribe(userId, {
    end: {
      behavior: EndBehaviorType.AfterSilence,
      duration: 1200
    }
  });

  const decoder = new prism.opus.Decoder({
    frameSize: 960,
    channels: 2,
    rate: 48000
  });

  const chunks = [];

  opusStream
    .pipe(decoder)
    .on('data', chunk => chunks.push(chunk))
    .on('end', async () => {
      try {
        const pcmBuffer = Buffer.concat(chunks);

        // Ignore les buffers trop courts (bruit / souffle)
        if (pcmBuffer.length < 48000) return;

        console.log(`[VOCAL] Audio reçu de ${userId} (${pcmBuffer.length} bytes)`);

        const text = await transcribeAudio(pcmBuffer);
        if (!text) return;

        console.log(`[VOCAL] Transcription : "${text}"`);

        const lower = text.toLowerCase();
        const triggered = TRIGGERS.some(word => lower.includes(word));
        if (!triggered) return;

        const reply = await getGrokResponse(text);
        if (!reply) return;

        console.log(`[VOCAL] Réponse : "${reply}"`);

        const voice = await textToSpeech(reply);
        if (!voice) return;

        await playAudio(connection, voice, session);

      } catch (err) {
        console.error('[VOCAL ERROR]', err);
      }
    })
    .on('error', err => console.error('[DECODER ERROR]', err));
}

// ─────────────────────────────────────────────────
// API publique
// ─────────────────────────────────────────────────

function startVocalIA(connection, guildId) {
  if (activeSessions.has(guildId)) return;

  const receiver = connection.receiver;
  const session = { receiver, isSpeaking: false, handler: null };

  const handler = (userId) => {
    listenToUser(receiver, userId, connection, session);
  };

  session.handler = handler;
  receiver.speaking.on('start', handler);
  activeSessions.set(guildId, session);

  console.log(`[VOCAL] IA activée pour guild ${guildId}`);
}

function stopVocalIA(guildId) {
  const session = activeSessions.get(guildId);
  if (!session) return;

  session.receiver.speaking.off('start', session.handler);
  activeSessions.delete(guildId);

  console.log(`[VOCAL] IA arrêtée pour guild ${guildId}`);
}

module.exports = { startVocalIA, stopVocalIA };