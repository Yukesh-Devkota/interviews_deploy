const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend'))); // Adjust if needed

// API endpoint to proxy OpenRouter requests
app.post('/api/getAnswer', async (req, res) => {
  const { question, conversationHistory } = req.body;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000', // Use env var for Render
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
    res.json({ answer });
  } catch (error) {
    console.error('Backend API Error:', error);
    res.status(500).json({ error: 'Failed to fetch answer' });
  }
});

// Serve live-interview.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'live-interview.html')); // Match your main HTML
});

module.exports = app;