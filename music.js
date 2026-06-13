'use strict';
const {
  joinVoiceChannel, createAudioPlayer, createAudioResource,
  AudioPlayerStatus, VoiceConnectionStatus, StreamType, entersState,
} = require('@discordjs/voice');
const play  = require('play-dl');
const ytdlp = require('yt-dlp-exec');
const prism = require('prism-media');

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // déconnexion après 5min sans musique

const queues = new Map(); // guildId -> { connection, player, voiceChannel, textChannel, songs, playing, idleTimeout }

function getQueue(guildId) {
  return queues.get(guildId);
}

function clearIdleTimeout(queue) {
  if (queue.idleTimeout) { clearTimeout(queue.idleTimeout); queue.idleTimeout = null; }
}

function scheduleDisconnect(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return;
  clearIdleTimeout(queue);
  queue.idleTimeout = setTimeout(() => {
    const q = queues.get(guildId);
    if (q && !q.playing && q.songs.length === 0) {
      q.connection.destroy();
      queues.delete(guildId);
    }
  }, IDLE_TIMEOUT_MS);
}

function createQueue(guild, voiceChannel, textChannel) {
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
  });
  const player = createAudioPlayer();
  connection.subscribe(player);

  const queue = {
    connection, player, voiceChannel, textChannel,
    songs: [], playing: false, idleTimeout: null,
    currentProcess: null, currentTranscoder: null,
  };

  player.on(AudioPlayerStatus.Idle, () => {
    queue.playing = false;
    queue.songs.shift();
    if (queue.songs.length > 0) {
      playNext(guild.id);
    } else {
      scheduleDisconnect(guild.id);
    }
  });

  player.on('error', err => {
    console.error('[Musique] Erreur lecteur:', err.message);
    queue.songs.shift();
    if (queue.songs.length > 0) playNext(guild.id);
    else scheduleDisconnect(guild.id);
  });

  player.on('stateChange', (oldState, newState) => {
    console.log(`[Musique] Player: ${oldState.status} -> ${newState.status}`);
  });

  connection.on('stateChange', (oldState, newState) => {
    console.log(`[Musique] Connexion: ${oldState.status} -> ${newState.status}`);
  });

  connection.on('error', err => {
    console.error('[Musique] Erreur connexion:', err.message);
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      // Une déconnexion peut être temporaire (reconnexion auto en cours)
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      console.log('[Musique] Déconnexion définitive du vocal.');
      clearIdleTimeout(queue);
      killCurrent(queue);
      connection.destroy();
      queues.delete(guild.id);
    }
  });

  queues.set(guild.id, queue);
  return queue;
}

// ── Tue le processus yt-dlp/ffmpeg en cours (changement/arrêt de piste) ──
function killCurrent(queue) {
  if (queue.currentProcess)    { queue.currentProcess.kill(); queue.currentProcess = null; }
  if (queue.currentTranscoder) { queue.currentTranscoder.destroy(); queue.currentTranscoder = null; }
}

async function playNext(guildId) {
  const queue = queues.get(guildId);
  if (!queue || queue.songs.length === 0) return;
  const song = queue.songs[0];

  killCurrent(queue);

  try {
    console.log(`[Musique] Lecture de ${song.url}`);
    const subprocess = ytdlp.exec(song.url, {
      format: 'bestaudio',
      output: '-',
      quiet: true,
      noWarnings: true,
    }, { stdio: ['ignore', 'pipe', 'pipe'] });
    subprocess.catch(() => {}); // évite les rejets non gérés (kill volontaire)
    subprocess.stderr.on('data', d => console.error('[Musique] yt-dlp stderr:', d.toString().trim()));
    subprocess.stdout.on('error', e => console.error('[Musique] yt-dlp stdout erreur:', e.message));

    const transcoder = new prism.FFmpeg({
      args: ['-analyzeduration', '0', '-loglevel', '0', '-f', 's16le', '-ar', '48000', '-ac', '2'],
    });
    transcoder.on('error', e => console.error('[Musique] ffmpeg erreur:', e.message));

    queue.currentProcess    = subprocess;
    queue.currentTranscoder = transcoder;

    const pcmStream = subprocess.stdout.pipe(transcoder);
    const resource  = createAudioResource(pcmStream, { inputType: StreamType.Raw });

    clearIdleTimeout(queue);
    queue.playing = true;
    queue.player.play(resource);
  } catch (e) {
    console.error('[Musique] Erreur lecture:', e.message);
    queue.songs.shift();
    if (queue.songs.length > 0) playNext(guildId);
    else scheduleDisconnect(guildId);
  }
}

// ── Rejoint (ou déplace le bot vers) un salon vocal, sans jouer ──
function join(guild, voiceChannel, textChannel) {
  let queue = queues.get(guild.id);
  if (queue) {
    queue.connection.rejoin({ channelId: voiceChannel.id, selfDeaf: false, selfMute: false });
    queue.voiceChannel = voiceChannel;
    queue.textChannel = textChannel;
    return queue;
  }
  return createQueue(guild, voiceChannel, textChannel);
}

// ── Recherche YouTube ──────────────────────────────────────────
async function search(query) {
  const results = await play.search(query, { limit: 1, source: { youtube: 'video' } });
  return results[0] ?? null;
}

// ── Récupère les infos (titre/durée) d'une URL directe via yt-dlp ──
async function getUrlInfo(url) {
  try {
    const info = await ytdlp(url, { dumpSingleJson: true, noWarnings: true, quiet: true, noPlaylist: true });
    return { url, title: info.title || url, durationRaw: info.duration_string || '' };
  } catch {
    return null;
  }
}

// ── Ajoute une chanson déjà résolue à la file (et lance si rien ne joue) ──
async function enqueue(guild, voiceChannel, textChannel, song) {
  let queue = queues.get(guild.id);
  if (!queue) queue = createQueue(guild, voiceChannel, textChannel);
  else queue.textChannel = textChannel;

  queue.songs.push(song);

  if (!queue.playing) await playNext(guild.id);

  return { title: song.title, duration: song.duration, position: queue.songs.length };
}

// ── Ajoute une musique à la file via une recherche (et la lance si rien ne joue) ──
async function playRequest(guild, voiceChannel, textChannel, query) {
  const result = await search(query);
  if (!result) return null;
  return enqueue(guild, voiceChannel, textChannel, { url: result.url, title: result.title, duration: result.durationRaw });
}

// ── Ajoute une musique à la file depuis une URL directe (fallback si la recherche échoue) ──
async function playUrl(guild, voiceChannel, textChannel, url) {
  const info = await getUrlInfo(url);
  if (!info) return null;
  return enqueue(guild, voiceChannel, textChannel, { url: info.url, title: info.title, duration: info.durationRaw });
}

function stop(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return false;
  queue.songs = [];
  clearIdleTimeout(queue);
  killCurrent(queue);
  queue.player.stop();
  queue.connection.destroy();
  queues.delete(guildId);
  return true;
}

function skip(guildId) {
  const queue = queues.get(guildId);
  if (!queue || queue.songs.length === 0) return false;
  queue.player.stop(); // déclenche Idle -> passe à la suivante
  return true;
}

function pause(guildId) {
  const queue = queues.get(guildId);
  if (!queue || !queue.playing) return false;
  return queue.player.pause();
}

function resume(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return false;
  return queue.player.unpause();
}

module.exports = { join, playRequest, playUrl, stop, skip, pause, resume, getQueue };
