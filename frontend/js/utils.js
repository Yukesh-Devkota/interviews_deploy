function showSpinner() {
  document.getElementById('spinner').classList.add('active');
}

function hideSpinner() {
  document.getElementById('spinner').classList.remove('active');
}

function showWaveform() {
  document.getElementById('waveform').classList.add('active');
}

function hideWaveform() {
  document.getElementById('waveform').classList.remove('active');
}

async function parseResume(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target.result;
      const resumeData = {
        skills: [],
        jobRole: '',
        experienceLevel: ''
      };

      const textLower = text.toLowerCase();
      const skillsList = ['javascript', 'python', 'java', 'sql', 'react', 'node.js'];
      resumeData.skills = skillsList.filter(skill => textLower.includes(skill));

      if (textLower.includes('software engineer') || textLower.includes('developer')) {
        resumeData.jobRole = 'software engineer';
      } else if (textLower.includes('manager')) {
        resumeData.jobRole = 'manager';
      }

      if (textLower.includes('junior') || textLower.includes('entry-level')) {
        resumeData.experienceLevel = 'entry-level';
      } else if (textLower.includes('senior') || textLower.includes('lead')) {
        resumeData.experienceLevel = 'senior';
      } else {
        resumeData.experienceLevel = 'mid-level';
      }

      resolve(resumeData);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function getPersonalizedQuestion(category) {
  const resumeData = JSON.parse(localStorage.getItem('resumeData')) || {};
  const userDetails = JSON.parse(localStorage.getItem('userDetails')) || {};
  const defaultQuestions = {
    tech: ['What is a closure in JavaScript?', 'Explain the difference between let and const.'],
    hr: ['Why do you want to work here?', 'What are your salary expectations?'],
    behavioral: ['Tell me about a time you faced a challenge.', 'How do you handle stress?']
  };

  const personalizedQuestions = {
    tech: {
      'software engineer': [
        `Explain a project where you used ${resumeData.skills[0] || 'JavaScript'} at ${userDetails.companyDetails || 'a company'}.`,
        'How do you handle debugging in a large codebase?'
      ],
      'manager': [
        `How do you manage a technical team at ${userDetails.companyDetails || 'a company'}?`,
        'What tools do you use for project management?'
      ]
    },
    hr: {
      'software engineer': [
        `What motivates you to work in software development at ${userDetails.companyDetails || 'a company'}?`,
        'How do you stay updated with new technologies?'
      ],
      'manager': [
        `How do you handle conflicts in your team at ${userDetails.companyDetails || 'a company'}?`,
        'What’s your leadership style?'
      ]
    },
    behavioral: {
      'software engineer': [
        'Tell me about a time you solved a complex coding problem.',
        `How do you handle tight deadlines in a project at ${userDetails.companyDetails || 'a company'}?`
      ],
      'manager': [
        `Describe a time you led a team through a challenge at ${userDetails.companyDetails || 'a company'}.`,
        'How do you motivate your team?'
      ]
    }
  };

  const jobRole = userDetails.jobRole || resumeData.jobRole || '';
  const interviewType = userDetails.interviewType || category;
  const questionsForRole = personalizedQuestions[interviewType]?.[jobRole.toLowerCase()] || defaultQuestions[category] || [];
  return questionsForRole[Math.floor(Math.random() * questionsForRole.length)] || defaultQuestions[category][Math.floor(Math.random() * defaultQuestions[category].length)];
}