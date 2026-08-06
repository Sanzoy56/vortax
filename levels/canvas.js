const { createCanvas, loadImage, registerFont } = require('canvas');
const { expProgress, getRankForLevel, fmt } = require('./levels');
const path = require('path');

// Noto Sans TTF (node-canvas ne supporte pas les WOFF/WOFF2)
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
  console.warn('[Canvas] Polices non chargees:', e.message);
}

const FONT = "'Noto Sans', sans-serif";

// Palette de catégories — désaturée par rapport à l'ancienne version
// (moins "arcade", plus proche d'un thème sobre/pro)
const CAT_COLORS = {
  MSG: '#c9a86a',
  VOC: '#8b7ec8',
  SOC: '#c97b96',
  PRG: '#5b8ac4',
  EVT: '#6fae7f',
  SPE: '#c98a5b',
};

const CAT_LABELS = {
  MSG: 'MESSAGES',
  VOC: 'VOCAL',
  SOC: 'SOCIAL',
  PRG: 'PROGRESSION',
  EVT: 'ÉVÉNEMENT',
  SPE: 'SPÉCIALE',
};

// Palette par rôle de slot — c'est elle qui porte l'identité visuelle
// principale de la carte (bandeau, pastille), pour qu'on distingue direct
// quotidienne / hebdo / à choix sans lire le texte.
const ROLE_META = {
  daily:  { label: 'QUOTIDIENNE',  color: '#6f9bd6' },
  weekly: { label: 'HEBDOMADAIRE', color: '#9585c9' },
  choice: { label: 'À CHOISIR',    color: '#c9a24a' },
};

