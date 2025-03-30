const fetch = require('node-fetch');
const { API_CONFIG } = require('../config/config');

async function callPerplexityAPI(question) {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: API_CONFIG.model,
            messages: [
                {
                    role: 'system',
                    content: '간단명료하게 답변해주세요.'
                },
                {
                    role: 'user',
                    content: question
                }
            ],
            max_tokens: API_CONFIG.max_tokens,
            temperature: API_CONFIG.temperature,
        }),
    });

    return response.json();
}

module.exports = {
    callPerplexityAPI
};