const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { token } = require('./config.json');
const ticket = require('./ticket.js');
const messages = require('./events/messages');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
    ]
});

client.once('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
    ticket(client);
    messages(client);
});

client.login(token);