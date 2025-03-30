const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// 개발 환경에서만 dotenv 사용
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command) {
        commands.push(command.data.toJSON());
    }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('슬래시 커맨드 등록 시작...');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('슬래시 커맨드 등록 완료!');
    } catch (error) {
        console.error('슬래시 커맨드 등록 중 오류 발생:', error);
    }
})(); 