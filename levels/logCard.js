'use strict';
// Rendu générique "carte de log" (image canvas) pour remplacer les embeds
// classiques des salons de logs (modération, antiraid, automod, joinleave,
// messages, rôles, vocal, salons, tickets, panel...).
// Reprend l'esthétique des cartes de niveau (fond sombre, halo coloré,
// avatar à double anneau, ligne dégradée or) définie dans levels/canvas.js.
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
const W = 760;
const PAD = 26;
const ACCENT_BAR_W = 5;
const LABEL_W = 152;

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
  // Double anneau (halo + anneau plein), comme les cartes de niveau
  ctx.beginPath();
  ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
  ctx.strokeStyle = ringColor + '40';
  ctx.lineWidth = 2;
  ctx.stroke();

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

// Emojis, pictogrammes et autres symboles non couverts par Noto Sans :
// node-canvas les affiche comme des cases avec leur code hexadécimal,
// donc on les retire avant de dessiner.
const EMOJI_REGEX = /[\u{1F000}-\u{1FFFF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/gu;

function stripEmoji(text) {
  return String(text ?? '').replace(EMOJI_REGEX, '');
}

function sanitize(text) {
  if (text === undefined || text === null) return '???';
  const cleaned = stripEmoji(text).replace(/\s+/g, ' ').trim();
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
  const paragraphs = stripEmoji(text).trim().split('\n').map(p => p.replace(/[^\S\n]+/g, ' ').trim());
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
  const HEADER_H = 92;
  const ROW_H = 34;
  const FOOTER_H = 54;
  const LONGTEXT_LINE_H = 21;
  const LONGTEXT_MAX_LINES = 6;

  const contentX = PAD + ACCENT_BAR_W + 16;
  const contentW = W - contentX - PAD;

  // Pré-calcul du nombre de lignes du bloc longText (canvas temporaire pour mesurer)
  let longTextLines = [];
  let longTextH = 0;
  if (longText?.value) {
    const measureCanvas = createCanvas(W, 10);
    const mctx = measureCanvas.getContext('2d');
    mctx.font = `13px ${FONT}`;
    longTextLines = wrapText(mctx, longText.value, contentW - 32, LONGTEXT_MAX_LINES);
    longTextH = 18 + 24 + longTextLines.length * LONGTEXT_LINE_H + 18 + 14;
  }

  const rowsH = rows.length * ROW_H;
  const H = HEADER_H + rowsH + longTextH + FOOTER_H;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Fond
  ctx.fillStyle = '#08080f';
  ctx.fillRect(0, 0, W, H);
  roundRect(ctx, 0, 0, W, H, 16);
  ctx.fillStyle = '#0d0d20';
  ctx.fill();

  // Halo dégradé à la couleur d'accent (zone d'en-tête)
  const glow = ctx.createLinearGradient(0, 0, W, 0);
  glow.addColorStop(0, accent + '26');
  glow.addColorStop(0.55, accent + '08');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  roundRect(ctx, 0, 0, W, H, 16);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, HEADER_H + 30);
  ctx.restore();

  // Bordure
  roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 16);
  ctx.strokeStyle = accent + '33';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Barre d'accent verticale
  roundRect(ctx, 0, 0, ACCENT_BAR_W, H, ACCENT_BAR_W / 2);
  ctx.fillStyle = accent;
  ctx.fill();

  // ===== En-tête =====
  let titleX = contentX;
  const AV_R = 30;
  const AV_CY = PAD + AV_R + 2;
  if (avatarURL) {
    await drawAvatar(ctx, avatarURL, contentX + AV_R, AV_CY, AV_R, accent);
    titleX = contentX + AV_R * 2 + 22;
  }

  // Petite étiquette de marque, en haut à droite
  ctx.font = `bold 11px ${FONT}`;
  ctx.fillStyle = '#3a3a5a';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('VORTAX • LOGS', W - PAD, PAD - 2);
  ctx.textAlign = 'left';

  ctx.fillStyle = accent;
  ctx.font = `bold 23px ${FONT}`;
  ctx.textBaseline = 'middle';
  const titleMaxW = (W - PAD) - titleX;
  ctx.fillText(truncate(ctx, title, titleMaxW), titleX, AV_CY - 2);

  ctx.textBaseline = 'alphabetic';

  drawGoldLine(ctx, contentX, HEADER_H - 6, contentW);

  // ===== Lignes d'info (table zébrée) =====
  let y = HEADER_H;
  rows.forEach((row, i) => {
    if (i % 2 === 1) {
      roundRect(ctx, contentX - 10, y + 2, contentW + 10, ROW_H - 4, 8);
      ctx.fillStyle = '#ffffff06';
      ctx.fill();
    }

    const rowY = y + ROW_H / 2;

    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = '#7a7a9a';
    ctx.textBaseline = 'middle';
    ctx.fillText(truncate(ctx, sanitize(row.label), LABEL_W - 12), contentX, rowY);

    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = '#f0f0fa';
    const valueX = contentX + LABEL_W;
    ctx.fillText(truncate(ctx, row.value, contentW - LABEL_W), valueX, rowY);

    ctx.textBaseline = 'alphabetic';
    y += ROW_H;
  });

  // ===== Bloc de texte long =====
  if (longTextLines.length > 0) {
    const boxY = y + 8;
    const boxH = longTextH - 8;
    roundRect(ctx, contentX - 10, boxY, contentW + 10, boxH, 10);
    ctx.fillStyle = '#08080f';
    ctx.fill();
    roundRect(ctx, contentX - 10, boxY, contentW + 10, boxH, 10);
    ctx.strokeStyle = accent + '22';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = `bold 11px ${FONT}`;
    ctx.fillStyle = accent;
    ctx.textBaseline = 'middle';
    ctx.fillText(sanitize(longText.label).toUpperCase(), contentX + 6, boxY + 18);

    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = '#c9c9dc';
    let ly = boxY + 18 + 24;
    for (const line of longTextLines) {
      ctx.fillText(line, contentX + 6, ly);
      ly += LONGTEXT_LINE_H;
    }
    ctx.textBaseline = 'alphabetic';

    y = boxY + boxH;
  }

  // ===== Pied de page =====
  const footerY = H - FOOTER_H;
  drawGoldLine(ctx, contentX, footerY + 8, contentW);

  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = '#4a4a6a';
  ctx.textBaseline = 'middle';
  ctx.fillText('Team Vortax © 2024 - 2026', contentX, footerY + FOOTER_H / 2 + 6);

  if (footerExtra) {
    const label = sanitize(footerExtra);
    ctx.font = `bold 11px ${FONT}`;
    const pillW = ctx.measureText(label).width + 20;
    const pillX = contentX + ctx.measureText('Team Vortax © 2024 - 2026').width + 14;
    const pillY = footerY + FOOTER_H / 2 - 4;
    roundRect(ctx, pillX, pillY - 5, pillW, 18, 9);
    ctx.fillStyle = accent + '1f';
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillText(label, pillX + 10, pillY + 5);
  }

  const dateStr = new Date().toLocaleString('fr-FR');
  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = '#4a4a6a';
  ctx.textAlign = 'right';
  ctx.fillText(dateStr, W - PAD, footerY + FOOTER_H / 2 + 6);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

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
