function generateCalendar(year = new Date().getFullYear(), month = new Date().getMonth()) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay();
    const monthLength = lastDay.getDate();
    
    const monthNames = [
        "1월", "2월", "3월", "4월", "5월", "6월",
        "7월", "8월", "9월", "10월", "11월", "12월"
    ];

    // 달력 헤더 생성
    let calendar = `\`\`\`
📅 ${year}년 ${monthNames[month]}
┌────┬────┬────┬────┬────┬────┬────┐
│ 일 │ 월 │ 화 │ 수 │ 목 │ 금 │ 토 │
├────┼────┼────┼────┼────┼────┼────┤
`;

    // 날짜 채우기
    let currentDay = 1;
    let currentWeek = "";
    
    // 첫 주의 빈 공간 추가
    for (let i = 0; i < startingDay; i++) {
        currentWeek += "│    ";
    }

    // 날짜 채우기
    while (currentDay <= monthLength) {
        if ((currentDay + startingDay - 1) % 7 === 0 && currentDay !== 1) {
            calendar += currentWeek + "│\n";
            if (currentDay <= monthLength) {
                calendar += "├────┼────┼────┼────┼────┼────┼────┤\n";
            }
            currentWeek = "";
        }
        currentWeek += `│ ${currentDay.toString().padStart(2)} `;
        currentDay++;
    }

    // 마지막 주의 남은 공간 채우기
    while ((currentDay + startingDay - 1) % 7 !== 0) {
        currentWeek += "│    ";
        currentDay++;
    }

    // 마지막 주 추가
    calendar += currentWeek + "│\n└────┴────┴────┴────┴────┴────┴────┘";
    calendar += "\n\`\`\`";
    return calendar;
}

async function handleCalendarCommand(message) {
    try {
        const args = message.content.split(' ').slice(1);
        let year = new Date().getFullYear();
        let month = new Date().getMonth();

        if (args.length >= 2) {
            year = parseInt(args[0]);
            month = parseInt(args[1]) - 1; // 사용자는 1-12로 입력, JavaScript는 0-11 사용
        }

        // 유효성 검사
        if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
            return message.reply('올바른 형식: !calendar [년도] [월]\n예시: !calendar 2024 3');
        }

        const calendar = generateCalendar(year, month);
        return message.reply(calendar);
    } catch (error) {
        console.error('Error handling calendar command:', error);
        return message.reply('달력을 생성하는 중 오류가 발생했습니다.');
    }
}

module.exports = { handleCalendarCommand }; 