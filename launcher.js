'use strict';
// Lanceur automatique du bot.
// À utiliser À LA PLACE de "node index.js" : lance "node launcher.js" et
// laisse tourner. Il s'occupe de tout :
//  - redémarre le bot tout seul s'il plante/se déconnecte
//  - vérifie toutes les CHECK_INTERVAL minutes si du nouveau code est dispo
//    sur GitHub, fait le "git pull" tout seul, et redémarre le bot avec le
//    nouveau code. Plus besoin de faire "git pull" ou de relancer le bot
//    à la main après un push.

const { spawn, execSync } = require('child_process');

const CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutes
const REPO_DIR = __dirname;

let child = null;
let manualRestart = false;

function startBot() {
  console.log('[Launcher] Démarrage du bot...');
  child = spawn(process.execPath, ['index.js'], { cwd: REPO_DIR, stdio: 'inherit' });
  child.on('exit', (code, signal) => {
    child = null;
    if (manualRestart) {
      manualRestart = false;
      startBot();
      return;
    }
    console.log(`[Launcher] Bot arrêté (code=${code}, signal=${signal}) — redémarrage dans 5s...`);
    setTimeout(startBot, 5000);
  });
}

function restartBot() {
  if (!child) { startBot(); return; }
  manualRestart = true;
  child.kill();
}

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: REPO_DIR, encoding: 'utf8' }).trim();
}

function checkForUpdates() {
  try {
    git('fetch');
    const local  = git('rev-parse HEAD');
    const remote = git('rev-parse @{u}');
    if (local !== remote) {
      console.log('[Launcher] Nouvelle version détectée sur GitHub — git pull + redémarrage...');
      git('pull');
      restartBot();
    }
  } catch (e) {
    console.error('[Launcher] Erreur vérification mise à jour :', e.message);
  }
}

process.on('SIGINT',  () => { if (child) child.kill('SIGINT');  process.exit(0); });
process.on('SIGTERM', () => { if (child) child.kill('SIGTERM'); process.exit(0); });

startBot();
setInterval(checkForUpdates, CHECK_INTERVAL);
console.log(`[Launcher] Vérification des mises à jour toutes les ${CHECK_INTERVAL / 60000} min.`);
