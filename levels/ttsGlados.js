'use strict';

const { execFile, spawn } = require('child_process');
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

// Releases Piper : archive Linux (tar.gz) et Windows (zip).
const PIPER_URL_LINUX = 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz';
const PIPER_URL_WINDOWS = 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip';
const MODEL_URL = 'https://raw.githubusercontent.com/TazzerMAN/piper-voice-glados-fr/main/models/fr_FR-glados-medium.tar.gz';

// FIX : cette fonction téléchargeait Piper + le modèle mais generateGladosAudio()
// ne l'appelait jamais et ne s'en servait jamais — tout passait par un Space
// Hugging Face public (cold start + queue = 12-13s de latence). On branche
// maintenant vraiment ce setup ET l'inférence locale sur le binaire Piper.
async function ensurePiper() {
  if (piperReady) return;

  const { execSync } = require('child_process');

  if (IS_WINDOWS) {
    const winDir = path.join(PIPER_DIR, 'piper');
    let needDownload = !fs.existsSync(PIPER_EXE);

    if (needDownload) {
      console.log('[TTS] Piper (Windows) manquant — téléchargement...');
      try {
        fs.mkdirSync(winDir, { recursive: true });
        const piperRes = await fetch(PIPER_URL_WINDOWS);
        if (!piperRes.ok) throw new Error(`Download piper: ${piperRes.status}`);
        const piperZip = path.join(TMP, 'piper_dl.zip');
        fs.writeFileSync(piperZip, Buffer.from(await piperRes.arrayBuffer()));
        // tar sait décompresser du zip depuis Windows 10+ (bsdtar intégré)
        execSync(`tar xf "${piperZip}" -C "${winDir}" --strip-components=1`, { stdio: 'pipe' });
        fs.unlinkSync(piperZip);
        console.log('[TTS] Piper (Windows) téléchargé OK');
      } catch (e) {
        console.error('[TTS] Échec téléchargement Piper Windows:', e.message);
        console.error('[TTS] -> Place manuellement piper.exe + ses DLLs dans', winDir);
      }
    }
  } else {
    const linuxDir = path.join(PIPER_DIR, 'piper_linux');

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
        const piperRes = await fetch(PIPER_URL_LINUX);
        if (!piperRes.ok) throw new Error(`Download piper: ${piperRes.status}`);
        const piperTar = path.join(TMP, 'piper_dl.tar.gz');
        fs.writeFileSync(piperTar, Buffer.from(await piperRes.arrayBuffer()));
        execSync(`tar xzf "${piperTar}" -C "${linuxDir}" --strip-components=1`, { stdio: 'pipe' });
        fs.unlinkSync(piperTar);
        console.log('[TTS] Piper téléchargé OK');
      } catch (e) {
        console.error('[TTS] Échec téléchargement Piper:', e.message);
      }
    }

    // chmod + symlinks (Linux uniquement)
    try {
      execSync(`chmod +x "${path.join(linuxDir, 'piper')}"`, { stdio: 'pipe' });
      const links = { 'libpiper_phonemize.so': 'libpiper_phonemize.so.1', 'libespeak-ng.so': 'libespeak-ng.so.1' };
      for (const [link, target] of Object.entries(links)) {
        const p = path.join(linuxDir, link);
        if (!fs.existsSync(p)) fs.symlinkSync(target, p);
      }
      console.log('[TTS] Piper prêt (Linux)');
    } catch (e) { console.error('[TTS] Setup Linux échoué:', e.message); }
  }

  // Vérifier si le modèle GLaDOS existe (commun aux deux OS)
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

  piperReady = true;
}

// FIX : génère l'audio via le binaire Piper LOCAL (rapide, ~1-3s) au lieu
// d'appeler un Space Hugging Face public distant (12-13s, cold start, file
// d'attente partagée). C'est ça qui causait l'essentiel de la latence
// "TTS+lecture" observée dans les logs.
async function generateGladosAudio(text) {
  await ensurePiper();

  const id = Date.now().toString(36);
  const tmpWav = path.join(TMP, `vtx_${id}.wav`);
  const tmpOgg = path.join(TMP, `vtx_${id}.ogg`);

  if (!fs.existsSync(PIPER_EXE) || !fs.existsSync(PIPER_MODEL)) {
    throw new Error(
      `Piper indisponible (binaire: ${fs.existsSync(PIPER_EXE)}, modèle: ${fs.existsSync(PIPER_MODEL)}). ` +
      `Vérifie ${PIPER_DIR}.`
    );
  }

  await new Promise((resolve, reject) => {
    const piper = spawn(PIPER_EXE, ['--model', PIPER_MODEL, '--output_file', tmpWav]);
    let stderr = '';
    piper.stderr.on('data', (d) => { stderr += d.toString(); });
    piper.on('error', reject);
    piper.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`piper a quitté avec le code ${code}: ${stderr.slice(-500)}`));
    });
    piper.stdin.write(text);
    piper.stdin.end();
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

module.exports = { generateGladosAudio, sendVoiceReply, fakeWaveform, ensurePiper };