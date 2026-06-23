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
function ensurePiper() {
  if (piperReady || IS_WINDOWS) { piperReady = true; return; }
  const linuxDir = path.join(PIPER_DIR, 'piper_linux');
  const { execSync } = require('child_process');
  try {
    // Rendre tous les binaires exécutables
    execSync(`chmod +x "${path.join(linuxDir, 'piper')}" "${path.join(linuxDir, 'piper_phonemize')}" "${path.join(linuxDir, 'espeak-ng')}"`, { stdio: 'pipe' });
    console.log('[TTS] chmod +x piper OK');
  } catch (e) { console.error('[TTS] chmod échoué:', e.message); }
  // Créer les symlinks manquants
  const links = {
    'libpiper_phonemize.so': 'libpiper_phonemize.so.1',
    'libespeak-ng.so': 'libespeak-ng.so.1',
  };
  for (const [link, target] of Object.entries(links)) {
    const p = path.join(linuxDir, link);
    if (!fs.existsSync(p)) {
      try { fs.symlinkSync(target, p); console.log(`[TTS] Symlink créé: ${link} -> ${target}`); }
      catch (e) { console.error(`[TTS] Symlink ${link} échoué:`, e.message); }
    }
  }
  // Vérifier que espeak-ng-data est accessible
  const espeakData = path.join(linuxDir, 'espeak-ng-data');
  if (!fs.existsSync(espeakData)) {
    console.error('[TTS] ⚠️ espeak-ng-data manquant dans piper_linux/');
  }
  piperReady = true;
}

async function generateGladosAudio(text) {
  ensurePiper();
  const id = Date.now().toString(36);
  const tmpWav = path.join(TMP, `vtx_${id}.wav`);
  const tmpOgg = path.join(TMP, `vtx_${id}.ogg`);

  await new Promise((resolve, reject) => {
    const env = IS_WINDOWS ? process.env : { ...process.env, LD_LIBRARY_PATH: path.dirname(PIPER_EXE) };
    const proc = require('child_process').spawn(PIPER_EXE, [
      '--model', PIPER_MODEL, '--output_file', tmpWav,
    ], { stdio: ['pipe', 'pipe', 'pipe'], env });
    let stderr = '';
    proc.stderr.on('data', d => stderr += d.toString());
    proc.stdin.write(text);
    proc.stdin.end();
    proc.on('close', code => {
      if (code === 0) return resolve();
      reject(new Error(`Piper exit ${code}: ${stderr.trim().slice(0, 200)}`));
    });
    proc.on('error', e => reject(new Error(`Piper spawn: ${e.message}`)));
    setTimeout(() => { proc.kill(); reject(new Error('Piper timeout')); }, 15000);
  });

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
