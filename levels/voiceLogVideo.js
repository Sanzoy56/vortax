'use strict';

const { createCanvas, loadImage } = require('canvas');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const FFMPEG = require('ffmpeg-static');
const execFileAsync = promisify(execFile);
const { renderLogCard } = require('./logCard');

const TMP = process.env.TEMP || '/tmp';

function formatDuration(ms) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function drawPlayerBar(cardBuffer, durationMs) {
  const card = require('canvas');
  const img = new card.Image();
  img.src = cardBuffer;

  const BAR_H = 60;
  const W = img.width;
  const H = img.height + BAR_H;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(img, 0, 0);

  // Fond du player
  ctx.fillStyle = '#0a0a18';
  ctx.fillRect(0, img.height, W, BAR_H);

  // Ligne séparatrice
  ctx.strokeStyle = '#1e1e45';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, img.height);
  ctx.lineTo(W, img.height);
  ctx.stroke();

  // Icône play
  const playX = 26;
  const playY = img.height + BAR_H / 2;
  ctx.fillStyle = '#a855f7';
  ctx.beginPath();
  ctx.moveTo(playX - 6, playY - 8);
  ctx.lineTo(playX + 8, playY);
  ctx.lineTo(playX - 6, playY + 8);
  ctx.closePath();
  ctx.fill();

  // Timestamps
  ctx.font = 'bold 12px "Noto Sans", sans-serif';
  ctx.fillStyle = '#8a8aa8';
  ctx.textBaseline = 'middle';
  ctx.fillText('0:00', 44, playY);
  const durText = formatDuration(durationMs);
  ctx.textAlign = 'right';
  ctx.fillText(durText, W - 20, playY);
  ctx.textAlign = 'left';

  // Barre de progression (fond)
  const barX = 84;
  const barW = W - 84 - 60;
  const barY = playY - 3;
  ctx.fillStyle = '#1e1e45';
  roundRect(ctx, barX, barY, barW, 6, 3);
  ctx.fill();

  // Waveform décorative
  ctx.fillStyle = '#2a2a5a';
  const waveCount = Math.floor(barW / 4);
  for (let i = 0; i < waveCount; i++) {
    const h = 4 + Math.random() * 14;
    ctx.fillRect(barX + i * 4, playY - h / 2, 2, h);
  }

  return { canvas, barX, barW, barY, playY, waveData: generateWaveData(waveCount) };
}

function generateWaveData(count) {
  const data = [];
  for (let i = 0; i < count; i++) data.push(4 + Math.random() * 14);
  return data;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function buildVoiceLogVideo({ authorTag, authorId, avatarURL, channelName, date, audioURL, durationSecs: rawDur }) {
  const formatDate = (d) => new Date(d).toLocaleString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Paris',
  });

  const durationSecs = Math.max(2, Math.round(rawDur || 3));
  const durationMs = durationSecs * 1000;

  const cardBuf = await renderLogCard({
    title: 'Message vocal',
    accent: '#a855f7',
    avatarURL,
    rows: [
      { label: 'Auteur', value: `${authorTag} (${authorId})` },
      { label: 'Salon', value: channelName },
      { label: 'Date', value: formatDate(date) },
      { label: 'Durée', value: formatDuration(durationMs) },
    ],
    footerExtra: `ID: ${authorId}`,
  });

  const { canvas, barX, barW, barY, playY, waveData } = drawPlayerBar(cardBuf, durationMs);
  const W = canvas.width;
  const H = canvas.height;

  const id = Date.now().toString(36);
  const tmpImg = path.join(TMP, `vlog_${id}.png`);
  const tmpAudio = path.join(TMP, `vlog_${id}.ogg`);
  const tmpMp4 = path.join(TMP, `vlog_${id}.mp4`);

  fs.writeFileSync(tmpImg, canvas.toBuffer('image/png'));

  const audioRes = await fetch(audioURL);
  if (!audioRes.ok) throw new Error('Audio download failed');
  fs.writeFileSync(tmpAudio, Buffer.from(await audioRes.arrayBuffer()));

  // Convertir OGG → WAV pour compatibilité FFmpeg
  const tmpWav = path.join(TMP, `vlog_${id}.wav`);
  await execFileAsync(FFMPEG, ['-y', '-i', tmpAudio, '-ar', '44100', '-ac', '2', tmpWav]);

  // FFmpeg : image statique + audio + barre de progression animée
  const progress = `t/${durationSecs}*${barW}`;
  await execFileAsync(FFMPEG, [
    '-loop', '1', '-framerate', '24', '-i', tmpImg,
    '-i', tmpWav,
    '-filter_complex',
    `[0:v]drawbox=x=${barX}:y=${barY}:w='if(gt(${progress},${barW}),${barW},${progress})':h=6:color=#a855f7:t=fill,drawbox=x='${barX}+if(gt(${progress},${barW}),${barW},${progress})-4':y=${barY - 3}:w=8:h=12:color=#c084fc:t=fill[v]`,
    '-map', '[v]', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'ultrafast',
    '-c:a', 'aac', '-b:a', '128k',
    '-pix_fmt', 'yuv420p',
    '-t', String(durationSecs),
    '-y', tmpMp4,
  ], { timeout: 60000 });

  const mp4 = fs.readFileSync(tmpMp4);
  fs.unlinkSync(tmpImg);
  fs.unlinkSync(tmpAudio);
  fs.unlinkSync(tmpWav);
  fs.unlinkSync(tmpMp4);
  return mp4;
}

