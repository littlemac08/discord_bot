const { callPerplexityAPI } = require('../utils/api');
const { getCurrentMonthUsage, updateUsage } = require('../utils/data');
const { COOLDOWN_TIME, MONTHLY_COST_LIMIT } = require('../config/config');

// 사용자별 마지막 요청 시간을 저장할 Map
const userCooldowns = new Map();

// !ask 명령어 처리 함수
async function handleAskCommand(message) {
    const lastUsed = userCooldowns.get(message.author.id) || 0;
    const timeLeft = COOLDOWN_TIME - (Date.now() - lastUsed);
    
    if (timeLeft > 0) {
        return message.reply(`잠시만 기다려주세요! ${Math.ceil(timeLeft / 1000)}초 후에 다시 질문할 수 있습니다.`);
    }

    const question = message.content.replace('!ask', '').trim();
    if (!question) {
        return message.reply('궁금하신게 있으시면 !ask "질문내용" 을 입력해보세요.');
    }

    try {
        const currentUsage = await getCurrentMonthUsage();
        if (currentUsage.totalCost >= MONTHLY_COST_LIMIT) {
            return message.reply(`죄송합니다. 이번 달 API 사용량 한도($${MONTHLY_COST_LIMIT})에 도달했습니다. 다음 달에 다시 시도해주세요.`);
        }

        userCooldowns.set(message.author.id, Date.now());

        const data = await callPerplexityAPI(question);
        console.log("Perplexity API raw response:", JSON.stringify(data, null, 2));

        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            return message.reply('Perplexity 응답 형식이 예상과 다릅니다. 콘솔 로그를 확인해주세요.');
        }

        let answer = data.choices[0].message.content;
        answer = answer.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                     .replace(/http[s]?:\/\/\S+/g, '')
                     .replace(/\n\s*>\s[^\n]+/g, '')
                     .replace(/\s{2,}/g, ' ')
                     .trim();

        if (data.usage) {
            const canProceed = await updateUsage(
                data.usage.total_tokens,
                message.author.id,
                question,
                answer
            );

            if (!canProceed) {
                return message.reply(`죄송합니다. 이 요청으로 인해 월 사용량 한도($${MONTHLY_COST_LIMIT})를 초과하게 됩니다.`);
            }
        }

        return message.reply(answer);
    } catch (error) {
        console.error('Error with Perplexity API:', error);
        return message.reply('죄송합니다. 요청을 처리하는 동안 오류가 발생했습니다.');
    }
}

module.exports = { handleAskCommand };
