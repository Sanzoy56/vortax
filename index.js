'use strict';
require('dotenv').config();

// ── Préférer IPv4 pour les résolutions DNS ──────────────────────────────
// Sur certains réseaux (Freebox/IPv6 mal routé), la connexion WebSocket
// vocale vers *.discord.media s'établit (Hello reçu) puis se ferme
// immédiatement sans raison — symptôme classique d'une route IPv6 cassée.
// Node 18+ utilise l'ordre "verbatim" du DNS (peut renvoyer l'IPv6 en
// premier) ; on force IPv4 pour éviter ce problème.
require('dns').setDefaultResultOrder('ipv4first');

// ── Auto-install des dépendances manquantes ─────────────────────────────
// Sur l'hébergement, le launcher fait un "git pull" + redémarrage sans
// forcément lancer "npm install" entre les deux. Si un package du
// package.json n'est pas dans node_modules, on l'installe ici avant de
// continuer (sinon le require() plus bas plante).
{
  const fs   = require('fs');
  const path = require('path');
  const { dependencies } = require('./package.json');
  const missing = Object.keys(dependencies).some(
    dep => !fs.existsSync(path.join(__dirname, 'node_modules', dep))
  );
  if (missing) {
    console.log('[Bootstrap] Dépendances manquantes détectées — npm install...');
    try {
      require('child_process').execSync('npm install', { cwd: __dirname, stdio: 'inherit' });
    } catch (e) {
      console.error('[Bootstrap] npm install a échoué :', e.message);
    }
  }
}

const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection
} = require('discord.js');

const { token } = require('./token.json');
const path = require('path');
const fs   = require('fs');

// ── Events existants ───────────────────────────────
const ticket     = require('./ticket.js');
const messages   = require('./events/messages');
const vocal      = require('./events/vocal');
const roles      = require('./events/roles');
const joinLeave  = require('./events/joinleave.js');
const salons     = require('./events/salons.js');
const moderation = require('./events/moderation.js');
const welcome    = require('./events/welcome.js');
const automod    = require('./events/automod.js');
const snipe      = require('./events/snipe.js');
const meteo      = require('./events/meteo.js');
const iq         = require('./events/iq.js');
const suggestion = require('./events/suggestion.js');
const autorole   = require('./events/autorole.js');
const stats     = require('./events/stats');
const vocalTemp = require('./events/vocalTemp');
const casino    = require('./events/casino');
const prefix    = require('./events/prefix');
const antiraid  = require('./events/antiraid');
const backup    = require('./events/backup');
const persos    = require('./events/persos');
// ── Command handlers manuels ───────────────────────
const panel = require('./commandes/panel.js');
const say   = require('./commandes/say.js');
const clear = require('./commandes/clear.js');
const clearSalon = require('./commandes/clear-salon.js');
const grok  = require('./grok.js');

// ── Youtube / giveaway ─────────────────────────────
const { checkYoutube, CHECK_INTERVAL } = require('./youtube.js');
const giveaway = require('./giveaway.js');

// ── Levels : tasks ────────────────────────────────
const { startStreakReminder } = require('./levels/tasks/streaktask');
const { startQuestReset }     = require('./levels/tasks/Questtask');
const { startVoiceXp }        = require('./levels/Voicexp');
const { startSeasonTask }     = require('./levels/tasks/Seasontask');

// ── Levels : messageCreate ────────────────────────
const levelMessage = require('./levels/Messagecreate');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildInvites
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember,
    Partials.User
  ]
});

client.setMaxListeners(30);
client.commands = new Collection();

// ───────────────────────────────────────────────────
// Chargement slash commands (multi-dossiers)
// ───────────────────────────────────────────────────

const commandFolders = [
  path.join(__dirname, 'levels', 'commands'),
  path.join(__dirname, 'commandes')
];

for (const commandsPath of commandFolders) {
  if (!fs.existsSync(commandsPath)) continue;

  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    try {
      const cmd = require(path.join(commandsPath, file));

      if (cmd.dep)     { client.commands.set(cmd.dep.data.name,     cmd.dep);     console.log(`📦 Commande chargée : ${cmd.dep.data.name}`); }
      if (cmd.withCmd) { client.commands.set(cmd.withCmd.data.name, cmd.withCmd); console.log(`📦 Commande chargée : ${cmd.withCmd.data.name}`); }

      if (cmd.data && cmd.execute) {
        client.commands.set(cmd.data.name, cmd);
        console.log(`📦 Commande chargée : ${cmd.data.name}`);
      }
    } catch (e) {
      console.warn(`⚠️ Erreur chargement ${file} :`, e.message);
    }
  }
}

// ───────────────────────────────────────────────────
// Init events existants
// ───────────────────────────────────────────────────

