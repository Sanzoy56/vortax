'use strict';

const { createCanvas, loadImage } = require('canvas');
const { roundRect, drawGoldLine, drawAvatar, sanitize, truncate, FONT } = require('./logCard');

const W = 760;
const PAD = 26;
const ACCENT_BAR_W = 5;
const IMG_MAX_W = 400;
const IMG_MAX_H = 300;

async function renderImageLogCard({ title, accent = '#ef4444', avatarURL, rows = [], footerExtra, imageBuffer }) {
  const contentX = PAD + ACCENT_BAR_W + 16;
  const contentW = W - contentX - PAD;

  // Charger l'image supprimée
  let img = null;
  let imgW = 0, imgH = 0;
  try {
    img = await loadImage(imageBuffer);
    const scale = Math.min(IMG_MAX_W / img.width, IMG_MAX_H / img.height, 1);
    imgW = Math.round(img.width * scale);
    imgH = Math.round(img.height * scale);
  } catch {}

  // Header
  const HEADER_H = 100;
  const PILL_H = 30;
  const PILL_GAP = 6;
  const gridRows = Math.ceil(rows.length / 2);
  const gridH = rows.length ? gridRows * PILL_H + (gridRows - 1) * PILL_GAP : 0;
  const FOOTER_H = 38;
  const IMG_SECTION_H = img ? imgH + 40 : 0;

  const H = HEADER_H + (rows.length ? 28 + gridH : 0) + IMG_SECTION_H + FOOTER_H;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Fond
  ctx.fillStyle = '#08080f';
  ctx.fillRect(0, 0, W, H);
  roundRect(ctx, 0, 0, W, H, 16);
  ctx.fillStyle = '#0d0d20';
  ctx.fill();

  // Halo
  const AV_R = 44;
  const AV_CX = contentX + AV_R;
  const AV_CY = PAD + AV_R + 4;
  const glow = ctx.createRadialGradient(AV_CX, AV_CY, 10, AV_CX, AV_CY, W * 0.65);
  glow.addColorStop(0, accent + '2e');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  roundRect(ctx, 0, 0, W, H, 16);
  ctx.save(); ctx.clip();
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Barre d'accent
  roundRect(ctx, 0, 0, ACCENT_BAR_W, H, 0);
  ctx.fillStyle = accent;
  ctx.fill();

  // Avatar
  if (avatarURL) {
    try { await drawAvatar(ctx, avatarURL, AV_CX, AV_CY, AV_R - 4, accent); } catch {}
  }

  // Titre
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillStyle = '#f0f0fa';
  ctx.fillText(title, contentX + AV_R * 2 + 16, PAD + 30);

  // Sous-titre
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = accent;
  ctx.fillText('Image / GIF supprimé du serveur', contentX + AV_R * 2 + 16, PAD + 52);

  // Ligne or
  let y = HEADER_H;
  drawGoldLine(ctx, contentX, y - 8, contentW);

  // Grille infos
  if (rows.length) {
    y += 12;
    const pillW = (contentW - 10) / 2;
    for (let i = 0; i < rows.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const px = contentX + col * (pillW + 10);
      const py = y + row * (PILL_H + PILL_GAP);

      ctx.fillStyle = '#12122a';
      roundRect(ctx, px, py, pillW, PILL_H, 6);
      ctx.fill();
      ctx.strokeStyle = '#1e1e45';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = `bold 10px ${FONT}`;
      ctx.fillStyle = '#7a7a9a';
      ctx.fillText(sanitize(rows[i].label).toUpperCase(), px + 10, py + 13);

      ctx.font = `12px ${FONT}`;
      ctx.fillStyle = '#c9c9dc';
      ctx.fillText(truncate(ctx, rows[i].value, pillW - 20), px + 10, py + 25);
    }
    y += gridH + 20;
  }

  // Image supprimée
  if (img) {
    ctx.font = `bold 11px ${FONT}`;
    ctx.fillStyle = '#7a7a9a';
    ctx.fillText('CONTENU SUPPRIMÉ', contentX, y + 4);
    y += 18;

    // Fond sombre pour l'image
    const imgX = contentX;
    roundRect(ctx, imgX, y, imgW + 16, imgH + 16, 8);
    ctx.fillStyle = '#0a0a18';
    ctx.fill();
    ctx.strokeStyle = '#1e1e45';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Image avec coins arrondis
    ctx.save();
    roundRect(ctx, imgX + 8, y + 8, imgW, imgH, 4);
    ctx.clip();
    ctx.drawImage(img, imgX + 8, y + 8, imgW, imgH);
    ctx.restore();

    y += imgH + 24;
  }

  // Footer
  const footerY = H - FOOTER_H;
  drawGoldLine(ctx, contentX, footerY + 8, contentW);

  ctx.font = `bold 11px ${FONT}`;
  ctx.fillStyle = '#8a8aa8';
  ctx.fillText('Team Vortax © 2024-2026', contentX, footerY + FOOTER_H / 2 + 6);

  if (footerExtra) {
    const pillW = ctx.measureText(footerExtra).width + 20;
    const pillX = contentX + 180;
    const pillY = footerY + FOOTER_H / 2 - 4;
    roundRect(ctx, pillX, pillY, pillW, 18, 9);
    ctx.fillStyle = '#1a1a3a';
    ctx.fill();
    ctx.font = `bold 10px ${FONT}`;
    ctx.fillStyle = accent;
    ctx.fillText(footerExtra, pillX + 10, pillY + 13);
  }

  const dateStr = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = '#4a4a6a';
  ctx.textAlign = 'right';
  ctx.fillText(dateStr, W - PAD, footerY + FOOTER_H / 2 + 6);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}

module.exports = { renderImageLogCard };