async function buildVoiceLogVideoFromBuffer({ title, accent, authorTag, authorId, avatarURL, channelName, date, audioBuffer, durationSecs: rawDur, deletedBy }) {
  const formatDate = (d) => new Date(d).toLocaleString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Paris',
  });

  const durationSecs = Math.max(2, Math.round(rawDur || 3));
  const durationMs = durationSecs * 1000;

  const rows = [
    { label: 'Auteur', value: `${authorTag} (${authorId})` },
    { label: 'Salon', value: channelName },
    { label: 'Date', value: formatDate(date) },
    { label: 'Durée', value: formatDuration(durationMs) },
  ];
  if (deletedBy) rows.push({ label: 'Supprimé par', value: deletedBy });

  const cardBuf = await renderLogCard({
    title: title || 'Message vocal supprimé',
    accent: accent || '#ef4444',
    avatarURL,
    rows,
    footerExtra: `ID: ${authorId}`,
  });

  const { canvas, barX, barW, barY, playY } = drawPlayerBar(cardBuf, durationMs);

  const id = Date.now().toString(36);
  const tmpImg = path.join(TMP, `vlog_${id}.png`);
  const tmpAudio = path.join(TMP, `vlog_${id}.ogg`);
  const tmpWav = path.join(TMP, `vlog_${id}.wav`);
  const tmpMp4 = path.join(TMP, `vlog_${id}.mp4`);

  fs.writeFileSync(tmpImg, canvas.toBuffer('image/png'));
  fs.writeFileSync(tmpAudio, audioBuffer);

  await execFileAsync(FFMPEG, ['-y', '-i', tmpAudio, '-ar', '44100', '-ac', '2', tmpWav]);

  const progress = `t/${durationSecs}*${barW}`;
  await execFileAsync(FFMPEG, [
    '-loop', '1', '-framerate', '24', '-i', tmpImg,
    '-i', tmpWav,
    '-filter_complex',
    `[0:v]drawbox=x=${barX}:y=${barY}:w='if(gt(${progress},${barW}),${barW},${progress})':h=6:color=${accent || '#ef4444'}:t=fill,drawbox=x='${barX}+if(gt(${progress},${barW}),${barW},${progress})-4':y=${barY - 3}:w=8:h=12:color=#c084fc:t=fill[v]`,
    '-map', '[v]', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'ultrafast',
    '-c:a', 'aac', '-b:a', '128k',
    '-pix_fmt', 'yuv420p',
    '-t', String(durationSecs),
    '-y', tmpMp4,
  ], { timeout: 60000 });

  const mp4 = fs.readFileSync(tmpMp4);
  fs.unlinkSync(tmpImg);
  fs.unlinkSync(tmpAudio);
  fs.unlinkSync(tmpWav);
  fs.unlinkSync(tmpMp4);
  return mp4;
}

module.exports = { buildVoiceLogVideo, buildVoiceLogVideoFromBuffer };