function statusColor(presence) {
  if (!presence) return '#5a5a7a';
  switch (presence.status) {
    case 'online':  return '#22c55e';
    case 'idle':    return '#faa81a';
    case 'dnd':     return '#ef4444';
    default:        return '#5a5a7a';
  }
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

function drawBackground(ctx, W, H) {
  ctx.fillStyle = '#08080f';
  ctx.fillRect(0, 0, W, H);
}

// ── Helpers couleurs (pour les nouvelles cartes dégradées) ────
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const bigint = parseInt(full, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}
function hexToRgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Fond dégradé "carte" utilisé par les nouvelles cartes niveau/rang/quête :
// coin haut-gauche sombre → coin bas-droit teinté de la couleur d'accent
function drawGradientCard(ctx, W, H, accent, radius = 28) {
  roundRect(ctx, 0, 0, W, H, radius);
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#0a0d18');
  grad.addColorStop(1, hexToRgba(accent, 0.32));
  ctx.fillStyle = grad;
  ctx.fill();

  roundRect(ctx, 0.75, 0.75, W - 1.5, H - 1.5, radius);
  ctx.strokeStyle = hexToRgba(accent, 0.45);
  ctx.lineWidth = 1.5;
  ctx.stroke();
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
    const img = await loadImage(avatarURL + '?size=256');
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  } catch {
    ctx.fillStyle = '#1e1e45';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.restore();
}

function drawBar(ctx, x, y, w, h, percent, color) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = '#16163a';
  ctx.fill();
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.strokeStyle = '#1e1e45';
  ctx.lineWidth = 1;
  ctx.stroke();
  const fillW = Math.max(h, w * Math.min(percent, 1));
  roundRect(ctx, x, y, fillW, h, h / 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawPill(ctx, x, y, text, color, filled = false) {
  ctx.font = 'bold 13px ' + FONT;
  const w = ctx.measureText(text).width + 28;
  const h = 30;
  roundRect(ctx, x - w, y, w, h, h / 2);
  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = '#08080f';
  } else {
    ctx.fillStyle = hexToRgba(color, 0.12);
    ctx.fill();
    roundRect(ctx, x - w, y, w, h, h / 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = color;
  }
  ctx.textAlign = 'center';
  ctx.fillText(text, x - w / 2, y + h / 2 + 4);
  ctx.textAlign = 'left';
  return h;
}

function sanitize(text) {
  if (!text) return '???';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned || '???';
}

function truncate(ctx, text, maxWidth) {
  if (!text) return '???';
  text = text.replace(/\s+/g, ' ').trim() || '???';
  if (ctx.measureText(text).width <= maxWidth) return text;
  const chars = [...text];
  let t = chars;
  while (t.length > 1 && ctx.measureText(t.join('') + '…').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t.join('') + '…';
}

// ════════════════════════════════════════════════════════════
// 1. PROFIL
// ════════════════════════════════════════════════════════════
async function generateProfile(member, userData) {
  const W = 900, H = 230;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  drawBackground(ctx, W, H);

  roundRect(ctx, 1, 1, W - 2, H - 2, 14);
  ctx.fillStyle = '#0e0e1c';
  ctx.fill();
  roundRect(ctx, 1, 1, W - 2, H - 2, 14);
  ctx.strokeStyle = '#1e1e45';
  ctx.lineWidth = 1;
  ctx.stroke();

  roundRect(ctx, 0, 0, 5, H, 4);
  ctx.fillStyle = '#7c5cfc';
  ctx.fill();

  const sColor    = statusColor(member.presence);
  const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
  const AV_R  = 60;
  const AV_CX = 30 + AV_R;
  const AV_CY = H / 2;
  await drawAvatar(ctx, avatarURL, AV_CX, AV_CY, AV_R, sColor);

  const { level, current, required } = expProgress(userData.exp);
  const badgeCX = AV_CX + AV_R * 0.72;
  const badgeCY = AV_CY + AV_R * 0.72;
  ctx.beginPath();
  ctx.arc(badgeCX, badgeCY, 16, 0, Math.PI * 2);
  ctx.fillStyle = '#08080f';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(badgeCX, badgeCY, 16, 0, Math.PI * 2);
  ctx.strokeStyle = '#f5c842';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f5c842';
  ctx.font = 'bold 12px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText(level, badgeCX, badgeCY + 4);
  ctx.textAlign = 'left';

  const TX = AV_CX + AV_R + 24;
  const TW = W - TX - 20;

  ctx.fillStyle = '#e8e8f5';
  ctx.font = 'bold 26px ' + FONT;
  ctx.fillText(truncate(ctx, member.user.username, TW * 0.6), TX, 42);

  ctx.fillStyle = '#5a5a7a';
  ctx.font = '13px ' + FONT;
  ctx.fillText('#' + member.user.discriminator || '', TX, 62);

  const rank = getRankForLevel(level);
  if (rank) {
    const rW = ctx.measureText(rank.name).width + 28;
    roundRect(ctx, TX, 70, rW, 22, 11);
    ctx.fillStyle = '#1e1045';
    ctx.fill();
    roundRect(ctx, TX, 70, rW, 22, 11);
    ctx.strokeStyle = '#7c5cfc';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#c4b5fd';
    ctx.font = 'bold 11px ' + FONT;
    ctx.fillText(rank.name, TX + 12, 85);
  }

  const xpPercent = current / required;
  ctx.fillStyle = '#f5c842';
  ctx.font = 'bold 12px ' + FONT;
  ctx.fillText('XP', TX, 112);
  ctx.fillStyle = '#5a5a7a';
  ctx.font = '12px ' + FONT;
  ctx.textAlign = 'right';
  ctx.fillText(fmt(current) + ' / ' + fmt(required), TX + TW, 112);
  ctx.textAlign = 'left';

  drawBar(ctx, TX, 117, TW, 10, xpPercent, '#f5c842');

  ctx.fillStyle = '#f5c842';
  ctx.font = 'bold 11px ' + FONT;
  ctx.fillText(Math.round(xpPercent * 100) + '%', TX, 143);

  drawGoldLine(ctx, TX, 150, TW);

  const stats = [
    { label: 'VTX-Coins',  value: fmt(userData.wallet || 0),           color: '#f5c842' },
    { label: 'Boost',      value: userData.boostActif ? 'Actif' : 'Aucun', color: userData.boostActif ? '#22c55e' : '#5a5a7a' },
    { label: 'Permanent',  value: userData.boostPermanent || 'Aucun',  color: '#a855f7' },
    { label: 'Rob',        value: (userData.rob?.lastUsed && Date.now() - userData.rob.lastUsed < 4 * 3600 * 1000) ? 'Cooldown' : 'Dispo',
      color: (userData.rob?.lastUsed && Date.now() - userData.rob.lastUsed < 4 * 3600 * 1000) ? '#ef4444' : '#22c55e' },
  ];

  const SW = Math.floor(TW / stats.length) - 5;
  stats.forEach((s, i) => {
    const sx = TX + i * (SW + 5);
    const sy = 158;

    roundRect(ctx, sx, sy, SW, 52, 8);
    ctx.fillStyle = '#12122a';
    ctx.fill();
    roundRect(ctx, sx, sy, SW, 52, 8);
    ctx.strokeStyle = '#1e1e45';
    ctx.lineWidth = 1;
    ctx.stroke();

    roundRect(ctx, sx, sy + 48, SW, 4, 4);
    ctx.fillStyle = s.color + '55';
    ctx.fill();

    ctx.fillStyle = '#5a5a7a';
    ctx.font = '10px ' + FONT;
    ctx.fillText(s.label, sx + 8, sy + 16);

    ctx.fillStyle = s.color;
    ctx.font = 'bold 13px ' + FONT;
    ctx.fillText(truncate(ctx, s.value, SW - 12), sx + 8, sy + 35);
  });

  return canvas.toBuffer('image/png');
}

// ════════════════════════════════════════════════════════════
// 2. QUETES — 3 slots fixes : daily (auto), weekly (auto), choice (choix)
// ════════════════════════════════════════════════════════════
async function generateQuests(member, slots) {
  const W        = 1400;
  const PAD      = 44;
  const HEADER_H = 150;
  const CARD_H   = 172;
  const GAP      = 20;
  const FOOT_H   = 40;

  const H = HEADER_H + slots.length * CARD_H + (slots.length - 1) * GAP + FOOT_H;

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  drawBackground(ctx, W, H);

  const displayName = member.displayName || member.user.username;
  ctx.fillStyle = '#e8e8f5';
  ctx.font = 'bold 20px ' + FONT;
  ctx.fillText(truncate(ctx, displayName, 500), PAD, 46);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8e8f5';
  ctx.font = 'bold 36px ' + FONT;
  ctx.fillText('QUÊTES', W / 2, 54);

  ctx.fillStyle = '#5a5a7a';
  ctx.font = '14px ' + FONT;
  ctx.fillText('Récompenses automatiques dès que le seuil est atteint.', W / 2, 80);
  ctx.textAlign = 'left';

  const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 128, forceStatic: true });
  await drawAvatar(ctx, avatarURL, W - PAD - 38, 56, 38, '#5a5a7a');

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const y = HEADER_H + i * (CARD_H + GAP);
    if (slot.status === 'choice') {
      drawChoiceCard(ctx, slot, PAD, y, W - PAD * 2, CARD_H);
    } else {
      drawActiveCard(ctx, slot.role, slot.quest, PAD, y, W - PAD * 2, CARD_H);
    }
  }

  ctx.fillStyle = '#35354d';
  ctx.font = '11px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText('Team Vortax', W / 2, H - 14);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}

function drawActiveCard(ctx, role, q, x, y, w, h) {
  const roleMeta = ROLE_META[role] || ROLE_META.choice;
  const catColor = CAT_COLORS[q.cat] || '#7a7a9a';

  roundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = q.completed ? '#0e1712' : '#0e0e1c';
  ctx.fill();
  roundRect(ctx, x, y, w, h, 14);
  ctx.strokeStyle = q.completed ? '#3d6b4a' : '#1e1e45';
  ctx.lineWidth = 1;
  ctx.stroke();

  roundRect(ctx, x, y + 14, 5, h - 28, 3);
  ctx.fillStyle = roleMeta.color;
  ctx.fill();

  const TX = x + 34;
  const TW = w - 34 - 260;

  ctx.fillStyle = catColor;
  ctx.font = 'bold 11px ' + FONT;
  ctx.fillText(CAT_LABELS[q.cat] || q.cat, TX, y + 30);

  ctx.fillStyle = '#e8e8f5';
  ctx.font = 'bold 22px ' + FONT;
  ctx.fillText(truncate(ctx, q.label, TW), TX, y + 60);

  ctx.fillStyle = '#6b6b8a';
  ctx.font = '13px ' + FONT;
  ctx.fillText(truncate(ctx, q.desc || '', TW), TX, y + 82);

  const barW = w - 34 - 20;
  drawBar(ctx, TX, y + 108, barW, 12, Math.min((q.progress || 0) / q.target, 1), q.completed ? '#3d8f57' : roleMeta.color);

  const pad2 = n => String(n).padStart(Math.max(2, String(q.target).length), '0');
  ctx.fillStyle = '#5a5a7a';
  ctx.font = 'bold 12px ' + FONT;
  ctx.textAlign = 'right';
  ctx.fillText(pad2(q.progress || 0) + ' / ' + pad2(q.target), x + barW + 34, y + 144);
  ctx.textAlign = 'left';

  drawPill(ctx, x + w - 24, y + 20, roleMeta.label, roleMeta.color);

  ctx.textAlign = 'right';
  const rewardParts = [];
  if (q.rewardExp)   rewardParts.push('+' + fmt(q.rewardExp) + ' XP');
  if (q.rewardCoins) rewardParts.push('+' + fmt(q.rewardCoins) + ' coins');
  ctx.fillStyle = '#c9a24a';
  ctx.font = 'bold 14px ' + FONT;
  ctx.fillText(rewardParts.join(' · '), x + w - 24, y + 72);
  ctx.textAlign = 'left';

  if (q.completed) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#3d8f57';
    ctx.font = 'bold 12px ' + FONT;
    ctx.fillText('✓ Terminée', x + w - 24, y + 92);
    ctx.textAlign = 'left';
  }
}

