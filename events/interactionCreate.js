const { database } = require('../config/firebase');
const { ref, get, update } = require('firebase/database');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // 슬래시 커맨드 처리
        if (interaction.isCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: '명령어 실행 중 오류가 발생했습니다.',
                    ephemeral: true
                });
            }
            return;
        }

        // 버튼 클릭 처리
        if (interaction.isButton()) {
            // 이벤트 참가 버튼 처리
            if (interaction.customId.startsWith('event_join_')) {
                const [, , status, eventId] = interaction.customId.split('_');
                
                try {
                    // Firebase에서 이벤트 데이터 가져오기
                    const eventRef = ref(database, `events/${eventId}`);
                    const snapshot = await get(eventRef);
                    const event = snapshot.val();

                    if (!event) {
                        return interaction.reply({
                            content: '이벤트를 찾을 수 없습니다.',
                            ephemeral: true
                        });
                    }

                    // 참가자 목록 업데이트
                    const attendees = event.attendees || [];
                    const attendeeIndex = attendees.findIndex(a => a.userId === interaction.user.id);
                    
                    if (attendeeIndex !== -1) {
                        // 기존 참가자 상태 업데이트
                        attendees[attendeeIndex].status = status;
                    } else {
                        // 새 참가자 추가
                        attendees.push({
                            userId: interaction.user.id,
                            status,
                            joinedAt: new Date().toISOString()
                        });
                    }

                    // Firebase 업데이트
                    await update(eventRef, {
                        attendees,
                        updatedAt: new Date().toISOString()
                    });

                    // 임베드 메시지 업데이트
                    const message = interaction.message;
                    const embed = message.embeds[0];

                    // 참가자 분류
                    const confirmedAttendees = attendees.filter(a => a.status === 'yes');
                    const maybeAttendees = attendees.filter(a => a.status === 'maybe');
                    const declinedAttendees = attendees.filter(a => a.status === 'no');

                    // 기존 참가자 필드 제거
                    embed.fields = embed.fields.filter(field => 
                        !['참가자', '미정', '불참'].includes(field.name)
                    );

                    // 새 참가자 필드 추가
                    if (confirmedAttendees.length > 0) {
                        embed.addField('참가자', confirmedAttendees.map(a => `<@${a.userId}>`).join('\n'));
                    }
                    if (maybeAttendees.length > 0) {
                        embed.addField('미정', maybeAttendees.map(a => `<@${a.userId}>`).join('\n'));
                    }
                    if (declinedAttendees.length > 0) {
                        embed.addField('불참', declinedAttendees.map(a => `<@${a.userId}>`).join('\n'));
                    }

                    await message.edit({ embeds: [embed] });

                    // 응답 메시지
                    await interaction.reply({
                        content: `이벤트 참가 상태가 업데이트되었습니다: ${status === 'yes' ? '참가' : status === 'no' ? '불참' : '미정'}`,
                        ephemeral: true
                    });

                } catch (error) {
                    console.error('Error handling event join button:', error);
                    await interaction.reply({
                        content: '이벤트 참가 처리 중 오류가 발생했습니다.',
                        ephemeral: true
                    });
                }
            }
        }
    },
}; 