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

const CAT_COLORS = {
  MSG: '#f5c842',
  VOC: '#a855f7',
  SOC: '#ec4899',
  PRG: '#3b82f6',
  EVT: '#22c55e',
  SPE: '#f97316',
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

  const rank = getRankForLevel(userData.level ?? level);
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
    { label: 'Streak',     value: (userData.streak || 0) + 'j',        color: '#f97316' },
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
// 2. QUETES
// ════════════════════════════════════════════════════════════
async function generateQuests(member, quests) {
  const COLS   = 2;
  const ROWS   = Math.ceil(quests.length / COLS);
  const CARD_W = 600;
  const CARD_H = 100;
  const GAP    = 7;
  const PAD    = 20;
  const HEAD_H = 116;
  const FOOT_H = 34;

  const W = CARD_W * COLS + GAP + PAD * 2;
  const H = HEAD_H + ROWS * (CARD_H + GAP) + FOOT_H;

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  drawBackground(ctx, W, H);

  try {
    const img = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 128, forceStatic: true }));
    ctx.save();
    ctx.beginPath();
    ctx.arc(PAD + 36, 54, 36, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, PAD, 18, 72, 72);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(PAD + 36, 54, 38, 0, Math.PI * 2);
    ctx.strokeStyle = '#f5c842';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  } catch {}

  const completed = quests.filter(q => q.completed).length;
  const globalPct = completed / quests.length;
  const allDone   = completed === quests.length;

  ctx.fillStyle = '#e8e8f5';
  ctx.font = 'bold 22px ' + FONT;
  ctx.fillText(truncate(ctx, '@' + member.user.username, 500), PAD + 88, 40);

  ctx.fillStyle = '#5a5a7a';
  ctx.font = '13px ' + FONT;
  ctx.fillText('Quetes du jour  -  reset a minuit', PAD + 88, 58);

  drawBar(ctx, PAD + 88, 66, W - PAD * 2 - 88, 11, globalPct, allDone ? '#22c55e' : '#7c5cfc');
  ctx.fillStyle = allDone ? '#22c55e' : '#f5c842';
  ctx.font = 'bold 11px ' + FONT;
  ctx.textAlign = 'right';
  ctx.fillText(completed + '/' + quests.length, W - PAD, 78);
  ctx.textAlign = 'left';

  drawGoldLine(ctx, PAD, 94, W - PAD * 2);

  for (let i = 0; i < quests.length; i++) {
    const q     = quests[i];
    const col   = i % COLS;
    const row   = Math.floor(i / COLS);
    const x     = PAD + col * (CARD_W + GAP);
    const y     = HEAD_H + row * (CARD_H + GAP);
    const color = CAT_COLORS[q.cat] || '#7c5cfc';
    const prog  = Math.min((q.progress || 0) / q.target, 1);

    roundRect(ctx, x, y, CARD_W, CARD_H, 9);
    ctx.fillStyle = q.completed ? '#0a1a0e' : '#0e0e1c';
    ctx.fill();
    roundRect(ctx, x, y, CARD_W, CARD_H, 9);
    ctx.strokeStyle = q.completed ? '#22c55e44' : '#1e1e45';
    ctx.lineWidth = 1;
    ctx.stroke();

    roundRect(ctx, x, y + 10, 4, CARD_H - 20, 2);
    ctx.fillStyle = color;
    ctx.fill();

    const catW = ctx.measureText(q.cat).width + 16;
    roundRect(ctx, x + 12, y + 10, catW, 17, 8);
    ctx.fillStyle = color + '25';
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = 'bold 10px ' + FONT;
    ctx.fillText(q.cat, x + 20, y + 22);

    ctx.fillStyle = q.completed ? '#22c55e' : '#e8e8f5';
    ctx.font = 'bold 15px ' + FONT;
    ctx.fillText(truncate(ctx, q.label + (q.completed ? '  ✓' : ''), CARD_W - 200), x + 12, y + 44);

    ctx.fillStyle = '#5a5a7a';
    ctx.font = '11px ' + FONT;
    ctx.fillText(truncate(ctx, q.desc || '', CARD_W - 200), x + 12, y + 61);

    drawBar(ctx, x + 12, y + 68, CARD_W - 190, 7, prog, q.completed ? '#22c55e' : color);

    ctx.fillStyle = '#5a5a7a';
    ctx.font = '11px ' + FONT;
    ctx.fillText((q.progress || 0) + '/' + q.target, x + 12, y + 90);

    ctx.textAlign = 'right';
    if (q.rewardExp) {
      ctx.fillStyle = '#f5c842';
      ctx.font = 'bold 14px ' + FONT;
      ctx.fillText('+' + fmt(q.rewardExp) + ' XP', x + CARD_W - 12, y + 34);
    }
    if (q.rewardCoins) {
      ctx.fillStyle = '#a855f7';
      ctx.font = '12px ' + FONT;
      ctx.fillText('+' + fmt(q.rewardCoins) + ' coins', x + CARD_W - 12, y + 52);
    }
    ctx.textAlign = 'left';
  }

  ctx.fillStyle = '#35354d';
  ctx.font = '11px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText('Team Vortax  -  2024-2026', W / 2, H - 10);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
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

module.exports = { generateProfile, generateQuests, generateLeaderboard, generateBal, statusColor };