function drawChoiceCard(ctx, slot, x, y, w, h) {
  const color = ROLE_META.choice.color;

  roundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = '#14120c';
  ctx.fill();
  roundRect(ctx, x, y, w, h, 14);
  ctx.strokeStyle = '#4a3f22';
  ctx.lineWidth = 1;
  ctx.stroke();

  roundRect(ctx, x, y + 14, 5, h - 28, 3);
  ctx.fillStyle = color;
  ctx.fill();

  const TX = x + 34;
  const TW = w - 34 - 220;

  ctx.fillStyle = color;
  ctx.font = 'bold 11px ' + FONT;
  ctx.fillText('SÉLECTION', TX, y + 28);

  ctx.fillStyle = '#e8e8f5';
  ctx.font = 'bold 18px ' + FONT;
  ctx.fillText('Choisis ta prochaine quête', TX, y + 52);

  const lineH   = (h - 66) / slot.options.length;
  const descMaxW = TW - 210;

  slot.options.forEach((opt, i) => {
    const ly = y + 66 + i * lineH + lineH / 2;

    ctx.fillStyle = '#c9c9dd';
    ctx.font = 'bold 13px ' + FONT;
    ctx.fillText(truncate(ctx, `${i + 1}. ${opt.label}`, 180), TX, ly - 2);

    ctx.fillStyle = '#6b6b8a';
    ctx.font = '12px ' + FONT;
    ctx.fillText(truncate(ctx, opt.desc, descMaxW), TX + 190, ly - 2);

    const rewardParts = [];
    if (opt.rewardExp)   rewardParts.push('+' + fmt(opt.rewardExp) + ' XP');
    if (opt.rewardCoins) rewardParts.push('+' + fmt(opt.rewardCoins) + ' coins');
    ctx.fillStyle = '#c9a24a';
    ctx.font = 'bold 12px ' + FONT;
    ctx.textAlign = 'right';
    ctx.fillText(rewardParts.join(' · '), x + w - 24, ly - 2);
    ctx.textAlign = 'left';

    if (i < slot.options.length - 1) {
      ctx.strokeStyle = '#26221a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(TX, y + 66 + (i + 1) * lineH);
      ctx.lineTo(x + w - 24, y + 66 + (i + 1) * lineH);
      ctx.stroke();
    }
  });

  drawPill(ctx, x + w - 24, y + 20, 'À CHOISIR', color);
}

