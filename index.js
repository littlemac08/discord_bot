// 개발 환경에서만 dotenv 사용
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
const express = require("express");
const server = express();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// 사용자별 마지막 요청 시간을 저장할 Map
const userCooldowns = new Map();
const COOLDOWN_TIME = 60000; // 쿨다운 시간 (60초)
const MONTHLY_COST_LIMIT = 4.0; // 4달러 제한

// 데이터 파일 경로
const DATA_DIR = path.join(__dirname, 'data');
const USAGE_FILE = path.join(DATA_DIR, 'usage.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

// 데이터 초기 구조
const defaultUsageData = {
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    totalCost: 0,
    totalTokens: 0
};

const defaultHistoryData = {
    searches: []
};

// 데이터 디렉토리와 파일 초기화
async function initializeDataFiles() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        
        try {
            await fs.access(USAGE_FILE);
        } catch {
            await fs.writeFile(USAGE_FILE, JSON.stringify(defaultUsageData));
        }
        
        try {
            await fs.access(HISTORY_FILE);
        } catch {
            await fs.writeFile(HISTORY_FILE, JSON.stringify(defaultHistoryData));
        }
    } catch (error) {
        console.error('Error initializing data files:', error);
    }
}

// 현재 사용량 데이터 읽기
async function getCurrentMonthUsage() {
    try {
        const data = JSON.parse(await fs.readFile(USAGE_FILE, 'utf8'));
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        // 월이 바뀌었으면 초기화
        if (data.month !== currentMonth || data.year !== currentYear) {
            const newData = {
                month: currentMonth,
                year: currentYear,
                totalCost: 0,
                totalTokens: 0
            };
            await fs.writeFile(USAGE_FILE, JSON.stringify(newData));
            return newData;
        }
        
        return data;
    } catch (error) {
        console.error('Error reading usage data:', error);
        return defaultUsageData;
    }
}

// 사용량 업데이트
async function updateUsage(tokens, userId, question, answer) {
    try {
        const usage = await getCurrentMonthUsage();
        const cost = (tokens / 1000000) * 0.2; // $0.2 per 1M tokens for sonar-small-chat
        
        if (usage.totalCost + cost > MONTHLY_COST_LIMIT) {
            return false;
        }
        
        // 사용량 업데이트
        usage.totalCost += cost;
        usage.totalTokens += tokens;
        await fs.writeFile(USAGE_FILE, JSON.stringify(usage));
        
        // 검색 기록 저장
        const history = JSON.parse(await fs.readFile(HISTORY_FILE, 'utf8'));
        history.searches.push({
            userId,
            question,
            answer,
            tokens,
            cost,
            timestamp: new Date().toISOString(),
            month: usage.month,
            year: usage.year
        });
        await fs.writeFile(HISTORY_FILE, JSON.stringify(history));
        
        return true;
    } catch (error) {
        console.error('Error updating usage:', error);
        return false;
    }
}

// 사용량 조회 명령어 처리
async function handleUsageCommand(message) {
    try {
        const usage = await getCurrentMonthUsage();
        const remainingCost = MONTHLY_COST_LIMIT - usage.totalCost;
        
        const usageMessage = `현재 월 사용량 (${usage.month + 1}월):\n` +
            `총 비용: $${usage.totalCost.toFixed(6)}\n` +
            `총 토큰: ${usage.totalTokens}\n` +
            `남은 금액: $${remainingCost.toFixed(6)}`;
        
        message.reply(usageMessage);
    } catch (error) {
        console.error('Error handling usage command:', error);
        message.reply('사용량 정보를 가져오는 중 오류가 발생했습니다.');
    }
}

