'use strict';
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { token } = require('./token.json');
const path = require('path');
const fs   = require('fs');

// ── Events existants ─────────────────────────────────────────────────────────
const ticket         = require('./ticket.js');
const messages       = require('./events/messages');
const vocal          = require('./events/vocal');
const roles          = require('./events/roles');
const joinLeave      = require('./events/joinleave.js');
const salons         = require('./events/salons.js');
const moderation     = require('./events/moderation.js');
const panel          = require('./commandes/panel.js');
const welcome        = require('./events/welcome.js');
const automod        = require('./events/automod.js');
const say            = require('./commandes/say.js');
const snipe          = require('./events/snipe.js');
const meteo          = require('./events/meteo.js');
const iq             = require('./events/iq.js');
const suggestion     = require('./events/suggestion.js');
const { checkYoutube, CHECK_INTERVAL } = require('./youtube.js');
const giveaway       = require('./giveaway.js');
const grok           = require('./grok.js');
const clear          = require('./commandes/clear.js');
const joinleavevocal = require('./commandes/joinleavevocal.js');

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
    GatewayIntentBits.GuildInvites,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember,
    Partials.User,
  ],
});

client.setMaxListeners(30);
client.commands = new Collection();

// ── Chargement slash commands (levels/commands/) ──────────────────────────────
const commandsPath = path.join(__dirname, 'levels', 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const cmd = require(path.join(commandsPath, file));
  if (cmd.data) client.commands.set(cmd.data.name, cmd);
}

// ── Init events ───────────────────────────────────────────────────────────────
ticket(client);
messages(client);
vocal(client);
roles(client);
joinLeave(client);
salons(client);
moderation(client);
panel(client);
welcome(client);
automod(client);
say(client);
snipe(client);
meteo(client);
iq(client);
suggestion(client);
giveaway(client);
grok(client);
clear(client);
joinleavevocal(client);

// ── Slash commands ────────────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  // Boutons
  if (interaction.isButton()) {
    const customId = interaction.customId;

    if (customId.startsWith('boutique_boost_')) {
      const boutique = client.commands.get('boutique');
      return boutique?.handleButton(interaction);
    }
    if (customId.startsWith('boutique_item_')) {
      const items = client.commands.get('items');
      return items?.handleButton(interaction);
    }
    if (customId.startsWith('use_item_')) {
      const use = client.commands.get('use');
      return use?.handleButton(interaction);
    }
    if (customId.startsWith('perm_achat_') || customId.startsWith('perm_confirm_') || customId === 'perm_annuler') {
      const boutique = client.commands.get('boutique-roles');
      return boutique?.handleButton(interaction);
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ Une erreur est survenue.', ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
    }
  }
});

// ── Ready ─────────────────────────────────────────────────────────────────────
client.once('ready', () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  checkYoutube(client);
  setInterval(() => checkYoutube(client), CHECK_INTERVAL);
});

process.on('unhandledRejection', err => console.error('❌ Erreur non gérée :', err));

client.login(token);