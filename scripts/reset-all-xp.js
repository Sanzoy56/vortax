'use strict';
// Script ponctuel : remet à zéro l'XP/niveau/quêtes de TOUT LE MONDE
// et retire les rôles de rang correspondants.
// Usage : node scripts/reset-all-xp.js

const fs   = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const { token } = require('../token.json');
const { RANKS } = require('../levels/config');

const DB_PATH   = path.join(__dirname, '..', 'level.json');
const GUILD_ID  = process.env.GUILD_ID || require('dotenv').config() && process.env.GUILD_ID;

async function main() {
  // ── 1. Sauvegarde avant toute modification ──
  const stamp  = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const backup = `${DB_PATH}.backup_${stamp}`;
  fs.copyFileSync(DB_PATH, backup);
  console.log(`[Reset] Sauvegarde créée : ${path.basename(backup)}`);

  // ── 2. Reset XP / niveau / quêtes pour tout le monde ──
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  let count = 0;
  for (const userId of Object.keys(db)) {
    db[userId].exp                = 0;
    db[userId].level              = 0;
    db[userId].lastAnnouncedLevel = 0;
    db[userId].quests             = { date: null, list: [] };
    count++;
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  console.log(`[Reset] XP/niveau/quêtes remis à zéro pour ${count} membre(s).`);

  // ── 3. Retirer les rôles de rang sur le serveur ──
  const guildId = GUILD_ID;
  if (!guildId) {
    console.log('[Reset] GUILD_ID introuvable — rôles de rang non retirés (fais-le manuellement).');
    return;
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
  await client.login(token);
  await new Promise(r => client.once('ready', r));

  const guild = await client.guilds.fetch(guildId);
  const members = await guild.members.fetch();
  const rankRoleIds = RANKS.map(r => r.roleId);

  let stripped = 0;
  for (const member of members.values()) {
    const toRemove = rankRoleIds.filter(id => member.roles.cache.has(id));
    if (toRemove.length) {
      await member.roles.remove(toRemove).catch(() => {});
      stripped++;
    }
  }
  console.log(`[Reset] Rôles de rang retirés pour ${stripped} membre(s).`);

  await client.destroy();
  console.log('[Reset] Terminé.');
}

main().catch(err => {
  console.error('[Reset] Erreur :', err);
  process.exit(1);
});
