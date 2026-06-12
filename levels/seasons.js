'use strict';
const fs   = require('fs');
const path = require('path');
const { getAllUsers, saveUser, today } = require('./db');

const DATA_DIR    = path.join(__dirname, '..', '..', 'vortax-data');
const SEASON_PATH = path.join(DATA_DIR, 'season.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadSeason() {
  try {
    return JSON.parse(fs.readFileSync(SEASON_PATH, 'utf8'));
  } catch {
    return { number: 1, lastResetMonth: null };
  }
}

function saveSeason(data) {
  fs.writeFileSync(SEASON_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// ── Top 10 entrées (même logique que =top) ────────────────────
async function buildTopEntries(guild, mode) {
  const { getRankForLevel, levelFromExp } = require('./levels');
  const db   = getAllUsers();
  const list = Object.values(db)
    .sort((a, b) => mode === 'coins'
      ? ((b.wallet||0)+(b.bank||0)) - ((a.wallet||0)+(a.bank||0))
      : (b.exp||0) - (a.exp||0))
    .slice(0, 10);
  return Promise.all(list.map(async u => {
    const member = await guild.members.fetch(u.userId).catch(() => null);
    const level  = levelFromExp(u.exp || 0);
    const rank   = getRankForLevel(level);
    const def    = `https://cdn.discordapp.com/embed/avatars/${(Number(BigInt(u.userId) >> 22n) % 6)}.png`;
    return {
      avatarURL: member?.user.displayAvatarURL({ extension: 'png', size: 64, forceStatic: true }) || def,
      username:  member?.user.username || `Joueur ${u.userId.slice(-4)}`,
      rank:      rank?.name || '—',
      level,
      exp:   u.exp   || 0,
      coins: (u.wallet||0) + (u.bank||0),
    };
  }));
}

// ── Génère et poste l'image/annonce de fin de saison (sans reset) ──
async function postSeasonAnnouncement(client, channelId, seasonNumber) {
  const channel = client.channels.cache.get(channelId) || await client.channels.fetch(channelId).catch(() => null);
  if (!channel) { console.warn(`[Saison] Salon ${channelId} introuvable.`); return null; }
  const guild = channel.guild;
  if (!guild) { console.warn('[Saison] Salon hors d\'une guilde.'); return null; }

  const [topExp, topCoins] = await Promise.all([
    buildTopEntries(guild, 'exp'),
    buildTopEntries(guild, 'coins'),
  ]);

  const { generateSeasonEndCard } = require('./canvas');
  const { AttachmentBuilder } = require('discord.js');
  const buffer = await generateSeasonEndCard(topExp.slice(0, 5), topCoins.slice(0, 5), seasonNumber);

  await channel.send({
    content: `🏁 **Fin de la Saison #${seasonNumber} !** Félicitations aux meilleurs joueurs ! La **Saison #${seasonNumber + 1}** commence maintenant — tous les XP et VTX-Coins ont été remis à zéro. Bonne chance à tous !`,
    files: [new AttachmentBuilder(buffer, { name: 'saison.png' })],
  }).catch(e => console.error('[Saison] Envoi message:', e.message));

  return channel;
}

// ── Aperçu : poste l'annonce SANS rien réinitialiser (test) ───
async function previewSeasonEnd(client, channelId) {
  const season = loadSeason();
  await postSeasonAnnouncement(client, channelId, season.number || 1);
}

// ── Fin de saison réelle : annonce + reset complet XP/coins ───
async function runSeasonEnd(client, channelId) {
  const season       = loadSeason();
  const seasonNumber = season.number || 1;

  const channel = await postSeasonAnnouncement(client, channelId, seasonNumber);
  if (!channel) return;

  // Reset complet XP + coins de tous les joueurs
  const allUsers = getAllUsers();
  let count = 0;
  for (const user of Object.values(allUsers)) {
    user.exp = 0;
    user.wallet = 0;
    user.bank = 0;
    user.lastAnnouncedLevel = 0;
    saveUser(user);
    count++;
  }
  console.log(`[Saison] Saison #${seasonNumber} terminée — ${count} utilisateurs réinitialisés (XP/coins).`);

  saveSeason({ number: seasonNumber + 1, lastResetMonth: today().slice(0, 7) });
}

module.exports = { loadSeason, saveSeason, runSeasonEnd, previewSeasonEnd, buildTopEntries };
