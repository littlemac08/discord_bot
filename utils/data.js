const { database } = require('../config/firebase');
const { ref, get, set, push, update, remove, query, orderByChild, startAt } = require('firebase/database');
const { MONTHLY_COST_LIMIT } = require('../config/config');

// Firebase 레퍼런스
const eventsRef = ref(database, 'events');
const usageRef = ref(database, 'usage');
const historyRef = ref(database, 'history');

// 초기 데이터 구조
const defaultUsageData = {
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    totalCost: 0,
    totalTokens: 0
};

// 현재 월 사용량 조회
async function getCurrentMonthUsage() {
    try {
        const snapshot = await get(usageRef);
        const data = snapshot.val() || defaultUsageData;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        if (data.month !== currentMonth || data.year !== currentYear) {
            const newData = { ...defaultUsageData };
            await set(usageRef, newData);
            return newData;
        }
        return data;
    } catch (error) {
        console.error('Error reading usage data:', error);
        return { ...defaultUsageData };
    }
}

// 사용량 업데이트
async function updateUsage(tokens, userId, question, answer) {
    try {
        const usage = await getCurrentMonthUsage();
        const cost = (tokens / 1000000) * 0.2;
        
        if (usage.totalCost + cost > MONTHLY_COST_LIMIT) {
            return false;
        }
        
        // 사용량 업데이트
        usage.totalCost += cost;
        usage.totalTokens += tokens;
        await set(usageRef, usage);
        
        // 히스토리 추가
        const newSearch = {
            userId,
            question,
            answer,
            tokens,
            cost,
            timestamp: new Date().toISOString(),
            month: usage.month,
            year: usage.year
        };
        await push(historyRef, newSearch);
        
        return true;
    } catch (error) {
        console.error('Error updating usage:', error);
        return false;
    }
}

// 이벤트 생성
async function createEvent(eventData) {
    try {
        const newEventRef = push(eventsRef);
        const newEvent = {
            id: newEventRef.key,
            ...eventData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        await set(newEventRef, newEvent);
        return newEvent;
    } catch (error) {
        console.error('Error creating event:', error);
        throw error;
    }
}

// 이벤트 조회
async function getEvent(eventId) {
    try {
        const snapshot = await get(ref(database, `events/${eventId}`));
        return snapshot.val();
    } catch (error) {
        console.error('Error getting event:', error);
        return null;
    }
}

// 채널의 미래 이벤트 조회
async function getFutureEvents(channelId) {
    try {
        const now = new Date().toISOString();
        const eventsQuery = query(
            eventsRef,
            orderByChild('startTime'),
            startAt(now)
        );
        
        const snapshot = await get(eventsQuery);
        const events = [];
        
        snapshot.forEach((childSnapshot) => {
            const event = childSnapshot.val();
            if (event.channel === channelId) {
                events.push(event);
            }
        });
        
        return events;
    } catch (error) {
        console.error('Error getting future events:', error);
        return [];
    }
}

// 이벤트 업데이트
async function updateEvent(eventId, updateData) {
    try {
        const eventRef = ref(database, `events/${eventId}`);
        const updates = {
            ...updateData,
            updatedAt: new Date().toISOString()
        };
        await update(eventRef, updates);
        return { id: eventId, ...updates };
    } catch (error) {
        console.error('Error updating event:', error);
        return null;
    }
}

// 이벤트 삭제
async function deleteEvent(eventId) {
    try {
        await remove(ref(database, `events/${eventId}`));
        return true;
    } catch (error) {
        console.error('Error deleting event:', error);
        return false;
    }
}

// 이벤트 참가자 업데이트
async function updateEventAttendee(eventId, userId, status) {
    try {
        const event = await getEvent(eventId);
        if (!event) return null;

        const attendees = event.attendees || [];
        const attendeeIndex = attendees.findIndex(a => a.userId === userId);
        
        if (attendeeIndex !== -1) {
            attendees[attendeeIndex].status = status;
        } else {
            attendees.push({
                userId,
                status,
                joinedAt: new Date().toISOString()
            });
        }

        return await updateEvent(eventId, { attendees });
    } catch (error) {
        console.error('Error updating event attendee:', error);
        return null;
    }
}

module.exports = {
    getCurrentMonthUsage,
    updateUsage,
    createEvent,
    getEvent,
    getFutureEvents,
    updateEvent,
    deleteEvent,
    updateEventAttendee
};