function saveSession(question, answer, feedback) {
  const sessions = getSessions();
  const score = calculateScore(feedback); // Simple scoring based on feedback
  const session = {
    question,
    answer,
    feedback,
    score,
    timestamp: Date.now()
  };
  sessions.push(session);
  localStorage.setItem('sessions', JSON.stringify(sessions));
  updateHistory();
}

function getSessions() {
  return JSON.parse(localStorage.getItem('sessions')) || [];
}

function calculateScore(feedback) {
  let score = 0;
  if (feedback.clarity.includes('clear')) score += 3;
  if (feedback.structure.includes('Good')) score += 3;
  if (feedback.relevance.includes('relevant')) score += 3;
  return score; // Out of 9
}

function calculateProgress() {
  const sessions = getSessions();
  const totalSessions = sessions.length;
  const totalScore = sessions.reduce((sum, session) => sum + (session.score || 0), 0);
  const averageScore = totalSessions ? totalScore / totalSessions : 0;

  const improvementAreas = [];
  const recentSessions = sessions.slice(-5); // Last 5 sessions
  const clarityIssues = recentSessions.filter(s => s.feedback.clarity.includes('too short') || s.feedback.clarity.includes('filler')).length;
  const structureIssues = recentSessions.filter(s => s.feedback.structure.includes('Try to structure')).length;
  if (clarityIssues > 2) improvementAreas.push('Clarity');
  if (structureIssues > 2) improvementAreas.push('Structure');

  return { totalSessions, averageScore, improvementAreas };
}

function updateHistory() {
  const historyLog = document.getElementById('historyLog');
  if (!historyLog) return;
  historyLog.innerHTML = '';
  const sessions = getSessions();
  sessions.forEach(session => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${session.question}</td>
      <td class="status-completed">Completed</td>
      <td><button class="table-btn" onclick="viewSession('${session.question}')">View</button></td>
    `;
    historyLog.appendChild(row);
  });
}

function viewSession(question) {
  const sessions = getSessions();
  const session = sessions.find(s => s.question === question);
  if (session) {
    alert(`Question: ${session.question}\nAnswer: ${session.answer}\nFeedback: ${session.feedback.clarity}`);
  }
}

function downloadSession() {
  const sessions = getSessions();
  const data = JSON.stringify(sessions, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'interview_sessions.json';
  a.click();
  URL.revokeObjectURL(url);
}

function shareSession() {
  const sessions = getSessions();
  const text = sessions.map(s => `Question: ${s.question}\nAnswer: ${s.answer}`).join('\n\n');
  if (navigator.share) {
    navigator.share({
      title: 'My Interview Sessions',
      text: text
    });
  } else {
    alert('Share feature not supported. Here is your session data:\n\n' + text);
  }
}