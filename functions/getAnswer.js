const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { question, conversationHistory } = JSON.parse(event.body);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'https://interviewsassistant.netlify.app',
        'X-Title': 'Instant Interview Assistant'
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5',
        messages: conversationHistory,
        max_tokens: 200,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const answer = data.choices[0]?.message?.content || 'No answer.';
    return {
      statusCode: 200,
      body: JSON.stringify({ answer })
    };
  } catch (error) {
    console.error('Function Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch answer' })
    };
  }
};