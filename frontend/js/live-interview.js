function initializeLiveInterview() {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const status = document.getElementById('status');
  const liveTranscript = document.getElementById('liveTranscript');
  const liveTranscriptFinal = document.getElementById('liveTranscriptFinal');
  const questionSpan = document.getElementById('question');
  const answerSpan = document.getElementById('answer');
  const languageSelect = document.getElementById('language');
  const questionSet = document.getElementById('questionSet');
  const customQuestion = document.getElementById('customQuestion');
  const feedback = document.getElementById('feedback');
  const spinner = document.getElementById('spinner');
  const waveform = document.getElementById('waveform');
  const rating = document.getElementById('rating');
  const historyList = document.getElementById('historyList');

  let recognition;
  let isListening = false;
  let currentSession = null;

  const questions = {
    tech: ['What is a closure in JavaScript?', 'Explain the difference between let and const.'],
    hr: ['Why do you want to work here?', 'What are your salary expectations?'],
    behavioral: ['Tell me about a time you faced a challenge.', 'How do you handle stress?']
  };

  function initializeSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      status.textContent = 'Speech Recognition API not supported in this browser.';
      startBtn.setAttribute('disabled', 'true');
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = languageSelect.value;
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = async event => {
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

      if (finalTranscript) {
        const selectedQuestion = customQuestion.value || 
          (questionSet.value ? questions[questionSet.value][Math.floor(Math.random() * questions[questionSet.value].length)] : finalTranscript);
        
        questionSpan.textContent = selectedQuestion;
        liveTranscript.textContent = '';
        liveTranscriptFinal.textContent = finalTranscript;
        showSpinner();

        try {
          const { answer, feedback: feedbackData } = await getAnswer(selectedQuestion);
          answerSpan.textContent = answer;
          renderRating();
          currentSession = { question: selectedQuestion, userAnswer: finalTranscript, aiAnswer: answer, feedback: feedbackData, timestamp: new Date().toISOString() };
          saveSession(selectedQuestion, finalTranscript, answer, feedbackData);
          displayFeedback(feedbackData);
          updateHistory();
        } catch (error) {
          console.error('Error fetching answer:', error);
          answerSpan.textContent = 'Error fetching answer: ' + error.message;
          feedback.textContent = 'Failed to generate answer.';
        } finally {
          hideSpinner();
        }
      }
    };

    recognition.onerror = event => {
      status.textContent = `Error occurred: ${event.error}`;
      stopListening();
    };

    recognition.onend = () => {
      if (isListening) recognition.start();
    };
  }

  async function getAnswer(question) {
    const response = await fetch('http://localhost:3000/api/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    if (!response.ok) {
      throw new Error('Failed to fetch answer from backend');
    }
    return await response.json();
  }

  function showSpinner() {
    spinner.style.display = 'block';
  }

  function hideSpinner() {
    spinner.style.display = 'none';
  }

  function showWaveform() {
    waveform.style.display = 'block';
  }

  function hideWaveform() {
    waveform.style.display = 'none';
  }

  function renderRating() {
    const stars = rating.querySelectorAll('span');
    stars.forEach(star => {
      star.addEventListener('click', () => {
        const value = parseInt(star.getAttribute('data-value'));
        stars.forEach(s => s.classList.remove('filled'));
        for (let i = 0; i < value; i++) {
          stars[i].classList.add('filled');
        }
        if (currentSession) {
          currentSession.rating = value;
          saveSession(currentSession.question, currentSession.userAnswer, currentSession.aiAnswer, currentSession.feedback, value);
        }
      });
    });
  }

  async function saveSession(question, userAnswer, aiAnswer, feedbackData, rating = null) {
    if (!supabase) {
      console.error('Supabase not initialized, cannot save session');
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session, cannot save');
        return;
      }
      const userId = session.user.id;
      const sessionData = {
        user_id: userId,
        question,
        user_answer: userAnswer,
        ai_answer: aiAnswer,
        feedback: feedbackData,
        rating,
        created_at: new Date().toISOString()
      };
      const { error } = await supabase.from('sessions').insert([sessionData]);
      if (error) {
        console.error('Error saving session:', error);
      } else {
        console.log('Session saved successfully');
      }
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  async function updateHistory() {
    if (!supabase) {
      console.error('Supabase not initialized, cannot update history');
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session, cannot fetch history');
        return;
      }
      const userId = session.user.id;
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching history:', error);
        return;
      }
      historyList.innerHTML = '';
      data.forEach(session => {
        const li = document.createElement('li');
        li.innerHTML = `
          <strong>Question:</strong> ${session.question}<br>
          <strong>Your Answer:</strong> ${session.user_answer}<br>
          <strong>AI Answer:</strong> ${session.ai_answer}<br>
          <strong>Timestamp:</strong> ${new Date(session.created_at).toLocaleString()}
        `;
        historyList.appendChild(li);
      });
    } catch (error) {
      console.error('Error updating history:', error);
    }
  }

  function displayFeedback(feedbackData) {
    feedback.innerHTML = `
      <strong>Feedback:</strong><br>
      <strong>Clarity:</strong> ${feedbackData.clarity}<br>
      <strong>Structure:</strong> ${feedbackData.structure}<br>
      <strong>Relevance:</strong> ${feedbackData.relevance}<br>
      <strong>Improvement Tips:</strong><br>
      ${feedbackData.tips.length ? feedbackData.tips.map(tip => `- ${tip}`).join('<br>') : 'No specific tips.'}
    `;
  }

  function downloadSession() {
    if (!currentSession) {
      alert('No session to download');
      return;
    }
    const sessionText = `
      Question: ${currentSession.question}
      Your Answer: ${currentSession.userAnswer}
      AI Answer: ${currentSession.aiAnswer}
      Feedback:
      - Clarity: ${currentSession.feedback.clarity}
      - Structure: ${currentSession.feedback.structure}
      - Relevance: ${currentSession.feedback.relevance}
      - Improvement Tips: ${currentSession.feedback.tips.join(', ')}
      Rating: ${currentSession.rating || 'Not rated'}
      Timestamp: ${currentSession.timestamp}
    `;
    const blob = new Blob([sessionText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-session-${currentSession.timestamp}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function shareSession() {
    if (!currentSession) {
      alert('No session to share');
      return;
    }
    const shareData = {
      title: 'Interview Session',
      text: `
        Question: ${currentSession.question}
        Your Answer: ${currentSession.userAnswer}
        AI Answer: ${currentSession.aiAnswer}
      `,
      url: window.location.href
    };
    try {
      await navigator.share(shareData);
    } catch (error) {
      console.error('Error sharing session:', error);
      alert('Sharing is not supported on this device/browser.');
    }
  }

  startBtn.addEventListener('click', () => {
    recognition.start();
    isListening = true;
    status.textContent = 'Listening...';
    showWaveform();
    questionSpan.textContent = '';
    liveTranscriptFinal.textContent = '';
    answerSpan.textContent = '';
    liveTranscript.textContent = '';
    feedback.textContent = '';
    startBtn.setAttribute('disabled', 'true');
    stopBtn.removeAttribute('disabled');
  });

  stopBtn.addEventListener('click', () => {
    stopListening();
  });

  function stopListening() {
    recognition.stop();
    isListening = false;
    status.textContent = 'Stopped listening';
    hideWaveform();
    startBtn.removeAttribute('disabled');
    stopBtn.setAttribute('disabled', 'true');
  }

  languageSelect.addEventListener('change', () => {
    recognition.lang = languageSelect.value;
    if (isListening) {
      recognition.stop();
      recognition.start();
    }
  });

  questionSet.addEventListener('change', () => {
    customQuestion.disabled = questionSet.value !== '';
  });

  document.getElementById('downloadBtn').addEventListener('click', downloadSession);
  document.getElementById('shareBtn').addEventListener('click', shareSession);

  initializeSpeechRecognition();
  updateHistory();
}