// ════════════════════════════════════════════════════════════
// 3. CLASSEMENT TOP 10
// ════════════════════════════════════════════════════════════
async function generateLeaderboard(entries, mode) {
  const W      = 1060;
  const HEAD_H = 100;
  const FOOT_H = 34;
  const ROW_H  = 86;
  const GAP    = 6;
  const ROWS   = 5;
  const COL_W  = 480;
  const PAD    = 18;
  const AV_R   = 26;
  const MID    = W / 2;

  const H = HEAD_H + ROWS * (ROW_H + GAP) - GAP + FOOT_H + 16;

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  drawBackground(ctx, W, H);

  ctx.fillStyle = '#f5c842';
  ctx.font = 'bold 28px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText(mode === 'exp' ? 'Classement EXP - Top 10' : 'Classement VTX-Coins - Top 10', MID, 44);
  ctx.fillStyle = '#5a5a7a';
  ctx.font = '13px ' + FONT;
  ctx.fillText(mode === 'exp' ? "Base sur l'experience totale" : 'Wallet + banque combines', MID, 65);
  ctx.textAlign = 'left';

  drawGoldLine(ctx, PAD, 82, W - PAD * 2);

  ctx.strokeStyle = '#2a2a50';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(MID, HEAD_H + 4);
  ctx.lineTo(MID, H - FOOT_H - 4);
  ctx.stroke();
  ctx.setLineDash([]);

  const medals    = ['1er', '2e', '3e'];
  const topColors = { 1: '#f5c842', 2: '#b0b8c8', 3: '#a0704a' };
  const topBg     = { 1: '#1a140a', 2: '#111118', 3: '#0f100a' };

  for (let i = 0; i < Math.min(entries.length, 10); i++) {
    const e      = entries[i];
    const pos    = i + 1;
    const isLeft = pos <= 5;
    const row    = isLeft ? pos - 1 : pos - 6;

    const x = isLeft ? PAD : MID + 10;
    const y = HEAD_H + row * (ROW_H + GAP);

    roundRect(ctx, x, y, COL_W, ROW_H, 9);
    ctx.fillStyle = topBg[pos] || '#0e0e1c';
    ctx.fill();
    roundRect(ctx, x, y, COL_W, ROW_H, 9);
    ctx.strokeStyle = topColors[pos] || '#1e1e45';
    ctx.lineWidth = pos <= 3 ? 1.5 : 1;
    ctx.stroke();

    const rankColor = topColors[pos] || '#5a5a7a';

    ctx.fillStyle = rankColor;
    ctx.font = 'bold 13px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('#' + pos, x + 20, y + ROW_H / 2 + 4);
    ctx.textAlign = 'left';

    if (pos <= 3) {
      ctx.fillStyle = rankColor;
      ctx.font = 'bold 11px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(medals[pos - 1], x + 20, y + ROW_H / 2 - 10);
      ctx.textAlign = 'left';
    }

    const avCX = x + 44 + AV_R;
    const avCY = y + ROW_H / 2;
    await drawAvatar(ctx, e.avatarURL, avCX, avCY, AV_R, topColors[pos] || '#1e1e45');

    const TX       = avCX + AV_R + 12;
    const nameMaxW = COL_W - (TX - x) - 12;

    ctx.fillStyle = '#e8e8f5';
    ctx.font = 'bold 15px ' + FONT;
    ctx.fillText(truncate(ctx, e.username, nameMaxW), TX, y + 22);

    ctx.fillStyle = '#5a5a7a';
    ctx.font = '11px ' + FONT;
    ctx.fillText('Rang : ' + sanitize(e.rank ?? 'Aucun'), TX, y + 39);
    ctx.fillText('Level : ' + e.level, TX, y + 54);

    if (mode === 'exp') {
      ctx.fillStyle = '#f5c842';
      ctx.font = '11px ' + FONT;
      ctx.fillText('XP : ' + fmt(e.exp), TX, y + 69);
    } else {
      ctx.fillStyle = '#f5c842';
      ctx.font = '11px ' + FONT;
      ctx.fillText('Coins : ' + fmt(e.coins), TX, y + 69);
    }
  }

  ctx.fillStyle = '#35354d';
  ctx.font = '11px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText('Team Vortax  -  2024-2026', MID, H - 10);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}

// ════════════════════════════════════════════════════════════
// 3b. FIN DE SAISON
// ════════════════════════════════════════════════════════════
async function generateSeasonEndCard(topExp, topCoins, seasonNumber) {
  const W      = 1060;
  const HEAD_H = 120;
  const FOOT_H = 34;
  const ROW_H  = 86;
  const GAP    = 6;
  const ROWS   = 5;
  const COL_W  = 480;
  const PAD    = 18;
  const AV_R   = 26;
  const MID    = W / 2;

  const H = HEAD_H + ROWS * (ROW_H + GAP) - GAP + FOOT_H + 16;

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  drawBackground(ctx, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5c842';
  ctx.font = 'bold 30px ' + FONT;
  ctx.fillText(`🏁 Fin de la Saison #${seasonNumber}`, MID, 42);

  ctx.fillStyle = '#9a9ac0';
  ctx.font = '14px ' + FONT;
  ctx.fillText(`Felicitations aux meilleurs joueurs ! La Saison #${seasonNumber + 1} commence maintenant.`, MID, 68);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 14px ' + FONT;
  ctx.fillText('⭐ Top EXP', PAD + COL_W / 2, 102);
  ctx.fillText('💰 Top Coins', MID + 10 + COL_W / 2, 102);
  ctx.textAlign = 'left';

  drawGoldLine(ctx, PAD, 110, W - PAD * 2);

  ctx.strokeStyle = '#2a2a50';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(MID, HEAD_H + 4);
  ctx.lineTo(MID, H - FOOT_H - 4);
  ctx.stroke();
  ctx.setLineDash([]);

  const medals    = ['1er', '2e', '3e'];
  const topColors = { 1: '#f5c842', 2: '#b0b8c8', 3: '#a0704a' };
  const topBg     = { 1: '#1a140a', 2: '#111118', 3: '#0f100a' };

  async function drawColumn(entries, x, valueLabel) {
    if (!entries.length) {
      ctx.fillStyle = '#5a5a7a';
      ctx.font = '14px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('Aucune donnée', x + COL_W / 2, HEAD_H + 40);
      ctx.textAlign = 'left';
      return;
    }
    for (let i = 0; i < Math.min(entries.length, ROWS); i++) {
      const e   = entries[i];
      const pos = i + 1;
      const y   = HEAD_H + i * (ROW_H + GAP);

      roundRect(ctx, x, y, COL_W, ROW_H, 9);
      ctx.fillStyle = topBg[pos] || '#0e0e1c';
      ctx.fill();
      roundRect(ctx, x, y, COL_W, ROW_H, 9);
      ctx.strokeStyle = topColors[pos] || '#1e1e45';
      ctx.lineWidth = pos <= 3 ? 1.5 : 1;
      ctx.stroke();

      const rankColor = topColors[pos] || '#5a5a7a';

      ctx.fillStyle = rankColor;
      ctx.font = 'bold 13px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('#' + pos, x + 20, y + ROW_H / 2 + 4);
      ctx.textAlign = 'left';

      if (pos <= 3) {
        ctx.fillStyle = rankColor;
        ctx.font = 'bold 11px ' + FONT;
        ctx.textAlign = 'center';
        ctx.fillText(medals[pos - 1], x + 20, y + ROW_H / 2 - 10);
        ctx.textAlign = 'left';
      }

      const avCX = x + 44 + AV_R;
      const avCY = y + ROW_H / 2;
      await drawAvatar(ctx, e.avatarURL, avCX, avCY, AV_R, topColors[pos] || '#1e1e45');

      const TX       = avCX + AV_R + 12;
      const nameMaxW = COL_W - (TX - x) - 12;

      ctx.fillStyle = '#e8e8f5';
      ctx.font = 'bold 15px ' + FONT;
      ctx.fillText(truncate(ctx, e.username, nameMaxW), TX, y + 22);

      ctx.fillStyle = '#5a5a7a';
      ctx.font = '11px ' + FONT;
      ctx.fillText('Rang : ' + sanitize(String(e.rank ?? '—')), TX, y + 39);
      ctx.fillText('Niveau : ' + e.level, TX, y + 54);

      ctx.fillStyle = '#f5c842';
      ctx.font = '11px ' + FONT;
      ctx.fillText(valueLabel(e), TX, y + 69);
    }
  }

  await drawColumn(topExp,   PAD,      e => 'XP : ' + fmt(e.exp));
  await drawColumn(topCoins, MID + 10, e => 'Coins : ' + fmt(e.coins));

  ctx.fillStyle = '#35354d';
  ctx.font = '11px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText('Team Vortax  -  2024-2026', MID, H - 10);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}

// ════════════════════════════════════════════════════════════
// 4. BAL
// ════════════════════════════════════════════════════════════
async function generateBal(member, userData) {
  const W = 600, H = 200;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  drawBackground(ctx, W, H);

  roundRect(ctx, 1, 1, W - 2, H - 2, 14);
  ctx.fillStyle = '#0e0e1c';
  ctx.fill();
  roundRect(ctx, 1, 1, W - 2, H - 2, 14);
  ctx.strokeStyle = '#1e1e45';
  ctx.lineWidth = 1;
  ctx.stroke();

  roundRect(ctx, 0, 0, 5, H, 4);
  ctx.fillStyle = '#7c5cfc';
  ctx.fill();

  // Avatar
  const AV_R     = 44;
  const AV_CX    = 22 + AV_R;
  const AV_CY    = H / 2;
  const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
  await drawAvatar(ctx, avatarURL, AV_CX, AV_CY, AV_R, '#7c5cfc');

  // Pseudo + sous-titre
  const TX = AV_CX + AV_R + 20;
  const TW = W - TX - 18;

  ctx.fillStyle = '#e8e8f5';
  ctx.font = 'bold 20px ' + FONT;
  ctx.fillText(truncate(ctx, member.user.username, TW), TX, 38);

  ctx.fillStyle = '#5a5a7a';
  ctx.font = '12px ' + FONT;
  ctx.fillText('Solde du portefeuille', TX, 56);

  drawGoldLine(ctx, TX, 66, TW);

  // 3 métriques
  const wallet = userData.wallet || 0;
  const bank   = userData.bank   || 0;
  const total  = wallet + bank;

  const metrics = [
    { label: 'Portefeuille', value: fmt(wallet), color: '#f5c842' },
    { label: 'Banque',       value: fmt(bank),   color: '#a855f7' },
    { label: 'Total',        value: fmt(total),  color: '#7c5cfc' },
  ];

  const CARD_W = Math.floor(TW / 3) - 5;
  metrics.forEach((m, i) => {
    const cx = TX + i * (CARD_W + 5);
    const cy = 74;

    roundRect(ctx, cx, cy, CARD_W, 106, 8);
    ctx.fillStyle = '#12122a';
    ctx.fill();
    roundRect(ctx, cx, cy, CARD_W, 106, 8);
    ctx.strokeStyle = '#1e1e45';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Barre colorée en bas
    roundRect(ctx, cx, cy + 102, CARD_W, 4, 4);
    ctx.fillStyle = m.color + '55';
    ctx.fill();

    ctx.fillStyle = '#5a5a7a';
    ctx.font = '10px ' + FONT;
    ctx.fillText(m.label, cx + 8, cy + 20);

    ctx.fillStyle = m.color;
    ctx.font = 'bold 16px ' + FONT;
    ctx.fillText(truncate(ctx, m.value, CARD_W - 12), cx + 8, cy + 50);

    ctx.fillStyle = '#35354d';
    ctx.font = '10px ' + FONT;
    ctx.fillText('VTX-Coins', cx + 8, cy + 70);
  });

  return canvas.toBuffer('image/png');
}

// ════════════════════════════════════════════════════════════
// 5. LEVEL-UP CARD
// ════════════════════════════════════════════════════════════
async function generateLevelUpCard(member, oldLevel, newLevel, userData, progressOverride = null) {
  const W = 1000, H = 320;
  const accent = '#7c5cfc';

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  drawGradientCard(ctx, W, H, accent);

  const sColor    = statusColor(member.presence);
  const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
  const AV_R = 75, AV_CX = 60 + AV_R, AV_CY = H / 2;
  await drawAvatar(ctx, avatarURL, AV_CX, AV_CY, AV_R, accent);

  const TX = AV_CX + AV_R + 55;
  const TW = W - TX - 60;

  ctx.fillStyle = '#f5f6fb';
  ctx.font = 'bold 46px ' + FONT;
  ctx.fillText('Niveau ' + newLevel, TX, 118);

  ctx.fillStyle = '#a7b0d1';
  ctx.font = '24px ' + FONT;
  ctx.fillText('Progression vers le niveau ' + (newLevel + 1), TX, 158);

  const { current, required } = progressOverride || expProgress(userData.exp);
  const xpPct = current / required;

  ctx.fillStyle = '#8b93b8';
  ctx.font = '17px ' + FONT;
  ctx.fillText(fmt(current) + ' / ' + fmt(required) + ' XP  ·  ' + Math.round(xpPct * 1000) / 10 + '%', TX, 192);

  drawBar(ctx, TX, 210, TW, 12, xpPct, accent);

  ctx.fillStyle = '#565f80';
  ctx.font = '14px ' + FONT;
  ctx.fillText('Carte palier niveau — Team Vortax', TX, 252);

  return canvas.toBuffer('image/png');
}

// ════════════════════════════════════════════════════════════
// 6. RANK-UP CARD
// ════════════════════════════════════════════════════════════
const RANK_COLORS = {
  'Plastique':     '#fdc6c6',
  'Plastique 1':   '#ffffff',
  'Plastique 2':   '#ffe3e3',
  'Plastique 3':   '#e2a9b2',
  'Carton':        '#ad7f3a',
  'Carton 1':      '#faca83',
  'Carton 2':      '#e6b162',
  'Carton 3':      '#884b22',
  'Bronze':        '#ff8a0c',
  'Bronze 1':      '#e67e22',
  'Bronze 2':      '#9c7104',
  'Bronze 3':      '#a57316',
  'Fer':           '#aabec9',
  'Fer 1':         '#607d8b',
  'Fer 2':         '#7b858a',
  'Fer 3':         '#545b5f',
  'Or':            '#e8ff00',
  'Or 1':          '#fdf500',
  'Or 2':          '#e7b900',
  'Or 3':          '#f1a500',
  'Diamant':       '#68addb',
  'Diamant 1':     '#00bfff',
  'Diamant 2':     '#1911fd',
  'Diamant 3':     '#8708ee',
  'Émeraude':      '#14af55',
  'Émeraude 1':    '#009940',
  'Émeraude 2':    '#1a9e51',
  'Émeraude 3':    '#087e39',
  'Rubis':         '#cf2729',
  'Rubis 1':       '#d46565',
  'Rubis 2':       '#e06e6e',
  'Rubis 3':       '#e00c0c',
  'Légendaire':    '#a9ff00',
  'Légendaire 1':  '#99dd23',
  'Légendaire 2':  '#7aff02',
  'Légendaire 3':  '#ff0000',
  'Mythique':      '#f32727',
  'Mythique 1':    '#a00000',
  'Mythique 2':    '#00b8fd',
  'Mythique 3':    '#a768ff',
  'GOAT':          '#3c40ff',
};

function rankAccentColor(rankName) {
  return RANK_COLORS[rankName] || '#7c5cfc';
}

async function generateRankUpCard(member, newRank, nextRank, currentLevel, userData) {
  const W = 1000, H = 320;
  const accent = rankAccentColor(newRank.name);

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  drawGradientCard(ctx, W, H, accent);

  const sColor    = statusColor(member.presence);
  const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
  const AV_R = 75, AV_CX = 60 + AV_R, AV_CY = H / 2;
  await drawAvatar(ctx, avatarURL, AV_CX, AV_CY, AV_R, accent);

  const TX = AV_CX + AV_R + 55;
  const TW = W - TX - 60;

  ctx.fillStyle = '#f5f6fb';
  ctx.font = 'bold 46px ' + FONT;
  ctx.fillText('Rang ' + truncate(ctx, newRank.name, TW), TX, 118);

  if (nextRank) {
    const totalLevels = nextRank.level - newRank.level;
    const doneLevels  = Math.max(0, currentLevel - newRank.level);
    const pct          = totalLevels > 0 ? Math.min(doneLevels / totalLevels, 1) : 1;

    ctx.fillStyle = '#a7b0d1';
    ctx.font = '20px ' + FONT;
    ctx.fillText('Niveau ' + currentLevel + '  ·  prochain : ' + nextRank.name + ' (niveau ' + nextRank.level + ')', TX, 160);

    drawBar(ctx, TX, 195, TW, 12, pct, accent);

    ctx.fillStyle = '#565f80';
    ctx.font = '14px ' + FONT;
    ctx.fillText('Progression vers le prochain palier de rang — ' + Math.round(pct * 1000) / 10 + '%', TX, 237);
  } else {
    ctx.fillStyle = accent;
    ctx.font = 'bold 20px ' + FONT;
    ctx.fillText('🏆 Rang maximum atteint !', TX, 165);

    ctx.fillStyle = '#565f80';
    ctx.font = '14px ' + FONT;
    ctx.fillText('Team Vortax', TX, 237);
  }

  return canvas.toBuffer('image/png');
}

// ════════════════════════════════════════════════════════════
// 7. QUÊTE TERMINÉE — style dégradé, cohérent avec level-up/rank-up
// ════════════════════════════════════════════════════════════
async function generateQuestCompleteCard(member, quest) {
  const W = 1000, H = 320;
  const accent = CAT_COLORS[quest.cat] || '#7c5cfc';

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  drawGradientCard(ctx, W, H, accent);

  const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
  const AV_R = 75, AV_CX = 60 + AV_R, AV_CY = H / 2;
  await drawAvatar(ctx, avatarURL, AV_CX, AV_CY, AV_R, accent);

  const TX = AV_CX + AV_R + 55;
  const TW = W - TX - 60;

  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 20px ' + FONT;
  ctx.fillText('QUÊTE TERMINÉE', TX, 70);

  ctx.fillStyle = '#f5f6fb';
  ctx.font = 'bold 40px ' + FONT;
  ctx.fillText(truncate(ctx, quest.label, TW), TX, 122);

  ctx.fillStyle = '#a7b0d1';
  ctx.font = '20px ' + FONT;
  ctx.fillText(truncate(ctx, quest.desc || '', TW), TX, 156);

  drawGoldLine(ctx, TX, 180, TW);

  const rewardParts = [];
  if (quest.rewardExp)   rewardParts.push('+' + fmt(quest.rewardExp) + ' XP');
  if (quest.rewardCoins) rewardParts.push('+' + fmt(quest.rewardCoins) + ' VTX-Coins');
  ctx.fillStyle = '#f5c842';
  ctx.font = 'bold 26px ' + FONT;
  ctx.fillText(rewardParts.join('   ·   '), TX, 218);

  ctx.fillStyle = '#565f80';
  ctx.font = '14px ' + FONT;
  ctx.fillText('Carte quête — Team Vortax', TX, 252);

  return canvas.toBuffer('image/png');
}

module.exports = {
  generateProfile, generateQuests, generateLeaderboard, generateBal,
  generateLevelUpCard, generateRankUpCard, generateQuestCompleteCard,
  generateSeasonEndCard,
  statusColor,
};