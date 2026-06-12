'use strict';
const { loadSeason, runSeasonEnd } = require('../seasons');

const TEST_CHANNEL_ID = '1510219562065465516';
const RESET_DAY = 20;

function startSeasonTask(client) {
  setInterval(async () => {
    const now = new Date();
    if (now.getDate() !== RESET_DAY || now.getHours() !== 12 || now.getMinutes() !== 0) return;

    const currentMonth = now.toISOString().slice(0, 7); // 'YYYY-MM'
    const season = loadSeason();
    if (season.lastResetMonth === currentMonth) return;

    console.log('[SaisonTask] Déclenchement de la fin de saison...');
    await runSeasonEnd(client, TEST_CHANNEL_ID).catch(e => console.error('[SaisonTask] Erreur:', e.message));
  }, 60 * 1000);
}

module.exports = { startSeasonTask, TEST_CHANNEL_ID };
