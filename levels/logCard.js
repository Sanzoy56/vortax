'use strict';
// Rendu générique "carte de log" (image canvas) pour remplacer les embeds
// classiques des salons de logs (modération, antiraid, vocal, rôles, etc.).
// Reprend l'esthétique des cartes de niveau (fond sombre, ligne dégradée or,
// avatar circulaire) définie dans levels/canvas.js.
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');

try {
  registerFont(
    path.join(__dirname, '../assets/fonts/NotoSans-Regular.ttf'),
    { family: 'Noto Sans' }
  );
  registerFont(
    path.join(__dirname, '../assets/fonts/NotoSans-Bold.ttf'),
    { family: 'Noto Sans', weight: 'bold' }
  );
} catch (e) {
  console.warn('[LogCard] Polices non chargees:', e.message);
}

const FONT = "'Noto Sans', sans-serif";
const W = 720;
const PAD = 24;
const ACCENT_W = 6;

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

function drawGoldLine(ctx, x, y, w) {
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, 'rgba(245,200,66,0)');
  grad.addColorStop(0.2, '#f5c842');
  grad.addColorStop(0.8, '#f5c842');
  grad.addColorStop(1, 'rgba(245,200,66,0)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
}

async function drawAvatar(ctx, avatarURL, cx, cy, r, ringColor) {
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  try {
    const img = await loadImage(avatarURL + (avatarURL.includes('?') ? '' : '?size=128'));
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  } catch {
    ctx.fillStyle = '#1e1e45';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.restore();
}

function sanitize(text) {
  if (text === undefined || text === null) return '???';
  const cleaned = String(text).replace(/\s+/g, ' ').trim();
  return cleaned || '???';
}

function truncate(ctx, text, maxWidth) {
  text = sanitize(text);
  if (ctx.measureText(text).width <= maxWidth) return text;
  const chars = [...text];
  let t = chars;
  while (t.length > 1 && ctx.measureText(t.join('') + '…').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t.join('') + '…';
}

// Découpe `text` en lignes tenant dans `maxWidth`, en respectant les retours
// à la ligne déjà présents. Limite à `maxLines` (avec "…" sur la dernière).
function wrapText(ctx, text, maxWidth, maxLines) {
  const lines = [];
  const paragraphs = sanitize(text).split('\n');
  for (const para of paragraphs) {
    const words = para.split(' ');
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
      if (lines.length >= maxLines) break;
    }
    if (lines.length >= maxLines) break;
    lines.push(current);
  }
  if (lines.length > maxLines) {
    lines.length = maxLines;
  }
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (ctx.measureText(last).width > maxWidth || paragraphs.join(' ').length > lines.join(' ').length) {
      lines[maxLines - 1] = truncate(ctx, last + '…', maxWidth);
    }
  }
  return lines;
}

/**
 * Génère une carte de log au format PNG.
 *
 * @param {object} opts
 * @param {string} opts.title - Titre (sans emoji), ex: "Membre banni"
 * @param {string} opts.accent - Couleur d'accent hex, ex: "#ef4444"
 * @param {string} [opts.avatarURL] - Avatar à afficher en haut à gauche
 * @param {{label:string, value:string}[]} [opts.rows] - Lignes "Label : valeur"
 * @param {{label:string, value:string}} [opts.longText] - Bloc de texte long (wrap)
 * @param {string} [opts.footerExtra] - Texte additionnel dans le pied (ex: ID)
 * @returns {Promise<Buffer>}
 */
async function renderLogCard({ title, accent = '#6b7280', avatarURL, rows = [], longText, footerExtra }) {
  const HEADER_H = 90;
  const ROW_H = 32;
  const FOOTER_H = 50;
  const LONGTEXT_LINE_H = 22;
  const LONGTEXT_MAX_LINES = 6;

  // Pré-calcul du nombre de lignes du bloc longText (canvas temporaire pour mesurer)
  let longTextLines = [];
  let longTextH = 0;
  if (longText?.value) {
    const measureCanvas = createCanvas(W, 10);
    const mctx = measureCanvas.getContext('2d');
    mctx.font = `14px ${FONT}`;
    longTextLines = wrapText(mctx, longText.value, W - PAD * 2 - ACCENT_W - 16, LONGTEXT_MAX_LINES);
    longTextH = 28 + longTextLines.length * LONGTEXT_LINE_H + 12;
  }

  const H = HEADER_H + rows.length * ROW_H + longTextH + FOOTER_H + PAD;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Fond
  ctx.fillStyle = '#08080f';
  ctx.fillRect(0, 0, W, H);
  roundRect(ctx, 0, 0, W, H, 14);
  ctx.fillStyle = '#0e0e1c';
  ctx.fill();
  roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 14);
  ctx.strokeStyle = '#1e1e45';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Barre d'accent
  roundRect(ctx, 0, 0, ACCENT_W + 8, H, 14);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, ACCENT_W, H);
  ctx.restore();

  const contentX = PAD + ACCENT_W;

  // En-tête
  let titleX = contentX;
  if (avatarURL) {
    await drawAvatar(ctx, avatarURL, contentX + 28, PAD + 28, 28, accent);
    titleX = contentX + 70;
  }
  ctx.fillStyle = '#e8e8f5';
  ctx.font = `bold 22px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(truncate(ctx, title, W - titleX - PAD), titleX, PAD + 28);

  drawGoldLine(ctx, contentX, HEADER_H - 8, W - contentX - PAD);

  // Lignes d'info
  let y = HEADER_H + ROW_H / 2;
  for (const row of rows) {
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = '#8a8aa8';
    ctx.fillText(sanitize(row.label), contentX, y);
    const labelW = ctx.measureText(sanitize(row.label)).width;

    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = '#e8e8f5';
    const valueX = contentX + labelW + 10;
    ctx.fillText(truncate(ctx, row.value, W - valueX - PAD), valueX, y);

    y += ROW_H;
  }

  // Bloc de texte long
  if (longTextLines.length > 0) {
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = '#8a8aa8';
    ctx.fillText(sanitize(longText.label), contentX, y);
    y += 22;

    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = '#c9c9dc';
    for (const line of longTextLines) {
      ctx.fillText(line, contentX, y);
      y += LONGTEXT_LINE_H;
    }
    y += 12;
  }

  // Pied de page
  drawGoldLine(ctx, contentX, H - FOOTER_H + 6, W - contentX - PAD);
  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = '#5a5a7a';
  const footerLeft = footerExtra ? `Team Vortax © 2024 - 2026  •  ${sanitize(footerExtra)}` : 'Team Vortax © 2024 - 2026';
  ctx.fillText(footerLeft, contentX, H - FOOTER_H / 2 + 6);

  const dateStr = new Date().toLocaleString('fr-FR');
  ctx.textAlign = 'right';
  ctx.fillText(dateStr, W - PAD, H - FOOTER_H / 2 + 6);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}

/**
 * Génère la carte et l'envoie dans le salon donné.
 * @param {import('discord.js').TextBasedChannel} channel
 * @param {Parameters<typeof renderLogCard>[0]} opts
 */
async function sendLogCard(channel, opts) {
  if (!channel) return;
  const buffer = await renderLogCard(opts);
  const attachment = new AttachmentBuilder(buffer, { name: 'log.png' });
  const payload = { files: [attachment] };
  if (opts.components) payload.components = opts.components;
  return channel.send(payload);
}

module.exports = { renderLogCard, sendLogCard };
