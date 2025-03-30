const fs = require('fs').promises;
const { HISTORY_FILE } = require('../utils/data');

async function handleStatsCommand(message) {
    try {
        const history = JSON.parse(await fs.readFile(HISTORY_FILE, 'utf8'));
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        // 이번 달 검색 기록만 필터링
        const monthlySearches = history.searches.filter(
            search => search.month === currentMonth && search.year === currentYear
        );

        // 사용자별 통계 계산
        const userStats = new Map();
        monthlySearches.forEach(search => {
            if (!userStats.has(search.userId)) {
                userStats.set(search.userId, {
                    searches: 0,
                    tokens: 0,
                    cost: 0
                });
            }
            const stats = userStats.get(search.userId);
            stats.searches++;
            stats.tokens += search.tokens;
            stats.cost += search.cost;
        });

        // 통계 메시지 생성
        let response = `📈 이번 달 사용자별 통계:\n`;
        for (const [userId, stats] of userStats) {
            const user = await message.client.users.fetch(userId);
            response += `\n${user.username}:
• 검색 횟수: ${stats.searches}회
• 총 토큰: ${stats.tokens.toLocaleString()} 토큰
• 총 비용: $${stats.cost.toFixed(4)}`;
        }

        if (userStats.size === 0) {
            response = '이번 달 사용 기록이 없습니다.';
        }

        return message.reply(response);
    } catch (error) {
        console.error('Error handling stats command:', error);
        return message.reply('통계 정보를 가져오는 중 오류가 발생했습니다.');
    }
}

module.exports = { handleStatsCommand };
