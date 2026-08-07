'use strict';

// ── musicAI.js ────────────────────────────────────────────────────────────
// Gère : rejoindre un salon vocal sur demande, jouer de la musique (recherche
// YouTube automatique via play-dl pour la recherche + yt-dlp/ffmpeg pour le
// streaming réel, plus fiable que play-dl seul), et demander un lien direct
// si la recherche ne trouve rien de convaincant.
//
// Dépendances à installer :
//   npm install play-dl yt-dlp-exec ffmpeg-static
// ─────────────────────────────────────────────────────────────────────────

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType,
  entersState,
} = require('@discordjs/voice');

const play = require('play-dl');
const ytdlp = require('yt-dlp-exec');
const ffmpegPath = require('ffmpeg-static');
const { spawn } = require('child_process');

// ── Init token play-dl (utilisé uniquement pour la recherche) ─────────────
(async () => {
  try {
    const id = await play.getFreeClientID();
    await play.setToken({
      useragent: [id],
      youtube: {
        cookie: process.env.YOUTUBE_COOKIE,
      },
    });
    console.log('[MusicAI] Token play-dl initialisé (recherche).');
  } catch (e) {
    console.error('[MusicAI] Échec init token play-dl:', e.message);
  }
})();

// guildId -> { connection, player, queue: [{url, query}], playing, voiceChannelId, ffmpegProcess }
const musicSessions = new Map();

// ── Rejoindre le vocal de l'utilisateur ────────────────────────────────────
async function joinUserVoice(message) {
  const voiceChannel = message.member?.voice?.channel;
  if (!voiceChannel) {
    return message.reply(
      `Je ne détecte aucun salon vocal où te rejoindre. Connecte-toi d'abord à un, sujet distrait.`
    );
  }

  const guild = message.guild;
  const existing = musicSessions.get(guild.id);
  if (existing && existing.voiceChannelId === voiceChannel.id) {
    return message.reply(`Je suis déjà dans **${voiceChannel.name}**. Inutile de le répéter.`);
  }
  if (existing) {
    try { existing.connection.destroy(); } catch {}
    try { existing.ffmpegProcess?.kill(); } catch {}
    musicSessions.delete(guild.id);
  }

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: false,
  });

  const player = createAudioPlayer();
  connection.subscribe(player);

  const session = {
    connection,
    player,
    queue: [],
    history: [],
    current: null,
    playing: false,
    voiceChannelId: voiceChannel.id,
    ffmpegProcess: null,
  };
  musicSessions.set(guild.id, session);

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
  } catch {
    try { connection.destroy(); } catch {}
    musicSessions.delete(guild.id);
    return message.reply(`Impossible de me connecter à ce salon vocal. Anomalie réseau.`);
  }

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      // Distingue une vraie déconnexion (kick manuel) d'une coupure réseau temporaire :
      // si la connexion essaie de repasser en Signalling/Connecting, on la laisse faire.
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
      // Reconnexion en cours (ex: changement de salon) — on ne touche à rien.
    } catch {
      // Vraie déconnexion (kick, salon supprimé, etc.) — on nettoie pour de bon.
      try { session.ffmpegProcess?.kill(); } catch {}
      try { connection.destroy(); } catch {}
      musicSessions.delete(guild.id);
    }
  });

  player.on(AudioPlayerStatus.Idle, () => {
    try { session.ffmpegProcess?.kill(); } catch {}
    playNext(guild.id, message.channel);
  });

  player.on('error', (err) => {
    console.error('[MusicAI] Erreur player:', err.message);
    try { session.ffmpegProcess?.kill(); } catch {}
    playNext(guild.id, message.channel);
  });

  await message.reply(`Connectée à **${voiceChannel.name}**. Prête à diffuser de la musique, si tu insistes.`);
  return session;
}

// ── Quitter le vocal ────────────────────────────────────────────────────────
function leaveVoice(message) {
  const session = musicSessions.get(message.guild.id);
  if (!session) return message.reply(`Je ne suis dans aucun salon vocal.`);
  try { session.ffmpegProcess?.kill(); } catch {}
  try { session.connection.destroy(); } catch {}
  musicSessions.delete(message.guild.id);
  return message.reply(`Je quitte le vocal. Enfin un peu de silence.`);
}