ticket(client);
messages(client);
vocal(client);
roles(client);
joinLeave(client);
salons(client);
moderation(client);
welcome(client);
automod(client);
snipe(client);
meteo(client);
iq(client);
suggestion(client);
giveaway(client);
autorole(client);
panel(client);
say(client);
clear(client);
clearSalon(client);
grok(client);
stats.init(client);
vocalTemp.init(client);
casino.init(client);
prefix.init(client);
antiraid.init(client);
backup.init(client);
persos.init(client);
// ───────────────────────────────────────────────────
// Levels : écoute des messages
// ───────────────────────────────────────────────────

client.on('messageCreate', async (message) => {
  await levelMessage.execute(message, client);
});

// ── Réactions → quête 'reactions' ──────────────────────────
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  if (!reaction.message.guild) return;
  const { updateQuestProgress } = require('./levels/quests');
  updateQuestProgress(reaction.message.guild, user.id, 'reactions', 1).catch(() => {});
});

// ───────────────────────────────────────────────────
// Slash commands centralisées
// ───────────────────────────────────────────────────

client.on('interactionCreate', async (interaction) => {
  // Ignorer les interactions buffered après un redémarrage (> 5s)
  if (Date.now() - interaction.createdTimestamp > 5000) return;

  try {
    // ───── Boutons boutique / items existants ─────
    if (interaction.isButton()) {
      const id = interaction.customId;

      if (id.startsWith('boutique_boost_'))  return client.commands.get('boutique')?.handleButton(interaction);
      if (id.startsWith('boutique_item_'))   return client.commands.get('items')?.handleButton(interaction);
      if (id.startsWith('use_item_'))        return client.commands.get('use')?.handleButton(interaction);
      if (id.startsWith('perm_achat_') || id.startsWith('perm_confirm_') || id === 'perm_annuler') {
        return client.commands.get('boutique-roles')?.handleButton(interaction);
      }
      if (id.startsWith('bperso_')) return client.commands.get('boutique-persos')?.handleButton(interaction);

      const levelsCmd = client.commands.get(interaction.message?.interaction?.commandName);
      if (levelsCmd?.handleButton) return levelsCmd.handleButton(interaction);

      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('bperso_select'))
        return client.commands.get('boutique-persos')?.handleSelect(interaction);
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // ── Tracking commandes pour quêtes ────────────
    try {
      const { getUser, saveUser }           = require('./levels/db');
      const { resetDailyStatsIfNeeded }     = require('./levels/levels');
      const { generateDailyQuests, updateQuestProgress } = require('./levels/quests');

      const excluded = [
        'quetes', 'profil', 'top', 'aide', 'inventaire', 'status',
        'adminexpajouter', 'adminexpretirer', 'adminmoneyajouter', 'adminmoneyretirer',
      ];

      const user = getUser(interaction.user.id);
      generateDailyQuests(user);
      resetDailyStatsIfNeeded(user);
      user.dailyStats.commands++;
      saveUser(user);

      // Fire-and-forget : ne bloque pas l'interaction (fenêtre Discord = 3s)
      if (!excluded.includes(interaction.commandName)) {
        updateQuestProgress(interaction.guild, interaction.user.id, 'commands', 1).catch(() => {});
      }
    } catch {}

    await command.execute(interaction, client);

  } catch (error) {
    console.error('❌ Command Error:', error);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: '❌ Une erreur est survenue.', flags: 64 });
      } else {
        await interaction.reply({ content: '❌ Une erreur est survenue.', flags: 64 });
      }
    } catch {}
  }
});

// ───────────────────────────────────────────────────
// Ready
// ───────────────────────────────────────────────────

// ── Debug temporaire : suivi des reconnexions de shard ──────────────────
// Permet de corréler une coupure de la connexion vocale avec une coupure
// du shard Discord (cause possible du "signalling -> destroyed").
client.on('shardDisconnect', (event, shardId) => {
  console.log(`[Debug] Shard ${shardId} déconnecté (code ${event?.code})`);
});
client.on('shardReconnecting', shardId => {
  console.log(`[Debug] Shard ${shardId} reconnexion...`);
});
client.on('shardResume', shardId => {
  console.log(`[Debug] Shard ${shardId} résumé.`);
});
client.on('shardError', (error, shardId) => {
  console.log(`[Debug] Shard ${shardId} erreur :`, error.message);
});

client.once('clientReady', () => {
  console.log(`✅ Connecté en tant que ${client.user.tag} — démarré le ${new Date().toLocaleString('fr-FR')}`);

  checkYoutube(client);
  setInterval(() => checkYoutube(client), CHECK_INTERVAL);

  startStreakReminder(client);
  startQuestReset(client);
  startVoiceXp(client);
  startSeasonTask(client);
});
async function getConfig() {
  try {
    const res = await fetch('http://localhost:3001/config')
    const config = await res.json()
    return config
  } catch (e) {
    console.error('❌ Impossible de lire la config du panel :', e.message)
    return {}
  }
}
// ───────────────────────────────────────────────────
// Errors
// ───────────────────────────────────────────────────

process.on('unhandledRejection', (err) => {
  if (err?.code === 10062) return;
  console.error('❌ Erreur non gérée :', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Exception non capturée :', err);
});

client.login(token);