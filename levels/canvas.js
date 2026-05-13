const { createCanvas, loadImage } = require('canvas');
const { expProgress, getRankForLevel, fmt } = require('./levels');

// ─── Couleur de statut Discord ───────────────────────────────
function statusColor(presence) {
  if (!presence) return '#747f8d';
  switch (presence.status) {
    case 'online':    return '#3ba55d';
    case 'idle':      return '#faa81a';
    case 'dnd':       return '#ed4245';
    default:          return '#747f8d';
  }
}

// ─── Dessin d'un rectangle arrondi ──────────────────────────
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

// ─── Avatar circulaire avec contour statut ───────────────────
async function drawAvatar(ctx, avatarURL, x, y, size, borderColor) {
  const radius = size / 2;
  const cx     = x + radius;
  const cy     = y + radius;

  // Contour statut
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
  ctx.fillStyle = borderColor;
  ctx.fill();

  // Clip circulaire
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  try {
    const img = await loadImage(avatarURL + '?size=256');
    ctx.drawImage(img, x, y, size, size);
  } catch {
    ctx.fillStyle = '#2c2f33';
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();
}

// ─── Barre de progression ────────────────────────────────────
function drawProgressBar(ctx, x, y, w, h, percent, colorFill = '#7c5cfc', colorBg = '#1e1e3a') {
  // Fond
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = colorBg;
  ctx.fill();

  // Remplissage
  const fillW = Math.max(h, w * Math.min(percent, 1));
  roundRect(ctx, x, y, fillW, h, h / 2);
  const grad = ctx.createLinearGradient(x, 0, x + fillW, 0);
  grad.addColorStop(0, colorFill);
  grad.addColorStop(1, '#a78bfa');
  ctx.fillStyle = grad;
  ctx.fill();
}

// ════════════════════════════════════════════════════════════
// 1. IMAGE PROFIL
// ════════════════════════════════════════════════════════════
async function generateProfile(member, userData) {
  const W = 800, H = 280;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // Fond
  ctx.fillStyle = '#0d0d1a';
  roundRect(ctx, 0, 0, W, H, 20);
  ctx.fill();

  // Accent bar gauche
  ctx.fillStyle = '#7c5cfc';
  ctx.fillRect(0, 0, 4, H);

  // Avatar
  const sColor = statusColor(member.presence);
  await drawAvatar(ctx, member.user.displayAvatarURL({ format: 'png' }), 30, 30, 120, sColor);

  // Nom
  ctx.fillStyle = '#e8e8f0';
  ctx.font      = 'bold 26px Rajdhani, sans-serif';
  ctx.fillText(member.displayName, 170, 70);

  // Rang
  const rank = getRankForLevel(userData.level);
  ctx.fillStyle = '#7c5cfc';
  ctx.font      = '16px Rajdhani, sans-serif';
  ctx.fillText(rank ? `🏅 ${rank.name}` : '🏅 Sans rang', 170, 95);

  // Level
  ctx.fillStyle = '#e8e8f0';
  ctx.font      = 'bold 20px Rajdhani, sans-serif';
  const { level, current, required } = expProgress(userData.exp);
  ctx.fillText(`Niveau ${level}`, 170, 125);

  // Barre XP
  drawProgressBar(ctx, 170, 135, 580, 18, current / required);
  ctx.fillStyle = '#6b6b8a';
  ctx.font      = '13px Rajdhani, sans-serif';
  ctx.fillText(`${fmt(current)} / ${fmt(required)} EXP`, 170, 168);

  // Stats
  const stats = [
    { label: 'EXP Total',   value: fmt(userData.exp)    },
    { label: 'VTX-Coins',   value: fmt(userData.wallet) },
    { label: 'Banque',      value: fmt(userData.bank)   },
    { label: 'Streak',      value: `${userData.streak}j` },
  ];

  stats.forEach((s, i) => {
    const sx = 30 + i * 190;
    const sy = 210;

    roundRect(ctx, sx, sy, 175, 55, 10);
    ctx.fillStyle = '#13132b';
    ctx.fill();

    ctx.fillStyle = '#6b6b8a';
    ctx.font      = '12px Rajdhani, sans-serif';
    ctx.fillText(s.label, sx + 12, sy + 20);

    ctx.fillStyle = '#e8e8f0';
    ctx.font      = 'bold 18px Rajdhani, sans-serif';
    ctx.fillText(s.value, sx + 12, sy + 42);
  });

  return canvas.toBuffer('image/png');
}

// ════════════════════════════════════════════════════════════
// 2. IMAGE QUÊTES
// ════════════════════════════════════════════════════════════
async function generateQuests(member, quests) {
  const W = 700, H = 80 + quests.length * 110 + 30;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  ctx.fillStyle = '#0d0d1a';
  roundRect(ctx, 0, 0, W, H, 20);
  ctx.fill();

  ctx.fillStyle = '#7c5cfc';
  ctx.fillRect(0, 0, 4, H);

  // Titre
  ctx.fillStyle = '#e8e8f0';
  ctx.font      = 'bold 24px Rajdhani, sans-serif';
  ctx.fillText('📋 Tes quêtes du jour', 20, 45);

  const sColor = statusColor(member.presence);
  await drawAvatar(ctx, member.user.displayAvatarURL({ format: 'png' }), W - 80, 15, 55, sColor);

  quests.forEach((q, i) => {
    const y = 75 + i * 110;

    roundRect(ctx, 15, y, W - 30, 95, 12);
    ctx.fillStyle = q.completed ? '#1a2a1a' : '#13132b';
    ctx.fill();

    if (q.completed) {
      ctx.fillStyle = '#3ba55d';
      ctx.font      = 'bold 16px Rajdhani, sans-serif';
      ctx.fillText('✅ ' + q.label, 25, y + 28);
    } else {
      ctx.fillStyle = '#e8e8f0';
      ctx.font      = 'bold 16px Rajdhani, sans-serif';
      ctx.fillText('🎯 ' + q.label, 25, y + 28);
    }

    // Récompenses
    ctx.fillStyle = '#f5c842';
    ctx.font      = '13px Rajdhani, sans-serif';
    const rewards = [];
    if (q.rewardExp)   rewards.push(`+${fmt(q.rewardExp)} EXP`);
    if (q.rewardCoins) rewards.push(`+${fmt(q.rewardCoins)} VTX-Coins`);
    ctx.fillText(rewards.join('  •  '), 25, y + 50);

    // Barre progression
    const prog = Math.min(q.progress / q.target, 1);
    drawProgressBar(ctx, 25, y + 60, W - 60, 14, prog);
    ctx.fillStyle = '#6b6b8a';
    ctx.font      = '12px Rajdhani, sans-serif';
    ctx.fillText(`${q.progress} / ${q.target}`, 25, y + 88);
  });

  return canvas.toBuffer('image/png');
}

// ════════════════════════════════════════════════════════════
// 3. IMAGE CLASSEMENT (TOP 10)
// ════════════════════════════════════════════════════════════
async function generateLeaderboard(entries, mode) {
  const W = 750, H = 90 + entries.length * 75 + 20;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  ctx.fillStyle = '#0d0d1a';
  roundRect(ctx, 0, 0, W, H, 20);
  ctx.fill();

  ctx.fillStyle = '#7c5cfc';
  ctx.fillRect(0, 0, 4, H);

  ctx.fillStyle = '#e8e8f0';
  ctx.font      = 'bold 26px Rajdhani, sans-serif';
  ctx.fillText(mode === 'exp' ? '🏆 Top 10 — EXP' : '💰 Top 10 — VTX-Coins', 20, 50);

  const medals = ['🥇', '🥈', '🥉'];

  for (let i = 0; i < entries.length; i++) {
    const e  = entries[i];
    const y  = 75 + i * 75;

    roundRect(ctx, 15, y, W - 30, 60, 10);
    ctx.fillStyle = i < 3 ? '#1a1a35' : '#13132b';
    ctx.fill();

    // Médaille / numéro
    ctx.font      = '20px Rajdhani, sans-serif';
    ctx.fillStyle = '#e8e8f0';
    ctx.fillText(medals[i] || `#${i + 1}`, 25, y + 38);

    // Avatar
    try {
      const img = await loadImage(e.avatarURL + '?size=64');
      ctx.save();
      ctx.beginPath();
      ctx.arc(85, y + 30, 22, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 63, y + 8, 44, 44);
      ctx.restore();
    } catch {}

    // Nom
    ctx.fillStyle = '#e8e8f0';
    ctx.font      = 'bold 16px Rajdhani, sans-serif';
    ctx.fillText(e.username, 118, y + 25);

    // Valeur
    ctx.fillStyle = '#7c5cfc';
    ctx.font      = 'bold 18px Rajdhani, sans-serif';
    const val = mode === 'exp' ? `${fmt(e.exp)} EXP — Niv.${e.level}` : `${fmt(e.coins)} VTX-Coins`;
    ctx.fillText(val, 118, y + 48);
  }

  return canvas.toBuffer('image/png');
}

module.exports = { generateProfile, generateQuests, generateLeaderboard, statusColor };