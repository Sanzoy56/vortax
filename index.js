'use strict';

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

// ── Command handlers manuels ───────────────────────
const panel = require('./commandes/panel.js');
const say   = require('./commandes/say.js');
const clear = require('./commandes/clear.js');
const grok  = require('./grok.js');

// ── Youtube / giveaway ─────────────────────────────
const { checkYoutube, CHECK_INTERVAL } = require('./youtube.js');
const giveaway = require('./giveaway.js');

// ── Levels : tasks ────────────────────────────────
const { startStreakReminder } = require('./levels/tasks/streaktask');
const { startQuestReset }     = require('./levels/tasks/Questtask');
const { startVoiceXp }        = require('./levels/Voicexp');

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
grok(client);

// ───────────────────────────────────────────────────
// Levels : écoute des messages
// ───────────────────────────────────────────────────

client.on('messageCreate', async (message) => {
  await levelMessage.execute(message, client);
});

// ───────────────────────────────────────────────────
// Slash commands centralisées
// ───────────────────────────────────────────────────

client.on('interactionCreate', async (interaction) => {
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

      const levelsCmd = client.commands.get(interaction.message?.interaction?.commandName);
      if (levelsCmd?.handleButton) return levelsCmd.handleButton(interaction);

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

      const excluded = ['quetes', 'profil', 'top', 'aide', 'inventaire', 'status'];

      const user = getUser(interaction.user.id);
      generateDailyQuests(user);
      resetDailyStatsIfNeeded(user);
      user.dailyStats.commands++;
      saveUser(user);

      if (!excluded.includes(interaction.commandName)) {
        await updateQuestProgress(interaction.guild, interaction.user.id, 'commands', 1);
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

client.once('clientReady', () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);

  checkYoutube(client);
  setInterval(() => checkYoutube(client), CHECK_INTERVAL);

  startStreakReminder(client);
  startQuestReset(client);
  startVoiceXp(client);
});

// ───────────────────────────────────────────────────
// Errors
// ───────────────────────────────────────────────────

process.on('unhandledRejection', (err) =>
  console.error('❌ Erreur non gérée :', err)
);

client.login(token);