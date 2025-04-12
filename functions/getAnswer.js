const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { question, conversationHistory = [] } = JSON.parse(event.body || '{}');

  try {
    console.log('Received request:', event.body); // Debug
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'https://interviewsassist.netlify.app',
        'X-Title': 'Instant Interview Assistant'
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5',
        messages: [...conversationHistory, { role: 'user', content: question }],
        max_tokens: 200,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter Error:', { status: response.status, errorText });
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const answer = data.choices[0]?.message?.content || 'No answer generated.';
    return {
      statusCode: 200,
      body: JSON.stringify({ answer }),
      headers: { 'Access-Control-Allow-Origin': 'https://interviewsassist.netlify.app' } // CORS
    };
  } catch (error) {
    console.error('Function Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch answer from OpenRouter API' }),
      headers: { 'Access-Control-Allow-Origin': 'https://interviewsassist.netlify.app' } // CORS
    };
  }
};
