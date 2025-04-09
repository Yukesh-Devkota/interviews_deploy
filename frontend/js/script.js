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

let recognition;
let isListening = false;

const questions = {
  tech: ['What is a closure in JavaScript?', 'Explain the difference between let and const.'],
  hr: ['Why do you want to work here?', 'What are your salary expectations?'],
  behavioral: ['Tell me about a time you faced a challenge.', 'How do you handle stress?']
};

function initializeSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    status.textContent = 'Speech Recognition API not supported in this browser.';
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
      liveTranscript.textContent = finalTranscript;
      showSpinner();

      try {
        const { answer, feedback: feedbackData } = await getAnswer(selectedQuestion);
        answerSpan.textContent = answer;
        renderRating();
        saveSession(selectedQuestion, answer, feedbackData);
        displayFeedback(feedbackData);
      } catch (error) {
        answerSpan.textContent = 'Error fetching answer.';
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

startBtn.addEventListener('click', () => {
  recognition.start();
  isListening = true;
  status.textContent = 'Listening...';
  showWaveform();
  questionSpan.textContent = '';
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