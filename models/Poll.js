const { Schema, model } = require('mongoose');

const pollSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    creator: {
        type: String,
        required: true
    },
    channel: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['standard', 'time'],
        default: 'standard'
    },
    options: [{
        text: String,
        time: Date, // time poll인 경우에만 사용
        votes: [{
            userId: String,
            votedAt: {
                type: Date,
                default: Date.now
            }
        }]
    }],
    settings: {
        allowMultipleVotes: {
            type: Boolean,
            default: true
        },
        allowUserOptions: {
            type: Boolean,
            default: true
        },
        anonymous: {
            type: Boolean,
            default: false
        },
        endTime: Date
    },
    messageId: String, // Discord 메시지 ID
    status: {
        type: String,
        enum: ['active', 'ended'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// 투표 수 계산 메서드
pollSchema.methods.getVoteCounts = function() {
    return this.options.map(option => ({
        text: option.text,
        time: option.time,
        count: option.votes.length
    }));
};

// 사용자의 투표 확인 메서드
pollSchema.methods.hasUserVoted = function(userId) {
    return this.options.some(option => 
        option.votes.some(vote => vote.userId === userId)
    );
};

// 업데이트 시간 자동 갱신
pollSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = model('Poll', pollSchema); 