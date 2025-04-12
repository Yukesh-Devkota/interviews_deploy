// Global error handler to prevent uncaught exceptions
window.addEventListener('error', (event) => {
  console.error('Global error:', event.message, event.filename, event.lineno);
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

// DOM Elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const status = document.getElementById('status');
const liveTranscript = document.getElementById('liveTranscript');
const questionSpan = document.getElementById('question');
const answerSpan = document.getElementById('answer');
const languageSelect = document.getElementById('language');
const questionSet = document.getElementById('questionSet');
const customQuestion = document.getElementById('customQuestion');
const feedback = document.getElementById('feedback');
const spinner = document.getElementById('spinner');
const waveform = document.getElementById('waveform');
const rating = document.getElementById('rating');
const historyLog = document.getElementById('historyLog');
const downloadBtn = document.getElementById('downloadBtn');
const shareBtn = document.getElementById('shareBtn');

let recognition;
let isListening = false;
let currentSession = null;

const questions = {
  tech: ['What is a closure in JavaScript?', 'Explain the difference between let and const.'],
  hr: ['Why do you want to work here?', 'What are your salary expectations?'],
  behavioral: ['Tell me about a time you faced a challenge.', 'How do you handle stress?']
};

// Wait for Supabase initialization
function initializeSupabase() {
  return new Promise((resolve) => {
    const checkSupabase = setInterval(() => {
      if (window.supabase && typeof window.supabase.auth.getSession === 'function') {
        clearInterval(checkSupabase);
        console.log('Supabase initialized successfully');
        resolve();
      } else {
        console.log('Waiting for Supabase initialization...');
      }
    }, 100);
  });
}

// Initialize Speech Recognition
async function initializeSpeechRecognition() {
  try {
    console.log('Initializing SpeechRecognition...');
    await initializeSupabase(); // Wait for Supabase
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('SpeechRecognition API not supported in this browser.');
      status.textContent = 'Speech Recognition API not supported in this browser.';
      startBtn.disabled = true;
      return;
    }

    recognition = new SpeechRecognition();
    console.log('SpeechRecognition initialized with lang:', languageSelect.value);
    recognition.lang = languageSelect.value;
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = async (event) => {
      console.log('onresult triggered, results length:', event.results.length);
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      liveTranscript.textContent = interimTranscript || finalTranscript;
      console.log('Transcript:', { interimTranscript, finalTranscript });

      if (finalTranscript) {
        const selectedQuestion = customQuestion.value || 
          (questionSet.value ? questions[questionSet.value][Math.floor(Math.random() * questions[questionSet.value].length)] : finalTranscript);
        
        questionSpan.textContent = selectedQuestion;
        liveTranscript.textContent = finalTranscript;
        showSpinner();

        try {
          const { answer, feedback: feedbackData } = await getAnswer(selectedQuestion);
          answerSpan.textContent = answer || 'No answer generated.';
          renderRating();
          currentSession = { question: selectedQuestion, userAnswer: finalTranscript, aiAnswer: answer, feedback: feedbackData, timestamp: new Date().toISOString() };
          saveSession(selectedQuestion, finalTranscript, answer, feedbackData);
          displayFeedback(feedbackData);
          updateHistory();
        } catch (error) {
          console.error('API Error:', error);
          answerSpan.textContent = 'Error fetching answer: ' + (error.message || 'Unknown error');
          feedback.textContent = 'Failed to generate answer.';
        } finally {
          hideSpinner();
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Recognition error:', event.error, event.message);
      status.textContent = `Error occurred: ${event.error} - ${event.message || 'No message'}`;
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        alert('Microphone access denied. Please allow permission in your browser.');
      } else if (event.error === 'no-speech' || event.error === 'aborted') {
        status.textContent += ' Please try again or check your microphone.';
      }
      stopListening();
    };

    recognition.onend = () => {
      console.log('Recognition ended, isListening:', isListening, 'error:', recognition.error);
      if (isListening && !recognition.error) {
        setTimeout(() => {
          if (isListening) {
            console.log('Restarting recognition...');
            recognition.start();
          }
        }, 100); // Delay to prevent rapid cycling
      } else {
        status.textContent = 'Stopped listening';
        hideWaveform();
        startBtn.disabled = false;
        stopBtn.disabled = true;
      }
    };

    recognition.onstart = () => {
      console.log('Recognition started');
      status.textContent = 'Listening...';
      showWaveform();
    };
  } catch (error) {
    console.error('SpeechRecognition initialization error:', error);
    status.textContent = 'Failed to initialize speech recognition: ' + error.message;
    startBtn.disabled = true;
  }
}

// API Call to Netlify Function
async function getAnswer(question) {
  try {
    const apiUrl = 'https://interviewsassist.netlify.app/.netlify/functions/getanswer';

    // Check if Supabase is available
    if (!window.supabase || typeof window.supabase.auth.getSession !== 'function') {
      console.error('Supabase not initialized');
      throw new Error('Supabase authentication is not available');
    }

    const { data: { session } } = await window.supabase.auth.getSession();
    const token = session?.access_token;

    console.log('Sending request to:', apiUrl, 'with token:', !!token);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.REQUIRE_AUTH === 'true' && token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({ question, conversationHistory: [] })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Fetch Error:', { status: response.status, errorText });
      throw new Error(`Failed to fetch answer: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    console.log('API Response:', data);
    return data;
  } catch (error) {
    throw error;
  }
}

// UI Functions
function showSpinner() { spinner.style.display = 'block'; }
function hideSpinner() { spinner.style.display = 'none'; }
function showWaveform() { waveform.style.display = 'block'; }
function hideWaveform() { waveform.style.display = 'none'; }

function renderRating() {
  rating.innerHTML = '<span data-value="1">★</span><span data-value="2">★</span><span data-value="3">★</span><span data-value="4">★</span><span data-value="5">★</span>';
  const stars = rating.querySelectorAll('span');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      const value = parseInt(star.getAttribute('data-value'));
      stars.forEach(s => s.classList.remove('filled'));
      for (let i = 0; i < value; i++) stars[i].classList.add('filled');
      if (currentSession) {
        currentSession.rating = value;
        saveSession(currentSession.question, currentSession.userAnswer, currentSession.aiAnswer, currentSession.feedback, value);
      }
    });
  });
  rating.querySelectorAll('span').forEach(s => s.classList.add('star'));
}

async function saveSession(question, userAnswer, aiAnswer, feedbackData, rating = null) {
  if (!window.supabase) return console.error('Supabase not initialized');
  const { data: { session } } = await window.supabase.auth.getSession();
  if (!session) return console.error('No active session');
  const userId = session.user.id;
  const sessionData = { user_id: userId, question, user_answer: userAnswer, ai_answer: aiAnswer, feedback: feedbackData, rating, created_at: new Date().toISOString() };
  const { error } = await window.supabase.from('sessions').insert([sessionData]);
  if (error) console.error('Save Error:', error);
  else console.log('Session saved');
}

async function updateHistory() {
  if (!window.supabase) return console.error('Supabase not initialized');
  const { data: { session } } = await window.supabase.auth.getSession();
  if (!session) return console.error('No active session');
  const userId = session.user.id;
  const { data, error } = await window.supabase.from('sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) console.error('History Error:', error);
  else {
    historyLog.innerHTML = '';
    data.forEach(session => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${session.question}</td>
        <td>Completed</td>
        <td><button>View</button></td>
      `;
      historyLog.appendChild(tr);
    });
  }
}

function displayFeedback(feedbackData) {
  feedback.innerHTML = `
    <strong>Feedback:</strong><br>
    <strong>Clarity:</strong> ${feedbackData.clarity || 'N/A'}<br>
    <strong>Structure:</strong> ${feedbackData.structure || 'N/A'}<br>
    <strong>Relevance:</strong> ${feedbackData.relevance || 'N/A'}<br>
    <strong>Improvement Tips:</strong><br>
    ${feedbackData.tips?.length ? feedbackData.tips.map(tip => `- ${tip}`).join('<br>') : 'No specific tips.'}
  `;
}

function downloadSession() {
  if (!currentSession) return alert('No session to download');
  const sessionText = `Question: ${currentSession.question}\nYour Answer: ${currentSession.userAnswer}\nAI Answer: ${currentSession.aiAnswer}\nFeedback:\n- Clarity: ${currentSession.feedback.clarity || 'N/A'}\n- Structure: ${currentSession.feedback.structure || 'N/A'}\n- Relevance: ${currentSession.feedback.relevance || 'N/A'}\n- Improvement Tips: ${currentSession.feedback.tips?.join(', ') || 'None'}\nRating: ${currentSession.rating || 'Not rated'}\nTimestamp: ${currentSession.timestamp}`;
  const blob = new Blob([sessionText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `interview-session-${currentSession.timestamp}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

async function shareSession() {
  if (!currentSession) return alert('No session to share');
  const shareData = { title: 'Interview Session', text: `Question: ${currentSession.question}\nYour Answer: ${currentSession.userAnswer}\nAI Answer: ${currentSession.aiAnswer}`, url: window.location.href };
  try { await navigator.share(shareData); } catch (error) { console.error('Share Error:', error); alert('Sharing not supported on this device/browser.'); }
}

// Event Listeners
startBtn.addEventListener('click', () => {
  if (!isListening) {
    try {
      console.log('Starting recognition...');
      recognition.start();
      isListening = true;
      status.textContent = 'Listening...';
      showWaveform();
      questionSpan.textContent = '';
      answerSpan.textContent = '';
      liveTranscript.textContent = '';
      feedback.textContent = '';
      startBtn.disabled = true;
      stopBtn.disabled = false;
    } catch (error) {
      console.error('Start error:', error);
      status.textContent = 'Failed to start listening: ' + error.message;
    }
  }
});

stopBtn.addEventListener('click', () => {
  stopListening();
});

function stopListening() {
  try {
    console.log('Stopping recognition...');
    recognition.stop();
    isListening = false;
    status.textContent = 'Stopped listening';
    hideWaveform();
    startBtn.disabled = false;
    stopBtn.disabled = true;
  } catch (error) {
    console.error('Stop error:', error);
  }
}

languageSelect.addEventListener('change', () => {
  recognition.lang = languageSelect.value;
  if (isListening) {
    stopListening();
    setTimeout(() => {
      if (isListening) recognition.start();
    }, 100);
  }
});

questionSet.addEventListener('change', () => {
  customQuestion.disabled = questionSet.value !== '';
});

downloadBtn.addEventListener('click', downloadSession);
shareBtn.addEventListener('click', shareSession);

// Initialize
try {
  console.log('Initializing application...');
  initializeSpeechRecognition();
  updateHistory();
} catch (error) {
  console.error('Initialization error:', error);
  status.textContent = 'Failed to initialize: ' + error.message;
}
