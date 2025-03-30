const { getCurrentMonthUsage } = require('../utils/data');
const { MONTHLY_COST_LIMIT } = require('../config/config');

async function handleUsageCommand(message) {
    try {
        const usage = await getCurrentMonthUsage();
        const remainingCost = MONTHLY_COST_LIMIT - usage.totalCost;
        const usagePercentage = (usage.totalCost / MONTHLY_COST_LIMIT) * 100;

        const response = `📊 이번 달 API 사용량:
• 총 토큰: ${usage.totalTokens.toLocaleString()} 토큰
• 총 비용: $${usage.totalCost.toFixed(4)}
• 남은 한도: $${remainingCost.toFixed(4)} (${usagePercentage.toFixed(1)}% 사용)`;

        return message.reply(response);
    } catch (error) {
        console.error('Error handling usage command:', error);
        return message.reply('사용량 정보를 가져오는 중 오류가 발생했습니다.');
    }
}

module.exports = { handleUsageCommand };
