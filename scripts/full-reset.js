'use strict';
// Reset complet : remet TOUT LE MONDE à zéro (XP, niveau, money, quêtes)
// et retire les rôles de rang sur le serveur Discord.
// Usage : node scripts/full-reset.js

const fs   = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const { token } = require('../token.json');
const { RANKS } = require('../levels/config');

const DB_PATH  = path.join(__dirname, '..', '..', 'vortax-data', 'level.json');
const GUILD_ID = process.env.GUILD_ID || (require('dotenv').config(), process.env.GUILD_ID);

async function main() {
  // ── 1. Sauvegarde avant remise à zéro ──
  if (fs.existsSync(DB_PATH)) {
    const stamp  = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const backup = `${DB_PATH}.backup_${stamp}`;
    fs.copyFileSync(DB_PATH, backup);
    console.log(`[Reset] Sauvegarde créée : ${path.basename(backup)}`);
  }

  // ── 2. Base entièrement vidée : tout le monde repart de zéro ──
  fs.writeFileSync(DB_PATH, '{}', 'utf8');
  console.log('[Reset] level.json vidé — XP/niveau/money/quêtes remis à zéro pour tout le monde.');

  // ── 3. Retirer les rôles de rang sur le serveur ──
  if (!GUILD_ID) {
    console.log('[Reset] GUILD_ID introuvable — rôles de rang non retirés (fais-le manuellement).');
    return;
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
  await client.login(token);
  await new Promise(r => client.once('ready', r));

  const guild       = await client.guilds.fetch(GUILD_ID);
  const members     = await guild.members.fetch();
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
