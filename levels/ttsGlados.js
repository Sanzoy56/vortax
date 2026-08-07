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

// Releases Piper : archive Linux (tar.gz, par archi) et Windows (zip).
// FIX ARM : avant, l'URL Linux était en dur sur piper_linux_x86_64.tar.gz.
// Ça marchait en local (PC x86_64) mais plantait silencieusement sur la
// Freebox (Docker ARM64) — le binaire x86_64 ne peut pas s'exécuter sur
// une archi ARM ("exec format error" au niveau kernel), et generateGladosAudio()
// finissait juste par throw, catché plus haut sans que l'utilisateur ne
// voie jamais l'erreur (juste : pas de réponse vocale).
const PIPER_RELEASE_BASE = 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2';

function getPiperLinuxUrl() {
  const arch = process.arch; // 'x64', 'arm64', 'arm', ...
  if (arch === 'arm64') return `${PIPER_RELEASE_BASE}/piper_linux_aarch64.tar.gz`;
  if (arch === 'arm') return `${PIPER_RELEASE_BASE}/piper_linux_armv7l.tar.gz`;
  return `${PIPER_RELEASE_BASE}/piper_linux_x86_64.tar.gz`;
}

const PIPER_URL_WINDOWS = `${PIPER_RELEASE_BASE}/piper_windows_amd64.zip`;
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

    // FIX ARM : le check ne se contente plus de vérifier que le fichier est
    // un ELF valide (un binaire x86_64 EST un ELF valide, donc l'ancien check
    // laissait passer un binaire de la mauvaise archi sans jamais le
    // re-télécharger). On lit maintenant le champ e_machine de l'en-tête ELF
    // (offset 18-19, little-endian) et on compare à l'archi attendue :
    //   0x3E = x86_64, 0xB7 = AArch64 (ARM64), 0x28 = ARM 32 bits (armv7)
    let needDownload = false;
    try {
      const header = Buffer.alloc(20);
      const fd = fs.openSync(PIPER_EXE, 'r');
      fs.readSync(fd, header, 0, 20, 0);
      fs.closeSync(fd);

      const isELF = header.toString('utf8', 0, 4) === '\x7fELF';
      const machine = header.readUInt16LE(18);

      const expectedMachine = { arm64: 0xb7, arm: 0x28 }[process.arch] ?? 0x3e; // défaut x86_64

      needDownload = !isELF || machine !== expectedMachine;
      if (isELF && machine !== expectedMachine) {
        console.warn(
          `[TTS] Binaire Piper présent mais mauvaise architecture ` +
          `(trouvé: 0x${machine.toString(16)}, attendu: 0x${expectedMachine.toString(16)} pour ${process.arch}) — re-téléchargement.`
        );
      }
    } catch { needDownload = true; }

    if (needDownload) {
      const url = getPiperLinuxUrl();
      console.log(`[TTS] Piper manquant, corrompu ou mauvaise archi (${process.arch}) — téléchargement depuis ${url} ...`);
      try {
        fs.mkdirSync(linuxDir, { recursive: true });
        const piperRes = await fetch(url);
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
      console.log(`[TTS] Piper prêt (Linux, archi: ${process.arch})`);
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