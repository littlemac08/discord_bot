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
const { handleCalendarCommand } = require('./commands/calendar');

const server = express();
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

// 서버 설정
const PORT = process.env.PORT || 3000;

server.get("/", (req, res) => {
    res.send("Bot is running!");
});

server.on('error', (error) => {
    console.error('Server error:', error);
});

// 서버 시작
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});

// 최근 처리한 메시지를 저장할 Set (중복 처리 방지)
const processedMessages = new Set();
const MESSAGE_CACHE_LIFETIME = 5000; // 5초 동안 메시지 캐시 유지

// 봇 초기화
client.once('ready', async () => {
    try {
        // 데이터 초기화
        await initializeDataFiles();
        console.log('데이터 초기화 완료');
        
        console.log(`Logged in as ${client.user.tag}!`);
    } catch (error) {
        console.error('초기화 중 오류 발생:', error);
    }
});

// 명령어 처리
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // 메시지 중복 처리 방지
    const messageKey = `${message.id}-${message.content}`;
    if (processedMessages.has(messageKey)) return;
    
    processedMessages.add(messageKey);
    setTimeout(() => processedMessages.delete(messageKey), MESSAGE_CACHE_LIFETIME);

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

    if (message.content.startsWith('!calendar')) {
        await handleCalendarCommand(message);
        return;
    }
});

// 봇 로그인
client.login(process.env.DISCORD_TOKEN);


