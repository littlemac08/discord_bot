const { Schema, model } = require('mongoose');

const eventSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    startTime: {
        type: Date,
        required: true
    },
    endTime: Date,
    channel: {
        type: String,
        required: true
    },
    creator: {
        type: String,
        required: true
    },
    color: {
        type: String,
        default: '#5865F2' // Discord 기본 색상
    },
    imageUrl: String,
    maxAttendees: Number,
    attendees: [{
        userId: String,
        status: {
            type: String,
            enum: ['yes', 'no', 'maybe'],
            default: 'yes'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    waitlist: [{
        userId: String,
        joinedAt: Date
    }],
    reminders: [{
        type: Number, // 분 단위로 이벤트 시작 전 알림
        sent: {
            type: Boolean,
            default: false
        }
    }],
    recurring: {
        type: {
            type: String,
            enum: ['none', 'daily', 'weekly', 'monthly']
        },
        interval: Number,
        until: Date
    },
    roles: [{
        roleId: String,
        condition: {
            type: String,
            enum: ['attending', 'maybe', 'declined']
        }
    }],
    messageId: String, // Discord 메시지 ID
    calendarLink: String, // Google Calendar 링크
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// 이벤트 수정 시 updatedAt 자동 업데이트
eventSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = model('Event', eventSchema); 