function handleInfoCommand(message) {
    const infoMessage = "안녕하세요! 저는 AI를 이용하여 질문에 답변하는 봇입니다.\n" +
        "사용 가능한 명령어:\n" +
        "!ask [질문내용] - 질문하기\n" +
        "!usage - 현재 월 사용량 확인\n" +
        "!stats - 이번 달 검색 통계 확인\n" +
        "(API 사용량 제한으로 인해 30초에 한 번만 질문할 수 있습니다)";
    return message.reply(infoMessage);
}

module.exports = { handleInfoCommand };