// 통계 조회 명령어 처리
async function handleStatsCommand(message) {
    try {
        const history = JSON.parse(await fs.readFile(HISTORY_FILE, 'utf8'));
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        // 이번 달 검색만 필터링
        const monthSearches = history.searches.filter(
            search => search.month === currentMonth && search.year === currentYear
        );
        
        // 사용자별 검색 횟수 집계
        const userSearches = new Map();
        monthSearches.forEach(search => {
            const count = userSearches.get(search.userId) || 0;
            userSearches.set(search.userId, count + 1);
        });
        
        let statsMessage = `이번 달 통계:\n총 검색 수: ${monthSearches.length}회\n\n상위 사용자:`;
        const sortedUsers = [...userSearches.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        for (const [userId, count] of sortedUsers) {
            statsMessage += `\n<@${userId}>: ${count}회`;
        }
        
        message.reply(statsMessage);
    } catch (error) {
        console.error('Error handling stats command:', error);
        message.reply('통계 정보를 가져오는 중 오류가 발생했습니다.');
    }
}

// 봇 초기화
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    await initializeDataFiles();
    keepAlive(); // 서버 시작
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === '!askbot') {
        const infoMessage = "안녕하세요! 저는 Chat-GPT를 이용하여 질문에 답변하는 봇입니다.\n" +
            "사용 가능한 명령어:\n" +
            "!ask [질문내용] - 질문하기\n" +
            "!usage - 현재 월 사용량 확인\n" +
            "!stats - 이번 달 검색 통계 확인\n" +
            "(API 사용량 제한으로 인해 1분에 한 번만 질문할 수 있습니다)";
        message.reply(infoMessage);
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
        const lastUsed = userCooldowns.get(message.author.id) || 0;
        const timeLeft = COOLDOWN_TIME - (Date.now() - lastUsed);
        
        if (timeLeft > 0) {
            message.reply(`잠시만 기다려주세요! ${Math.ceil(timeLeft / 1000)}초 후에 다시 질문할 수 있습니다.`);
            return;
        }

        const question = message.content.replace('!ask', '').trim();
        if (!question) {
            message.reply('궁금하신게 있으시면 !ask "질문내용" 을 입력해보세요.');
            return;
        }

        try {
            // 현재 월 사용량 확인
            const currentUsage = await getCurrentMonthUsage();
            if (currentUsage.totalCost >= MONTHLY_COST_LIMIT) {
                message.reply(`죄송합니다. 이번 달 API 사용량 한도($${MONTHLY_COST_LIMIT})에 도달했습니다. 다음 달에 다시 시도해주세요.`);
                return;
            }

            userCooldowns.set(message.author.id, Date.now());

            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'sonar-small-chat',
                    messages: [
                        {
                            role: 'system',
                            content: '간단명료하게 답변해주세요.'
                        },
                        {
                            role: 'user',
                            content: question
                        }
                    ],
                    max_tokens: 250,
                    temperature: 0.7,
                }),
            });

            const data = await response.json();
            console.log("Perplexity API raw response:", JSON.stringify(data, null, 2));

            if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
                message.reply('Perplexity 응답 형식이 예상과 다릅니다. 콘솔 로그를 확인해주세요.');
                return;
            }

            let answer = data.choices[0].message.content;
            answer = answer.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                         .replace(/http[s]?:\/\/\S+/g, '')
                         .replace(/\n\s*>\s[^\n]+/g, '')
                         .replace(/\s{2,}/g, ' ')
                         .trim();

            // 사용량 업데이트 및 검색 기록 저장
            if (data.usage) {
                const canProceed = await updateUsage(
                    data.usage.total_tokens,
                    message.author.id,
                    question,
                    answer
                );

                if (!canProceed) {
                    message.reply(`죄송합니다. 이 요청으로 인해 월 사용량 한도($${MONTHLY_COST_LIMIT})를 초과하게 됩니다.`);
                    return;
                }
            }

            message.reply(answer);
        } catch (error) {
            console.error('Error with Perplexity API:', error);
            message.reply('죄송합니다. 요청을 처리하는 동안 오류가 발생했습니다.');
        }
    }
});

// 서버 설정을 먼저 실행
function keepAlive() {
    // Render가 제공하는 PORT 환경변수 사용
    const PORT = process.env.PORT || 3000;
    
    server.get("/", (req, res) => {
        res.send("Bot is running!");
    });

    // 서버 시작 전에 에러 핸들러 등록
    server.on('error', (error) => {
        console.error('Server error:', error);
    });

    // 명시적으로 호스트 지정
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

// 봇이 준비되었을 때 서버도 시작
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    await initializeDataFiles();
    keepAlive(); // 서버 시작
});

// client.login을 마지막에 실행
client.login(process.env.DISCORD_TOKEN);

module.exports = keepAlive;


