const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { token } = require('./token.json');

const ticket     = require('./ticket.js');
const messages   = require('./events/messages');
const vocal      = require('./events/vocal');
const roles      = require('./events/roles');
const joinLeave  = require('./events/joinleave.js');
const salons     = require('./events/salons.js');
const moderation = require('./events/moderation.js');
const panel      = require('./commandes/panel.js');
const welcome    = require('./events/welcome.js');
const automod    = require('./events/automod.js');
const say        = require('./commandes/say.js');
const snipe      = require('./events/snipe.js');
const levels     = require('./events/levels.js');
const meteo      = require('./events/meteo.js');
const iq         = require('./events/iq.js');
const suggestion = require('./events/suggestion.js'); // ← faute corrigée
const { checkYoutube, CHECK_INTERVAL } = require('./youtube.js'); // ← ajout
const giveaway = require('./giveaway.js');
const grok = require('./grok.js');
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
    ]
});

client.setMaxListeners(30);
client.commands = new Collection();

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
levels(client);
meteo(client);
iq(client);
suggestion(client);
giveaway(client);
grok(client);
client.once('ready', () => {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);
    checkYoutube(client); // premier check au démarrage
    setInterval(() => checkYoutube(client), CHECK_INTERVAL); // toutes les 5 min
});

client.on('interactionCreate', async (interaction) => {
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

process.on('unhandledRejection', (error) => {
    console.error('❌ Erreur non gérée : ', error);
});

client.login(token);