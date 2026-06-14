'use strict';
// Bannière "bienvenue / au revoir" envoyée dans les salons publics
// (config.welcome / config.leave). Remplace les anciens templates
// jaune/noir (assets/welcome.png / leave.png) + police "Impact" absente
// par un design sombre/or cohérent avec levels/canvas.js et logCard.js.
const { createCanvas } = require('canvas');
const { AttachmentBuilder } = require('discord.js');
const { roundRect, drawGoldLine, drawAvatar, sanitize, truncate, FONT } = require('./logCard');

const W = 1000;
const H = 360;
const AV_R = 110;
const AV_CX = 190;
const AV_CY = H / 2;

async function renderWelcomeCard({ type, member }) {
  const accent = type === 'welcome' ? '#22c55e' : '#ef4444';
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Fond
  ctx.fillStyle = '#08080f';
  roundRect(ctx, 0, 0, W, H, 18);
  ctx.fill();

  // Halo coloré derrière l'avatar
  const glow = ctx.createRadialGradient(AV_CX, AV_CY, 20, AV_CX, AV_CY, W * 0.75);
  glow.addColorStop(0, accent + '33');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  roundRect(ctx, 0, 0, W, H, 18);
  ctx.clip();
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Avatar
  await drawAvatar(ctx, member.user.displayAvatarURL(), AV_CX, AV_CY, AV_R, accent);

  const textX = AV_CX + AV_R + 60;
  const textW = W - textX - 50;

  // Label
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillStyle = accent;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(type === 'welcome' ? 'NOUVEAU MEMBRE' : 'DÉPART', textX, 90);

  // Pseudo
  ctx.font = `bold 52px ${FONT}`;
  ctx.fillStyle = '#f0f0fa';
  ctx.fillText(truncate(ctx, member.user.username, textW), textX, 158);

  // Sous-titre
  ctx.font = `26px ${FONT}`;
  ctx.fillStyle = '#9a9ab8';
  ctx.fillText(
    truncate(ctx, type === 'welcome'
      ? `a rejoint ${sanitize(member.guild.name)}`
      : `a quitté ${sanitize(member.guild.name)}`, textW),
    textX, 202
  );

  // Ligne dorée
  drawGoldLine(ctx, textX, 240, textW);

  // Statistique membres
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillStyle = accent;
  const memberLabel = type === 'welcome'
    ? `Tu es le ${member.guild.memberCount}e membre !`
    : `Il reste ${member.guild.memberCount} membres`;
  ctx.fillText(memberLabel, textX, 284);

  // Footer brand
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillStyle = '#3a3a5a';
  ctx.textAlign = 'right';
  ctx.fillText('Team Vortax © 2024 - 2026', W - 28, H - 22);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}

async function sendWelcomeCard(channel, type, member) {
  if (!channel) return;
  const buffer = await renderWelcomeCard({ type, member });
  const attachment = new AttachmentBuilder(buffer, { name: `${type}.png` });
  return channel.send({ files: [attachment] });
}

module.exports = { renderWelcomeCard, sendWelcomeCard };
