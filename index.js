// 개발 환경에서만 dotenv 사용
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const { Client, GatewayIntentBits } = require('discord.js');
const express = require("express");
const { initializeDataFiles } = require('./utils/data');

// 명령어 핸들러들 import
const { handleAskCommand } = require('./commands/ask');
const { handleUsageCommand } = require('./commands/usage');
const { handleStatsCommand } = require('./commands/stats');
const { handleInfoCommand } = require('./commands/info');

const server = express();
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

// 봇 초기화
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    await initializeDataFiles();
    keepAlive(); // 서버 시작
});

// 명령어 처리
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === '!askbot') {
        await handleInfoCommand(message);
        return;
    }

    if (message.content === '!usage') {
        await handleUsageCommand(message);
        return;
    }

    if (message.content === '!stats') {
        await handleStatsCommand(message);
        return;
    }

    if (message.content.startsWith('!ask')) {
        await handleAskCommand(message);
        return;
    }
});

// 서버 설정을 먼저 실행
function keepAlive() {
    const PORT = process.env.PORT || 3000;
    
    server.get("/", (req, res) => {
        res.send("Bot is running!");
    });

    server.on('error', (error) => {
        console.error('Server error:', error);
    });

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

client.login(process.env.DISCORD_TOKEN);

module.exports = keepAlive;


