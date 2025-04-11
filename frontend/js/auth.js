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

    // Handle Google OAuth token from URL hash
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      console.log('Access token in URL:', hash);
      const params = new URLSearchParams(hash.replace('#', ''));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ 
          access_token: accessToken, 
          refresh_token: refreshToken 
        });
        if (error) throw error;
        console.log('Session set from Google OAuth');
        // Redirect to clean URL to avoid hash issues
        window.location = '/dashboard.html';
        return;
      }
    }

    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) console.error('Session error:', error.message);
    else if (session) {
      console.log('Active session:', session);
      localStorage.setItem('isLoggedIn', 'true');
      updateUserProfile(session.user.email);
      if (isLoginPage()) {
        console.log('Redirecting to dashboard.html');
        window.location.href = '/dashboard.html';
        return;
      }
    } else {
      console.log('No session');
      localStorage.removeItem('isLoggedIn');
      if (!isPublicPage()) {
        console.log('Redirecting to login.html');
        window.location.href = '/login.html';
        return;
      }
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

    setupLoginButtons();
    setupSignupButton();

  } catch (error) {
    console.error('Auth init failed:', error.message);
    showFeedback('Auth unavailable. Refresh the page.');
    setupLoginButtonsWithError();
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
  const feedback = document.getElementById('loginError');
  if (feedback) {
    feedback.textContent = message;
    feedback.classList.add('show');
    setTimeout(() => feedback.classList.remove('show'), 3000);
  }
}

function setupLoginButtonsWithError() {
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  if (googleLoginBtn) googleLoginBtn.addEventListener('click', () => showFeedback('Auth not ready. Try later.'));

  const emailLoginBtn = document.getElementById('emailLoginBtn');
  const emailForm = document.getElementById('emailForm');
  if (emailLoginBtn && emailForm) {
    emailLoginBtn.addEventListener('click', () => {
      emailForm.style.display = emailForm.style.display === 'none' ? 'flex' : 'none';
    });
  }
}

function setupLoginButtons() {
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
      googleLoginBtn.disabled = true;
      try {
        const redirectUrl = `${window.location.origin}/dashboard.html`;
        console.log('Google redirect to:', redirectUrl);
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: redirectUrl }
        });
        if (error) throw error;
      } catch (error) {
        console.error('Google login error:', error.message);
        showFeedback('Google login failed: ' + error.message);
      } finally {
        googleLoginBtn.disabled = false;
      }
    });
  }

  const emailLoginBtn = document.getElementById('emailLoginBtn');
  const emailForm = document.getElementById('emailForm');
  if (emailLoginBtn && emailForm) {
    emailLoginBtn.addEventListener('click', () => {
      emailForm.style.display = emailForm.style.display === 'none' ? 'flex' : 'none';
    });
  }

  const submitEmailLogin = document.getElementById('submitEmailLogin');
  if (submitEmailLogin) {
    submitEmailLogin.addEventListener('click', async () => {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();
      if (!email || !password) {
        showFeedback('Please enter both email and password.');
        return;
      }
      submitEmailLogin.disabled = true;
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        console.log('Email login successful');
      } catch (error) {
        console.error('Email login error:', error.message);
        showFeedback('Login failed: ' + error.message);
      } finally {
        submitEmailLogin.disabled = false;
      }
    });
  }
}

function setupSignupButton() {
  const submitSignup = document.getElementById('submitSignup');
  if (submitSignup) {
    submitSignup.addEventListener('click', async () => {
      const email = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value.trim();
      if (!email || !password) {
        showFeedback('Please enter both email and password.');
        return;
      }
      submitSignup.disabled = true;
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
      } finally {
        submitSignup.disabled = false;
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthInitialized) initializeAuth();
});
