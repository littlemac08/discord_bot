const fs = require('fs').promises;
const path = require('path');
const { MONTHLY_COST_LIMIT } = require('../config/config');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USAGE_FILE = path.join(DATA_DIR, 'usage.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

const defaultUsageData = {
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    totalCost: 0,
    totalTokens: 0
};

const defaultHistoryData = {
    searches: []
};

async function initializeDataFiles() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        try {
            await fs.access(USAGE_FILE);
        } catch {
            await fs.writeFile(USAGE_FILE, JSON.stringify(defaultUsageData));
        }
        try {
            await fs.access(HISTORY_FILE);
        } catch {
            await fs.writeFile(HISTORY_FILE, JSON.stringify(defaultHistoryData));
        }
    } catch (error) {
        console.error('Error initializing data files:', error);
    }
}

async function getCurrentMonthUsage() {
    try {
        const data = JSON.parse(await fs.readFile(USAGE_FILE, 'utf8'));
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        if (data.month !== currentMonth || data.year !== currentYear) {
            const newData = { ...defaultUsageData };
            await fs.writeFile(USAGE_FILE, JSON.stringify(newData));
            return newData;
        }
        return data;
    } catch (error) {
        console.error('Error reading usage data:', error);
        return { ...defaultUsageData };
    }
}

async function updateUsage(tokens, userId, question, answer) {
    try {
        const usage = await getCurrentMonthUsage();
        const cost = (tokens / 1000000) * 0.2;
        
        if (usage.totalCost + cost > MONTHLY_COST_LIMIT) {
            return false;
        }
        
        usage.totalCost += cost;
        usage.totalTokens += tokens;
        await fs.writeFile(USAGE_FILE, JSON.stringify(usage));
        
        const history = JSON.parse(await fs.readFile(HISTORY_FILE, 'utf8'));
        history.searches.push({
            userId,
            question,
            answer,
            tokens,
            cost,
            timestamp: new Date().toISOString(),
            month: usage.month,
            year: usage.year
        });
        await fs.writeFile(HISTORY_FILE, JSON.stringify(history));
        
        return true;
    } catch (error) {
        console.error('Error updating usage:', error);
        return false;
    }
}

module.exports = {
    initializeDataFiles,
    getCurrentMonthUsage,
    updateUsage,
    DATA_DIR,
    USAGE_FILE,
    HISTORY_FILE
};