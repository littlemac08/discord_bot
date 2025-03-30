const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const { database } = require('../config/firebase');
const { ref, push, get, update, query, orderByChild, startAt } = require('firebase/database');
const chrono = require('chrono-node');
const { formatRelative } = require('date-fns');
const { ko } = require('date-fns/locale');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('event')
        .setDescription('이벤트 관련 명령어')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('새 이벤트 생성')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('이벤트 제목')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('time')
                        .setDescription('이벤트 시작 시간 (예: 내일 오후 3시)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('이벤트 설명'))
                .addNumberOption(option =>
                    option.setName('max_attendees')
                        .setDescription('최대 참가자 수'))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('이벤트 색상 (예: #FF0000)'))
                .addStringOption(option =>
                    option.setName('image')
                        .setDescription('이벤트 이미지 URL')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('예정된 이벤트 목록 보기')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create':
                await handleCreateEvent(interaction);
                break;
            case 'list':
                await handleListEvents(interaction);
                break;
        }
    }
};

async function handleCreateEvent(interaction) {
    const title = interaction.options.getString('title');
    const timeStr = interaction.options.getString('time');
    const description = interaction.options.getString('description') || '';
    const maxAttendees = interaction.options.getNumber('max_attendees');
    const color = interaction.options.getString('color') || '#5865F2';
    const imageUrl = interaction.options.getString('image');

    // 시간 파싱
    const startTime = chrono.parseDate(timeStr, new Date(), { forwardDate: true });
    if (!startTime) {
        return interaction.reply({
            content: '올바른 시간 형식이 아닙니다. 예시: "내일 오후 3시", "다음 주 금요일 저녁 8시"',
            ephemeral: true
        });
    }

    try {
        // Firebase에 이벤트 생성
        const eventsRef = ref(database, 'events');
        const newEventRef = push(eventsRef);
        const eventData = {
            id: newEventRef.key,
            title,
            description,
            startTime: startTime.toISOString(),
            channel: interaction.channelId,
            creator: interaction.user.id,
            maxAttendees,
            color,
            imageUrl,
            attendees: [{
                userId: interaction.user.id,
                status: 'yes',
                joinedAt: new Date().toISOString()
            }],
            createdAt: new Date().toISOString()
        };

        await update(newEventRef, eventData);

        // 이벤트 임베드 생성
        const embed = new MessageEmbed()
            .setTitle(`📅 ${title}`)
            .setDescription(description)
            .addField('시작 시간', formatRelative(startTime, new Date(), { locale: ko }))
            .addField('주최자', `<@${interaction.user.id}>`)
            .setColor(color);

        if (maxAttendees) {
            embed.addField('최대 참가자 수', maxAttendees.toString());
        }

        if (imageUrl) {
            embed.setImage(imageUrl);
        }

        // 버튼 추가
        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId(`event_join_yes_${eventData.id}`)
                    .setLabel('참가')
                    .setStyle('SUCCESS'),
                new MessageButton()
                    .setCustomId(`event_join_no_${eventData.id}`)
                    .setLabel('불참')
                    .setStyle('DANGER'),
                new MessageButton()
                    .setCustomId(`event_join_maybe_${eventData.id}`)
                    .setLabel('미정')
                    .setStyle('SECONDARY')
            );

        const message = await interaction.reply({
            embeds: [embed],
            components: [row],
            fetchReply: true
        });

        // 메시지 ID 저장
        await update(newEventRef, {
            messageId: message.id
        });

    } catch (error) {
        console.error('Error creating event:', error);
        await interaction.reply({
            content: '이벤트 생성 중 오류가 발생했습니다.',
            ephemeral: true
        });
    }
}

async function handleListEvents(interaction) {
    try {
        // 현재 시간 이후의 이벤트 조회
        const eventsRef = ref(database, 'events');
        const eventsQuery = query(
            eventsRef,
            orderByChild('startTime'),
            startAt(new Date().toISOString())
        );
        
        const snapshot = await get(eventsQuery);
        const events = [];
        
        // 현재 채널의 이벤트만 필터링
        snapshot.forEach((childSnapshot) => {
            const event = childSnapshot.val();
            if (event.channel === interaction.channelId) {
                events.push(event);
            }
        });

        if (events.length === 0) {
            return interaction.reply({
                content: '예정된 이벤트가 없습니다.',
                ephemeral: true
            });
        }

        const embed = new MessageEmbed()
            .setTitle('📅 예정된 이벤트')
            .setColor('#5865F2');

        events.forEach(event => {
            const attendeeCount = event.attendees.filter(a => a.status === 'yes').length;
            const maxAttendeesStr = event.maxAttendees ? `/${event.maxAttendees}` : '';

            embed.addField(
                event.title,
                `🕒 ${formatRelative(new Date(event.startTime), new Date(), { locale: ko })}\n` +
                `👥 참가자: ${attendeeCount}${maxAttendeesStr}명\n` +
                `🎮 [이벤트로 이동](https://discord.com/channels/${interaction.guildId}/${event.channel}/${event.messageId})`
            );
        });

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        console.error('Error listing events:', error);
        await interaction.reply({
            content: '이벤트 목록을 가져오는 중 오류가 발생했습니다.',
            ephemeral: true
        });
    }
} 