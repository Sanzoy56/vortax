'use strict';

const { createCanvas, registerFont } = require('canvas');
const path = require('path');

try {
  registerFont(path.join(__dirname, '../assets/fonts/NotoSans-Regular.ttf'), { family: 'Noto Sans' });
  registerFont(path.join(__dirname, '../assets/fonts/NotoSans-Bold.ttf'), { family: 'Noto Sans', weight: 'bold' });
} catch {}

const FONT = "'Noto Sans', sans-serif";
const W = 280;
const BG = '#1e1f22';
const BG_DARK = '#17181b';
const CAT_COLOR = '#949ba4';
const TEXT_COLOR = '#8b8f95';
const TEXT_HOVER = '#dbdee1';
const VOICE_COLOR = '#949ba4';
const ACCENT = '#7c5cfc';

function renderTemplatePreview(formatted, templateLabel, styleLabel) {
  // Calculer la hauteur
  let totalItems = 0;
  for (const cat of formatted) {
    totalItems += 1 + cat.channels.length; // catégorie + salons
  }

  const HEADER_H = 56;
  const CAT_H = 32;
  const CHAN_H = 28;
  const PAD = 10;
  const FOOTER_H = 40;
  const H = HEADER_H + totalItems * CHAN_H + formatted.length * 8 + FOOTER_H + PAD * 2;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Fond
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Header serveur
  ctx.fillStyle = BG_DARK;
  ctx.fillRect(0, 0, W, HEADER_H);
  ctx.fillStyle = '#fff';
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillText(templateLabel, 16, 24);
  ctx.fillStyle = '#949ba4';
  ctx.font = `12px ${FONT}`;
  ctx.fillText(styleLabel, 16, 44);

  // Ligne séparatrice
  ctx.strokeStyle = '#0f0f10';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, HEADER_H);
  ctx.lineTo(W, HEADER_H);
  ctx.stroke();

  let y = HEADER_H + PAD;

  for (const cat of formatted) {
    // Catégorie
    ctx.fillStyle = CAT_COLOR;
    ctx.font = `bold 11px ${FONT}`;
    const catText = cat.catName.toUpperCase();

    // Flèche ▼
    ctx.fillText('▼  ' + catText, 12, y + 14);
    y += CAT_H;

    // Salons
    for (const ch of cat.channels) {
      const isVoice = ch.type === 2;

      // Hover effect sur un salon aléatoire
      const isHovered = Math.random() < 0.15;
      if (isHovered) {
        ctx.fillStyle = '#35373c';
        roundRect(ctx, 6, y, W - 12, CHAN_H - 2, 4);
        ctx.fill();
      }

      // Icône
      ctx.fillStyle = isHovered ? TEXT_HOVER : TEXT_COLOR;
      ctx.font = `14px ${FONT}`;
      const icon = isVoice ? '🔊' : '#';

      if (!isVoice) {
        ctx.font = `bold 16px ${FONT}`;
        ctx.fillStyle = isHovered ? TEXT_HOVER : '#6d6f78';
        ctx.fillText('#', 22, y + 18);
      }

      // Nom du salon
      ctx.font = `500 14px ${FONT}`;
      ctx.fillStyle = isHovered ? TEXT_HOVER : TEXT_COLOR;
      const nameX = isVoice ? 22 : 40;
      const displayName = isVoice ? '🔊 ' + ch.name : ch.name;
      ctx.fillText(truncate(ctx, displayName, W - nameX - 16), nameX, y + 18);

      y += CHAN_H;
    }

    y += 8; // gap entre catégories
  }

  // Footer
  ctx.fillStyle = BG_DARK;
  ctx.fillRect(0, H - FOOTER_H, W, FOOTER_H);
  ctx.fillStyle = ACCENT;
  ctx.font = `bold 10px ${FONT}`;
  ctx.fillText('VTX-BOT • Template Preview', 16, H - FOOTER_H / 2 + 4);

  return canvas.toBuffer('image/png');
}

function truncate(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  while (text.length > 0 && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1);
  return text + '…';
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

module.exports = { renderTemplatePreview };
