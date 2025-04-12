console.log('auth.js loaded');

let supabase;
let isAuthInitialized = false;

async function waitForSupabaseScript(timeout = 10000) {
  const supabaseScript = document.getElementById('supabaseScript');
  if (!supabaseScript) throw new Error('Supabase script not found');
  return new Promise((resolve, reject) => {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) return resolve();
    supabaseScript.addEventListener('load', resolve);
    supabaseScript.addEventListener('error', () => reject(new Error('Supabase script failed to load')));
    setTimeout(() => reject(new Error('Supabase script load timed out')), timeout);
  });
}

async function initializeSupabase() {
  console.log('Initializing Supabase...');
  try {
    // Assign to window.supabase
    window.supabase = supabase = supabase.createClient(
      'https://fadrnmgjulvdoymevqhf.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhZHJubWdqdWx2ZG95bWV2cWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5OTA3NzEsImV4cCI6MjA1ODU2Njc3MX0.XvyVNkjvTiVA5i0Abs1WIIhY-5i9fXfoxMrgIiuoOsA'
    );
    console.log('Supabase initialized:', window.supabase);
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

    const { data: { session }, error } = await window.supabase.auth.getSession();
    if (error) console.error('Session error:', error.message);
    else if (session) {
      console.log('Active session:', session);
      localStorage.setItem('isLoggedIn', 'true');
      updateUserProfile(session.user.email);
      window.location.href = '/dashboard.html';
      return;
    } else {
      console.log('No session');
      localStorage.removeItem('isLoggedIn');
      handleAuthForms();
    }

    window.supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state:', event, session);
      if (event === 'SIGNED_IN' && session) {
        localStorage.setItem('isLoggedIn', 'true');
        updateUserProfile(session.user.email);
        window.location.href = '/dashboard.html';
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('isLoggedIn');
        updateUserProfile(null);
        if (window.location.pathname !== '/login.html') window.location.href = '/login.html';
      }
    });

  } catch (error) {
    console.error('Auth init failed:', error.message);
    showFeedback('loginError', 'Auth unavailable. Refresh the page.');
  }
}

function updateUserProfile(email) {
  const userProfile = document.getElementById('userProfile');
  if (userProfile) userProfile.textContent = email || 'User Profile';
  const welcomeUserName = document.getElementById('welcomeUserName');
  const sidebarUserName = document.getElementById('sidebarUserName');
  if (welcomeUserName) welcomeUserName.textContent = email ? email.split('@')[0] : 'User';
  if (sidebarUserName) sidebarUserName.textContent = email ? email.split('@')[0] : 'User';
}

function showFeedback(elementId, message) {
  const feedback = document.getElementById(elementId);
  if (feedback) {
    feedback.textContent = message;
    feedback.classList.add('show');
    setTimeout(() => feedback.classList.remove('show'), 3000);
  }
}

function handleAuthForms() {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const submitLogin = document.getElementById('submitLogin');
  const submitSignup = document.getElementById('submitSignup');

  if (loginForm && loginForm.classList.contains('active')) {
    submitLogin.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email')?.value.trim();
      const password = document.getElementById('password')?.value.trim();
      if (!email || !password) {
        showFeedback('loginError', 'Please enter both email and password.');
        return;
      }
      try {
        const { error } = await window.supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } catch (error) {
        console.error('Login error:', error.message);
        showFeedback('loginError', 'Login failed: ' + error.message);
      }
    });
  }

  if (signupForm && signupForm.classList.contains('active')) {
    submitSignup.addEventListener('click', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signupName')?.value.trim();
      const email = document.getElementById('signupEmail')?.value.trim();
      const password = document.getElementById('signupPassword')?.value.trim();
      if (!name || !email || !password) {
        showFeedback('signupError', 'Please fill all fields.');
        return;
      }
      try {
        const { data, error } = await window.supabase.auth.signUp({
          email,
          password,
          options: { data: { name }, emailRedirectTo: `${window.location.origin}/login.html` }
        });
        if (error) throw error;
        console.log('Signup successful:', data);
        if (data.session) {
          await window.supabase.auth.setSession(data.session);
          window.location.href = '/dashboard.html';
        } else {
          showFeedback('signupError', 'Signup successful! Check your email to confirm.');
          document.getElementById('signupForm').style.display = 'none';
          document.getElementById('loginForm').style.display = 'block';
          document.getElementById('loginForm').classList.add('active');
          document.getElementById('signupForm').classList.remove('active');
        }
      } catch (error) {
        console.error('Signup error:', error.message);
        showFeedback('signupError', 'Signup failed: ' + error.message);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthInitialized) initializeAuth();
});