// ── Jouer de la musique (recherche ou lien direct) ─────────────────────────
async function playMusic(message, query) {
  const guild = message.guild;
  let session = musicSessions.get(guild.id);

  if (!session) {
    session = await joinUserVoice(message);
    if (!session) return; // le join a échoué, message déjà envoyé
  }

  const isDirectLink = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(query.trim());
  let url = null;
  let label = query.trim();

  if (isDirectLink) {
    url = query.trim();
  } else {
    try {
      const results = await play.search(query, { limit: 1, source: { youtube: 'video' } });
      if (results.length > 0) {
        url = results[0].url;
        label = results[0].title || query;
      }
    } catch (e) {
      console.error('[MusicAI] Erreur recherche:', e.message);
    }
  }

  if (!url) {
    return message.reply(
      `Je ne trouve pas **${query}** de manière convaincante. Donne-moi un lien YouTube direct, ce sera plus fiable que ton intitulé approximatif.`
    );
  }

  session.queue.push({ url, query: label });

  if (!session.playing) {
    await playNext(guild.id, message.channel);
  } else {
    message.reply(`Ajouté à la file d'attente : **${label}**.`);
  }
}

// ── Lecture de la file d'attente ────────────────────────────────────────────
async function playNext(guildId, channel) {
  const session = musicSessions.get(guildId);
  if (!session) return;

  // Le morceau qui vient de se terminer part dans l'historique (pour "précédent")
  if (session.current) {
    session.history.push(session.current);
    if (session.history.length > 20) session.history.shift(); // limite mémoire
  }

  const next = session.queue.shift();
  if (!next) {
    session.playing = false;
    session.current = null;
    return;
  }

  session.playing = true;
  session.current = next;

  // Garde-fou : évite un crash si l'entrée est corrompue/vide
  if (!next.url || typeof next.url !== 'string') {
    console.error('[MusicAI] URL invalide dans la file:', next);
    channel.send(`Entrée invalide dans la file, je passe au morceau suivant.`).catch(() => {});
    return playNext(guildId, channel);
  }

  try {
    console.log('[MusicAI DEBUG] URL avant stream:', next.url);

    // yt-dlp récupère l'URL directe du flux audio (plus fiable que play-dl ici)
    const output = await ytdlp(next.url, {
      f: 'bestaudio',
      g: true, // renvoie juste l'URL directe du flux, sans télécharger le fichier
    });
    const directUrl = String(output).trim().split('\n')[0];

    if (!directUrl) {
      throw new Error("yt-dlp n'a renvoyé aucune URL de flux exploitable.");
    }

    // ffmpeg convertit ce flux en PCM brut lisible par @discordjs/voice.
    // On télécharge le flux nous-mêmes via Node (fetch) et on le transmet à
    // ffmpeg par stdin, plutôt que de laisser ffmpeg résoudre l'URL lui-même :
    // certains environnements bloquent/cassent la résolution DNS interne de
    // ffmpeg alors que Node y arrive très bien.
    const streamResponse = await fetch(directUrl);
    if (!streamResponse.ok || !streamResponse.body) {
      throw new Error(`Téléchargement du flux audio échoué (HTTP ${streamResponse.status}).`);
    }

    const ffmpegProcess = spawn(ffmpegPath, [
      '-i', 'pipe:0',
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2',
      'pipe:1',
    ]);

    const { Readable } = require('stream');
    const sourceStream = Readable.fromWeb(streamResponse.body);
    sourceStream.pipe(ffmpegProcess.stdin);
    sourceStream.on('error', (err) => {
      console.error('[MusicAI] Erreur téléchargement flux:', err.message);
      try { ffmpegProcess.stdin.end(); } catch {}
    });

    session.ffmpegProcess = ffmpegProcess;

    let ffmpegStderr = '';
    ffmpegProcess.stderr.on('data', (chunk) => {
      ffmpegStderr += chunk.toString();
      if (ffmpegStderr.length > 4000) ffmpegStderr = ffmpegStderr.slice(-4000); // garde la fin, plus utile
    });
    ffmpegProcess.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[MusicAI] ffmpeg terminé avec le code ${code}:\n${ffmpegStderr}`);
        channel.send(`⚠️ ffmpeg a échoué (code ${code}).\n\`\`\`\n${ffmpegStderr.slice(-1500)}\n\`\`\``).catch(() => {});
      }
    });
    ffmpegProcess.on('error', (err) => {
      console.error('[MusicAI] Erreur process ffmpeg:', err.message);
      channel.send(`⚠️ Impossible de lancer ffmpeg : ${err.message}`).catch(() => {});
    });

    const resource = createAudioResource(ffmpegProcess.stdout, {
      inputType: StreamType.Raw,
    });

    session.player.play(resource);
    channel.send(`🎵 Lecture : **${next.query}**`).catch(() => {});
  } catch (e) {
    console.error('[MusicAI] Erreur lecture:', e.message);
    channel.send(`Échec de la lecture de **${next.query}**. Suivant.\n\`\`\`\n${String(e.message).slice(0, 1500)}\n\`\`\``).catch(() => {});
    playNext(guildId, channel);
  }
}

// ── Passer au morceau suivant ───────────────────────────────────────────────
function skip(message) {
  const session = musicSessions.get(message.guild.id);
  if (!session || !session.playing) {
    return message.reply(`Je ne joue rien actuellement.`);
  }
  session.player.stop(); // déclenche AudioPlayerStatus.Idle -> playNext()
  return message.reply(`Morceau suivant.`);
}

