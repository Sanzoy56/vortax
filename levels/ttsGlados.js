'use strict';

const { execFile } = require('child_process');
const { promisify } = require('util');
const { Routes, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const FFMPEG = require('ffmpeg-static');
const execFileAsync = promisify(execFile);
const TMP = process.env.TEMP || '/tmp';

const PIPER_DIR = path.join(__dirname, '../assets/piper');
const IS_WINDOWS = process.platform === 'win32';
const PIPER_EXE = IS_WINDOWS
  ? path.join(PIPER_DIR, 'piper/piper.exe')
  : path.join(PIPER_DIR, 'piper_linux/piper');
const PIPER_MODEL = path.join(PIPER_DIR, 'fr_FR-glados-medium.onnx');

let piperReady = false;
const PIPER_URL = 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz';
const MODEL_URL = 'https://raw.githubusercontent.com/TazzerMAN/piper-voice-glados-fr/main/models/fr_FR-glados-medium.tar.gz';

async function ensurePiper() {
  if (piperReady) return;
  if (IS_WINDOWS) { piperReady = true; return; }

  const linuxDir = path.join(PIPER_DIR, 'piper_linux');
  const { execSync } = require('child_process');

  // Vérifier si le binaire est un vrai ELF (pas corrompu par git)
  let needDownload = false;
  try {
    const header = Buffer.alloc(4);
    const fd = fs.openSync(PIPER_EXE, 'r');
    fs.readSync(fd, header, 0, 4, 0);
    fs.closeSync(fd);
    needDownload = header.toString() !== '\x7fELF';
  } catch { needDownload = true; }

  if (needDownload) {
    console.log('[TTS] Piper manquant ou corrompu — téléchargement...');
    try {
      fs.mkdirSync(linuxDir, { recursive: true });
      // Télécharger et extraire Piper
      const piperRes = await fetch(PIPER_URL);
      if (!piperRes.ok) throw new Error(`Download piper: ${piperRes.status}`);
      const piperTar = path.join(TMP, 'piper_dl.tar.gz');
      fs.writeFileSync(piperTar, Buffer.from(await piperRes.arrayBuffer()));
      execSync(`tar xzf "${piperTar}" -C "${linuxDir}" --strip-components=1`, { stdio: 'pipe' });
      fs.unlinkSync(piperTar);
      console.log('[TTS] Piper téléchargé OK');
    } catch (e) {
      console.error('[TTS] Échec téléchargement Piper:', e.message);
      piperReady = true;
      return;
    }
  }

  // Vérifier si le modèle GLaDOS existe
  if (!fs.existsSync(PIPER_MODEL)) {
    console.log('[TTS] Modèle GLaDOS FR manquant — téléchargement...');
    try {
      const modelRes = await fetch(MODEL_URL);
      if (!modelRes.ok) throw new Error(`Download model: ${modelRes.status}`);
      const modelTar = path.join(TMP, 'glados_dl.tar.gz');
      fs.writeFileSync(modelTar, Buffer.from(await modelRes.arrayBuffer()));
      execSync(`tar xzf "${modelTar}" -C "${PIPER_DIR}"`, { stdio: 'pipe' });
      fs.unlinkSync(modelTar);
      console.log('[TTS] Modèle GLaDOS FR téléchargé OK');
    } catch (e) { console.error('[TTS] Échec téléchargement modèle:', e.message); }
  }

  // chmod + symlinks
  try {
    execSync(`chmod +x "${path.join(linuxDir, 'piper')}"`, { stdio: 'pipe' });
    const links = { 'libpiper_phonemize.so': 'libpiper_phonemize.so.1', 'libespeak-ng.so': 'libespeak-ng.so.1' };
    for (const [link, target] of Object.entries(links)) {
      const p = path.join(linuxDir, link);
      if (!fs.existsSync(p)) fs.symlinkSync(target, p);
    }
    console.log('[TTS] Piper prêt (Linux)');
  } catch (e) { console.error('[TTS] Setup Linux échoué:', e.message); }

  piperReady = true;
}

const GLADOS_API = 'https://sanzoy-glados-tts.hf.space/tts';

async function generateGladosAudio(text) {
  const id = Date.now().toString(36);
  const tmpWav = path.join(TMP, `vtx_${id}.wav`);
  const tmpOgg = path.join(TMP, `vtx_${id}.ogg`);

  // Appel API Hugging Face (Piper GLaDOS FR hébergé)
  const res = await fetch(GLADOS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`GLaDOS API ${res.status}: ${await res.text().catch(() => '')}`);
  fs.writeFileSync(tmpWav, Buffer.from(await res.arrayBuffer()));

  await execFileAsync(FFMPEG, [
    '-y', '-i', tmpWav,
    '-af', 'volume=0.8',
    '-c:a', 'libopus', '-b:a', '64k',
    tmpOgg,
  ]);

  const ogg = fs.readFileSync(tmpOgg);
  const duration = Math.max(5, Math.ceil(ogg.length / (64000 / 8)));
  fs.unlinkSync(tmpWav);
  fs.unlinkSync(tmpOgg);
  return { ogg, duration };
}

function fakeWaveform(durationSecs) {
  const samples = Math.max(32, Math.min(256, Math.floor(durationSecs * 10)));
  const buf = Buffer.alloc(samples);
  for (let i = 0; i < samples; i++) buf[i] = Math.floor(Math.random() * 180) + 40;
  return buf.toString('base64');
}

async function sendVoiceReply(client, channelId, messageId, text, guild) {
  let clean = text
    .replace(/<@!?(\d+)>/g, (_, id) => {
      const member = guild?.members?.cache.get(id);
      return member ? member.displayName : 'quelqu\'un';
    })
    .replace(/<@&(\d+)>/g, (_, id) => {
      const role = guild?.roles?.cache.get(id);
      return role ? role.name : 'un rôle';
    })
    .replace(/<#(\d+)>/g, (_, id) => {
      const ch = guild?.channels?.cache.get(id);
      return ch ? ch.name : 'un salon';
    })
    .replace(/<a?:\w+:\d+>/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*_`#>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return false;

  const { ogg, duration } = await generateGladosAudio(clean);

  await client.rest.post(Routes.channelMessages(channelId), {
    body: {
      flags: MessageFlags.IsVoiceMessage,
      message_reference: { message_id: messageId },
      attachments: [{
        id: '0',
        filename: 'voice-message.ogg',
        duration_secs: duration,
        waveform: fakeWaveform(duration),
      }],
    },
    files: [{
      data: ogg,
      name: 'voice-message.ogg',
      contentType: 'audio/ogg',
    }],
  });
  return true;
}

module.exports = { generateGladosAudio, sendVoiceReply, fakeWaveform };
