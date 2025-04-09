let conversationHistory = [];

async function getAnswer(question) {
  conversationHistory.push({ role: 'user', content: question });

  // Dynamically set the API endpoint based on environment
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const apiUrl = isLocal 
    ? 'http://localhost:3000/api/getAnswer' 
    : '/.netlify/functions/getAnswer';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question,
        conversationHistory
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const answer = data.answer || 'No answer.';
    conversationHistory.push({ role: 'assistant', content: answer });
    return { answer, feedback: generateFeedback(answer) };
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

function generateFeedback(answer) {
  let feedback = {
    clarity: '',
    structure: '',
    relevance: '',
    tips: []
  };

  // Analyze clarity (simplified: check length and presence of filler words)
  const words = answer.split(' ').length;
  const fillerWords = ['um', 'uh', 'like', 'you know'];
  const fillerCount = fillerWords.reduce((count, filler) => 
    count + (answer.toLowerCase().split(filler).length - 1), 0);
  feedback.clarity = words < 20 ? 'Your answer is too short. Try to elaborate more.' :
                    fillerCount > 2 ? 'You used filler words (e.g., "um", "uh") too often. Try to speak more confidently.' :
                    'Your answer is clear and well-spoken.';

  // Analyze structure (check for key phrases indicating structure)
  const hasStructure = answer.toLowerCase().includes('for example') || 
                      answer.toLowerCase().includes('first') || 
                      answer.toLowerCase().includes('then');
  feedback.structure = hasStructure ? 'Good structure! You used examples or a clear sequence.' :
                      'Try to structure your answer better. Use the STAR method (Situation, Task, Action, Result) for behavioral questions.';

  // Analyze relevance (simplified: check if answer mentions the question topic)
  feedback.relevance = answer.length > 10 ? 'Your answer seems relevant.' :
                       'Your answer is too brief to assess relevance. Provide more details.';

  // Provide improvement tips
  if (words < 20) feedback.tips.push('Elaborate more by providing specific examples.');
  if (fillerCount > 2) feedback.tips.push('Reduce filler words to sound more confident.');
  if (!hasStructure) feedback.tips.push('Use the STAR method to organize your thoughts.');

  return feedback;
}

function renderRating() {
  const ratingDiv = document.getElementById('rating');
  ratingDiv.innerHTML = 'Rate: ' + [1, 2, 3, 4, 5].map(n => 
    `<span class="star" data-value="${n}">★</span>`).join('');
  ratingDiv.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', () => {
      const value = star.dataset.value;
      ratingDiv.querySelectorAll('.star').forEach(s => s.classList.toggle('active', s.dataset.value <= value));
    });
  });
}