// ── Arrêter la musique (vide la file, coupe le morceau, reste connectée) ────
function stopMusic(message) {
  const session = musicSessions.get(message.guild.id);
  if (!session) {
    return message.reply(`Je ne joue aucune musique actuellement.`);
  }
  session.queue = [];
  try { session.ffmpegProcess?.kill(); } catch {}
  try { session.player.stop(); } catch {}
  session.playing = false;
  return message.reply(`Musique arrêtée. File d'attente vidée.`);
}

// ── Revenir au morceau précédent ─────────────────────────────────────────────
function previousTrack(message) {
  const session = musicSessions.get(message.guild.id);
  if (!session) {
    return message.reply(`Je ne suis connectée à aucun salon vocal.`);
  }
  if (session.history.length === 0) {
    return message.reply(`Je n'ai aucun morceau précédent en mémoire.`);
  }
  const prev = session.history.pop();
  if (session.current) session.queue.unshift(session.current);
  session.queue.unshift(prev);
  session.current = null; // sera réassigné au début de playNext
  try { session.ffmpegProcess?.kill(); } catch {}
  try { session.player.stop(); } catch {} // déclenche Idle -> playNext, qui relit `prev` en premier
  return message.reply(`Retour au morceau précédent : **${prev.query}**.`);
}

// ── État courant de la session (pour donner du contexte à l'IA) ──────────────
function getSessionInfo(guildId) {
  const session = musicSessions.get(guildId);
  if (!session) return { inVoice: false };
  return {
    inVoice: true,
    playing: session.playing,
    current: session.current ? session.current.query : null,
    queueLength: session.queue.length,
  };
}

// ── Détection d'intention en langage naturel ────────────────────────────────
// Renvoie { type: 'join' | 'leave' | 'stop' | 'play' | 'skip', query? } ou null
function detectMusicIntent(text) {
  const n = text.toLowerCase();

  const vocKw = /\b(voc(?:al)?|salon\s+vocal)\b/;

  // Rejoindre : "join", "rejoins", "rejoint" (conjugaison), "viens", "connecte-toi" + mention du vocal
  const joinKw = /\b(rejoins?|rejoint|joins?|viens|connecte[- ]?toi)\b/;
  if (joinKw.test(n) && vocKw.test(n)) {
    return { type: 'join' };
  }

  // Quitter : "quitte", "pars", "déconnecte-toi", "va-t'en", "sors" + mention du vocal
  const leaveKw = /\b(quitte|pars|va[- ]?t[- ]?en|d[ée]connecte(?:[- ]?toi)?|sors|casse[- ]?toi)\b/;
  if (leaveKw.test(n) && vocKw.test(n)) {
    return { type: 'leave' };
  }

  // Arrêter la musique (sans quitter le vocal) : "stop"/"stoppe" seuls suffisent,
  // mais "arrête" ou "coupe" doivent être accompagnés d'un mot lié à la musique
  // pour éviter les faux positifs (ex: "la coupe du monde", "arrête-toi").
  const stopBare = /\b(stop|stoppe)\b/;
  const hasMusicWord = /\b(musique|chanson|morceau|le\s*son)\b/.test(n);
  const stopWithMusicWord = (/\barr[êe]te(?:r)?\b/.test(n) || /\bcoupe\b/.test(n)) && hasMusicWord;
  if (stopBare.test(n) || stopWithMusicWord) {
    return { type: 'stop' };
  }

  // Passer au morceau suivant
  if (/\bskip\b/.test(n) || /\b(suivant|passe la musique|passe la chanson)\b/.test(n)) {
    return { type: 'skip' };
  }

  // Revenir au morceau précédent
  if (/\b(pr[ée]c[ée]dent(?:e)?|d['’]avant|morceau\s+d['’]avant|chanson\s+d['’]avant|titre\s+d['’]avant|retour\s+en\s+arri[èe]re|reviens\s+en\s+arri[èe]re|previous|back)\b/.test(n)) {
    return { type: 'previous' };
  }

  // Capture la requête en conservant la casse d'origine (recherche + affichage)
  const musicMatch = text.match(
    /\b(?:joue|mets?|lance|balance|play)\b(?:\s+(?:de\s+la\s+musique|la\s+chanson|un\s+son|de\s+la))?\s*[:\-]?\s*(.+)/i
  );
  if (musicMatch && musicMatch[1] && musicMatch[1].trim().length > 1) {
    return { type: 'play', query: musicMatch[1].trim() };
  }

  return null;
}

module.exports = {
  detectMusicIntent,
  joinUserVoice,
  leaveVoice,
  playMusic,
  skip,
  stopMusic,
  previousTrack,
  getSessionInfo,
  musicSessions,
};