console.log('auth.js loaded');

let supabase;
let isAuthInitialized = false;

async function waitForSupabaseScript(timeout = 10000) {
  const supabaseScript = document.getElementById('supabaseScript');
  if (!supabaseScript) throw new Error('Supabase script not found');
  return new Promise((resolve, reject) => {
    if (typeof window.supabase !== 'undefined') return resolve();
    supabaseScript.addEventListener('load', resolve);
    supabaseScript.addEventListener('error', () => reject(new Error('Supabase script failed to load')));
    setTimeout(() => reject(new Error('Supabase script load timed out')), timeout);
  });
}

async function initializeSupabase() {
  console.log('Initializing Supabase...');
  try {
    supabase = window.supabase.createClient(
      'https://fadrnmgjulvdoymevqhf.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhZHJubWdqdWx2ZG95bWV2cWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5OTA3NzEsImV4cCI6MjA1ODU2Njc3MX0.XvyVNkjvTiVA5i0Abs1WIIhY-5i9fXfoxMrgIiuoOsA'
    );
    console.log('Supabase initialized');
    return true;
  } catch (error) {
    console.error('Supabase init failed:', error.message);
    return false;
  }
}

async function initializeAuth() {
  if (isAuthInitialized) return;
  console.log('initializeAuth called');
  isAuthInitialized = true;

  try {
    await waitForSupabaseScript();
    if (!await initializeSupabase()) throw new Error('Supabase init failed');

    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) console.error('Session error:', error.message);
    else if (session) {
      console.log('Active session:', session);
      localStorage.setItem('isLoggedIn', 'true');
      updateUserProfile(session.user.email);
      if (isLoginPage()) window.location.href = '/dashboard.html';
      return;
    } else {
      console.log('No session');
      localStorage.removeItem('isLoggedIn');
      handleAuthForm();
    }

    supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state:', event, session);
      if (event === 'SIGNED_IN' && session) {
        localStorage.setItem('isLoggedIn', 'true');
        updateUserProfile(session.user.email);
        if (isLoginPage()) window.location.href = '/dashboard.html';
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('isLoggedIn');
        updateUserProfile(null);
        if (!isPublicPage()) window.location.href = '/index.html';
      }
    });

  } catch (error) {
    console.error('Auth init failed:', error.message);
    showFeedback('Auth unavailable. Refresh the page.');
  }
}

function isLoginPage() {
  return window.location.pathname === '/login.html' || window.location.pathname === '/';
}

function isPublicPage() {
  return window.location.pathname === '/index.html' || window.location.pathname === '/login.html' || window.location.pathname === '/';
}

function updateUserProfile(email) {
  const userProfile = document.getElementById('userProfile');
  if (userProfile) userProfile.textContent = email || 'User Profile';
  const welcomeUserName = document.getElementById('welcomeUserName');
  const sidebarUserName = document.getElementById('sidebarUserName');
  if (welcomeUserName) welcomeUserName.textContent = email.split('@')[0] || 'User';
  if (sidebarUserName) sidebarUserName.textContent = email.split('@')[0] || 'User';
}

function showFeedback(message) {
  const feedback = document.getElementById('authFeedback');
  if (feedback) {
    feedback.textContent = message;
    feedback.classList.add('show');
    setTimeout(() => feedback.classList.remove('show'), 3000);
  }
}

function handleAuthForm() {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const activePanel = document.querySelector('.slider-panel.active');

  if (activePanel.classList.contains('login-panel')) {
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        if (!email || !password) {
          showFeedback('Please enter both email and password.');
          return;
        }
        try {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
        } catch (error) {
          console.error('Login error:', error.message);
          showFeedback('Login failed: ' + error.message);
        }
      });
    }
  } else if (activePanel.classList.contains('signup-panel')) {
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value.trim();
        if (!email || !password) {
          showFeedback('Please enter both email and password.');
          return;
        }
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/dashboard.html` }
          });
          if (error) throw error;
          console.log('Signup successful:', data);
          if (data.session) {
            await supabase.auth.setSession(data.session);
            window.location.href = '/dashboard.html';
          } else {
            showFeedback('Signup successful! Check your email to confirm, then log in.');
          }
        } catch (error) {
          console.error('Signup error:', error.message);
          showFeedback('Signup failed: ' + error.message);
        }
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthInitialized) initializeAuth();
});
