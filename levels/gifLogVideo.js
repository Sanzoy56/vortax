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
const GIF_W = 360;
const GIF_H = 270;

async function buildGifLogVideo({ title, accent, avatarURL, rows, footerExtra, gifBuffer }) {
  const cardBuf = await renderLogCard({
    title, accent, avatarURL, rows, footerExtra,
    longText: { label: 'Contenu', value: '(GIF ci-dessous)' },
  });

  // Charger la carte pour connaître ses dimensions
  const cardImg = await loadImage(cardBuf);
  const cardW = cardImg.width;
  const cardH = cardImg.height;

  // Créer un canvas étendu avec espace pour le GIF
  const totalH = cardH + GIF_H + 30;
  const canvas = createCanvas(cardW, totalH);
  const ctx = canvas.getContext('2d');

  // Fond
  ctx.fillStyle = '#0d0d20';
  ctx.fillRect(0, 0, cardW, totalH);

  // Carte log
  ctx.drawImage(cardImg, 0, 0);

  // Zone GIF (fond sombre + label)
  const gifX = Math.floor((cardW - GIF_W) / 2);
  const gifY = cardH + 10;

  ctx.fillStyle = '#0a0a18';
  ctx.strokeStyle = '#1e1e45';
  ctx.lineWidth = 1;
  roundRect(ctx, gifX - 8, gifY - 8, GIF_W + 16, GIF_H + 16, 8);
  ctx.fill();
  ctx.stroke();

  const id = Date.now().toString(36);
  const tmpCard = path.join(TMP, `glog_${id}_card.png`);
  const tmpGif = path.join(TMP, `glog_${id}.gif`);
  const tmpMp4 = path.join(TMP, `glog_${id}.mp4`);

  fs.writeFileSync(tmpCard, canvas.toBuffer('image/png'));
  fs.writeFileSync(tmpGif, gifBuffer);

  // FFmpeg : fond statique + GIF animé overlay
  await execFileAsync(FFMPEG, [
    '-y',
    '-loop', '1', '-framerate', '15', '-i', tmpCard,
    '-ignore_loop', '0', '-i', tmpGif,
    '-filter_complex', [
      `[1:v]scale=${GIF_W}:${GIF_H}:force_original_aspect_ratio=decrease,pad=${GIF_W}:${GIF_H}:(ow-iw)/2:(oh-ih)/2:color=0x0a0a18[gif]`,
      `[0:v][gif]overlay=${gifX}:${gifY}:shortest=1[out]`,
    ].join(';'),
    '-map', '[out]',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
    '-t', '6',
    tmpMp4,
  ], { timeout: 30000 });

  const mp4 = fs.readFileSync(tmpMp4);
  fs.unlinkSync(tmpCard);
  fs.unlinkSync(tmpGif);
  fs.unlinkSync(tmpMp4);
  return mp4;
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

module.exports = { buildGifLogVideo };
